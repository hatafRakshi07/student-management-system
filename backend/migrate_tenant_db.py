from sqlalchemy import text
from app.database import engine, Base
import app.models

def migrate_tenant_schema():
    print("Creating all Phase 38-40 Multi-Tenant & Developer API tables on database...")
    Base.metadata.create_all(bind=engine)
    print("All Phase 38-40 Multi-Tenant & Developer API tables created successfully!")

if __name__ == "__main__":
    migrate_tenant_schema()
