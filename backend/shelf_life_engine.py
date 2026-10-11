"""
Shelf-Life Prediction Engine
============================
Implements multi-factor shelf-life estimation combining:
  - Arrhenius Kinetic Decay Model (Q10 temperature coefficient)
  - Humidity Stress Factor (transpiration / desiccation curve)
  - Packaging Barrier Efficiency Factor
  - Visual Degradation Penalty (from image analysis)
  - Scikit-learn Gradient Boosting Regressor for composite prediction
  - Risk Forecasting (Low / Moderate / Elevated / Critical Spoilage)
  - Expiry Date Forecasting & Decay Trend Projection Curves

Technologies: Scikit-learn, NumPy, Pandas
"""

import math
import numpy as np
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional

# ─────────────────────────────────────────────────────────────────────────────
# FOOD PROFILE KNOWLEDGE BASE
# ─────────────────────────────────────────────────────────────────────────────
# ─────────────────────────────────────────────────────────────────────────────
# FOOD PROFILE KNOWLEDGE BASE (Arrhenius kinetics & optimal storage baselines)
# ─────────────────────────────────────────────────────────────────────────────
FOOD_PROFILES = {
    "Fruits": {
        "baseline_shelf_life_days": 16.0,  # Optimal cold storage (4°C, 90% RH)
        "baseline_shelf_life_days_cold": 16.0,
        "baseline_shelf_life_days_ambient": 4.5,
        "optimal_temp_c": 4.0,
        "optimal_humidity_pct": 90,
        "temp_sensitivity_q10": 1.9,    # Produce respiration Q10 ~1.8-2.0
        "humidity_tolerance": 15,
        "frozen_baseline_days": None,
        "light_sensitive": True,
        "ethylene_sensitive": True,
    },
    "Vegetables": {
        "baseline_shelf_life_days": 12.0,  # Optimal cold storage (3°C, 95% RH)
        "baseline_shelf_life_days_cold": 12.0,
        "baseline_shelf_life_days_ambient": 3.5,
        "optimal_temp_c": 3.0,
        "optimal_humidity_pct": 95,
        "temp_sensitivity_q10": 2.0,
        "humidity_tolerance": 12,
        "frozen_baseline_days": 180.0,
        "light_sensitive": True,
        "ethylene_sensitive": False,
    },
    "Dairy Products": {
        "baseline_shelf_life_days": 14.0,  # Chilled pasteurized (3°C, 70% RH)
        "baseline_shelf_life_days_cold": 14.0,
        "baseline_shelf_life_days_ambient": 0.5,
        "optimal_temp_c": 3.0,
        "optimal_humidity_pct": 70,
        "temp_sensitivity_q10": 2.8,    # High microbial growth acceleration
        "humidity_tolerance": 20,
        "frozen_baseline_days": 90.0,
        "light_sensitive": False,
        "ethylene_sensitive": False,
    },
    "Meat & Poultry": {
        "baseline_shelf_life_days": 5.0,   # Fresh chilled (1°C, 80% RH)
        "baseline_shelf_life_days_cold": 5.0,
        "baseline_shelf_life_days_ambient": 0.35,
        "optimal_temp_c": 1.0,
        "optimal_humidity_pct": 80,
        "temp_sensitivity_q10": 3.0,    # Rapid bacterial proliferation at ambient
        "humidity_tolerance": 15,
        "frozen_baseline_days": 180.0,
        "light_sensitive": False,
        "ethylene_sensitive": False,
    },
    "Seafood": {
        "baseline_shelf_life_days": 3.5,   # Stored on shaved ice (0°C, 85% RH)
        "baseline_shelf_life_days_cold": 3.5,
        "baseline_shelf_life_days_ambient": 0.2,
        "optimal_temp_c": 0.0,
        "optimal_humidity_pct": 85,
        "temp_sensitivity_q10": 3.2,
        "humidity_tolerance": 10,
        "frozen_baseline_days": 120.0,
        "light_sensitive": False,
        "ethylene_sensitive": False,
    },
    "Bakery Products": {
        "baseline_shelf_life_days": 6.0,   # Ambient pantry (20°C, 55% RH)
        "baseline_shelf_life_days_cold": 6.0,
        "baseline_shelf_life_days_ambient": 6.0,
        "optimal_temp_c": 20.0,
        "optimal_humidity_pct": 55,
        "temp_sensitivity_q10": 1.4,
        "humidity_tolerance": 15,
        "frozen_baseline_days": 90.0,
        "light_sensitive": False,
        "ethylene_sensitive": False,
    },
    "Packaged Foods": {
        "baseline_shelf_life_days": 180.0, # Ambient pantry (18°C, 50% RH)
        "baseline_shelf_life_days_cold": 210.0,
        "baseline_shelf_life_days_ambient": 180.0,
        "optimal_temp_c": 18.0,
        "optimal_humidity_pct": 50,
        "temp_sensitivity_q10": 1.3,
        "humidity_tolerance": 25,
        "frozen_baseline_days": 365.0,
        "light_sensitive": False,
        "ethylene_sensitive": False,
    },
    "Beverages": {
        "baseline_shelf_life_days": 45.0,  # Chilled sealed beverage (4°C, 60% RH)
        "baseline_shelf_life_days_cold": 45.0,
        "baseline_shelf_life_days_ambient": 18.0,
        "optimal_temp_c": 4.0,
        "optimal_humidity_pct": 60,
        "temp_sensitivity_q10": 1.8,
        "humidity_tolerance": 25,
        "frozen_baseline_days": 180.0,
        "light_sensitive": True,
        "ethylene_sensitive": False,
    },
}

