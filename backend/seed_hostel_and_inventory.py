from app.database import SessionLocal, engine, Base
from app.models.expansion import InventoryAssetRecord, AssetStatus
from app.models.user import User, UserRole
from app.models.student import StudentProfile
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, text
from datetime import date, datetime

db = SessionLocal()

# Ensure hostel tables exist
db.execute(text("""
CREATE TABLE IF NOT EXISTS hostel_rooms (
    id SERIAL PRIMARY KEY,
    room_number VARCHAR(50) UNIQUE NOT NULL,
    block_wing VARCHAR(100) DEFAULT 'Girls Hostel Block A',
    floor INT DEFAULT 1,
    capacity INT DEFAULT 2,
    occupied_count INT DEFAULT 0,
    monthly_rent FLOAT DEFAULT 3500.0,
    facilities VARCHAR(255) DEFAULT 'AC, WiFi, Study Table',
    status VARCHAR(50) DEFAULT 'AVAILABLE'
);
"""))

db.execute(text("""
CREATE TABLE IF NOT EXISTS hostel_allocations (
    id SERIAL PRIMARY KEY,
    room_id INT REFERENCES hostel_rooms(id) ON DELETE CASCADE,
    student_id INT REFERENCES users(id) ON DELETE CASCADE,
    allotted_date DATE DEFAULT CURRENT_DATE,
    mess_plan VARCHAR(100) DEFAULT 'Full Mess (Veg/Jain)',
    fee_status VARCHAR(50) DEFAULT 'PAID'
);
"""))
db.commit()

# Seed Hostel Rooms
room_count = db.execute(text("SELECT COUNT(*) FROM hostel_rooms")).scalar()
if room_count == 0:
    rooms_data = [
        ("101", "Girls Hostel Block A", 1, 2, 2, 4500.0, "AC, Attached Bath, High-Speed WiFi, Balcony", "OCCUPIED"),
        ("102", "Girls Hostel Block A", 1, 2, 1, 4500.0, "AC, Attached Bath, WiFi", "PARTIAL"),
        ("103", "Girls Hostel Block A", 1, 3, 3, 3500.0, "Non-AC, WiFi, Study Desk", "OCCUPIED"),
        ("104", "Girls Hostel Block A", 1, 2, 0, 4500.0, "AC, Attached Bath, WiFi", "AVAILABLE"),
        ("201", "Girls Hostel Block B (PG)", 2, 1, 1, 6000.0, "Single Deluxe Room, AC, TV, Refrigerator", "OCCUPIED"),
        ("202", "Girls Hostel Block B (PG)", 2, 2, 0, 4800.0, "AC, Attached Bath, Study Table", "AVAILABLE"),
        ("203", "Girls Hostel Block B (PG)", 2, 2, 1, 4800.0, "AC, Attached Bath, WiFi", "PARTIAL"),
        ("301", "Senior Hostel Wing", 3, 2, 0, 4000.0, "AC, Attached Bath, WiFi", "AVAILABLE"),
    ]
    for r_num, wing, fl, cap, occ, rent, fac, st in rooms_data:
        db.execute(text(f"""
            INSERT INTO hostel_rooms (room_number, block_wing, floor, capacity, occupied_count, monthly_rent, facilities, status)
            VALUES ('{r_num}', '{wing}', {fl}, {cap}, {occ}, {rent}, '{fac}', '{st}')
        """))
    db.commit()

# Seed Inventory Asset Records
asset_count = db.query(InventoryAssetRecord).count()
if asset_count == 0:
    assets_data = [
        ("AST-CS-001", "Dell OptiPlex 7090 i7 Desktop PC", "Computers & IT", "Computer Lab 1", 58500.0, "Good", AssetStatus.ASSIGNED),
        ("AST-CS-002", "Dell OptiPlex 7090 i7 Desktop PC", "Computers & IT", "Computer Lab 1", 58500.0, "Good", AssetStatus.ASSIGNED),
        ("AST-CS-003", "HP Laserjet Pro Enterprise Printer", "Office Supplies", "Administrative Office", 34500.0, "Excellent", AssetStatus.ASSIGNED),
        ("AST-CS-004", "Epson High-Definition Classroom Projector", "AV & Multimedia", "Auditorium & Lab 2", 42000.0, "Good", AssetStatus.AVAILABLE),
        ("AST-LIB-001", "BarCode RFID Book Scanner Station", "Library Tech", "Central Library", 28000.0, "Excellent", AssetStatus.ASSIGNED),
        ("AST-LAB-001", "Digital Microscope 1000x HD Lens", "Science Lab", "Botany Lab", 18500.0, "Good", AssetStatus.AVAILABLE),
        ("AST-SP-001", "Badminton & Volleyball Tournament Kit", "Sports Equipment", "Sports Complex", 12000.0, "Good", AssetStatus.AVAILABLE),
        ("AST-GEN-001", "50 KVA Diesel Soundproof Generator", "Electrical Assets", "Power Backup Station", 450000.0, "Good", AssetStatus.ASSIGNED),
    ]
    for code, name, cat, loc, price, cond, st in assets_data:
        db.add(InventoryAssetRecord(
            asset_code=code, item_name=name, category=cat, location=loc,
            purchase_price=price, condition=cond, status=st, purchase_date=date(2023, 6, 15)
        ))
    db.commit()

print("Hostel rooms count:", db.execute(text("SELECT COUNT(*) FROM hostel_rooms")).scalar())
print("Inventory assets count:", db.query(InventoryAssetRecord).count())
db.close()
