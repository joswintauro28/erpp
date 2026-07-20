import sys
import os

# Add parent directory to path to ensure uvicorn can find the app module correctly if started from backend/
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
