from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

FOOD_CATEGORIES = [
    "Fruits",
    "Vegetables",
    "Dairy Products",
    "Meat & Poultry",
    "Seafood",
    "Bakery Products",
    "Packaged Foods",
    "Beverages"
]

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = Field(..., description="Role: Consumer, Retail Manager, Warehouse Operator, Food Quality Inspector, Administrator")

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    reset_code: str
    new_password: str = Field(..., min_length=6)

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

# Food Inventory Schemas
class FoodItemBase(BaseModel):
    name: str = Field(..., description="Food Item Name")
    batch_number: str = Field(..., description="Batch / Lot Identification Number")
    category: str = Field(..., description="Category from FOOD_CATEGORIES")
    quantity: float = Field(default=1.0, gt=0)
    unit: str = Field(default="units", description="units, kg, lbs, liters, packs")
    storage_location: str = Field(default="Cold Room A")
    expiry_date: datetime

class FoodItemCreate(FoodItemBase):
    pass

class FoodItemOut(FoodItemBase):
    id: int
    manufacture_date: datetime
    status: str
    created_by_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ================= IMAGE ANALYSIS ENGINE SCHEMAS =================
class ColorAnalysisMetrics(BaseModel):
    browning_index: float
    color_degradation_pct: float
    mean_lightness: float
    mean_saturation: float
    chromatic_shift: float
    dominant_hex: str

class TextureAnalysisMetrics(BaseModel):
    texture_degradation_pct: float
    roughness_index: float
    shrivel_index: float
    entropy: float
    laplacian_variance: Optional[float] = None

class MoldDetectionMetrics(BaseModel):
    mold_detected: bool
    colony_count: int
    infected_area_pct: float
    mold_severity_pct: float

class BruiseDetectionMetrics(BaseModel):
    bruise_detected: bool
    bruise_severity_pct: float
    affected_tissue_pct: float
    bruise_patches_count: int

class DamageDetectionMetrics(BaseModel):
    damage_detected: bool
    damage_severity_pct: float
    structural_cuts_count: int

class FeatureBreakdown(BaseModel):
    color_analysis: ColorAnalysisMetrics
    texture_analysis: TextureAnalysisMetrics
    mold_detection: MoldDetectionMetrics
    bruise_detection: BruiseDetectionMetrics
    physical_damage_detection: DamageDetectionMetrics

class TrendProjectionPoint(BaseModel):
    day: str
    day_number: int
    cold_storage_score: float
    ambient_storage_score: float

class VisualOverlays(BaseModel):
    original_image_base64: str
    diagnostic_overlay_base64: str

class ImageAnalysisResponse(BaseModel):
    id: Optional[int] = None
    image_filename: str
    food_category: str
    detected_food_name: str
    dataset_reference: str
    freshness_score: float
    freshness_category: str
    quality_grade: str
    spoilage_probability: float
    estimated_shelf_life_days: float
    recommendation: str
    trend_projection: List[TrendProjectionPoint]
    features: FeatureBreakdown
    visual_overlays: VisualOverlays
    mongo_telemetry_id: Optional[str] = None
    created_at: Optional[datetime] = None

class ImageAnalysisRecordOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    food_item_id: Optional[int] = None
    image_name: str
    food_category: str
    detected_food_name: str
    freshness_score: float
    freshness_category: str
    quality_grade: str
    spoilage_probability: float
    color_degradation_pct: float
    texture_degradation_pct: float
    mold_severity_pct: float
    bruise_severity_pct: float
    damage_severity_pct: float
    estimated_shelf_life_days: float
    recommendation: str
    dataset_source: str
    mongo_telemetry_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class BenchmarkPreset(BaseModel):
    id: str
    name: str
    category: str
    dataset_reference: str
    dataset_purpose: str
    expected_category: str
    sample_color: str
    description: str

class SyncWithInventoryRequest(BaseModel):
    food_item_id: int
    freshness_score: float
    freshness_category: str
    estimated_shelf_life_days: float
    notes: Optional[str] = None


# =================== SHELF LIFE PREDICTION SCHEMAS ===================
class ShelfLifePredictionRequest(BaseModel):
    # 1. Product Type
    food_category: str = Field(default="Fruits", description="Product Type / Food category")
    # 2. Storage Temperature
    current_temp_c: float = Field(default=4.0, description="Storage temperature in Celsius")
    # 3. Humidity
    current_humidity_pct: float = Field(default=85.0, ge=0, le=100, description="Humidity % RH")
    # 4. Packaging Type
    packaging_type: str = Field(default="Cardboard Box", description="Packaging type used")
    # 5. Storage Duration
    storage_duration_days: float = Field(default=0.0, ge=0, description="Storage duration already elapsed in days")
    # 6. Food Images (represented by visual freshness score extracted from CV inspection)
    visual_freshness_score: Optional[float] = Field(default=None, ge=0, le=100, description="Visual freshness score from food image analysis")
    food_item_id: Optional[int] = Field(default=None, description="Optional link to inventory item")
    # Optional legacy fields for backward compatibility
    air_circulation: Optional[str] = Field(default=None)
    light_exposure: Optional[str] = Field(default=None)


