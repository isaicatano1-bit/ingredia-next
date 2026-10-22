-- Additive changes only: 002 already created supplier_ingredients, purchases,
-- and purchase_lines. Existing tenants receive this through migrateTenantSchema.
ALTER TABLE supplier_ingredients
  ADD COLUMN purchase_unit_id UUID,
  ADD COLUMN minimum_order_quantity NUMERIC(14, 4),
  ADD COLUMN lead_time_days INTEGER,
  ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE supplier_ingredients si
SET purchase_unit_id = i.purchase_unit_id
FROM ingredients i
WHERE i.id = si.ingredient_id;

ALTER TABLE supplier_ingredients
  ALTER COLUMN purchase_unit_id SET NOT NULL,
  ADD CONSTRAINT supplier_ingredients_purchase_unit_id_fkey
    FOREIGN KEY (purchase_unit_id) REFERENCES units(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT supplier_ingredients_minimum_order_check
    CHECK (minimum_order_quantity IS NULL OR minimum_order_quantity > 0),
  ADD CONSTRAINT supplier_ingredients_lead_time_check
    CHECK (lead_time_days IS NULL OR lead_time_days >= 0),
  ADD CONSTRAINT supplier_ingredients_price_positive_check
    CHECK (last_known_unit_price IS NULL OR last_known_unit_price > 0),
  ADD CONSTRAINT supplier_ingredients_product_code_nonempty_check
    CHECK (supplier_product_code IS NULL OR length(btrim(supplier_product_code)) > 0);
CREATE INDEX supplier_ingredients_purchase_unit_id_idx ON supplier_ingredients (purchase_unit_id);
CREATE UNIQUE INDEX supplier_ingredients_supplier_product_code_key
  ON supplier_ingredients (supplier_id, lower(supplier_product_code))
  WHERE supplier_product_code IS NOT NULL;

ALTER TABLE purchases
  ADD COLUMN notes TEXT,
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN finalized_at TIMESTAMPTZ;

UPDATE purchases SET finalized_at = created_at WHERE status = 'CONFIRMED';

ALTER TABLE purchases ADD CONSTRAINT purchases_invoice_number_nonempty_check
  CHECK (invoice_number IS NULL OR length(btrim(invoice_number)) > 0);
ALTER TABLE purchases ADD CONSTRAINT purchases_notes_length_check
  CHECK (notes IS NULL OR length(notes) <= 4000);
ALTER TABLE purchases ADD CONSTRAINT purchases_finalized_at_check
  CHECK ((status = 'CONFIRMED' AND finalized_at IS NOT NULL) OR (status <> 'CONFIRMED' AND finalized_at IS NULL));

CREATE OR REPLACE FUNCTION enforce_purchase_lifecycle() RETURNS trigger
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'DRAFT' THEN
      RAISE EXCEPTION 'Only draft purchases may be deleted' USING ERRCODE = '23514';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.status <> 'DRAFT' THEN
    RAISE EXCEPTION 'Finalized purchases are immutable' USING ERRCODE = '23514';
  END IF;
  IF NEW.status NOT IN ('DRAFT', 'CONFIRMED', 'CANCELLED') THEN
    RAISE EXCEPTION 'Invalid purchase status' USING ERRCODE = '23514';
  END IF;
  IF NEW.status = 'CONFIRMED' THEN
    NEW.finalized_at := COALESCE(NEW.finalized_at, CURRENT_TIMESTAMP);
  ELSE
    NEW.finalized_at := NULL;
  END IF;
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END $$;

CREATE TRIGGER purchases_lifecycle_guard
BEFORE UPDATE OR DELETE ON purchases
FOR EACH ROW EXECUTE FUNCTION enforce_purchase_lifecycle();

CREATE OR REPLACE FUNCTION enforce_purchase_line_draft() RETURNS trigger
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
DECLARE purchase_status TEXT;
BEGIN
  SELECT status INTO purchase_status FROM purchases
  WHERE id = CASE WHEN TG_OP = 'DELETE' THEN OLD.purchase_id ELSE NEW.purchase_id END
  FOR UPDATE;
  IF purchase_status IS DISTINCT FROM 'DRAFT' THEN
    RAISE EXCEPTION 'Purchase lines can only change while the purchase is a draft' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER purchase_lines_draft_guard
BEFORE INSERT OR UPDATE OR DELETE ON purchase_lines
FOR EACH ROW EXECUTE FUNCTION enforce_purchase_line_draft();

ALTER TABLE purchase_lines ADD CONSTRAINT purchase_lines_unit_price_positive_check CHECK (unit_price > 0);
