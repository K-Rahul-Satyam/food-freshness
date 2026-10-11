"""
Recommendation Engine & Freshness Scoring Engine
=================================================
Implements the 5-tier Recommendation Engine and Weighted Freshness Scoring Model:

Freshness Score = 40% Visual Condition Analysis
               + 25% Storage Conditions
               + 20% Shelf-Life Prediction
               + 15% Product Age

Recommendation Tiers:
  1. Storage Recommendations
  2. Consumption Recommendations
  3. Inventory Rotation Suggestions (FEFO/FIFO)
  4. Waste Reduction Recommendations
  5. Quality Improvement Suggestions

Also computes:
  - Freshness confidence scoring
  - Shelf-life scoring
  - Storage condition scoring
  - Overall food health score
  - Inventory insights: KPIs, rotation matrix, economic waste value at risk

Technologies: NumPy, Pandas, Python standard library
"""

import math
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional


# ─────────────────────────────────────────────────────────────────────────────
# FRESHNESS SCORING ENGINE (Weighted Model)
# ─────────────────────────────────────────────────────────────────────────────
WEIGHT_VISUAL = 0.40
WEIGHT_STORAGE = 0.25
WEIGHT_SHELF_LIFE = 0.20
WEIGHT_AGE = 0.15


def compute_visual_condition_score(
    freshness_score: Optional[float] = None,
    color_degradation_pct: float = 0.0,
    texture_degradation_pct: float = 0.0,
    mold_severity_pct: float = 0.0,
    bruise_severity_pct: float = 0.0,
    damage_severity_pct: float = 0.0,
) -> float:
    """
    Computes the Visual Condition Score (0-100).
    Uses image analysis outputs; falls back to degradation metrics if score missing.
    """
    if freshness_score is not None:
        base = freshness_score
    else:
        # Composite from individual degradation metrics
        defect_penalty = (
            color_degradation_pct * 0.30
            + texture_degradation_pct * 0.20
            + mold_severity_pct * 0.30
            + bruise_severity_pct * 0.10
            + damage_severity_pct * 0.10
        )
        base = max(0.0, 100.0 - defect_penalty)
    return round(min(100.0, max(0.0, base)), 2)


def compute_storage_condition_score(
    temp_c: float,
    optimal_temp_c: float,
    humidity_pct: float,
    optimal_humidity_pct: float,
    humidity_tolerance: float,
    air_circulation: str = "Medium",
    light_exposure: str = "Dark",
    is_light_sensitive: bool = False,
) -> float:
    """
    Computes the Storage Condition Score (0-100).
    Penalizes deviations from optimal temperature and humidity.
    """
    score = 100.0

    # Temperature penalty (Gaussian decay)
    temp_diff = abs(temp_c - optimal_temp_c)
    temp_penalty = min(60.0, 60.0 * (1.0 - math.exp(-0.15 * temp_diff ** 1.3)))
    score -= temp_penalty

    # Humidity penalty
    hum_diff = max(0, abs(humidity_pct - optimal_humidity_pct) - humidity_tolerance)
    hum_penalty = min(30.0, 30.0 * (1.0 - math.exp(-0.1 * hum_diff)))
    score -= hum_penalty

    # Air circulation penalty
    if air_circulation == "None / Stagnant":
        score -= 10.0

    # Light penalty
    if is_light_sensitive and light_exposure in ["Direct Sunlight", "Fluorescent"]:
        score -= 8.0

    return round(max(0.0, min(100.0, score)), 2)


def compute_shelf_life_score(
    remaining_days: float,
    total_shelf_life_days: float,
) -> float:
    """
    Computes the Shelf-Life Score (0-100).
    Proportional to fraction of shelf life remaining.
    """
    if total_shelf_life_days <= 0:
        return 0.0
    fraction_remaining = max(0.0, min(1.0, remaining_days / total_shelf_life_days))
    # Sigmoid-shaped: penalizes heavily once < 30% of shelf life remains
    score = 100.0 * (1.0 / (1.0 + math.exp(-10 * (fraction_remaining - 0.3))))
    return round(score, 2)


def compute_product_age_score(
    manufacture_date: Optional[datetime],
    expiry_date: Optional[datetime],
) -> float:
    """
    Computes the Product Age Score (0-100).
    Based on ratio of total life consumed.
    """
    if manufacture_date is None or expiry_date is None:
        return 70.0  # Default neutral score when dates unavailable

    now = datetime.now(timezone.utc)
    # Normalize datetime to UTC naive for comparison
    def utc_naive(dt: datetime) -> datetime:
        if dt.tzinfo is not None:
            return dt.replace(tzinfo=None)
        return dt

    now_naive = now.replace(tzinfo=None)
    mfg = utc_naive(manufacture_date)
    exp = utc_naive(expiry_date)

    total_life = (exp - mfg).total_seconds()
    if total_life <= 0:
        return 0.0

    elapsed = (now_naive - mfg).total_seconds()
    fraction_consumed = max(0.0, min(1.0, elapsed / total_life))
    score = max(0.0, 100.0 * (1.0 - fraction_consumed))
    return round(score, 2)


