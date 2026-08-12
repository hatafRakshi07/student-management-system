import sys
import os

sys.setrecursionlimit(50000)

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.main import app
from mangum import Mangum

# Mangum wraps FastAPI as a Lambda/Vercel-compatible handler for all HTTP methods
handler = Mangum(app, lifespan="off")
