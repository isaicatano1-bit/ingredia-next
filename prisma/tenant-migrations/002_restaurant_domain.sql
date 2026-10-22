-- Add the tenant business domain. Run inside a transaction with this tenant
-- schema first in search_path. Unknown legacy units are preserved as OTHER and
-- require an explicit conversion rule before they can be used in costing.

CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  measurement_type TEXT NOT NULL CHECK (measurement_type IN ('MASS', 'VOLUME', 'COUNT', 'OTHER')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT units_abbreviation_key UNIQUE (abbreviation),
  CONSTRAINT units_name_nonempty_check CHECK (length(btrim(name)) > 0),
  CONSTRAINT units_abbreviation_nonempty_check CHECK (length(btrim(abbreviation)) > 0)
);

ALTER TABLE ingredients ADD COLUMN purchase_unit_id UUID;

INSERT INTO units (name, abbreviation, measurement_type)
SELECT DISTINCT btrim(unit), btrim(unit),
  CASE
    WHEN lower(btrim(unit)) IN ('g', 'gram', 'grams', 'mg', 'milligram', 'milligrams', 'kg', 'kilogram', 'kilograms', 'oz', 'ounce', 'ounces', 'lb', 'lbs', 'pound', 'pounds') THEN 'MASS'
    WHEN lower(btrim(unit)) IN ('ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres', 'l', 'liter', 'liters', 'litre', 'litres') THEN 'VOLUME'
    WHEN lower(btrim(unit)) IN ('ea', 'each', 'unit', 'units', 'piece', 'pieces', 'pc', 'pcs', 'portion', 'portions', 'serving', 'servings') THEN 'COUNT'
    ELSE 'OTHER'
  END
FROM ingredients
WHERE length(btrim(unit)) > 0;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM ingredients WHERE length(btrim(unit)) = 0) THEN
    RAISE EXCEPTION 'Cannot migrate ingredients with an empty legacy unit';
  END IF;
END $$;

UPDATE ingredients AS i
SET purchase_unit_id = u.id
FROM units AS u
WHERE u.abbreviation = btrim(i.unit);

ALTER TABLE ingredients ALTER COLUMN purchase_unit_id SET NOT NULL;
ALTER TABLE ingredients DROP COLUMN unit;
ALTER TABLE ingredients
  ADD CONSTRAINT ingredients_purchase_unit_id_fkey
    FOREIGN KEY (purchase_unit_id) REFERENCES units(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT ingredients_name_nonempty_check CHECK (length(btrim(name)) > 0),
  ADD COLUMN archived_at TIMESTAMPTZ,
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX ingredients_purchase_unit_id_idx ON ingredients (purchase_unit_id);

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT suppliers_name_nonempty_check CHECK (length(btrim(name)) > 0)
);
CREATE INDEX suppliers_name_idx ON suppliers (name);

CREATE TABLE supplier_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL,
  ingredient_id UUID NOT NULL,
  supplier_product_code TEXT,
  last_known_unit_price NUMERIC(14, 4),
  currency_code CHAR(3),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT supplier_ingredients_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT supplier_ingredients_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT supplier_ingredients_supplier_ingredient_key UNIQUE (supplier_id, ingredient_id),
  CONSTRAINT supplier_ingredients_price_check CHECK (last_known_unit_price IS NULL OR last_known_unit_price >= 0),
  CONSTRAINT supplier_ingredients_currency_check CHECK ((last_known_unit_price IS NULL AND currency_code IS NULL) OR (last_known_unit_price IS NOT NULL AND currency_code ~ '^[A-Z]{3}$'))
);
CREATE INDEX supplier_ingredients_ingredient_id_idx ON supplier_ingredients (ingredient_id);

CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  yield_quantity NUMERIC(14, 4) NOT NULL DEFAULT 1,
  yield_unit_id UUID NOT NULL,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT recipes_yield_unit_id_fkey FOREIGN KEY (yield_unit_id) REFERENCES units(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT recipes_name_nonempty_check CHECK (length(btrim(name)) > 0),
  CONSTRAINT recipes_yield_quantity_check CHECK (yield_quantity > 0)
);
CREATE INDEX recipes_yield_unit_id_idx ON recipes (yield_unit_id);
CREATE INDEX recipes_name_idx ON recipes (name);

CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL,
  ingredient_id UUID NOT NULL,
  quantity NUMERIC(14, 4) NOT NULL,
  unit_id UUID NOT NULL,
  preparation_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT recipe_ingredients_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT recipe_ingredients_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT recipe_ingredients_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT recipe_ingredients_quantity_check CHECK (quantity > 0)
);
CREATE INDEX recipe_ingredients_recipe_id_idx ON recipe_ingredients (recipe_id);
CREATE INDEX recipe_ingredients_ingredient_id_idx ON recipe_ingredients (ingredient_id);
CREATE INDEX recipe_ingredients_unit_id_idx ON recipe_ingredients (unit_id);

CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL,
  purchase_date TIMESTAMPTZ NOT NULL,
  invoice_number TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'CONFIRMED', 'CANCELLED')),
  currency_code CHAR(3) NOT NULL CHECK (currency_code ~ '^[A-Z]{3}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT purchases_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX purchases_supplier_id_idx ON purchases (supplier_id);
CREATE INDEX purchases_purchase_date_idx ON purchases (purchase_date);

CREATE TABLE purchase_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL,
  ingredient_id UUID NOT NULL,
  quantity NUMERIC(14, 4) NOT NULL,
  unit_id UUID NOT NULL,
  unit_price NUMERIC(14, 4) NOT NULL,
  line_total NUMERIC(18, 4) GENERATED ALWAYS AS (round(quantity * unit_price, 4)) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT purchase_lines_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT purchase_lines_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT purchase_lines_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT purchase_lines_quantity_check CHECK (quantity > 0),
  CONSTRAINT purchase_lines_unit_price_check CHECK (unit_price >= 0)
);
CREATE INDEX purchase_lines_purchase_id_idx ON purchase_lines (purchase_id);
CREATE INDEX purchase_lines_ingredient_id_idx ON purchase_lines (ingredient_id);
CREATE INDEX purchase_lines_unit_id_idx ON purchase_lines (unit_id);

CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL,
  name TEXT NOT NULL,
  sale_price NUMERIC(14, 2) NOT NULL,
  currency_code CHAR(3) NOT NULL CHECK (currency_code ~ '^[A-Z]{3}$'),
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT menu_items_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT menu_items_name_nonempty_check CHECK (length(btrim(name)) > 0),
  CONSTRAINT menu_items_sale_price_check CHECK (sale_price >= 0)
);
CREATE INDEX menu_items_recipe_id_idx ON menu_items (recipe_id);

CREATE TABLE price_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL,
  estimated_cost NUMERIC(14, 4) NOT NULL,
  proposed_sale_price NUMERIC(14, 2) NOT NULL,
  target_margin NUMERIC(7, 4),
  currency_code CHAR(3) NOT NULL CHECK (currency_code ~ '^[A-Z]{3}$'),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'APPROVED', 'REJECTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT price_proposals_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT price_proposals_estimated_cost_check CHECK (estimated_cost >= 0),
  CONSTRAINT price_proposals_sale_price_check CHECK (proposed_sale_price >= 0),
  CONSTRAINT price_proposals_target_margin_check CHECK (target_margin IS NULL OR (target_margin >= 0 AND target_margin < 1))
);
CREATE INDEX price_proposals_recipe_id_idx ON price_proposals (recipe_id);
CREATE INDEX price_proposals_created_at_idx ON price_proposals (created_at);
