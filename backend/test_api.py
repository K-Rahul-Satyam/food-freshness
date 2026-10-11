import urllib.request
import json

BASE_URL = "http://127.0.0.1:8000/api"

roles = [
    ("Consumer", "consumer@test.com"),
    ("Retail Manager", "retail@test.com"),
    ("Warehouse Operator", "warehouse@test.com"),
    ("Food Quality Inspector", "inspector@test.com"),
    ("Administrator", "admin@test.com"),
]

print("--- STARTING API VERIFICATION ---")

for role, email in roles:
    # 1. Register User
    reg_data = json.dumps({
        "full_name": f"Test {role}",
        "email": email,
        "password": "password123",
        "role": role
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{BASE_URL}/auth/register",
        data=reg_data,
        headers={"Content-Type": "application/json"}
    )
    
    try:
        res = urllib.request.urlopen(req)
        user_res = json.loads(res.read().decode())
        print(f"REGISTER SUCCESS: [{role}] ID={user_res['id']} Email={user_res['email']}")
    except urllib.error.HTTPError as e:
        if e.code == 400:
            print(f"User {email} already registered, proceeding to login test...")
        else:
            print(f"REGISTER FAILED: {e.read().decode()}")

    # 2. Login User
    login_data = json.dumps({
        "email": email,
        "password": "password123"
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{BASE_URL}/auth/login",
        data=login_data,
        headers={"Content-Type": "application/json"}
    )
    
    res = urllib.request.urlopen(req)
    token_res = json.loads(res.read().decode())
    token = token_res["access_token"]
    print(f"LOGIN SUCCESS: [{role}] JWT Token issued.")

    # 3. Fetch Me
    req = urllib.request.Request(
        f"{BASE_URL}/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    res = urllib.request.urlopen(req)
    me_res = json.loads(res.read().decode())
    assert me_res["email"] == email
    assert me_res["role"] == role

    # 4. Fetch Role Dashboard Stats
    req = urllib.request.Request(
        f"{BASE_URL}/dashboard/stats",
        headers={"Authorization": f"Bearer {token}"}
    )
    res = urllib.request.urlopen(req)
    stats_res = json.loads(res.read().decode())
    assert stats_res["role"] == role
    print(f"ROLE DASHBOARD VERIFIED FOR: [{role}]")

print("--- ALL API VERIFICATIONS PASSED SUCCESSFULLY! ---")
