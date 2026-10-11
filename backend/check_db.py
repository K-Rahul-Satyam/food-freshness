from database import SessionLocal
import models

def inspect_database():
    db = SessionLocal()
    try:
        print("\n================ SYSTEM USERS ================")
        users = db.query(models.User).all()
        for u in users:
            print(f"ID: {u.id:<3} | Name: {u.full_name:<20} | Email: {u.email:<28} | Role: {u.role:<22} | Active: {u.is_active}")
        
        print("\n================ FOOD INVENTORY ================")
        items = db.query(models.FoodItem).all()
        for item in items:
            print(f"ID: {item.id:<3} | Batch: {item.batch_number:<15} | Name: {item.name:<28} | Category: {item.category:<16} | Status: {item.status}")
        
        print(f"\nTotal Users: {len(users)} | Total Food Items: {len(items)}\n")
    finally:
        db.close()

if __name__ == "__main__":
    inspect_database()
