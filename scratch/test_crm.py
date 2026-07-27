import requests
from jose import jwt # PyJWT or python-jose
import sys

JWT_SECRET = "development-jwt-secret-key-123"
token_payload = {
    "user_id": 1,
    "email": "admin@datavex.com",
    "role": "Organization Owner",
    "permissions": ["all"]
}

# Sign the token using HS256
token = jwt.encode(token_payload, JWT_SECRET, algorithm="HS256")

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# 1. Test POST /api/leads (Adding a lead)
print("Testing Add Lead (POST /api/leads)...")
lead_payload = {
    "name": "Test Lead Name",
    "company": "Test Company",
    "source": "Website Inquiry",
    "est_value": 50000,
    "owner": "tester"
}

try:
    res = requests.post("http://localhost:8001/api/leads", json=lead_payload, headers=headers)
    print(f"Status Code: {res.status_code}")
    print(f"Response Body: {res.text}")
except Exception as e:
    print(f"Request failed: {e}")

# 2. Test POST /api/lead-discovery/import (Importing a lead)
print("\nTesting Import Lead (POST /api/lead-discovery/import)...")
import_payload = {
    "companies": [
        {
            "company_name": "Test Company Import",
            "industry": "Technology",
            "location": "New York",
            "website": "https://testcompany.com",
            "estimated_employees": "100",
            "estimated_revenue": "$10M",
            "company_overview": "A test company overview",
            "ai_readiness_score": 80,
            "detected_technologies": ["React", "Python"],
            "business_pain_points": ["Scaling"],
            "recommended_ai_solutions": ["Chatbot"],
            "key_decision_makers": [
                {
                    "name": "Jane Doe",
                    "title": "CTO",
                    "email": "jane@testcompany.com",
                    "phone": "+12345678",
                    "linkedin": ""
                }
            ],
            "public_contact": {
                "email": "info@testcompany.com",
                "phone": "+12345678",
                "address": "123 Test St",
                "linkedin": ""
            }
        }
    ]
}

try:
    res = requests.post("http://localhost:8001/api/lead-discovery/import", json=import_payload, headers=headers)
    print(f"Status Code: {res.status_code}")
    print(f"Response Body: {res.text}")
except Exception as e:
    print(f"Request failed: {e}")