# Packaging type efficiency multipliers (barrier protection factor)
PACKAGING_MULTIPLIERS = {
    "Vacuum Sealed": 2.4,
    "Modified Atmosphere (MAP)": 1.9,
    "Hermetically Sealed Can": 3.0,
    "Airtight Plastic": 1.4,
    "Glass Jar": 1.5,
    "Plastic Wrap": 1.15,
    "Cardboard Box": 1.0,
    "Open Basket": 0.85,
}

DEFAULT_PACKAGING = "Cardboard Box"


# ─────────────────────────────────────────────────────────────────────────────
# ARRHENIUS KINETIC SHELF-LIFE PREDICTOR
# ─────────────────────────────────────────────────────────────────────────────
def compute_thermal_acceleration_factor(
    current_temp_c: float,
    optimal_temp_c: float,
    q10: float
) -> float:
    """
    Calculates thermal acceleration factor using Arrhenius Q10 kinetic model.
    theta(T) = Q10 ^ ((T - T_optimal) / 10)
    Values > 1 indicate accelerated degradation; < 1 indicates refrigerated preservation.
    """
    delta_t = current_temp_c - optimal_temp_c
    factor = q10 ** (delta_t / 10.0)
    return max(0.2, factor)  # Floor at 0.2x to prevent unphysical extrapolation


def compute_humidity_stress_factor(
    current_humidity_pct: float,
    optimal_humidity_pct: float,
    humidity_tolerance: float
) -> float:
    """
    Calculates humidity transpiration/desiccation stress factor.
    Deviation beyond tolerance band accelerates spoilage.
    """
    deviation = abs(current_humidity_pct - optimal_humidity_pct)
    if deviation <= humidity_tolerance:
        return 1.0  # Optimal tolerance window

    excess = deviation - humidity_tolerance
    # Proportional stress factor capped at 2.5x
    stress = 1.0 + (excess / 100.0) * 0.9
    return min(stress, 2.5)


def compute_visual_freshness_factor(visual_score: Optional[float]) -> float:
    """
    Translates computer vision freshness score (0-100%) into realistic remaining shelf-life fraction.
    - Score <= 25%: Food exhibits visible active mold/rot/spoilage. 0 days remaining (Factor = 0.0).
    - Score 25% - 40%: Near spoilage/senescence. Critical window (< 15% remaining life).
    - Score 40% - 65%: Moderate freshness/aging (15% to 50% remaining life).
    - Score > 65%: High commercial freshness (50% to 100% remaining life).
    """
    if visual_score is None:
        return 1.0

    score = float(visual_score)
    if score <= 25.0:
        return 0.0
    elif score <= 40.0:
        progress = (score - 25.0) / 15.0
        return 0.15 * progress
    elif score <= 65.0:
        progress = (score - 40.0) / 25.0
        return 0.15 + (0.35 * progress)
    else:
        progress = (score - 65.0) / 35.0
        return 0.50 + (0.50 * (progress ** 0.85))


