import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from app.config import settings
from app.database import engine, check_connection, create_tables
from seed_db import seed

def main():
    print("=" * 60)
    print(" SUPABASE DATABASE INITIALIZATION & VERIFICATION ")
    print("=" * 60)
    
    db_url = settings.database_url
    print(f"Target Database URL: {db_url}")
    
    if "postgres" not in db_url:
        print("\n[WARNING] Currently using SQLite or non-PostgreSQL connection.")
        print("Please update DATABASE_URL in backend/.env with your Supabase PostgreSQL URL.")
        print("Example: postgresql+psycopg2://postgres.[ref]:[password]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres\n")
    else:
        print("\n[INFO] PostgreSQL connection detected.")

    print("Testing connection...")
    if check_connection():
        print("[SUCCESS] Connection established successfully!")
        print("Creating tables in Supabase / PostgreSQL database...")
        create_tables()
        print("Seeding initial data (Admin, Teachers, Students, Subjects)...")
        seed()
        print("\n[ALL DONE] Database initialization completed successfully!")
    else:
        print("\n[ERROR] Connection failed. Please check your credentials in backend/.env")

if __name__ == "__main__":
    main()
