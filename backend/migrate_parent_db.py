from sqlalchemy import text
from app.database import engine, Base
import app.models

def migrate_parent_schema():
    print("Creating all Parent Portal tables on database...")
    Base.metadata.create_all(bind=engine)
    print("All Parent Portal tables created successfully!")

if __name__ == "__main__":
    migrate_parent_schema()
