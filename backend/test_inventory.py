import urllib.request
import json

BASE_URL = "http://127.0.0.1:8000/api"

print("--- TESTING FOOD INVENTORY MANAGEMENT ENDPOINTS ---")

# 1. Login to get JWT Token
login_data = json.dumps({
    "email": "admin@test.com",
    "password": "password123"
}).encode("utf-8")

req = urllib.request.Request(
    f"{BASE_URL}/auth/login",
    data=login_data,
    headers={"Content-Type": "application/json"}
)
res = urllib.request.urlopen(req)
token = json.loads(res.read().decode())["access_token"]
headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {token}"
}

# 2. Get Food Categories
req = urllib.request.Request(f"{BASE_URL}/inventory/categories", headers=headers)
categories = json.loads(urllib.request.urlopen(req).read().decode())
print(f"CATEGORIES VERIFIED ({len(categories)} categories):", categories)
assert "Fruits" in categories
assert "Vegetables" in categories
assert "Dairy Products" in categories
assert "Meat & Poultry" in categories
assert "Seafood" in categories
assert "Bakery Products" in categories
assert "Packaged Foods" in categories
assert "Beverages" in categories

# 3. Register New Food Item (Batch Management & Categorization)
new_item = json.dumps({
    "name": "Fresh Organic Blueberries",
    "batch_number": "BATCH-FR-999",
    "category": "Fruits",
    "quantity": 50.0,
    "unit": "packs",
    "storage_location": "Zone A - Cold Storage",
    "expiry_date": "2026-09-05T00:00:00Z"
}).encode("utf-8")

req = urllib.request.Request(f"{BASE_URL}/inventory", data=new_item, headers=headers)
created_item = json.loads(urllib.request.urlopen(req).read().decode())
print("FOOD ITEM REGISTERED:", created_item["name"], "Batch:", created_item["batch_number"], "Status:", created_item["status"])
assert created_item["batch_number"] == "BATCH-FR-999"

# 4. Fetch Inventory List & Verify Filter
req = urllib.request.Request(f"{BASE_URL}/inventory?category=Fruits", headers=headers)
fruits_list = json.loads(urllib.request.urlopen(req).read().decode())
print(f"INVENTORY FILTERED BY 'Fruits': {len(fruits_list)} items found.")
assert any(i["batch_number"] == "BATCH-FR-999" for i in fruits_list)

print("--- ALL INVENTORY MANAGEMENT TESTS PASSED PERFECTLY! ---")
