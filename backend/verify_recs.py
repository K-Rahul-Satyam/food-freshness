import urllib.request
import json

BASE_URL = "http://127.0.0.1:8000/api"
test_email = "checker_test_99@test.com"
test_pwd = "password123"
reg_data = json.dumps({"full_name": "Checker", "email": test_email, "password": test_pwd, "role": "Administrator"}).encode("utf-8")
try:
    req = urllib.request.Request(BASE_URL + "/auth/register", data=reg_data, headers={"Content-Type": "application/json"})
    urllib.request.urlopen(req)
except Exception as e:
    pass

login_data = json.dumps({"email": test_email, "password": test_pwd}).encode("utf-8")
req = urllib.request.Request(BASE_URL + "/auth/login", data=login_data, headers={"Content-Type": "application/json"})
res = urllib.request.urlopen(req)
token = json.loads(res.read().decode())["access_token"]
headers = {"Content-Type": "application/json", "Authorization": "Bearer " + token}

req = urllib.request.Request(BASE_URL + "/inventory", headers=headers)
items = json.loads(urllib.request.urlopen(req).read().decode())

print(f"Total inventory items found: {len(items)}\n")

for item in items[:4]:
    item_id = str(item["id"])
    req = urllib.request.Request(BASE_URL + "/recommendations/product/" + item_id, headers=headers)
    rec = json.loads(urllib.request.urlopen(req).read().decode())
    print("=" * 60)
    print(f"PRODUCT: {rec['product_name']} (Days Left: {rec['days_left']})")
    print("=" * 60)
    for cat in ["storage", "consumption", "waste_reduction", "quality_improvement"]:
        print(f"  {cat.upper()}:")
        for tip in rec.get(cat, []):
            print(f"    - {tip['title']}: {tip['description']}")
    print()