def calculate_weighted_freshness_score(
    visual_score: float,
    storage_score: float,
    shelf_life_score: float,
    age_score: float,
) -> Dict[str, Any]:
    """
    Applies the Weighted Freshness Scoring Model:
    Freshness Score = 40% Visual + 25% Storage + 20% Shelf-Life + 15% Age
    """
    weighted_score = (
        WEIGHT_VISUAL * visual_score
        + WEIGHT_STORAGE * storage_score
        + WEIGHT_SHELF_LIFE * shelf_life_score
        + WEIGHT_AGE * age_score
    )
    weighted_score = round(min(100.0, max(0.0, weighted_score)), 2)

    # Quality grade
    if weighted_score >= 85:
        grade = "Grade A - Premium"
        grade_color = "#22C55E"
    elif weighted_score >= 70:
        grade = "Grade B - Good Standard"
        grade_color = "#84CC16"
    elif weighted_score >= 55:
        grade = "Grade C - Acceptable"
        grade_color = "#EAB308"
    elif weighted_score >= 35:
        grade = "Grade D - Substandard"
        grade_color = "#F97316"
    else:
        grade = "Grade F - Reject"
        grade_color = "#EF4444"

    # Confidence scoring (how many sub-scores are reliable)
    component_scores = [visual_score, storage_score, shelf_life_score, age_score]
    confidence = round(90.0 - 10.0 * sum(1 for s in component_scores if s == 70.0), 1)

    return {
        "overall_freshness_score": weighted_score,
        "quality_grade": grade,
        "grade_color": grade_color,
        "freshness_confidence_pct": max(60.0, confidence),
        "score_breakdown": {
            "visual_condition": {
                "score": visual_score,
                "weight_pct": int(WEIGHT_VISUAL * 100),
                "weighted_contribution": round(WEIGHT_VISUAL * visual_score, 2),
            },
            "storage_conditions": {
                "score": storage_score,
                "weight_pct": int(WEIGHT_STORAGE * 100),
                "weighted_contribution": round(WEIGHT_STORAGE * storage_score, 2),
            },
            "shelf_life": {
                "score": shelf_life_score,
                "weight_pct": int(WEIGHT_SHELF_LIFE * 100),
                "weighted_contribution": round(WEIGHT_SHELF_LIFE * shelf_life_score, 2),
            },
            "product_age": {
                "score": age_score,
                "weight_pct": int(WEIGHT_AGE * 100),
                "weighted_contribution": round(WEIGHT_AGE * age_score, 2),
            },
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# RECOMMENDATION ENGINE — 5-TIER RECOMMENDATION GENERATION
# ─────────────────────────────────────────────────────────────────────────────
# PRODUCT-SPECIFIC KNOWLEDGE BASE — SIMPLE, USER-FRIENDLY DIRECTIVES
# ─────────────────────────────────────────────────────────────────────────────
PRODUCT_INSIGHTS = {
    "apple": {
        "storage": [
            {
                "icon": "❄️",
                "title": "Keep in fridge (1°C – 3°C)",
                "description": "Apples stay crisp and juicy much longer when kept cold.",
            },
            {
                "icon": "🌿",
                "title": "Keep away from leafy greens",
                "description": "Apples emit ripening gas that makes nearby spinach and lettuce rot faster.",
            }
        ],
        "consumption": [
            {
                "icon": "🍎",
                "title": "Best eaten within 5 days",
                "description": "Eat or sell now for the best crunch and sweet flavor.",
            },
            {
                "icon": "🥧",
                "title": "Soft apples? Bake or juice them",
                "description": "Softer apples are still delicious for baking, pies, or making fresh cider.",
            }
        ],
        "waste": [
            {
                "icon": "🏷️",
                "title": "Apply a 20% discount if unsold in 48 hours",
                "description": "Quick discount to sell out remaining stock with zero waste.",
            }
        ],
        "quality": [
            {
                "icon": "🚫",
                "title": "Do not wash until ready to eat",
                "description": "Water washes off the apple's protective natural coating and causes decay.",
            },
            {
                "icon": "📦",
                "title": "Do not stack crates too high",
                "description": "Heavy stacking creates soft brown bruises on bottom apples.",
            }
        ]
    },
    "spinach": {
        "storage": [
            {
                "icon": "❄️",
                "title": "Store in the cold vegetable drawer (1°C – 3°C)",
                "description": "Spinach stays fresh and green when kept cold.",
            },
            {
                "icon": "🧻",
                "title": "Put a dry paper towel inside the pack",
                "description": "Soaks up extra moisture to keep leaves dry and stop slimy rot.",
            }
        ],
        "consumption": [
            {
                "icon": "🥗",
                "title": "Eat fresh in salads within 4 days",
                "description": "Eat raw while leaves are stiff and green for the best vitamins.",
            },
            {
                "icon": "🍳",
                "title": "Wilting leaves? Cook into pasta or soup",
                "description": "Soft leaves that lost crispness are still great in curries, stir-fries, or smoothies.",
            }
        ],
        "waste": [
            {
                "icon": "🧊",
                "title": "Blanch in hot water for 2 mins and freeze",
                "description": "Easy way to save surplus spinach for months of cooking.",
            }
        ],
        "quality": [
            {
                "icon": "💧",
                "title": "Never wash before storing",
                "description": "Moisture makes leaves rot quickly. Wash only right before eating.",
            }
        ]
    },
    "yogurt": {
        "storage": [
            {
                "icon": "🥛",
                "title": "Keep on middle fridge shelf below 4°C",
                "description": "Store inside the fridge where it's coldest, not in the door rack.",
            },
            {
                "icon": "🔒",
                "title": "Snap lid tightly shut after every use",
                "description": "Stops air from drying out the top layer and prevents mold.",
            }
        ],
        "consumption": [
            {
                "icon": "🥄",
                "title": "Eat within 5–7 days after opening",
                "description": "Tastes creamiest and freshest during the first week.",
            },
            {
                "icon": "🍗",
                "title": "Use leftover yogurt for marinades or baking",
                "description": "Great for tenderizing chicken or baking soft cakes and muffins.",
            }
        ],
        "waste": [
            {
                "icon": "🥣",
                "title": "Blend leftover yogurt into fruit smoothies",
                "description": "Quick, healthy breakfast idea so no yogurt gets wasted.",
            }
        ],
        "quality": [
            {
                "icon": "🥄",
                "title": "Always use a clean, dry spoon",
                "description": "Never leave a metal spoon inside the tub — it separates the whey.",
            }
        ]
    },
    "chicken": {
        "storage": [
            {
                "icon": "❄️",
                "title": "Keep frozen at -18°C or bottom shelf (0°C – 2°C)",
                "description": "Keep extra cold to prevent harmful bacteria.",
            },
            {
                "icon": "🛡️",
                "title": "Always store on the bottom shelf",
                "description": "Ensures raw chicken juices never drip down onto other food items.",
            }
        ],
        "consumption": [
            {
                "icon": "🍳",
                "title": "Cook to 75°C (165°F) within 2 days",
                "description": "Cook fresh chicken within 48 hours or move it to the freezer.",
            },
            {
                "icon": "🚫",
                "title": "Never refreeze raw chicken once thawed",
                "description": "Refreezing ruins texture and increases bacterial risk.",
            }
        ],
        "waste": [
            {
                "icon": "🍗",
                "title": "Cook and shred for meals ahead",
                "description": "Pre-cooked chicken safely lasts 4 more days in the fridge.",
            }
        ],
        "quality": [
            {
                "icon": "🧊",
                "title": "Thaw slowly inside the fridge, not on the counter",
                "description": "Slow fridge thawing keeps meat juicy and tender.",
            }
        ]
    },
    "salmon": {
        "storage": [
            {
                "icon": "🐟",
                "title": "Store over ice at 0°C – 1°C or freeze at -18°C",
                "description": "Fresh fish spoils fast at normal temperatures; keep icy cold.",
            }
        ],
        "consumption": [
            {
                "icon": "🍽️",
                "title": "Cook or eat within 24–48 hours",
                "description": "Best cooked fresh within 2 days for rich, tender flavor.",
            },
            {
                "icon": "🥣",
                "title": "Flake leftovers into pasta or chowder",
                "description": "Cooked salmon makes great fish cakes, salad toppings, or soup.",
            }
        ],
        "waste": [
            {
                "icon": "❄️",
                "title": "Freeze in airtight bags for up to 3 months",
                "description": "Freeze immediately if not eating within 24 hours.",
            }
        ],
        "quality": [
            {
                "icon": "🧻",
                "title": "Pat dry with paper towels before chilling",
                "description": "Removes surface moisture to stop fishy odors.",
            }
        ]
    },
    "bread": {
        "storage": [
            {
                "icon": "🥖",
                "title": "Keep in a breadbox at room temp (never in the fridge!)",
                "description": "Cold fridge air crystallizes starch and turns bread stale 3x faster.",
            },
            {
                "icon": "🍞",
                "title": "Place cut side down on the cutting board",
                "description": "Keeps the soft inside from drying out without needing plastic bags.",
            }
        ],
        "consumption": [
            {
                "icon": "🥪",
                "title": "Eat within 3–4 days while crust is crunchy",
                "description": "Best enjoyed fresh, sliced, and toasted with butter.",
            },
            {
                "icon": "🥗",
                "title": "Make stale bread into croutons or French toast",
                "description": "Cube dry bread and toast with garlic herbs for crispy soup croutons.",
            }
        ],
        "waste": [
            {
                "icon": "❄️",
                "title": "Slice loaf and freeze in a ziplock bag",
                "description": "Toast slices directly from the freezer anytime for fresh hot bread.",
            }
        ],
        "quality": [
            {
                "icon": "🔥",
                "title": "Spritz with water and warm in oven for 5 minutes",
                "description": "Restores the warm, crispy, just-baked bakery crust instantly.",
            }
        ]
    },
    "olive oil": {
        "storage": [
            {
                "icon": "🫒",
                "title": "Keep in a dark cupboard away from the stove",
                "description": "Heat and sunlight make olive oil bitter and destroy its healthy nutrients.",
            },
            {
                "icon": "🔒",
                "title": "Tighten cap immediately after each use",
                "description": "Stops air from oxidizing the oil and preserves fresh grassy taste.",
            }
        ],
        "consumption": [
            {
                "icon": "🥗",
                "title": "Use generously within 6 months of opening",
                "description": "Olive oil is best fresh — enjoy over salads, pasta, and grilled foods.",
            }
        ],
        "waste": [
            {
                "icon": "🌿",
                "title": "Infuse older oil with herbs and garlic",
                "description": "Warm gently with rosemary or chili for a tasty bread-dipping oil.",
            }
        ],
        "quality": [
            {
                "icon": "🍾",
                "title": "Always keep in dark glass or metal bottles",
                "description": "Clear glass lets in light rays that spoil the oil quickly.",
            }
        ]
    },
    "water": {
        "storage": [
            {
                "icon": "💧",
                "title": "Store in a cool pantry away from cleaning supplies",
                "description": "Plastic bottles can absorb odors from nearby chemical detergents.",
            }
        ],
        "consumption": [
            {
                "icon": "🧊",
                "title": "Chill before serving for crisp bubbles",
                "description": "Cold sparkling water stays fizzy and refreshing longer.",
            }
        ],
        "waste": [
            {
                "icon": "♻️",
                "title": "Crush and recycle empty bottles",
                "description": "Collect and return empty plastic bottles for recycling.",
            }
        ],
        "quality": [
            {
                "icon": "🍾",
                "title": "Finish within 3 days of opening",
                "description": "Use a tight bottle stopper so carbonation doesn't go flat.",
            }
        ]
    }
}


def _match_product_key(name: str, category: str) -> Optional[str]:
    """Helper to match product keywords to tailored insights."""
    text = f"{name} {category}".lower()
    if "apple" in text:
        return "apple"
    if "spinach" in text or "lettuce" in text or "kale" in text or "green" in text:
        return "spinach"
    if "yogurt" in text or "curd" in text or "dairy" in text:
        return "yogurt"
    if "chicken" in text or "poultry" in text or "meat" in text:
        return "chicken"
    if "salmon" in text or "fish" in text or "seafood" in text:
        return "salmon"
    if "bread" in text or "sourdough" in text or "bakery" in text or "bun" in text:
        return "bread"
    if "oil" in text or "olive" in text:
        return "olive oil"
    if "water" in text or "beverage" in text or "soda" in text:
        return "water"
    return None


def generate_storage_recommendations(
    food_category: str,
    freshness_score: float,
    current_temp_c: float,
    optimal_temp_c: float,
    current_humidity_pct: float,
    optimal_humidity_pct: float,
    packaging_type: str,
    risk_level: str,
    item_name: str = "",
) -> List[Dict[str, str]]:
    """Tier 1: Straightforward, interesting storage recommendations."""
    key = _match_product_key(item_name, food_category)
    if key and key in PRODUCT_INSIGHTS and "storage" in PRODUCT_INSIGHTS[key]:
        return PRODUCT_INSIGHTS[key]["storage"]

    target_name = item_name.strip() if item_name and item_name.strip() else food_category
    recs = []

    temp_diff = current_temp_c - optimal_temp_c
    if abs(temp_diff) > 2:
        action = "Decrease" if temp_diff > 0 else "Increase"
        recs.append({
            "priority": "HIGH" if abs(temp_diff) > 5 else "MEDIUM",
            "icon": "🌡️",
            "title": f"Set Temperature to {optimal_temp_c}°C",
            "description": f"{target_name} lasts significantly longer at {optimal_temp_c}°C. {action} thermostat by {abs(temp_diff):.1f}°C.",
            "action": f"Adjust thermostat to {optimal_temp_c}°C",
            "estimated_impact": "Extends freshness by 25-40%",
        })

    hum_diff = current_humidity_pct - optimal_humidity_pct
    if abs(hum_diff) > 10:
        action = "Reduce" if hum_diff > 0 else "Increase"
        recs.append({
            "priority": "MEDIUM",
            "icon": "💧",
            "title": f"Target {optimal_humidity_pct}% Humidity",
            "description": f"Adjust humidity to {optimal_humidity_pct}% to keep {target_name} from drying out or developing moisture rot.",
            "action": f"{action} humidity to {optimal_humidity_pct}%",
            "estimated_impact": "Prevents mold and drying",
        })

    if packaging_type in ["Open Basket", "Cardboard Box"]:
        recs.append({
            "priority": "MEDIUM",
            "icon": "📦",
            "title": "Switch to Sealed Container",
            "description": f"Cardboard and open bins expose {target_name} to stale air and odors. Move to a sealed airtight container.",
            "action": "Use an airtight container or zip pouch",
            "estimated_impact": "Doubles storage shelf life",
        })

    if not recs:
        recs.append({
            "priority": "LOW",
            "icon": "✅",
            "title": f"Storage is Optimal for {target_name}",
            "description": f"Temperature ({current_temp_c}°C) and humidity ({current_humidity_pct}%) are right on target. Keep these conditions steady.",
            "action": "Maintain current settings",
            "estimated_impact": "Maximum shelf life",
        })

    return recs


def generate_consumption_recommendations(
    food_category: str,
    freshness_score: float,
    remaining_days: float,
    risk_level: str,
    item_name: str = "",
) -> List[Dict[str, str]]:
    """Tier 2: Direct, interesting consumption prioritization recommendations."""
    key = _match_product_key(item_name, food_category)
    if key and key in PRODUCT_INSIGHTS and "consumption" in PRODUCT_INSIGHTS[key]:
        return PRODUCT_INSIGHTS[key]["consumption"]

    target = item_name or food_category
    recs = []

    if risk_level in ["Spoiled"]:
        recs.append({
            "priority": "CRITICAL",
            "icon": "🚨",
            "title": f"Dispose of {target} Immediately",
            "description": f"{target} has passed its safe window and shows signs of spoilage. Do not consume.",
            "action": "Safely discard per compost or waste guidelines",
            "estimated_impact": "Protects health and safety",
        })
    elif risk_level == "Critical Spoilage":
        recs.append({
            "priority": "HIGH",
            "icon": "⚠️",
            "title": f"Cook or Consume {target} Today",
            "description": f"Only {remaining_days:.0f} day(s) left. Consume or process immediately before quality drops.",
            "action": "Prepare or cook within 24 hours",
            "estimated_impact": "Avoids complete spoilage",
        })
    elif risk_level == "Elevated Risk":
        recs.append({
            "priority": "MEDIUM",
            "icon": "📢",
            "title": f"Priority Use: 3–5 Days Remaining",
            "description": f"{target} is in prime condition now but will decline next week. Plan meals or sales around it.",
            "action": "Prioritize on daily menu or sales display",
            "estimated_impact": "Guarantees 100% utilization",
        })
    else:
        recs.append({
            "priority": "LOW",
            "icon": "✅",
            "title": f"Safe Consumption Window ({remaining_days:.0f} Days Left)",
            "description": f"{target} is in great shape with plenty of time remaining. Standard rotation applies.",
            "action": "Standard meal prep or normal shelf display",
            "estimated_impact": "Enjoy at peak quality",
        })

    return recs


def generate_inventory_rotation_suggestions(
    inventory_items: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Tier 3: Dynamic FEFO (First-Expired, First-Out) and FIFO rotation matrix.
    """
    # Sort by expiry date (FEFO = First Expired, First Out)
    def get_remaining_days(item):
        expiry = item.get("expiry_date")
        if expiry is None:
            return 999
        if isinstance(expiry, str):
            try:
                expiry = datetime.fromisoformat(expiry.replace("Z", "+00:00"))
            except Exception:
                return 999
        now = datetime.now(timezone.utc)
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)
        return max(0, (expiry - now).total_seconds() / 86400)

    sorted_items = sorted(inventory_items, key=get_remaining_days)

    fefo_matrix = []
    for i, item in enumerate(sorted_items[:20]):  # Top 20 urgency
        days = get_remaining_days(item)
        if days <= 0:
            priority = "EXPIRED"
            color = "#EF4444"
        elif days <= 2:
            priority = "URGENT"
            color = "#F97316"
        elif days <= 5:
            priority = "HIGH"
            color = "#EAB308"
        elif days <= 10:
            priority = "MEDIUM"
            color = "#84CC16"
        else:
            priority = "LOW"
            color = "#22C55E"

        fefo_matrix.append({
            "rotation_rank": i + 1,
            "item_id": item.get("id"),
            "item_name": item.get("name", "Unknown"),
            "batch_number": item.get("batch_number", "N/A"),
            "category": item.get("category", "Fruits"),
            "storage_location": item.get("storage_location", "N/A"),
            "quantity": item.get("quantity", 0),
            "unit": item.get("unit", "units"),
            "remaining_days": round(days, 1),
            "priority": priority,
            "priority_color": color,
            "rotation_action": _get_rotation_action(priority, item),
        })

    return {
        "rotation_strategy": "FEFO (First-Expired, First-Out)",
        "total_items": len(inventory_items),
        "urgent_count": sum(1 for f in fefo_matrix if f["priority"] in ["URGENT", "EXPIRED"]),
        "fefo_rotation_matrix": fefo_matrix,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def _get_rotation_action(priority: str, item: Dict) -> str:
    actions = {
        "EXPIRED": f"REMOVE: {item.get('name', 'Item')} must be quarantined and disposed immediately.",
        "URGENT": f"SELL NOW: Apply 40-50% clearance markdown on {item.get('name', 'Item')}.",
        "HIGH": f"PRIORITIZE: Move {item.get('name', 'Item')} to front-of-shelf / priority dispatch.",
        "MEDIUM": f"MONITOR: Schedule promotional discount within 3 days for {item.get('name', 'Item')}.",
        "LOW": f"STANDARD: {item.get('name', 'Item')} — maintain normal FEFO rotation.",
    }
    return actions.get(priority, "Standard handling")


def generate_waste_reduction_recommendations(
    inventory_items: List[Dict[str, Any]],
    total_waste_value: float = 0.0,
    item_name: str = "",
    food_category: str = "",
) -> List[Dict[str, Any]]:
    """Tier 4: Straightforward, practical food waste reduction recommendations."""
    key = _match_product_key(item_name, food_category)
    if key and key in PRODUCT_INSIGHTS and "waste" in PRODUCT_INSIGHTS[key]:
        return PRODUCT_INSIGHTS[key]["waste"]

    recs = []
    target = item_name or food_category or "Produce"

    # Count items by risk
    expired = [i for i in inventory_items if _item_is_expired(i)]
    critical = [i for i in inventory_items if _item_is_critical(i)]

    if critical or expired:
        recs.append({
            "priority": "HIGH",
            "icon": "⚡",
            "title": f"Flash Markdown on {target}",
            "description": f"Apply a 30-50% discount to sell through {target} before end of day.",
            "impact_items": max(1, len(critical)),
            "estimated_savings": "Recovers 60-70% product cost",
            "action_type": "Flash Sale",
        })
        recs.append({
            "priority": "HIGH",
            "icon": "🍲",
            "title": f"Transfer {target} to Daily Kitchen Prep",
            "description": f"Route ripe {target} to the kitchen for soups, sauces, marinades, or baked goods.",
            "impact_items": max(1, len(critical)),
            "estimated_savings": "100% waste prevention",
            "action_type": "Repurposing",
        })
    else:
        recs.append({
            "priority": "MEDIUM",
            "icon": "🧊",
            "title": f"Portion & Freeze Surplus {target}",
            "description": f"Pre-portion and freeze any excess {target} to lock in flavor and avoid spoilage.",
            "impact_items": 1,
            "estimated_savings": "Prevents 100% future waste",
            "action_type": "Freezing",
        })
        recs.append({
            "priority": "LOW",
            "icon": "🏷️",
            "title": "Weekend 15% Clearance Tag",
            "description": f"Mark down older crates by 15% on Friday afternoon to ensure high inventory turnover.",
            "impact_items": 1,
            "estimated_savings": "Maintains high turnover",
            "action_type": "Pricing",
        })

    return recs


def generate_quality_improvement_suggestions(
    food_category: str,
    freshness_score: float,
    packaging_type: str,
    storage_location: str,
    item_name: str = "",
) -> List[Dict[str, str]]:
    """Tier 5: Straightforward culinary and handling tips to keep quality peak."""
    key = _match_product_key(item_name, food_category)
    if key and key in PRODUCT_INSIGHTS and "quality" in PRODUCT_INSIGHTS[key]:
        return PRODUCT_INSIGHTS[key]["quality"]

    target_name = item_name.strip() if item_name and item_name.strip() else food_category
    suggestions = []

    if packaging_type in ["Open Basket", "Cardboard Box", "Plastic Wrap"]:
        suggestions.append({
            "priority": "HIGH",
            "icon": "📦",
            "title": f"Store {target_name} in Sealed Container",
            "description": f"Switch from open containers to sealed bins to lock in moisture and protect from odors.",
            "investment": "Zero / Minimal",
            "shelf_life_gain": "Extends fresh texture by 50%",
            "category": "Packaging",
        })

    suggestions.append({
        "priority": "MEDIUM",
        "icon": "🌡️",
        "title": f"Avoid Temperature Fluctuation",
        "description": f"Keep {target_name} inside the main storage zone rather than near doors where opening lets warm air in.",
        "investment": "None",
        "shelf_life_gain": "Stops condensation & texture breakdown",
        "category": "Placement",
    })

    suggestions.append({
        "priority": "LOW",
        "icon": "✨",
        "title": f"Gentle Handling for {target_name}",
        "description": f"Handle crates gently without dropping to prevent invisible bruising that speeds decay.",
        "investment": "None",
        "shelf_life_gain": "Preserves visual presentation",
        "category": "Handling",
    })

    return suggestions


# ─────────────────────────────────────────────────────────────────────────────
# COMPREHENSIVE RECOMMENDATION GENERATOR
# ─────────────────────────────────────────────────────────────────────────────
def generate_full_recommendations(
    food_category: str,
    item_name: str,
    freshness_score: float,
    storage_score: float,
    shelf_life_score: float,
    age_score: float,
    remaining_days: float,
    risk_level: str,
    current_temp_c: float,
    optimal_temp_c: float,
    current_humidity_pct: float,
    optimal_humidity_pct: float,
    packaging_type: str,
    storage_location: str,
    inventory_items: Optional[List[Dict]] = None,
) -> Dict[str, Any]:
    """
    Generates all 5 recommendation tiers and the weighted freshness score breakdown.
    """
    weighted_score = calculate_weighted_freshness_score(
        visual_score=freshness_score,
        storage_score=storage_score,
        shelf_life_score=shelf_life_score,
        age_score=age_score,
    )

    storage_recs = generate_storage_recommendations(
        food_category, freshness_score, current_temp_c, optimal_temp_c,
        current_humidity_pct, optimal_humidity_pct, packaging_type, risk_level,
        item_name=item_name,
    )

    consumption_recs = generate_consumption_recommendations(
        food_category, freshness_score, remaining_days, risk_level, item_name,
    )

    rotation = None
    if inventory_items:
        rotation = generate_inventory_rotation_suggestions(inventory_items)

    waste_recs = generate_waste_reduction_recommendations(
        inventory_items or [],
        item_name=item_name,
        food_category=food_category,
    )

    quality_suggestions = generate_quality_improvement_suggestions(
        food_category, freshness_score, packaging_type, storage_location,
        item_name=item_name,
    )

    return {
        "item_name": item_name,
        "food_category": food_category,
        "weighted_freshness_score": weighted_score,
        "recommendations": {
            "storage": storage_recs,
            "consumption": consumption_recs,
            "inventory_rotation": rotation,
            "waste_reduction": waste_recs,
            "quality_improvement": quality_suggestions,
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# UTILITY HELPERS
# ─────────────────────────────────────────────────────────────────────────────
def _get_days_remaining(expiry) -> float:
    if expiry is None:
        return 999.0
    if isinstance(expiry, str):
        try:
            expiry = datetime.fromisoformat(expiry.replace("Z", "+00:00"))
        except Exception:
            return 999.0
    now = datetime.now(timezone.utc)
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    return (expiry - now).total_seconds() / 86400


def _item_is_expired(item: Dict) -> bool:
    return _get_days_remaining(item.get("expiry_date")) <= 0


def _item_is_critical(item: Dict) -> bool:
    days = _get_days_remaining(item.get("expiry_date"))
    return 0 < days <= 1


def _item_is_elevated(item: Dict) -> bool:
    days = _get_days_remaining(item.get("expiry_date"))
    return 1 < days <= 3


def compute_item_freshness_details(item: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes individual batch freshness using the 5-point Freshness Scoring Engine:
      1. Food quality scoring (quality grade & visual condition)
      2. Freshness confidence scoring (confidence %)
      3. Shelf-life scoring (shelf-life score & remaining days)
      4. Storage condition scoring (temperature, humidity, light, circulation)
      5. Overall food health score (composite score)
    Maintains the 4-factor Weighted Scoring Model:
      Freshness Score = 40% Visual Condition Analysis
                      + 25% Storage Conditions
                      + 20% Shelf-Life Prediction
                      + 15% Product Age
    """
    from shelf_life_engine import FOOD_PROFILES

    category = item.get("category", "Fruits")
    profile = FOOD_PROFILES.get(category, FOOD_PROFILES.get("Fruits", {}))

    expiry = item.get("expiry_date")
    days_remaining = _get_days_remaining(expiry)
    status = item.get("status", "Fresh")
    is_expired = (status == "Expired" or (days_remaining is not None and days_remaining <= 0))

    # 1. Visual Condition Score (40% weight)
    raw_visual = item.get("freshness_score")
    if raw_visual is not None and raw_visual > 0:
        v_base = float(raw_visual)
    else:
        if is_expired:
            v_base = 20.0
        elif status == "Approaching Expiry" or (days_remaining is not None and days_remaining <= 3):
            v_base = 65.0
        else:
            v_base = 92.0
    visual_score = compute_visual_condition_score(freshness_score=v_base)
    if is_expired:
        visual_score = min(25.0, visual_score)

    # 2. Storage Condition Score (25% weight)
    temp_c = item.get("current_temperature")
    if temp_c is None:
        temp_c = profile.get("optimal_temp_c", 4.0)
    hum_pct = item.get("current_humidity")
    if hum_pct is None:
        hum_pct = profile.get("optimal_humidity_pct", 85.0)
    air_circ = item.get("air_circulation", "Medium") or "Medium"
    light_exp = item.get("light_exposure", "Dark") or "Dark"

    storage_score = compute_storage_condition_score(
        temp_c=float(temp_c),
        optimal_temp_c=profile.get("optimal_temp_c", 4.0),
        humidity_pct=float(hum_pct),
        optimal_humidity_pct=profile.get("optimal_humidity_pct", 85.0),
        humidity_tolerance=profile.get("humidity_tolerance", 15.0),
        air_circulation=air_circ,
        light_exposure=light_exp,
        is_light_sensitive=profile.get("light_sensitive", False),
    )

    # 3. Shelf-Life Score (20% weight)
    total_shelf_life = profile.get("baseline_shelf_life_days", 14.0)
    if is_expired:
        shelf_life_score = 0.0
    else:
        shelf_life_score = compute_shelf_life_score(
            remaining_days=max(0.0, days_remaining),
            total_shelf_life_days=total_shelf_life,
        )

    # 4. Product Age Score (15% weight)
    mfg_date = item.get("manufacture_date")
    if isinstance(mfg_date, str):
        try:
            mfg_date = datetime.fromisoformat(mfg_date.replace("Z", "+00:00"))
        except Exception:
            mfg_date = None
    exp_date = expiry
    if isinstance(exp_date, str):
        try:
            exp_date = datetime.fromisoformat(exp_date.replace("Z", "+00:00"))
        except Exception:
            exp_date = None

    if is_expired:
        age_score = 0.0
    else:
        age_score = compute_product_age_score(manufacture_date=mfg_date, expiry_date=exp_date)

    # Weighted Scoring Model Calculation
    weighted_calc = calculate_weighted_freshness_score(
        visual_score=visual_score,
        storage_score=storage_score,
        shelf_life_score=shelf_life_score,
        age_score=age_score,
    )

    if is_expired:
        overall_health_score = min(20.0, weighted_calc["overall_freshness_score"])
        quality_grade = "Grade F - Reject (Expired)"
        grade_color = "#EF4444"
    else:
        overall_health_score = weighted_calc["overall_freshness_score"]
        quality_grade = weighted_calc["quality_grade"]
        grade_color = weighted_calc["grade_color"]

    return {
        "id": item.get("id"),
        "name": item.get("name"),
        "batch_number": item.get("batch_number"),
        "category": category,
        "quantity": item.get("quantity", 1),
        "unit": item.get("unit", "units"),
        "storage_location": item.get("storage_location", "Main Storage"),
        "status": status,
        "days_remaining": round(max(0.0, days_remaining), 1) if days_remaining is not None else 0.0,
        "is_expired": is_expired,
        "temperature_c": float(temp_c),
        "humidity_pct": float(hum_pct),
        "air_circulation": air_circ,
        "light_exposure": light_exp,
        "optimal_temperature_c": profile.get("optimal_temp_c", 4.0),
        "optimal_humidity_pct": profile.get("optimal_humidity_pct", 85.0),

        # Freshness Scoring Engine: 5 Scores
        "food_quality_score": visual_score,
        "quality_grade": quality_grade,
        "grade_color": grade_color,
        "freshness_confidence_pct": weighted_calc["freshness_confidence_pct"],
        "shelf_life_score": shelf_life_score,
        "storage_condition_score": storage_score,
        "overall_food_health_score": overall_health_score,

        # Weighted Scoring Model Breakdown (Visual 40%, Storage 25%, Shelf-life 20%, Age 15%)
        "visual_condition_score": visual_score,
        "product_age_score": age_score,
        "weighted_breakdown": {
            "visual_condition": {
                "score": visual_score,
                "weight_pct": 40,
                "contribution": round(0.40 * visual_score, 2),
            },
            "storage_conditions": {
                "score": storage_score,
                "weight_pct": 25,
                "contribution": round(0.25 * storage_score, 2),
            },
            "shelf_life": {
                "score": shelf_life_score,
                "weight_pct": 20,
                "contribution": round(0.20 * shelf_life_score, 2),
            },
            "product_age": {
                "score": age_score,
                "weight_pct": 15,
                "contribution": round(0.15 * age_score, 2),
            },
        },
        "scoring_formula": "Freshness Score = (Visual × 40%) + (Storage × 25%) + (Shelf-Life × 20%) + (Product Age × 15%)"
    }


# ─────────────────────────────────────────────────────────────────────────────
# INVENTORY INSIGHTS ENGINE
# ─────────────────────────────────────────────────────────────────────────────
def generate_inventory_insights(inventory_items: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Generates comprehensive inventory analytics, KPIs, and individual batch freshness details.
    """
    now = datetime.now(timezone.utc)
    total = len(inventory_items)
    if total == 0:
        return {"error": "No inventory items available for insights"}

    fresh_count = 0
    approaching_count = 0
    expired_count = 0
    total_remaining_days = 0.0
    category_counts: Dict[str, int] = {}
    location_counts: Dict[str, int] = {}
    waste_value_at_risk = 0.0

    batch_freshness_details = []

    for item in inventory_items:
        expiry = item.get("expiry_date")
        days_remaining = _get_days_remaining(expiry)
        total_remaining_days += max(0, days_remaining)

        status = item.get("status", "Fresh")
        if status == "Expired" or days_remaining <= 0:
            expired_count += 1
            # Estimate value at risk
            qty = item.get("quantity", 1)
            waste_value_at_risk += qty * 50  # Rough Rs/unit estimate
        elif status == "Approaching Expiry" or days_remaining <= 3:
            approaching_count += 1
            qty = item.get("quantity", 1)
            waste_value_at_risk += qty * 20  # Partial risk
        else:
            fresh_count += 1

        cat = item.get("category", "Other")
        category_counts[cat] = category_counts.get(cat, 0) + 1

        loc = item.get("storage_location", "Other")
        location_counts[loc] = location_counts.get(loc, 0) + 1

        # Compute full 5-score freshness details for this item
        batch_freshness_details.append(compute_item_freshness_details(item))

    avg_remaining_days = total_remaining_days / total if total > 0 else 0
    spoilage_risk_index = round((expired_count + approaching_count * 0.5) / max(1, total) * 100, 1)
    store_freshness_index = round(100.0 - spoilage_risk_index, 1)

    # FEFO rotation efficiency
    fefo_efficiency = round(max(0, 100.0 - (expired_count / max(1, total)) * 100), 1)

    # Category distribution
    category_distribution = [
        {"category": cat, "count": count, "pct": round(count / total * 100, 1)}
        for cat, count in sorted(category_counts.items(), key=lambda x: -x[1])
    ]

    # Location heatmap
    location_heatmap = [
        {"location": loc, "item_count": count}
        for loc, count in sorted(location_counts.items(), key=lambda x: -x[1])
    ]

    # Top 5 urgent items
    urgent_items = sorted(
        inventory_items,
        key=lambda x: _get_days_remaining(x.get("expiry_date"))
    )[:5]

    # Expired items list for waste insights
    expired_items = [
        b for b in batch_freshness_details
        if b.get("is_expired") or (b.get("days_remaining") is not None and b.get("days_remaining") <= 0)
    ]

    return {
        "summary_kpis": {
            "total_items": total,
            "fresh_count": fresh_count,
            "approaching_expiry_count": approaching_count,
            "expired_count": expired_count,
            "avg_remaining_shelf_life_days": round(avg_remaining_days, 1),
            "store_freshness_index": store_freshness_index,
            "spoilage_risk_index": spoilage_risk_index,
            "fefo_rotation_efficiency_pct": fefo_efficiency,
            "estimated_waste_value_at_risk_inr": round(waste_value_at_risk, 0),
        },
        "category_distribution": category_distribution,
        "location_heatmap": location_heatmap,
        "batch_freshness_details": batch_freshness_details,
        "expired_items": expired_items,
        "top_5_urgent_items": [
            {
                "id": i.get("id"),
                "name": i.get("name"),
                "category": i.get("category"),
                "batch": i.get("batch_number"),
                "quantity": i.get("quantity"),
                "unit": i.get("unit"),
                "storage_location": i.get("storage_location", "Main Storage"),
                "days_remaining": round(_get_days_remaining(i.get("expiry_date")), 1),
                "status": "Expired" if _get_days_remaining(i.get("expiry_date")) <= 0 else i.get("status", "Approaching Expiry"),
                "health_score": round(float(i.get("freshness_score") or (20.0 if _get_days_remaining(i.get("expiry_date")) <= 0 else 65.0)), 1),
                "action_required": (
                    "Quarantine & Discard" if _get_days_remaining(i.get("expiry_date")) <= 0
                    else "50% Flash Markdown" if _get_days_remaining(i.get("expiry_date")) <= 1.0
                    else "FEFO Priority Dispatch"
                ),
                "loss_value_at_risk_inr": round((float(i.get("quantity") or 1)) * (50.0 if i.get("category") in ["Meat & Poultry", "Seafood"] else 20.0), 0),
            }
            for i in urgent_items
        ],
        "scoring_model": {
            "name": "Weighted Freshness Scoring Model",
            "weights": {
                "visual_condition_pct": 40,
                "storage_conditions_pct": 25,
                "shelf_life_prediction_pct": 20,
                "product_age_pct": 15,
            },
            "formula": "Freshness Score = (Visual × 40%) + (Storage × 25%) + (Shelf-Life × 20%) + (Product Age × 15%)"
        },
        "generated_at": now.isoformat(),
    }

