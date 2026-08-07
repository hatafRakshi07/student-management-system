import sys
import os

# Increase recursion limit to handle deep SQLAlchemy mapper compilation on Vercel
sys.setrecursionlimit(50000)

# Add backend path so imports resolve cleanly on Vercel Serverless
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.main import app
