from sqlalchemy import text
from app.database import engine, Base
import app.models

def migrate_enterprise_schema():
    print("Creating all Phase 26-28 Enterprise ERP tables on database...")
    Base.metadata.create_all(bind=engine)
    print("All Phase 26-28 Enterprise ERP tables created successfully!")

if __name__ == "__main__":
    migrate_enterprise_schema()
