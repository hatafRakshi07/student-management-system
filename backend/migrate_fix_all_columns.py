"""
Phase 1: Complete Schema Migration Script
Adds all missing columns to student_profiles, teacher_profiles, 
and creates hostel tables.
Fixes BUG-1, BUG-2, BUG-10.
"""
import sqlite3
import os
import sys

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "student_management.db")

def safe_add_column(cur, table, column, col_type, default=None):
    """Add column if it doesn't exist."""
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


def migrate_student_profiles(cur):
    """BUG-1: Add 20+ missing columns to student_profiles."""
    print("\n=== Migrating student_profiles ===")
    columns = [
        ("reg_no", "VARCHAR(100)", None),
        ("father_name", "VARCHAR(255)", None),
        ("mother_name", "VARCHAR(255)", None),
        ("gender", "VARCHAR(50)", None),
        ("category", "VARCHAR(50)", None),
        ("student_type", "VARCHAR(50)", None),
        ("reg_date", "DATE", None),
        ("reg_class", "VARCHAR(100)", None),
        ("religion", "VARCHAR(50)", None),
        ("father_mobile", "VARCHAR(50)", None),
        ("mother_phone", "VARCHAR(50)", None),
        ("mother_mobile", "VARCHAR(50)", None),
        ("permanent_address", "VARCHAR(500)", None),
        ("exist_status", "VARCHAR(50)", None),
        ("minority", "INTEGER", None),
        ("permanent_area", "VARCHAR(255)", None),
        ("discount_remark", "VARCHAR(255)", None),
        ("janaadhar_no", "VARCHAR(100)", None),
        ("blood_group", "VARCHAR(20)", None),
        ("allergies", "VARCHAR(255)", None),
        ("pre_school_name", "VARCHAR(255)", None),
        ("board_roll_no_12", "VARCHAR(100)", None),
        ("board_roll_no_10", "VARCHAR(100)", None),
        ("extra_fields", "VARCHAR(2000)", None),
        ("admission_no", "VARCHAR(100)", None),
        ("student_name", "VARCHAR(255)", None),
        ("mobile", "VARCHAR(50)", None),
        ("status", "VARCHAR(50)", "'ACTIVE'"),
        ("created_at", "DATETIME", None),
        ("updated_at", "DATETIME", None),
    ]
    added = 0
    for col_name, col_type, default in columns:
        if safe_add_column(cur, "student_profiles", col_name, col_type, default):
            added += 1
    print(f"  Total columns added: {added}")
    return added


def migrate_teacher_profiles(cur):
    """BUG-2: Add last_verified_at to teacher_profiles."""
    print("\n=== Migrating teacher_profiles ===")
    added = 0
    if safe_add_column(cur, "teacher_profiles", "last_verified_at", "DATETIME"):
        added += 1
    return added


def create_hostel_tables(cur):
    """BUG-10: Create hostel_rooms and hostel_allocations tables."""
    print("\n=== Creating hostel tables ===")
    
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='hostel_rooms'")
    if not cur.fetchone():
        cur.execute("""
            CREATE TABLE hostel_rooms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_number VARCHAR(50) UNIQUE NOT NULL,
                block_wing VARCHAR(100) DEFAULT 'Girls Hostel Block A',
                floor INTEGER DEFAULT 1,
                capacity INTEGER DEFAULT 2,
                occupied_count INTEGER DEFAULT 0,
                monthly_rent FLOAT DEFAULT 3500.0,
                facilities VARCHAR(255) DEFAULT 'AC, WiFi, Study Table',
                status VARCHAR(50) DEFAULT 'AVAILABLE',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  ✅ Created hostel_rooms table")
    else:
        print("  ⏭️  hostel_rooms already exists")

    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='hostel_allocations'")
    if not cur.fetchone():
        cur.execute("""
            CREATE TABLE hostel_allocations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_id INTEGER REFERENCES hostel_rooms(id) ON DELETE CASCADE,
                student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                allotted_date DATE DEFAULT CURRENT_DATE,
                mess_plan VARCHAR(100) DEFAULT 'Full Mess (Veg/Jain)',
                fee_status VARCHAR(50) DEFAULT 'PAID',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  ✅ Created hostel_allocations table")
    else:
        print("  ⏭️  hostel_allocations already exists")


def create_indexes(cur):
    """Create performance indexes for new columns."""
    print("\n=== Creating indexes ===")
    indexes = [
        "CREATE INDEX IF NOT EXISTS idx_sp_reg_no ON student_profiles(reg_no)",
        "CREATE INDEX IF NOT EXISTS idx_sp_admission_no ON student_profiles(admission_no)",
        "CREATE INDEX IF NOT EXISTS idx_sp_student_name ON student_profiles(student_name)",
        "CREATE INDEX IF NOT EXISTS idx_sp_mobile ON student_profiles(mobile)",
        "CREATE INDEX IF NOT EXISTS idx_sp_father_mobile ON student_profiles(father_mobile)",
    ]
    for idx_sql in indexes:
        try:
            cur.execute(idx_sql)
            print(f"  ✅ {idx_sql.split('idx_')[1].split(' ')[0]}")
        except Exception as e:
            print(f"  ⚠️ Index error: {e}")


def backfill_student_name(cur):
    """Copy full_name from users table to student_profiles.student_name where NULL."""
    print("\n=== Backfilling student_name from users.full_name ===")
    cur.execute("""
        UPDATE student_profiles 
        SET student_name = (SELECT full_name FROM users WHERE users.id = student_profiles.user_id)
        WHERE student_name IS NULL
    """)
    updated = cur.rowcount
    print(f"  ✅ Backfilled {updated} student_name values")
    return updated


def main():
    print(f"Database: {DB_PATH}")
    if not os.path.exists(DB_PATH):
        print(f"ERROR: Database file not found: {DB_PATH}")
        sys.exit(1)
    
    db = sqlite3.connect(DB_PATH)
    cur = db.cursor()
    
    try:
        migrate_student_profiles(cur)
        migrate_teacher_profiles(cur)
        create_hostel_tables(cur)
        create_indexes(cur)
        backfill_student_name(cur)
        
        db.commit()
        print("\n" + "=" * 50)
        print("✅ Phase 1 Migration COMPLETE!")
        print("=" * 50)
        
        # Verify
        cur.execute("PRAGMA table_info(student_profiles)")
        cols = [row[1] for row in cur.fetchall()]
        print(f"\nstudent_profiles now has {len(cols)} columns:")
        print(f"  {', '.join(cols)}")
        
        cur.execute("PRAGMA table_info(teacher_profiles)")
        cols = [row[1] for row in cur.fetchall()]
        print(f"\nteacher_profiles now has {len(cols)} columns:")
        print(f"  {', '.join(cols)}")
        
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'hostel%'")
        hostel_tables = [row[0] for row in cur.fetchall()]
        print(f"\nHostel tables: {hostel_tables}")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Migration FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
