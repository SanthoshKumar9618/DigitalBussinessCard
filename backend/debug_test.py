import sys
import os
import traceback
sys.path.insert(0, '.')

print("=" * 60)
print("FASTAPI DEBUG TEST")
print("=" * 60)

print("\nStep 1: Loading environment...")
try:
    from app.config.settings import settings
    print(f"✓ Settings loaded. DB: {settings.POSTGRES_HOST}")
except Exception as e:
    print(f"✗ Settings loading failed: {e}")
    traceback.print_exc()
    sys.exit(1)

print("\nStep 2: Testing database connection...")
try:
    from app.database.connection import engine
    with engine.connect() as conn:
        print("✓ Database connected successfully")
except Exception as e:
    print(f"✗ Database connection failed: {e}")
    traceback.print_exc()
    sys.exit(1)

print("\nStep 3: Loading app...")
try:
    from app.main import app
    print("✓ App loaded successfully")
except Exception as e:
    print(f"✗ App loading failed: {e}")
    traceback.print_exc()
    sys.exit(1)

print("\nStep 4: Testing root endpoint...")
try:
    from fastapi.testclient import TestClient
    client = TestClient(app)
    response = client.get("/")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    if response.status_code != 200:
        print(f"✗ Root endpoint returned {response.status_code}")
    else:
        print("✓ Root endpoint works")
except Exception as e:
    print(f"✗ Root endpoint failed: {e}")
    traceback.print_exc()

print("\nStep 5: Testing auth/forgot-password endpoint...")
try:
    from fastapi.testclient import TestClient
    client = TestClient(app)
    response = client.post("/auth/forgot-password", json={"identifier": "test@example.com"})
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"✗ Auth endpoint failed: {e}")
    traceback.print_exc()

print("\n" + "=" * 60)
print("DEBUG TEST COMPLETE")
print("=" * 60)