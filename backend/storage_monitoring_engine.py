"""
Storage Monitoring Engine
=========================
Real-time IoT environmental tracking and compliance validation for multi-zone
cold storage warehouse infrastructure.

Monitors:
  - Temperature (°C)
  - Humidity (% RH)
  - Air Circulation (CFM / qualitative level)
  - Light Exposure (Lux / qualitative level)
  - Storage Duration

Compliance against USDA/FDA cold-chain standards per food category.
Generates compliance reports, violation alerts, and storage optimization recommendations.
Simulates MQTT/IoT sensor telemetry for warehouse zones.

Technologies: NumPy, Pandas, datetime (IoT simulation)
"""

import random
import math
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional, Tuple

# ─────────────────────────────────────────────────────────────────────────────
# STORAGE COMPLIANCE STANDARDS (USDA/FDA Cold-Chain)
# ─────────────────────────────────────────────────────────────────────────────
COMPLIANCE_STANDARDS = {
    "Fruits": {
        "temp_min_c": 0.0,
        "temp_max_c": 10.0,
        "humidity_min_pct": 80,
        "humidity_max_pct": 95,
        "recommended_air": "Medium",
        "light": "Dark",
        "max_duration_hours": 168.0,  # 7 days
        "regulation": "USDA Cold Chain Guideline §C2",
    },
    "Vegetables": {
        "temp_min_c": 0.0,
        "temp_max_c": 8.0,
        "humidity_min_pct": 85,
        "humidity_max_pct": 98,
        "recommended_air": "Medium",
        "light": "Dark",
        "max_duration_hours": 120.0,  # 5 days
        "regulation": "USDA Cold Chain Guideline §V3",
    },
    "Dairy Products": {
        "temp_min_c": 1.0,
        "temp_max_c": 4.0,
        "humidity_min_pct": 60,
        "humidity_max_pct": 80,
        "recommended_air": "Low",
        "light": "Dark",
        "max_duration_hours": 168.0,  # 7 days
        "regulation": "FDA 21 CFR §133 / PMO §7",
    },
    "Meat & Poultry": {
        "temp_min_c": -2.0,
        "temp_max_c": 3.0,
        "humidity_min_pct": 75,
        "humidity_max_pct": 85,
        "recommended_air": "Low",
        "light": "Dark",
        "max_duration_hours": 72.0,  # 3 days fresh
        "regulation": "USDA FSIS §430 / FDA Food Safety",
    },
    "Seafood": {
        "temp_min_c": -2.0,
        "temp_max_c": 2.0,
        "humidity_min_pct": 80,
        "humidity_max_pct": 90,
        "recommended_air": "Low",
        "light": "Dark",
        "max_duration_hours": 48.0,  # 2 days fresh
        "regulation": "FDA Fish & Fishery Products §123",
    },
    "Bakery Products": {
        "temp_min_c": 15.0,
        "temp_max_c": 22.0,
        "humidity_min_pct": 45,
        "humidity_max_pct": 65,
        "recommended_air": "Medium",
        "light": "Indirect Light",
        "max_duration_hours": 72.0,  # 3 days
        "regulation": "FDA GMP §110.80",
    },
    "Packaged Foods": {
        "temp_min_c": 10.0,
        "temp_max_c": 25.0,
        "humidity_min_pct": 40,
        "humidity_max_pct": 60,
        "recommended_air": "Low",
        "light": "Indirect Light",
        "max_duration_hours": 720.0,  # 30 days
        "regulation": "FDA 21 CFR §110",
    },
    "Beverages": {
        "temp_min_c": 4.0,
        "temp_max_c": 18.0,
        "humidity_min_pct": 50,
        "humidity_max_pct": 75,
        "recommended_air": "Low",
        "light": "Dark",
        "max_duration_hours": 720.0,  # 30 days
        "regulation": "FDA Beverage Safety CFR §165",
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# WAREHOUSE STORAGE ZONES
# ─────────────────────────────────────────────────────────────────────────────
STORAGE_ZONES = {
    "Zone A - Cold Storage": {
        "zone_type": "Cold Room",
        "design_temp_c": 4.0,
        "design_humidity_pct": 88,
        "design_air": "Medium",
        "design_light": "Dark",
        "current_duration_hours": 36.0,
        "capacity_kg": 2000,
        "categories": ["Fruits", "Vegetables"],
        "icon": "❄️",
    },
    "Zone B - Freezer": {
        "zone_type": "Deep Freezer",
        "design_temp_c": -18.0,
        "design_humidity_pct": 75,
        "design_air": "Low",
        "design_light": "Dark",
        "current_duration_hours": 48.0,
        "capacity_kg": 1500,
        "categories": ["Meat & Poultry", "Seafood"],
        "icon": "🧊",
    },
    "Refrigerated Rack 3": {
        "zone_type": "Refrigerated Rack",
        "design_temp_c": 3.0,
        "design_humidity_pct": 70,
        "design_air": "Low",
        "design_light": "Dark",
        "current_duration_hours": 24.0,
        "capacity_kg": 500,
        "categories": ["Dairy Products"],
        "icon": "🥛",
    },
    "Deep Freezer": {
        "zone_type": "Ultra-Cold Freezer",
        "design_temp_c": -22.0,
        "design_humidity_pct": 75,
        "design_air": "Low",
        "design_light": "Dark",
        "current_duration_hours": 30.0,
        "capacity_kg": 800,
        "categories": ["Seafood", "Meat & Poultry"],
        "icon": "🐟",
    },
    "Ambient Bakery Bin": {
        "zone_type": "Ambient Storage",
        "design_temp_c": 18.0,
        "design_humidity_pct": 55,
        "design_air": "Medium",
        "design_light": "Indirect Light",
        "current_duration_hours": 18.0,
        "capacity_kg": 300,
        "categories": ["Bakery Products"],
        "icon": "🍞",
    },
    "Dry Shelf 4": {
        "zone_type": "Dry Storage",
        "design_temp_c": 18.0,
        "design_humidity_pct": 48,
        "design_air": "Low",
        "design_light": "Indirect Light",
        "current_duration_hours": 96.0,
        "capacity_kg": 1000,
        "categories": ["Packaged Foods"],
        "icon": "📦",
    },
    "Beverage Cooler": {
        "zone_type": "Beverage Cooler",
        "design_temp_c": 8.0,
        "design_humidity_pct": 65,
        "design_air": "Low",
        "design_light": "Dark",
        "current_duration_hours": 60.0,
        "capacity_kg": 600,
        "categories": ["Beverages"],
        "icon": "🥤",
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# COMPLIANCE VALIDATION ENGINE
# ─────────────────────────────────────────────────────────────────────────────
def validate_storage_compliance(
    food_category: str,
    temp_c: float,
    humidity_pct: float,
    air_circulation: str = "Medium",
    light_exposure: str = "Dark",
    storage_duration_hours: float = 0.0,
) -> Dict[str, Any]:
    """
    Validates storage conditions against USDA/FDA compliance standards.
    Returns compliance status, violation list, and optimization recommendations.
    """
    standards = COMPLIANCE_STANDARDS.get(food_category, COMPLIANCE_STANDARDS["Fruits"])
    violations = []
    warnings = []
    recommendations = []

    # Temperature compliance
    temp_status = "compliant"
    if temp_c < standards["temp_min_c"]:
        violations.append({
            "parameter": "Temperature",
            "severity": "warning" if (standards["temp_min_c"] - temp_c) < 3 else "critical",
            "actual": f"{temp_c}°C",
            "required": f">= {standards['temp_min_c']}°C",
            "message": f"Temperature {temp_c}°C is too low (target: {standards['temp_min_c']}°C to {standards['temp_max_c']}°C). Risk of cold injury.",
        })
        temp_status = "violation"
        recommendations.append(f"Raise temperature to safe range ({standards['temp_min_c']}°C to {standards['temp_max_c']}°C).")
    elif temp_c > standards["temp_max_c"]:
        excess = temp_c - standards["temp_max_c"]
        severity = "critical" if excess > 5 else "warning"
        violations.append({
            "parameter": "Temperature",
            "severity": severity,
            "actual": f"{temp_c}°C",
            "required": f"<= {standards['temp_max_c']}°C",
            "message": f"Temperature {temp_c}°C is too high (target: {standards['temp_min_c']}°C to {standards['temp_max_c']}°C). Accelerates spoilage.",
        })
        temp_status = "violation"
        recommendations.append(f"Lower storage temperature to between {standards['temp_min_c']}°C and {standards['temp_max_c']}°C.")

    # Humidity compliance
    humidity_status = "compliant"
    if humidity_pct < standards["humidity_min_pct"]:
        violations.append({
            "parameter": "Humidity",
            "severity": "warning",
            "actual": f"{humidity_pct}%",
            "required": f">= {standards['humidity_min_pct']}%",
            "message": f"Humidity {humidity_pct}% is too low (target: {standards['humidity_min_pct']}% to {standards['humidity_max_pct']}%). Causes shriveling and drying.",
        })
        humidity_status = "violation"
        recommendations.append(f"Increase humidity to between {standards['humidity_min_pct']}% and {standards['humidity_max_pct']}%.")
    elif humidity_pct > standards["humidity_max_pct"]:
        violations.append({
            "parameter": "Humidity",
            "severity": "warning",
            "actual": f"{humidity_pct}%",
            "required": f"<= {standards['humidity_max_pct']}%",
            "message": f"Humidity {humidity_pct}% is too high (target: {standards['humidity_min_pct']}% to {standards['humidity_max_pct']}%). Risk of mold growth.",
        })
        humidity_status = "violation"
        recommendations.append(f"Decrease humidity to between {standards['humidity_min_pct']}% and {standards['humidity_max_pct']}%.")

    # Air circulation compliance
    air_map = {"None / Stagnant": 0, "Low": 1, "Medium": 2, "High": 3}
    recommended_air_level = air_map.get(standards["recommended_air"], 2)
    current_air_level = air_map.get(air_circulation, 1)
    air_status = "compliant"
    if current_air_level == 0:
        warnings.append({"parameter": "Air Circulation", "message": "Stagnant air allows gas buildup. Turn on gentle ventilation."})
        recommendations.append("Turn on low or medium air circulation.")
        air_status = "warning"

    # Light compliance
    light_levels = {"Dark": 0, "Indirect Light": 1, "Fluorescent": 2, "Direct Sunlight": 3}
    recommended_light_level = light_levels.get(standards["light"], 0)
    current_light_level = light_levels.get(light_exposure, 0)
    light_status = "compliant"
    if current_light_level > recommended_light_level + 1:
        warnings.append({"parameter": "Light Exposure", "message": f"High light exposure accelerates quality loss for {food_category}."})
        recommendations.append(f"Store in a dark or shaded area.")
        light_status = "warning"

    # Storage Duration compliance
    duration_status = "compliant"
    max_duration = standards.get("max_duration_hours", 168.0)
    if storage_duration_hours > 0:
        if storage_duration_hours > max_duration:
            violations.append({
                "parameter": "Storage Duration",
                "severity": "critical" if storage_duration_hours > max_duration * 1.5 else "warning",
                "actual": f"{storage_duration_hours}h",
                "required": f"<= {max_duration}h",
                "message": f"Storage duration of {storage_duration_hours}h exceeds recommended limit of {max_duration}h ({round(max_duration/24, 1)} days).",
            })
            duration_status = "violation"
            recommendations.append(f"Prioritize this stock for immediate consumption, sale, or dispatch.")
        elif storage_duration_hours > max_duration * 0.8:
            duration_status = "warning"
            warnings.append({
                "parameter": "Storage Duration",
                "message": f"Storage duration {storage_duration_hours}h is nearing the {max_duration}h limit. Schedule use soon.",
            })
            recommendations.append(f"Storage duration {storage_duration_hours}h is near the limit ({max_duration}h). Plan consumption or rotation soon.")

    # Determine overall compliance status
    critical_violations = [v for v in violations if v["severity"] == "critical"]
    if critical_violations:
        overall_status = "Critical Violation"
        status_color = "#EF4444"
    elif violations:
        overall_status = "Non-Compliant"
        status_color = "#F59E0B"
    elif warnings:
        overall_status = "Warning"
        status_color = "#EAB308"
    else:
        overall_status = "Compliant"
        status_color = "#22C55E"

    # Optimization recommendations if all are optimal
    if not recommendations:
        recommendations.append(f"All {food_category} storage parameters are in safe optimal range.")

    result = {
        "food_category": food_category,
        "overall_compliance_status": overall_status,
        "status_color": status_color,
        "regulation_reference": standards["regulation"],
        "violations": violations,
        "warnings": warnings,
        "recommendations": recommendations,
        "parameters": {
            "temperature": {"value": temp_c, "unit": "°C", "status": temp_status, "range": f"{standards['temp_min_c']}–{standards['temp_max_c']}°C"},
            "humidity": {"value": humidity_pct, "unit": "% RH", "status": humidity_status, "range": f"{standards['humidity_min_pct']}–{standards['humidity_max_pct']}% RH"},
            "air_circulation": {"value": air_circulation, "status": air_status, "range": standards["recommended_air"]},
            "light_exposure": {"value": light_exposure, "status": light_status, "range": standards["light"]},
            "storage_duration_hours": {"value": storage_duration_hours, "unit": "hours", "status": duration_status, "range": f"<= {max_duration}h"},
        },
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }
    result["optimizations"] = generate_storage_optimizations("Storage Chamber", result)
    return result


# ─────────────────────────────────────────────────────────────────────────────
# IoT SENSOR TELEMETRY SIMULATOR (MQTT simulation)
# ─────────────────────────────────────────────────────────────────────────────
_zone_telemetry_state: Dict[str, Dict] = {}

def _initialize_zone_state(zone_name: str) -> Dict[str, Any]:
    """Initialize baseline telemetry state for a zone."""
    zone = STORAGE_ZONES.get(zone_name, {})
    return {
        "temp_c": zone.get("design_temp_c", 4.0),
        "humidity_pct": zone.get("design_humidity_pct", 85.0),
        "air_circulation": zone.get("design_air", "Medium"),
        "light_exposure": zone.get("design_light", "Dark"),
        "storage_duration_hours": zone.get("current_duration_hours", 24.0),
        "power_status": "Online",
        "door_open": False,
    }


def get_live_zone_telemetry(zone_name: str, force_rescan: bool = False) -> Dict[str, Any]:
    """
    Returns stable sensor telemetry for a storage zone.
    Does not fluctuate on every call. Telemetry updates only when a regular scan is performed.
    """
    if zone_name not in _zone_telemetry_state:
        _zone_telemetry_state[zone_name] = _initialize_zone_state(zone_name)

    state = _zone_telemetry_state[zone_name]
    zone = STORAGE_ZONES.get(zone_name, {})

    if force_rescan or "cached_telemetry" not in state:
        base_temp = zone.get("design_temp_c", 4.0)
        base_humidity = zone.get("design_humidity_pct", 85.0)
        duration_hours = zone.get("current_duration_hours", 24.0)

        current_temp = round(base_temp, 1)
        current_humidity = round(base_humidity, 1)

        categories = zone.get("categories", ["Fruits"])
        primary_category = categories[0] if categories else "Fruits"
        compliance = validate_storage_compliance(
            food_category=primary_category,
            temp_c=current_temp,
            humidity_pct=current_humidity,
            air_circulation=zone.get("design_air", "Medium"),
            light_exposure=zone.get("design_light", "Dark"),
            storage_duration_hours=duration_hours,
        )

        optimizations = generate_storage_optimizations(zone_name, compliance)

        state["cached_telemetry"] = {
            "zone_name": zone_name,
            "zone_type": zone.get("zone_type", "Storage Room"),
            "icon": zone.get("icon", "📦"),
            "categories": categories,
            "sensor_data": {
                "temperature_c": current_temp,
                "humidity_pct": current_humidity,
                "air_circulation": zone.get("design_air", "Medium"),
                "light_exposure": zone.get("design_light", "Dark"),
                "storage_duration_hours": duration_hours,
            },
            "design_targets": {
                "temperature_c": base_temp,
                "humidity_pct": base_humidity,
                "air_circulation": zone.get("design_air", "Medium"),
                "light_exposure": zone.get("design_light", "Dark"),
                "max_duration_hours": COMPLIANCE_STANDARDS.get(primary_category, {}).get("max_duration_hours", 168.0),
            },
            "compliance": {
                "status": compliance["overall_compliance_status"],
                "status_color": compliance["status_color"],
                "violations": compliance.get("violations", []),
                "recommendations": compliance.get("recommendations", []),
            },
            "optimizations": optimizations,
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }

    return state["cached_telemetry"]


def get_all_zones_telemetry() -> List[Dict[str, Any]]:
    """Returns stable telemetry for all storage zones."""
    zones = []
    for zone_name in list(STORAGE_ZONES.keys()):
        zones.append(get_live_zone_telemetry(zone_name, force_rescan=False))
    return zones


def scan_all_zones() -> List[Dict[str, Any]]:
    """Performs a regular scan across all storage zones and refreshes sensor readings."""
    zones = []
    for zone_name in list(STORAGE_ZONES.keys()):
        zones.append(get_live_zone_telemetry(zone_name, force_rescan=True))
    return zones


def add_storage_zone(
    zone_name: str,
    categories: List[str],
    design_temp_c: float,
    design_humidity_pct: float,
    design_air: str = "Medium",
    design_light: str = "Dark",
    current_duration_hours: float = 24.0,
    zone_type: str = "Storage Room",
    icon: Optional[str] = None
) -> Dict[str, Any]:
    """Adds a new storage zone/location to monitoring."""
    category_icons = {
        "Fruits": "🍎",
        "Vegetables": "🥦",
        "Dairy Products": "🥛",
        "Meat & Poultry": "🥩",
        "Seafood": "🐟",
        "Bakery Products": "🍞",
        "Packaged Foods": "📦",
        "Beverages": "🥤"
    }
    assigned_icon = icon or (category_icons.get(categories[0]) if categories else "📦") or "📦"

    STORAGE_ZONES[zone_name] = {
        "zone_type": zone_type,
        "design_temp_c": design_temp_c,
        "design_humidity_pct": design_humidity_pct,
        "design_air": design_air,
        "design_light": design_light,
        "current_duration_hours": current_duration_hours,
        "categories": categories,
        "icon": assigned_icon,
    }

    _zone_telemetry_state[zone_name] = _initialize_zone_state(zone_name)
    return get_live_zone_telemetry(zone_name, force_rescan=True)


def delete_storage_zone(zone_name: str) -> bool:
    """Deletes a storage zone."""
    if zone_name in STORAGE_ZONES:
        del STORAGE_ZONES[zone_name]
        _zone_telemetry_state.pop(zone_name, None)
        return True
    return False


def generate_environmental_history(
    zone_name: str,
    hours: int = 24
) -> List[Dict[str, Any]]:
    """
    Generates synthetic historical temperature and humidity telemetry data.
    Used for trend charts in dashboard.
    """
    zone = STORAGE_ZONES.get(zone_name, {})
    base_temp = zone.get("design_temp_c", 4.0)
    base_humidity = zone.get("design_humidity_pct", 85.0)

    history = []
    now = datetime.now(timezone.utc)
    for i in range(hours, -1, -1):
        t = now - timedelta(hours=i)
        # Simulate realistic diurnal variation
        hour_of_day = t.hour
        diurnal_temp_offset = 1.5 * math.sin(2 * math.pi * hour_of_day / 24)
        temp = round(base_temp + diurnal_temp_offset + random.gauss(0, 0.5), 1)
        humidity = round(base_humidity + random.gauss(0, 2.0), 1)
        humidity = max(30, min(99, humidity))

        history.append({
            "timestamp": t.isoformat(),
            "hour_label": t.strftime("%H:%M"),
            "temperature_c": temp,
            "humidity_pct": humidity,
        })
    return history


# ─────────────────────────────────────────────────────────────────────────────
# STORAGE OPTIMIZATION RECOMMENDATIONS
# ─────────────────────────────────────────────────────────────────────────────
def generate_storage_optimizations(
    zone_name: str,
    compliance_result: Dict[str, Any]
) -> List[Dict[str, str]]:
    """
    Generates specific storage optimization recommendations based on compliance gaps.
    Covers Temperature, Humidity, Air Circulation, Light Exposure, and Storage Duration.
    """
    zone = STORAGE_ZONES.get(zone_name, {})
    optimizations = []

    for violation in compliance_result.get("violations", []):
        param = violation["parameter"]
        severity = violation["severity"]
        if param == "Temperature":
            if severity == "critical":
                optimizations.append({
                    "priority": "HIGH",
                    "action": "Urgent Temperature Correction",
                    "detail": f"Temperature in {zone_name} is outside safe limits. Adjust cooling immediately to prevent food spoiling.",
                    "category": "Temperature",
                })
            else:
                optimizations.append({
                    "priority": "MEDIUM",
                    "action": "Adjust Thermostat",
                    "detail": f"Adjust thermostat by 1-2°C to match the ideal temperature for {compliance_result['food_category']}.",
                    "category": "Temperature",
                })
        elif param == "Humidity":
            optimizations.append({
                "priority": "MEDIUM",
                "action": "Adjust Humidity",
                "detail": violation["message"] + " Turn humidifier on or off as needed.",
                "category": "Humidity",
            })
        elif param == "Storage Duration":
            optimizations.append({
                "priority": "HIGH",
                "action": "Use or Dispatch Soon",
                "detail": "This item has been stored for too long. Use, sell, or dispatch it promptly.",
                "category": "Duration",
            })

    # Warnings-based optimizations
    for warning in compliance_result.get("warnings", []):
        param = warning.get("parameter", "")
        if param == "Air Circulation":
            optimizations.append({
                "priority": "MEDIUM",
                "action": "Improve Airflow",
                "detail": "Turn on low-speed fans to keep air circulating evenly.",
                "category": "Airflow",
            })
        elif param == "Light Exposure":
            optimizations.append({
                "priority": "LOW",
                "action": "Reduce Light",
                "detail": "Store items in the dark or keep them away from bright lights and direct sun.",
                "category": "Light",
            })
        elif param == "Storage Duration":
            optimizations.append({
                "priority": "MEDIUM",
                "action": "Plan Usage Soon",
                "detail": "Items are nearing their recommended storage limit. Plan to use or rotate them soon.",
                "category": "Duration",
            })

    return optimizations
