import requests

try:
    print("Testing http://127.0.0.1:8001/api/dashboard...")
    r = requests.get("http://127.0.0.1:8001/api/dashboard", timeout=5)
    print("Status code:", r.status_code)
    print("Response body:", r.text[:200])
except Exception as e:
    print("Request failed:", e)