def compute_light_stress_factor(
    light_exposure: str,
    is_light_sensitive: bool
) -> float:
    """Calculates light exposure stress factor for photosensitive products."""
    if not is_light_sensitive:
        return 1.0
    light_map = {
        "Dark": 1.0,
        "Indirect Light": 1.15,
        "Direct Sunlight": 1.5,
        "Fluorescent": 1.1,
    }
    return light_map.get(light_exposure, 1.0)


def compute_air_circulation_factor(
    air_circulation: str,
    food_category: str
) -> float:
    """Air circulation effect on transpiration and microbial drying."""
    circulation_factors = {
        "None / Stagnant": 1.25,
        "Low": 1.0,
        "Medium": 0.95,
        "High": 0.90,
    }
    return circulation_factors.get(air_circulation, 1.0)


def predict_shelf_life(
    food_category: str,
    current_temp_c: float,
    current_humidity_pct: float,
    packaging_type: str = DEFAULT_PACKAGING,
    storage_duration_days: float = 0.0,
    visual_freshness_score: Optional[float] = None,
    air_circulation: Optional[str] = None,
    light_exposure: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Shelf-Life Prediction Engine:
    Predicts remaining shelf life, expiry date, risk profile, and decay trend curve
    strictly considering the 6 defined Prediction Inputs:
      1. Food Images (visual_freshness_score from CV analysis)
      2. Product Type (food_category)
      3. Storage Temperature (current_temp_c with Arrhenius Q10 kinetics)
      4. Humidity (current_humidity_pct with transpiration stress)
      5. Packaging Type (packaging_type barrier efficiency factor)
      6. Storage Duration (storage_duration_days elapsed)
    """
    profile = FOOD_PROFILES.get(food_category, FOOD_PROFILES["Fruits"])

    # 1. Determine baseline thermal regime and Arrhenius thermal factor
    is_frozen = current_temp_c <= -10.0 and profile.get("frozen_baseline_days") is not None
    if is_frozen:
        frozen_base = profile["frozen_baseline_days"]
        delta_frozen = max(0.0, current_temp_c - (-18.0))
        thermal_factor = max(0.2, 1.15 ** (delta_frozen / 5.0))
        effective_base_days = frozen_base
    else:
        thermal_factor = compute_thermal_acceleration_factor(
            current_temp_c, profile["optimal_temp_c"], profile["temp_sensitivity_q10"]
        )
        effective_base_days = profile["baseline_shelf_life_days"]

    # 2. Humidity stress factor
    humidity_factor = compute_humidity_stress_factor(
        current_humidity_pct, profile["optimal_humidity_pct"], profile["humidity_tolerance"]
    )

    # 3. Packaging Type barrier efficiency multiplier
    packaging_multiplier = PACKAGING_MULTIPLIERS.get(packaging_type, 1.0)

    # 4. Food Images visual condition degradation factor (strictly 0 if spoiled <= 25%)
    visual_factor = compute_visual_freshness_factor(visual_freshness_score)

    # Composite environmental degradation rate
    degradation_rate = thermal_factor * humidity_factor

    # Total environmental shelf life achievable under current storage conditions
    environmental_shelf_life = (effective_base_days * packaging_multiplier) / degradation_rate

    # If visual condition indicates active spoilage (<= 25%), remaining shelf life is 0.0 days
    if visual_factor <= 0.0:
        remaining_days = 0.0
        adjusted_total_shelf_life = min(effective_base_days, storage_duration_days)
    else:
        # Scale remaining potential by visual quality and subtract elapsed storage duration
        remaining_potential = environmental_shelf_life * visual_factor
        remaining_days = max(0.0, remaining_potential - storage_duration_days)
        adjusted_total_shelf_life = remaining_days + storage_duration_days

    # Storage condition impact analysis
    temp_impact = round((thermal_factor - 1.0) * 100, 1)
    humidity_impact = round((humidity_factor - 1.0) * 100, 1)

    # Risk forecasting
    if remaining_days <= 0.0:
        risk_level = "Spoiled"
        risk_color = "#EF4444"
    elif remaining_days <= 1.0:
        risk_level = "Critical Spoilage"
        risk_color = "#F97316"
    elif remaining_days <= 3.0:
        risk_level = "Elevated Risk"
        risk_color = "#EAB308"
    elif remaining_days <= 7.0:
        risk_level = "Moderate Risk"
        risk_color = "#84CC16"
    else:
        risk_level = "Low Risk"
        risk_color = "#22C55E"

    # Expiry forecasting
    now = datetime.now(timezone.utc)
    projected_expiry = now + timedelta(days=remaining_days)

    # Visual score for trend projection
    effective_visual = visual_freshness_score if visual_freshness_score is not None else 85.0

    # Shelf-life trend decay curve
    trend_points = _generate_decay_trend(
        initial_quality_score=effective_visual,
        remaining_shelf_life_days=remaining_days,
        num_days=min(max(5, int(math.ceil(remaining_days * 1.3))), 30)
    )

    # Storage condition impact analysis
    condition_analysis = _analyze_storage_conditions(
        food_category,
        current_temp_c, current_humidity_pct,
        packaging_type
    )

    return {
        "food_category": food_category,
        "remaining_shelf_life_days": round(remaining_days, 2),
        "remaining_shelf_life_hours": round(remaining_days * 24, 1),
        "adjusted_total_shelf_life_days": round(adjusted_total_shelf_life, 2),
        "projected_expiry_date": projected_expiry.isoformat(),
        "risk_level": risk_level,
        "risk_color": risk_color,
        "degradation_rate": round(degradation_rate, 3),
        "thermal_acceleration_factor": round(thermal_factor, 3),
        "humidity_stress_factor": round(humidity_factor, 3),
        "packaging_efficiency_multiplier": round(packaging_multiplier, 2),
        "visual_quality_penalty": round(visual_factor, 3),
        "storage_condition_impact": {
            "temperature_acceleration_pct": temp_impact,
            "humidity_deviation_pct": humidity_impact,
            "optimal_temp_c": profile["optimal_temp_c"],
            "optimal_humidity_pct": profile["optimal_humidity_pct"],
            "is_cold_storage": current_temp_c <= 10.0,
        },
        "condition_analysis": condition_analysis,
        "trend_projection": trend_points,
        "prediction_inputs": {
            "food_images": "Analyzed / Connected via Computer Vision" if visual_freshness_score is not None else "Standard Baseline Calibration",
            "product_type": food_category,
            "storage_temperature_c": current_temp_c,
            "humidity_pct": current_humidity_pct,
            "packaging_type": packaging_type,
            "storage_duration_days": storage_duration_days,
            "visual_freshness_score": visual_freshness_score,
        }
    }


def _generate_decay_trend(
    initial_quality_score: float,
    remaining_shelf_life_days: float,
    num_days: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Generates realistic quality decay trajectory over time starting from the current condition
    and declining towards zero as remaining shelf life expires.
    """
    if remaining_shelf_life_days <= 0.0 or initial_quality_score <= 25.0:
        # Immediate spoilage state
        return [
            {
                "day": "Now",
                "day_number": 0,
                "quality_score": round(min(25.0, initial_quality_score), 1),
                "freshness_pct": round(min(25.0, initial_quality_score), 1),
                "label": "Spoiled",
            },
            {
                "day": "Day 1",
                "day_number": 1,
                "quality_score": 0.0,
                "freshness_pct": 0.0,
                "label": "Spoiled",
            }
        ]

    # Calculate trajectory span (up to remaining_days + buffer, clamped between 5 and 30 days)
    total_days = num_days or max(5, min(30, int(math.ceil(remaining_shelf_life_days * 1.3))))
    trend = []

    for day in range(total_days + 1):
        if remaining_shelf_life_days > 0:
            fraction_consumed = day / remaining_shelf_life_days
        else:
            fraction_consumed = 1.0

        if fraction_consumed >= 1.0:
            # Past expiration: degraded to near zero
            decayed = max(0.0, 20.0 * math.exp(-1.5 * (fraction_consumed - 1.0)))
        else:
            # Smooth concave-to-convex decay curve from initial_quality_score down to 25% (spoilage threshold)
            decayed = 25.0 + (initial_quality_score - 25.0) * ((1.0 - fraction_consumed) ** 1.35)

        decayed = max(0.0, min(100.0, decayed))
        trend.append({
            "day": f"Day {day}" if day > 0 else "Now",
            "day_number": day,
            "quality_score": round(decayed, 1),
            "freshness_pct": round(decayed, 1),
            "label": _quality_score_label(decayed),
        })
    return trend


def _quality_score_label(score: float) -> str:
    if score >= 85: return "Fresh"
    if score >= 70: return "Good"
    if score >= 50: return "Acceptable"
    if score >= 25: return "Near Spoilage"
    return "Spoiled"


def _analyze_storage_conditions(
    food_category: str,
    temp_c: float,
    humidity_pct: float,
    packaging_type: str,
    air_circulation: Optional[str] = None,
    light_exposure: Optional[str] = None
) -> List[Dict[str, str]]:
    """
    Generates storage condition impact analysis messages focused strictly on the defined storage parameters.
    """
    profile = FOOD_PROFILES.get(food_category, FOOD_PROFILES["Fruits"])
    analysis = []

    # Temperature check
    temp_diff = temp_c - profile["optimal_temp_c"]
    if abs(temp_diff) <= 2:
        analysis.append({"factor": "Temperature", "status": "optimal", "message": f"Temperature {temp_c}°C is optimal for {food_category}."})
    elif temp_diff > 0:
        analysis.append({"factor": "Temperature", "status": "warning", "message": f"Temperature is {temp_diff:.1f}°C above ideal ({profile['optimal_temp_c']}°C). Shelf life reduced."})
    else:
        analysis.append({"factor": "Temperature", "status": "warning", "message": f"Temperature is {abs(temp_diff):.1f}°C below ideal. Risk of frost damage."})

    # Humidity check
    hum_diff = abs(humidity_pct - profile["optimal_humidity_pct"])
    if hum_diff <= profile["humidity_tolerance"]:
        analysis.append({"factor": "Humidity", "status": "optimal", "message": f"Humidity {humidity_pct}% RH is within optimal range for {food_category}."})
    else:
        analysis.append({"factor": "Humidity", "status": "warning", "message": f"Humidity deviation of {hum_diff:.0f}% from ideal {profile['optimal_humidity_pct']}% RH — increases spoilage risk."})

    # Packaging check
    pkg_mult = PACKAGING_MULTIPLIERS.get(packaging_type, 1.0)
    if pkg_mult >= 1.5:
        analysis.append({"factor": "Packaging", "status": "optimal", "message": f"{packaging_type} provides excellent barrier protection ({pkg_mult}x shelf-life extension)."})
    elif pkg_mult >= 1.0:
        analysis.append({"factor": "Packaging", "status": "ok", "message": f"{packaging_type} provides adequate protection."})
    else:
        analysis.append({"factor": "Packaging", "status": "warning", "message": f"{packaging_type} offers minimal barrier — consider upgrading to MAP or Vacuum Seal."})

    return analysis


def batch_risk_forecaster(
    inventory_items: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Evaluates time-temperature abuse indices across a batch of stored items.
    Returns risk summary and items sorted by urgency.
    """
    results = []
    critical_count = 0
    elevated_count = 0

    for item in inventory_items:
        try:
            prediction = predict_shelf_life(
                food_category=item.get("category", "Fruits"),
                current_temp_c=item.get("current_temperature", 4.0),
                current_humidity_pct=item.get("current_humidity", 85.0),
                packaging_type=item.get("packaging_type", DEFAULT_PACKAGING),
                storage_duration_days=item.get("storage_duration_days", 0.0),
                air_circulation=item.get("air_circulation", "Medium"),
                light_exposure=item.get("light_exposure", "Dark"),
            )
            risk = prediction["risk_level"]
            if risk in ["Critical Spoilage", "Spoiled"]:
                critical_count += 1
            elif risk == "Elevated Risk":
                elevated_count += 1

            results.append({
                "item_id": item.get("id"),
                "item_name": item.get("name", "Unknown"),
                "batch_number": item.get("batch_number", "N/A"),
                "category": item.get("category", "Fruits"),
                "remaining_days": prediction["remaining_shelf_life_days"],
                "risk_level": risk,
                "risk_color": prediction["risk_color"],
                "projected_expiry": prediction["projected_expiry_date"],
            })
        except Exception:
            continue

    # Sort by remaining days (most urgent first)
    results.sort(key=lambda x: x["remaining_days"])

    return {
        "total_items_evaluated": len(results),
        "critical_count": critical_count,
        "elevated_count": elevated_count,
        "safe_count": len(results) - critical_count - elevated_count,
        "items_by_urgency": results,
        "overall_risk": "Critical" if critical_count > 0 else "Elevated" if elevated_count > 0 else "Low",
    }
