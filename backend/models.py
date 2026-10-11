from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text
from database import Base

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="Consumer") # Roles: Consumer, Retail Manager, Warehouse Operator, Food Quality Inspector, Administrator
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)

class FoodItem(Base):
    __tablename__ = "food_inventory"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    batch_number = Column(String(50), index=True, nullable=False)
    category = Column(String(50), nullable=False) # Categories: Fruits, Vegetables, Dairy Products, Meat & Poultry, Seafood, Bakery Products, Packaged Foods, Beverages
    quantity = Column(Float, nullable=False, default=1.0)
    unit = Column(String(20), nullable=False, default="units") # units, kg, lbs, liters, packs
    storage_location = Column(String(100), nullable=False, default="Cold Room A")
    manufacture_date = Column(DateTime, default=utc_now)
    expiry_date = Column(DateTime, nullable=False)
    status = Column(String(50), default="Fresh") # Fresh, Approaching Expiry, Expired
    # Extended storage & freshness fields (Milestone 2)
    packaging_type = Column(String(50), nullable=True, default="Cardboard Box")
    current_temperature = Column(Float, nullable=True, default=4.0)
    current_humidity = Column(Float, nullable=True, default=85.0)
    air_circulation = Column(String(50), nullable=True, default="Medium")
    light_exposure = Column(String(50), nullable=True, default="Dark")
    freshness_score = Column(Float, nullable=True, default=None)
    shelf_life_days_remaining = Column(Float, nullable=True, default=None)
    created_by_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=utc_now)

class ImageAnalysisRecord(Base):
    __tablename__ = "food_image_analysis_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    food_item_id = Column(Integer, nullable=True, index=True) # Linked inventory item if any
    image_name = Column(String(255), nullable=False, default="inspection_image.jpg")
    food_category = Column(String(100), nullable=False, default="Fruits")
    detected_food_name = Column(String(150), nullable=False, default="Fresh Produce")
    freshness_score = Column(Float, nullable=False, default=100.0) # 0 to 100
    freshness_category = Column(String(50), nullable=False, default="Fresh") # Fresh, Good, Acceptable, Near Spoilage, Spoiled
    quality_grade = Column(String(20), nullable=False, default="Grade A") # Grade A, Grade B, Grade C, Grade D, Grade F
    spoilage_probability = Column(Float, nullable=False, default=0.0) # 0 to 100%
    color_degradation_pct = Column(Float, nullable=False, default=0.0) # 0 to 100%
    texture_degradation_pct = Column(Float, nullable=False, default=0.0) # 0 to 100%
    mold_severity_pct = Column(Float, nullable=False, default=0.0) # 0 to 100%
    bruise_severity_pct = Column(Float, nullable=False, default=0.0) # 0 to 100%
    damage_severity_pct = Column(Float, nullable=False, default=0.0) # 0 to 100%
    estimated_shelf_life_days = Column(Float, nullable=False, default=7.0)
    recommendation = Column(String(255), nullable=False, default="Optimal quality. Safe for retail distribution.")
    dataset_source = Column(String(100), nullable=False, default="Live Camera / Custom Upload")
    mongo_telemetry_id = Column(String(100), nullable=True) # Secondary MongoDB document link
    created_at = Column(DateTime, default=utc_now)


class StorageLogRecord(Base):
    """
    Periodic environmental telemetry snapshots for warehouse storage zones.
    Records compliance status and deviations from USDA/FDA standards.
    """
    __tablename__ = "storage_logs"

    id = Column(Integer, primary_key=True, index=True)
    zone_name = Column(String(100), nullable=False, index=True)
    food_category = Column(String(50), nullable=True)
    temperature_c = Column(Float, nullable=False)
    humidity_pct = Column(Float, nullable=False)
    air_circulation = Column(String(50), nullable=False, default="Medium")
    light_exposure = Column(String(50), nullable=False, default="Dark")
    storage_duration_hours = Column(Float, nullable=False, default=0.0)
    compliance_status = Column(String(50), nullable=False, default="Compliant")
    violation_count = Column(Integer, nullable=False, default=0)
    recorded_by_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=utc_now)


class RecommendationRecord(Base):
    """
    Logs generated recommendations and freshness scores for each inventory item.
    """
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    food_item_id = Column(Integer, nullable=True, index=True)
    food_category = Column(String(50), nullable=False)
    item_name = Column(String(150), nullable=False)
    overall_freshness_score = Column(Float, nullable=False, default=0.0)
    visual_score = Column(Float, nullable=False, default=70.0)
    storage_score = Column(Float, nullable=False, default=70.0)
    shelf_life_score = Column(Float, nullable=False, default=70.0)
    age_score = Column(Float, nullable=False, default=70.0)
    quality_grade = Column(String(50), nullable=False, default="Grade B - Good Standard")
    remaining_shelf_life_days = Column(Float, nullable=False, default=7.0)
    risk_level = Column(String(50), nullable=False, default="Low Risk")
    primary_recommendation = Column(String(500), nullable=False, default="")
    generated_by_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=utc_now)


class NotificationRecord(Base):
    """
    Alerts and system notifications spanning freshness drops, shelf-life expiry,
    spoilage detections, storage excursions, inventory risk, and platform announcements.
    """
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True) # None = broadcast to all users
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    alert_type = Column(String(50), nullable=False, default="freshness") 
    # Alert types: freshness, shelf_life, spoilage, storage, inventory, platform
    severity = Column(String(20), nullable=False, default="info") 
    # Severities: info, warning, critical
    item_id = Column(Integer, nullable=True)
    zone_name = Column(String(100), nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utc_now)
