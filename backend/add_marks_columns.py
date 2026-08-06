from sqlalchemy import text
from app.database import engine

def alter_marks_table():
    print("Altering 'marks' table to add missing ERP columns...")
    alter_queries = [
        "ALTER TABLE marks ADD COLUMN IF NOT EXISTS subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL;",
        "ALTER TABLE marks ADD COLUMN IF NOT EXISTS theory_marks DOUBLE PRECISION DEFAULT 0.0;",
        "ALTER TABLE marks ADD COLUMN IF NOT EXISTS internal_marks DOUBLE PRECISION DEFAULT 0.0;",
        "ALTER TABLE marks ADD COLUMN IF NOT EXISTS practical_marks DOUBLE PRECISION DEFAULT 0.0;",
        "ALTER TABLE marks ADD COLUMN IF NOT EXISTS viva_marks DOUBLE PRECISION DEFAULT 0.0;",
        "ALTER TABLE marks ADD COLUMN IF NOT EXISTS grace_marks DOUBLE PRECISION DEFAULT 0.0;",
        "ALTER TABLE marks ADD COLUMN IF NOT EXISTS total_obtained DOUBLE PRECISION DEFAULT 0.0;",
        "ALTER TABLE marks ADD COLUMN IF NOT EXISTS letter_grade VARCHAR(10) DEFAULT 'F';",
        "ALTER TABLE marks ADD COLUMN IF NOT EXISTS grade_point DOUBLE PRECISION DEFAULT 0.0;",
        "ALTER TABLE marks ADD COLUMN IF NOT EXISTS is_pass BOOLEAN DEFAULT TRUE;",
        "ALTER TABLE marks ADD COLUMN IF NOT EXISTS marked_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL;",
        "ALTER TABLE marks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;"
    ]
    with engine.begin() as conn:
        for q in alter_queries:
            conn.execute(text(q))
    print("'marks' table columns updated successfully!")

if __name__ == "__main__":
    alter_marks_table()
