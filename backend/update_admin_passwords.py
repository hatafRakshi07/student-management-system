from app.database import SessionLocal
from app.models.user import User, UserRole
from app.utils.password_handler import hash_password

db = SessionLocal()
admins = db.query(User).filter(User.role == UserRole.admin).all()
pwd_hash = hash_password("Admin@123")

for a in admins:
    a.hashed_password = pwd_hash

db.commit()
print("Updated password for all admin accounts to Admin@123!")
for a in db.query(User).filter(User.role == UserRole.admin).all():
    print("ID:", a.id, "Username:", a.username, "Email:", a.email, "Name:", a.full_name)
db.close()
