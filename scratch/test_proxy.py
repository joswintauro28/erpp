import requests

try:
    print("Testing http://localhost:3001/api/dashboard...")
    r = requests.get("http://localhost:3001/api/dashboard", timeout=5)
    print("Status code:", r.status_code)
    print("Response headers:", r.headers)
    print("Response body:", r.text[:500])
except Exception as e:
    print("Request failed:", e)
