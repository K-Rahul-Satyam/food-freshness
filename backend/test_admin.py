import unittest
from fastapi.testclient import TestClient
from main import app

class TestAdminAndAuth(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_forgot_and_reset_password(self):
        # 1. Register a test user
        reg_resp = self.client.post("/api/auth/register", json={
            "full_name": "Reset Test User",
            "email": "forgot_test@freshguard.io",
            "password": "oldpassword123",
            "role": "Consumer"
        })
        self.assertIn(reg_resp.status_code, [201, 400]) # 201 created or 400 if already exists

        # 2. Request forgot password reset code
        resp = self.client.post("/api/auth/forgot-password", json={"email": "forgot_test@freshguard.io"})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("reset_code", data)
        code = data["reset_code"]

        # 3. Reset password using reset code
        reset_resp = self.client.post("/api/auth/reset-password", json={
            "email": "forgot_test@freshguard.io",
            "reset_code": code,
            "new_password": "newsecurepassword123"
        })
        self.assertEqual(reset_resp.status_code, 200)
        self.assertIn("successfully", reset_resp.json()["message"])

        # 4. Sign in with updated password
        login_resp = self.client.post("/api/auth/login", json={
            "email": "forgot_test@freshguard.io",
            "password": "newsecurepassword123"
        })
        self.assertEqual(login_resp.status_code, 200)
        self.assertIn("access_token", login_resp.json())
        print("FORGOT & RESET PASSWORD TEST PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    unittest.main()