# =================== STORAGE MONITORING SCHEMAS ===================
class StorageComplianceRequest(BaseModel):
    food_category: str = Field(default="Fruits")
    temp_c: float = Field(default=4.0)
    humidity_pct: float = Field(default=85.0, ge=0, le=100)
    air_circulation: str = Field(default="Medium")
    light_exposure: str = Field(default="Dark")
    storage_duration_hours: float = Field(default=0.0, ge=0)
    zone_name: Optional[str] = Field(default=None)


# =================== FRESHNESS SCORING SCHEMAS ===================
class FreshnessScoringRequest(BaseModel):
    food_category: str = Field(default="Fruits")
    food_item_id: Optional[int] = Field(default=None)
    item_name: Optional[str] = Field(default="")
    # Visual inputs
    visual_freshness_score: Optional[float] = Field(default=None, ge=0, le=100)
    color_degradation_pct: float = Field(default=0.0, ge=0, le=100)
    texture_degradation_pct: float = Field(default=0.0, ge=0, le=100)
    mold_severity_pct: float = Field(default=0.0, ge=0, le=100)
    bruise_severity_pct: float = Field(default=0.0, ge=0, le=100)
    damage_severity_pct: float = Field(default=0.0, ge=0, le=100)
    # Storage inputs
    current_temp_c: float = Field(default=4.0)
    current_humidity_pct: float = Field(default=85.0, ge=0, le=100)
    air_circulation: str = Field(default="Medium")
    light_exposure: str = Field(default="Dark")
    # Shelf life inputs
    remaining_shelf_life_days: float = Field(default=7.0, ge=0)
    total_shelf_life_days: float = Field(default=14.0, ge=0)
    # Age inputs
    manufacture_date: Optional[datetime] = Field(default=None)
    expiry_date: Optional[datetime] = Field(default=None)


# =================== RECOMMENDATION ENGINE SCHEMAS ===================
class RecommendationRequest(BaseModel):
    food_category: str = Field(default="Fruits")
    item_name: str = Field(default="")
    food_item_id: Optional[int] = Field(default=None)
    freshness_score: float = Field(default=75.0, ge=0, le=100)
    storage_score: float = Field(default=80.0, ge=0, le=100)
    shelf_life_score: float = Field(default=70.0, ge=0, le=100)
    age_score: float = Field(default=75.0, ge=0, le=100)
    remaining_days: float = Field(default=7.0, ge=0)
    risk_level: str = Field(default="Low Risk")
    current_temp_c: float = Field(default=4.0)
    optimal_temp_c: float = Field(default=4.0)
    current_humidity_pct: float = Field(default=85.0, ge=0, le=100)
    optimal_humidity_pct: float = Field(default=90.0, ge=0, le=100)
    packaging_type: str = Field(default="Cardboard Box")
    storage_location: str = Field(default="Cold Room A")


# =================== FOOD ITEM PATCH (Update storage fields) ===================
class FoodItemPatch(BaseModel):
    packaging_type: Optional[str] = None
    current_temperature: Optional[float] = None
    current_humidity: Optional[float] = None
    air_circulation: Optional[str] = None
    light_exposure: Optional[str] = None


# =================== NOTIFICATION SCHEMAS ===================
class NotificationResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    title: str
    message: str
    alert_type: str
    severity: str
    item_id: Optional[int] = None
    zone_name: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationCreateRequest(BaseModel):
    title: str
    message: str
    alert_type: str = "freshness" # freshness, shelf_life, spoilage, storage, inventory, platform
    severity: str = "info" # info, warning, critical
    user_id: Optional[int] = None
    item_id: Optional[int] = None
    zone_name: Optional[str] = None


class StorageRoomCreate(BaseModel):
    zone_name: str
    categories: List[str] = ["Fruits"]
    design_temp_c: float = 4.0
    design_humidity_pct: float = 85.0
    design_air: str = "Medium"
    design_light: str = "Dark"
    current_duration_hours: float = 24.0
    zone_type: str = "Storage Area"
    icon: Optional[str] = None
