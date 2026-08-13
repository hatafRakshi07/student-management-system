"""
Migration script to add missing columns to assignments and marks tables.
Fixes 500 errors on /assignments, /students/assignments, and /parent/dashboard.
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "student_management.db")

def safe_add_column(cur, table, column, col_type, default=None):
    cur.execute(f"PRAGMA table_info([{table}])")
    existing = [row[1] for row in cur.fetchall()]
    if column not in existing:
        default_clause = f" DEFAULT {default}" if default is not None else ""
        sql = f"ALTER TABLE [{table}] ADD COLUMN [{column}] {col_type}{default_clause}"
        cur.execute(sql)
        print(f"  ✅ Added {table}.{column} ({col_type})")
        return True
    else:
        print(f"  ⏭️  {table}.{column} already exists")
        return False

def migrate():
    print(f"Migrating database: {DB_PATH}")
    db = sqlite3.connect(DB_PATH)
    cur = db.cursor()
    
    print("\n=== Migrating assignments table ===")
    assignment_cols = [
        ("class_name", "VARCHAR(100)", "'BCA'"),
        ("semester", "INTEGER", "1"),
        ("section", "VARCHAR(50)", "'A'"),
        ("subject_name", "VARCHAR(255)", "'General Subject'"),
    ]
    for col_name, col_type, default in assignment_cols:
        safe_add_column(cur, "assignments", col_name, col_type, default)
        
    print("\n=== Migrating marks table ===")
    marks_cols = [
        ("subject_id", "INTEGER", "NULL"),
        ("theory_marks", "FLOAT", "0.0"),
        ("internal_marks", "FLOAT", "0.0"),
        ("practical_marks", "FLOAT", "0.0"),
        ("viva_marks", "FLOAT", "0.0"),
        ("grace_marks", "FLOAT", "0.0"),
        ("total_obtained", "FLOAT", "0.0"),
        ("letter_grade", "VARCHAR(10)", "'A'"),
        ("grade_point", "FLOAT", "8.0"),
        ("is_pass", "BOOLEAN", "1"),
        ("marked_by_id", "INTEGER", "NULL"),
        ("updated_at", "DATETIME", "NULL"),
    ]
    for col_name, col_type, default in marks_cols:
        safe_add_column(cur, "marks", col_name, col_type, default)
        
    db.commit()
    db.close()
    print("\n✅ Assignments & Marks migration complete!")

if __name__ == "__main__":
    migrate()
