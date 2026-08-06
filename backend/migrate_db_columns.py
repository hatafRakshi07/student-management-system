import sys
import os
from sqlalchemy import text

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.database import engine, create_tables

def run_migrations():
    print("Running comprehensive database column migrations for Postgres...")
    alter_statements = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100);",
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users (username);",
        
        # Student Profile Columns
        "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS reg_no VARCHAR(100);",
        "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS father_name VARCHAR(255);",
        "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS mother_name VARCHAR(255);",
        "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS gender VARCHAR(50);",
        "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS category VARCHAR(50);",
        "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS student_type VARCHAR(50);",
        "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS reg_date DATE;",
        "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS reg_class VARCHAR(100);",
        "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS religion VARCHAR(50);",
        "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS father_mobile VARCHAR(50);",
        "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS mother_phone VARCHAR(50);",
        "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS mother_mobile VARCHAR(50);",
        "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS permanent_address VARCHAR(500);",
        "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS exist_status VARCHAR(50);",
        "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS minority INTEGER;",
        "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS permanent_area VARCHAR(255);",
        "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS discount_remark VARCHAR(255);",
        "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS janaadhar_no VARCHAR(100);",
        "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS blood_group VARCHAR(20);",
        "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS allergies VARCHAR(255);",
        "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS pre_school_name VARCHAR(255);",
        "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS board_roll_no_12 VARCHAR(100);",
        "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS board_roll_no_10 VARCHAR(100);",
        "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS extra_fields VARCHAR(2000);",
        "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS admission_no VARCHAR(100);",
        "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS student_name VARCHAR(255);",
        "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS mobile VARCHAR(50);",
        "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';",
        "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;",
        "ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;",

        # Fee Transactions Columns
        "ALTER TABLE fee_transactions ADD COLUMN IF NOT EXISTS scholar_no VARCHAR(100);",
        "ALTER TABLE fee_transactions ADD COLUMN IF NOT EXISTS is_matched BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE fee_transactions ADD COLUMN IF NOT EXISTS extra_columns TEXT;"
    ]

    with engine.connect() as conn:
        for stmt in alter_statements:
            try:
                conn.execute(text(stmt))
                conn.commit()
                print(f"Executed: {stmt}")
            except Exception as e:
                print(f"Statement failed: {stmt} -> {e}")

    # Create missing tables
    create_tables()
    print("Migration finished successfully!")

if __name__ == "__main__":
    run_migrations()
