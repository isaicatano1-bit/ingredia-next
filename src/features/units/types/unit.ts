export type MeasurementType = "MASS" | "VOLUME" | "COUNT" | "OTHER";
export type Unit = { id: string; name: string; abbreviation: string; measurementType: MeasurementType; createdAt: string };
export type UnitInput = { name: string; abbreviation: string; measurementType: MeasurementType };
