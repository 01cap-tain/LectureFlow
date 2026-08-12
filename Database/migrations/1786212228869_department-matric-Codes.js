/**
 * Create matric-code mappings for departments.
 * Example: CSC -> Computer Science, MCB -> Microbiology.
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS department_matric_codes (
      id            SERIAL PRIMARY KEY,
      department_id INTEGER NOT NULL REFERENCES departments (id) ON DELETE RESTRICT,
      code          VARCHAR(20) NOT NULL,
      is_active     BOOLEAN NOT NULL DEFAULT TRUE,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      CONSTRAINT uq_department_matric_codes_code UNIQUE (code)
    );

    CREATE INDEX IF NOT EXISTS idx_department_matric_codes_department_id
      ON department_matric_codes (department_id);

    CREATE INDEX IF NOT EXISTS idx_department_matric_codes_active_code
      ON department_matric_codes (code)
      WHERE is_active = TRUE;

    DROP TRIGGER IF EXISTS trg_department_matric_codes_updated_at ON department_matric_codes;
    CREATE TRIGGER trg_department_matric_codes_updated_at
      BEFORE UPDATE ON department_matric_codes
      FOR EACH ROW
      EXECUTE PROCEDURE set_updated_at();
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP TRIGGER IF EXISTS trg_department_matric_codes_updated_at ON department_matric_codes;
    DROP TABLE IF EXISTS department_matric_codes;
  `);
};
