import os
import sys
from datetime import datetime, timedelta, timezone

# Ensure backend directory is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
import models

def seed_real_commercial_inventory():
    db = SessionLocal()
    try:
        # Clear previous sample records
        db.query(models.FoodItem).delete()
        db.commit()
        print("Cleared previous sample items.")

        now = datetime.now(timezone.utc)

        REAL_ITEMS = [
            # ── FRUITS (8 batches) ──
            models.FoodItem(
                name="Honeycrisp Apples", batch_number="BATCH-FR-101", category="Fruits",
                quantity=120.0, unit="kg", storage_location="Cold Room A",
                manufacture_date=now - timedelta(days=5), expiry_date=now + timedelta(days=14),
                status="Fresh", packaging_type="Ventilated Box", current_temperature=3.8,
                current_humidity=88.0, air_circulation="High", light_exposure="Dark", freshness_score=94.0
            ),
            models.FoodItem(
                name="Cavendish Bananas", batch_number="BATCH-FR-102", category="Fruits",
                quantity=95.0, unit="kg", storage_location="Ripening Room 2",
                manufacture_date=now - timedelta(days=4), expiry_date=now + timedelta(days=3),
                status="Approaching Expiry", packaging_type="Corrugated Box", current_temperature=13.5,
                current_humidity=90.0, air_circulation="Medium", light_exposure="Dim", freshness_score=72.0
            ),
            models.FoodItem(
                name="Valencia Oranges", batch_number="BATCH-FR-103", category="Fruits",
                quantity=150.0, unit="kg", storage_location="Cold Room A",
                manufacture_date=now - timedelta(days=3), expiry_date=now + timedelta(days=21),
                status="Fresh", packaging_type="Mesh Bag", current_temperature=4.2,
                current_humidity=85.0, air_circulation="High", light_exposure="Dark", freshness_score=95.0
            ),
            models.FoodItem(
                name="Organic Strawberries", batch_number="BATCH-FR-104", category="Fruits",
                quantity=40.0, unit="packs", storage_location="Berry Chiller",
                manufacture_date=now - timedelta(days=2), expiry_date=now + timedelta(days=2),
                status="Approaching Expiry", packaging_type="Clamshell Pack", current_temperature=1.8,
                current_humidity=92.0, air_circulation="Low", light_exposure="Dark", freshness_score=68.0
            ),
            models.FoodItem(
                name="Hass Avocados", batch_number="BATCH-FR-105", category="Fruits",
                quantity=80.0, unit="kg", storage_location="Cold Room B",
                manufacture_date=now - timedelta(days=3), expiry_date=now + timedelta(days=8),
                status="Fresh", packaging_type="Crate", current_temperature=5.5,
                current_humidity=86.0, air_circulation="Medium", light_exposure="Dark", freshness_score=88.0
            ),
            models.FoodItem(
                name="Crimson Seedless Grapes", batch_number="BATCH-FR-106", category="Fruits",
                quantity=65.0, unit="packs", storage_location="Cold Room A",
                manufacture_date=now - timedelta(days=4), expiry_date=now + timedelta(days=11),
                status="Fresh", packaging_type="Pouch Bag", current_temperature=2.0,
                current_humidity=90.0, air_circulation="High", light_exposure="Dark", freshness_score=91.0
            ),
            models.FoodItem(
                name="Golden Pineapples", batch_number="BATCH-FR-107", category="Fruits",
                quantity=50.0, unit="units", storage_location="Tropical Bay",
                manufacture_date=now - timedelta(days=5), expiry_date=now + timedelta(days=6),
                status="Fresh", packaging_type="Cardboard Tray", current_temperature=9.0,
                current_humidity=85.0, air_circulation="Medium", light_exposure="Ambient", freshness_score=84.0
            ),
            models.FoodItem(
                name="Sweet Blackberries", batch_number="BATCH-FR-108", category="Fruits",
                quantity=30.0, unit="packs", storage_location="Berry Chiller",
                manufacture_date=now - timedelta(days=8), expiry_date=now - timedelta(days=1),
                status="Expired", packaging_type="Clamshell Pack", current_temperature=2.2,
                current_humidity=91.0, air_circulation="Low", light_exposure="Dark", freshness_score=22.0
            ),

            # ── VEGETABLES (8 batches) ──
            models.FoodItem(
                name="Fresh Baby Spinach", batch_number="BATCH-VG-201", category="Vegetables",
                quantity=60.0, unit="packs", storage_location="Veggie Chiller 1",
                manufacture_date=now - timedelta(days=3), expiry_date=now + timedelta(days=3),
                status="Approaching Expiry", packaging_type="Sealed Pillow Bag", current_temperature=2.5,
                current_humidity=94.0, air_circulation="Medium", light_exposure="Dark", freshness_score=74.0
            ),
            models.FoodItem(
                name="Roma Tomatoes", batch_number="BATCH-VG-202", category="Vegetables",
                quantity=110.0, unit="kg", storage_location="Ambient Produce Room",
                manufacture_date=now - timedelta(days=3), expiry_date=now + timedelta(days=7),
                status="Fresh", packaging_type="Vented Box", current_temperature=12.0,
                current_humidity=80.0, air_circulation="Medium", light_exposure="Ambient", freshness_score=87.0
            ),
            models.FoodItem(
                name="English Cucumbers", batch_number="BATCH-VG-203", category="Vegetables",
                quantity=85.0, unit="units", storage_location="Veggie Chiller 2",
                manufacture_date=now - timedelta(days=2), expiry_date=now + timedelta(days=9),
                status="Fresh", packaging_type="Shrink Wrap", current_temperature=8.0,
                current_humidity=88.0, air_circulation="Medium", light_exposure="Dark", freshness_score=90.0
            ),
            models.FoodItem(
                name="Crisp Iceberg Lettuce", batch_number="BATCH-VG-204", category="Vegetables",
                quantity=70.0, unit="heads", storage_location="Veggie Chiller 1",
                manufacture_date=now - timedelta(days=3), expiry_date=now + timedelta(days=5),
                status="Fresh", packaging_type="Film Wrap", current_temperature=2.8,
                current_humidity=95.0, air_circulation="High", light_exposure="Dark", freshness_score=89.0
            ),
            models.FoodItem(
                name="Organic Carrots", batch_number="BATCH-VG-205", category="Vegetables",
                quantity=140.0, unit="kg", storage_location="Cold Storage Root Vault",
                manufacture_date=now - timedelta(days=4), expiry_date=now + timedelta(days=25),
                status="Fresh", packaging_type="Mesh Bag", current_temperature=3.0,
                current_humidity=90.0, air_circulation="Medium", light_exposure="Dark", freshness_score=96.0
            ),
            models.FoodItem(
                name="Bell Peppers Tri-Color", batch_number="BATCH-VG-206", category="Vegetables",
                quantity=90.0, unit="kg", storage_location="Veggie Chiller 2",
                manufacture_date=now - timedelta(days=2), expiry_date=now + timedelta(days=10),
                status="Fresh", packaging_type="Perforated Bag", current_temperature=7.0,
                current_humidity=85.0, air_circulation="Medium", light_exposure="Dark", freshness_score=92.0
            ),
            models.FoodItem(
                name="Fresh Broccoli Crowns", batch_number="BATCH-VG-207", category="Vegetables",
                quantity=75.0, unit="kg", storage_location="Iced Storage Bin",
                manufacture_date=now - timedelta(days=3), expiry_date=now + timedelta(days=4),
                status="Fresh", packaging_type="Iced Waxed Carton", current_temperature=1.2,
                current_humidity=95.0, air_circulation="Low", light_exposure="Dark", freshness_score=85.0
            ),
            models.FoodItem(
                name="Baby Arugula Leaves", batch_number="BATCH-VG-208", category="Vegetables",
                quantity=35.0, unit="packs", storage_location="Veggie Chiller 1",
                manufacture_date=now - timedelta(days=6), expiry_date=now + timedelta(hours=19),
                status="Approaching Expiry", packaging_type="Sealed Tub", current_temperature=3.2,
                current_humidity=92.0, air_circulation="Low", light_exposure="Dark", freshness_score=62.0
            ),

            # ── DAIRY PRODUCTS (6 batches) ──
            models.FoodItem(
                name="Whole Pasteurized Milk 1 Gal", batch_number="BATCH-DY-301", category="Dairy Products",
                quantity=180.0, unit="units", storage_location="Dairy Walk-in Chiller",
                manufacture_date=now - timedelta(days=2), expiry_date=now + timedelta(days=10),
                status="Fresh", packaging_type="HDPE Jug", current_temperature=3.0,
                current_humidity=72.0, air_circulation="Medium", light_exposure="Dark", freshness_score=96.0
            ),
            models.FoodItem(
                name="Whole Greek Yogurt 500g", batch_number="BATCH-DY-302", category="Dairy Products",
                quantity=120.0, unit="units", storage_location="Dairy Walk-in Chiller",
                manufacture_date=now - timedelta(days=4), expiry_date=now + timedelta(days=28),
                status="Fresh", packaging_type="PP Sealed Tub", current_temperature=3.2,
                current_humidity=75.0, air_circulation="Medium", light_exposure="Dark", freshness_score=97.0
            ),
            models.FoodItem(
                name="Sharp Cheddar Cheese Block 250g", batch_number="BATCH-DY-303", category="Dairy Products",
                quantity=90.0, unit="units", storage_location="Cheese Vault",
                manufacture_date=now - timedelta(days=10), expiry_date=now + timedelta(days=45),
                status="Fresh", packaging_type="Vacuum Pouch", current_temperature=4.0,
                current_humidity=70.0, air_circulation="Low", light_exposure="Dark", freshness_score=98.0
            ),
            models.FoodItem(
                name="Salted Farm Butter 454g", batch_number="BATCH-DY-304", category="Dairy Products",
                quantity=140.0, unit="packs", storage_location="Dairy Walk-in Chiller",
                manufacture_date=now - timedelta(days=5), expiry_date=now + timedelta(days=60),
                status="Fresh", packaging_type="Foil Wrap", current_temperature=2.8,
                current_humidity=70.0, air_circulation="Medium", light_exposure="Dark", freshness_score=99.0
            ),
            models.FoodItem(
                name="Organic Heavy Whipping Cream", batch_number="BATCH-DY-305", category="Dairy Products",
                quantity=65.0, unit="bottles", storage_location="Dairy Walk-in Chiller",
                manufacture_date=now - timedelta(days=6), expiry_date=now + timedelta(days=2),
                status="Approaching Expiry", packaging_type="PET Bottle", current_temperature=3.1,
                current_humidity=74.0, air_circulation="Medium", light_exposure="Dark", freshness_score=69.0
            ),
            models.FoodItem(
                name="Fresh Mozzarella Balls", batch_number="BATCH-DY-306", category="Dairy Products",
                quantity=40.0, unit="tubs", storage_location="Dairy Walk-in Chiller",
                manufacture_date=now - timedelta(days=5), expiry_date=now + timedelta(days=2, hours=12),
                status="Approaching Expiry", packaging_type="Brine Tub", current_temperature=3.5,
                current_humidity=75.0, air_circulation="Medium", light_exposure="Dark", freshness_score=75.0
            ),

            # ── MEAT & POULTRY (6 batches) ──
            models.FoodItem(
                name="Boneless Chicken Breasts", batch_number="BATCH-MT-401", category="Meat & Poultry",
                quantity=85.0, unit="kg", storage_location="Meat Cooler Bay 1",
                manufacture_date=now - timedelta(days=1), expiry_date=now + timedelta(days=4),
                status="Fresh", packaging_type="MAP Tray", current_temperature=1.0,
                current_humidity=82.0, air_circulation="Medium", light_exposure="Dark", freshness_score=93.0
            ),
            models.FoodItem(
                name="Ground Beef Chuck 80/20", batch_number="BATCH-MT-402", category="Meat & Poultry",
                quantity=120.0, unit="kg", storage_location="Meat Cooler Bay 2",
                manufacture_date=now - timedelta(days=2), expiry_date=now + timedelta(days=3),
                status="Approaching Expiry", packaging_type="Vacuum Skin", current_temperature=0.8,
                current_humidity=84.0, air_circulation="Medium", light_exposure="Dark", freshness_score=78.0
            ),
            models.FoodItem(
                name="Center-Cut Pork Chops", batch_number="BATCH-MT-403", category="Meat & Poultry",
                quantity=60.0, unit="kg", storage_location="Meat Cooler Bay 1",
                manufacture_date=now - timedelta(days=1), expiry_date=now + timedelta(days=5),
                status="Fresh", packaging_type="Foam Tray + Film", current_temperature=1.2,
                current_humidity=80.0, air_circulation="Medium", light_exposure="Dark", freshness_score=91.0
            ),
            models.FoodItem(
                name="USDA Prime Ribeye Steaks", batch_number="BATCH-MT-404", category="Meat & Poultry",
                quantity=45.0, unit="kg", storage_location="Meat Cooler Bay 2",
                manufacture_date=now - timedelta(days=1), expiry_date=now + timedelta(days=6),
                status="Fresh", packaging_type="Vacuum Pouch", current_temperature=0.9,
                current_humidity=82.0, air_circulation="Medium", light_exposure="Dark", freshness_score=95.0
            ),
            models.FoodItem(
                name="Turkey Breast Cutlets", batch_number="BATCH-MT-405", category="Meat & Poultry",
                quantity=50.0, unit="kg", storage_location="Meat Cooler Bay 1",
                manufacture_date=now - timedelta(days=3), expiry_date=now + timedelta(days=1),
                status="Approaching Expiry", packaging_type="MAP Tray", current_temperature=1.1,
                current_humidity=83.0, air_circulation="Medium", light_exposure="Dark", freshness_score=64.0
            ),
            models.FoodItem(
                name="Smoked Bacon Rashers", batch_number="BATCH-MT-406", category="Meat & Poultry",
                quantity=75.0, unit="packs", storage_location="Meat Cooler Bay 2",
                manufacture_date=now - timedelta(days=5), expiry_date=now + timedelta(days=20),
                status="Fresh", packaging_type="Vacuum Sealed Film", current_temperature=1.5,
                current_humidity=80.0, air_circulation="Medium", light_exposure="Dark", freshness_score=96.0
            ),

            # ── SEAFOOD (5 batches) ──
            models.FoodItem(
                name="Fresh Atlantic Salmon Fillet", batch_number="BATCH-SF-501", category="Seafood",
                quantity=45.0, unit="kg", storage_location="Fresh Fish Iced Bay",
                manufacture_date=now - timedelta(days=1), expiry_date=now + timedelta(days=3),
                status="Fresh", packaging_type="Waxed Box on Ice", current_temperature=0.4,
                current_humidity=94.0, air_circulation="Low", light_exposure="Dark", freshness_score=91.0
            ),
            models.FoodItem(
                name="Wild Caught Jumbo Prawns", batch_number="BATCH-SF-502", category="Seafood",
                quantity=60.0, unit="kg", storage_location="Seafood Deep Freeze",
                manufacture_date=now - timedelta(days=10), expiry_date=now + timedelta(days=90),
                status="Fresh", packaging_type="Frozen Block Box", current_temperature=-18.5,
                current_humidity=85.0, air_circulation="High", light_exposure="Dark", freshness_score=98.0
            ),
            models.FoodItem(
                name="Pacific Cod Fillets", batch_number="BATCH-SF-503", category="Seafood",
                quantity=35.0, unit="kg", storage_location="Fresh Fish Iced Bay",
                manufacture_date=now - timedelta(days=2), expiry_date=now + timedelta(days=2),
                status="Approaching Expiry", packaging_type="Iced Tray", current_temperature=0.5,
                current_humidity=95.0, air_circulation="Low", light_exposure="Dark", freshness_score=75.0
            ),
            models.FoodItem(
                name="Cooked Snow Crab Legs", batch_number="BATCH-SF-504", category="Seafood",
                quantity=30.0, unit="kg", storage_location="Seafood Deep Freeze",
                manufacture_date=now - timedelta(days=8), expiry_date=now + timedelta(days=60),
                status="Fresh", packaging_type="Frozen Poly Bag", current_temperature=-19.0,
                current_humidity=85.0, air_circulation="High", light_exposure="Dark", freshness_score=96.0
            ),
            models.FoodItem(
                name="Bluefin Tuna Steaks", batch_number="BATCH-SF-505", category="Seafood",
                quantity=20.0, unit="kg", storage_location="Fresh Fish Iced Bay",
                manufacture_date=now - timedelta(days=6), expiry_date=now - timedelta(days=1),
                status="Expired", packaging_type="Vacuum Pack", current_temperature=0.6,
                current_humidity=92.0, air_circulation="Low", light_exposure="Dark", freshness_score=20.0
            ),

            # ── BAKERY PRODUCTS (5 batches) ──
            models.FoodItem(
                name="Artisanal Sourdough Bread", batch_number="BATCH-BK-601", category="Bakery Products",
                quantity=50.0, unit="units", storage_location="Bakery Display Area",
                manufacture_date=now - timedelta(days=1), expiry_date=now + timedelta(days=4),
                status="Fresh", packaging_type="Perforated Paper Bag", current_temperature=20.0,
                current_humidity=54.0, air_circulation="Medium", light_exposure="Ambient", freshness_score=92.0
            ),
            models.FoodItem(
                name="Brioche Burger Buns 6pk", batch_number="BATCH-BK-602", category="Bakery Products",
                quantity=80.0, unit="packs", storage_location="Bakery Staging Rack",
                manufacture_date=now - timedelta(days=2), expiry_date=now + timedelta(days=2),
                status="Approaching Expiry", packaging_type="Poly Bag with Twist Tie", current_temperature=19.5,
                current_humidity=52.0, air_circulation="Medium", light_exposure="Ambient", freshness_score=71.0
            ),
            models.FoodItem(
                name="All-Butter Croissants 4pk", batch_number="BATCH-BK-603", category="Bakery Products",
                quantity=65.0, unit="packs", storage_location="Bakery Display Area",
                manufacture_date=now - timedelta(days=1), expiry_date=now + timedelta(days=3),
                status="Fresh", packaging_type="Plastic Clamshell", current_temperature=20.2,
                current_humidity=53.0, air_circulation="Medium", light_exposure="Ambient", freshness_score=89.0
            ),
            models.FoodItem(
                name="Multigrain Seed Loaf", batch_number="BATCH-BK-604", category="Bakery Products",
                quantity=90.0, unit="loaves", storage_location="Bakery Staging Rack",
                manufacture_date=now - timedelta(days=1), expiry_date=now + timedelta(days=5),
                status="Fresh", packaging_type="Waxed Paper Wrap", current_temperature=19.2,
                current_humidity=50.0, air_circulation="Medium", light_exposure="Ambient", freshness_score=94.0
            ),
            models.FoodItem(
                name="Glazed Cinnamon Rolls 4pk", batch_number="BATCH-BK-605", category="Bakery Products",
                quantity=35.0, unit="packs", storage_location="Bakery Display Area",
                manufacture_date=now - timedelta(days=3), expiry_date=now + timedelta(days=2, hours=18),
                status="Approaching Expiry", packaging_type="Sealed Carton", current_temperature=20.5,
                current_humidity=55.0, air_circulation="Medium", light_exposure="Ambient", freshness_score=72.0
            ),

            # ── PACKAGED FOODS (6 batches) ──
            models.FoodItem(
                name="Extra Virgin Olive Oil 1L", batch_number="BATCH-PK-701", category="Packaged Foods",
                quantity=180.0, unit="bottles", storage_location="Dry Grocery Aisle 3",
                manufacture_date=now - timedelta(days=30), expiry_date=now + timedelta(days=210),
                status="Fresh", packaging_type="Dark Glass Bottle", current_temperature=21.0,
                current_humidity=45.0, air_circulation="Low", light_exposure="Dark", freshness_score=98.0
            ),
            models.FoodItem(
                name="Jasmine White Rice 5kg", batch_number="BATCH-PK-702", category="Packaged Foods",
                quantity=95.0, unit="bags", storage_location="Dry Bulk Stacking",
                manufacture_date=now - timedelta(days=20), expiry_date=now + timedelta(days=365),
                status="Fresh", packaging_type="Woven Poly Bag", current_temperature=21.5,
                current_humidity=40.0, air_circulation="Low", light_exposure="Ambient", freshness_score=99.0
            ),
            models.FoodItem(
                name="Organic Crushed Tomatoes 800g", batch_number="BATCH-PK-703", category="Packaged Foods",
                quantity=240.0, unit="cans", storage_location="Dry Grocery Aisle 2",
                manufacture_date=now - timedelta(days=40), expiry_date=now + timedelta(days=450),
                status="Fresh", packaging_type="Steel Can", current_temperature=20.5,
                current_humidity=45.0, air_circulation="Low", light_exposure="Dark", freshness_score=99.0
            ),
            models.FoodItem(
                name="Bronze-Cut Spaghetti 500g", batch_number="BATCH-PK-704", category="Packaged Foods",
                quantity=200.0, unit="boxes", storage_location="Dry Grocery Aisle 1",
                manufacture_date=now - timedelta(days=25), expiry_date=now + timedelta(days=300),
                status="Fresh", packaging_type="Recycled Cardboard", current_temperature=21.0,
                current_humidity=44.0, air_circulation="Low", light_exposure="Ambient", freshness_score=98.0
            ),
            models.FoodItem(
                name="Creamy Peanut Butter 500g", batch_number="BATCH-PK-705", category="Packaged Foods",
                quantity=120.0, unit="jars", storage_location="Dry Grocery Aisle 3",
                manufacture_date=now - timedelta(days=15), expiry_date=now + timedelta(days=180),
                status="Fresh", packaging_type="Glass Jar with Induction Seal", current_temperature=21.2,
                current_humidity=42.0, air_circulation="Low", light_exposure="Dark", freshness_score=97.0
            ),
            models.FoodItem(
                name="Organic Rolled Oats 1kg", batch_number="BATCH-PK-706", category="Packaged Foods",
                quantity=140.0, unit="canisters", storage_location="Dry Bulk Stacking",
                manufacture_date=now - timedelta(days=18), expiry_date=now + timedelta(days=240),
                status="Fresh", packaging_type="Composite Canister", current_temperature=20.8,
                current_humidity=42.0, air_circulation="Low", light_exposure="Ambient", freshness_score=98.0
            ),

            # ── BEVERAGES (5 batches) ──
            models.FoodItem(
                name="Sparkling Spring Water 750ml", batch_number="BATCH-BV-801", category="Beverages",
                quantity=260.0, unit="bottles", storage_location="Beverage Staging Area",
                manufacture_date=now - timedelta(days=10), expiry_date=now + timedelta(days=120),
                status="Fresh", packaging_type="Glass Bottle", current_temperature=18.0,
                current_humidity=50.0, air_circulation="Low", light_exposure="Ambient", freshness_score=99.0
            ),
            models.FoodItem(
                name="Cold-Pressed Pure Orange Juice", batch_number="BATCH-BV-802", category="Beverages",
                quantity=85.0, unit="bottles", storage_location="Refrigerated Drink Chiller",
                manufacture_date=now - timedelta(days=2), expiry_date=now + timedelta(days=8),
                status="Fresh", packaging_type="PET Bottle", current_temperature=3.5,
                current_humidity=70.0, air_circulation="Medium", light_exposure="Dark", freshness_score=94.0
            ),
            models.FoodItem(
                name="Organic Matcha Green Tea 12pk", batch_number="BATCH-BV-803", category="Beverages",
                quantity=110.0, unit="boxes", storage_location="Dry Grocery Aisle 4",
                manufacture_date=now - timedelta(days=20), expiry_date=now + timedelta(days=150),
                status="Fresh", packaging_type="Foil Sachet in Box", current_temperature=21.0,
                current_humidity=45.0, air_circulation="Low", light_exposure="Ambient", freshness_score=97.0
            ),
            models.FoodItem(
                name="Barista Oat Milk 1L", batch_number="BATCH-BV-804", category="Beverages",
                quantity=150.0, unit="cartons", storage_location="Beverage Staging Area",
                manufacture_date=now - timedelta(days=8), expiry_date=now + timedelta(days=65),
                status="Fresh", packaging_type="Aseptic Tetra Pak", current_temperature=18.2,
                current_humidity=50.0, air_circulation="Low", light_exposure="Dark", freshness_score=98.0
            ),
            models.FoodItem(
                name="100% Coconut Water 500ml", batch_number="BATCH-BV-805", category="Beverages",
                quantity=190.0, unit="cartons", storage_location="Refrigerated Drink Chiller",
                manufacture_date=now - timedelta(days=5), expiry_date=now + timedelta(days=40),
                status="Fresh", packaging_type="Tetra Prisma", current_temperature=3.8,
                current_humidity=72.0, air_circulation="Medium", light_exposure="Dark", freshness_score=96.0
            ),
        ]

        db.add_all(REAL_ITEMS)
        db.commit()
        print(f"Successfully seeded {len(REAL_ITEMS)} real inventory items across all 8 commercial categories!")
    finally:
        db.close()

if __name__ == "__main__":
    seed_real_commercial_inventory()
