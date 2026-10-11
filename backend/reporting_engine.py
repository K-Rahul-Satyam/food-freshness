"""
Reporting & Export Engine
Generates structured datasets for:
1. Freshness Audit Reports
2. Shelf-Life Projections & Expiry Forecasts
3. Inventory Quality Health Reports
4. Waste Reduction & Economic Impact Reports
5. Storage Zone Compliance Audits
Outputs structured JSON and CSV/Excel compatible formats.
"""

from datetime import datetime, timezone
import io
import csv
from sqlalchemy.orm import Session
import models
from storage_monitoring_engine import get_all_zones_telemetry
from recommendation_engine import compute_item_freshness_details

def generate_freshness_report_data(db: Session) -> dict:
    """
    Consolidates complete freshness and quality metrics across all inventory
    using the 5-point Freshness Scoring Engine and Weighted Model.
    """
    items = db.query(models.FoodItem).all()
    rows = []
    now = datetime.now(timezone.utc)

    grade_counts = {"Grade A": 0, "Grade B": 0, "Grade C": 0, "Grade D": 0, "Grade F": 0}
    status_counts = {"Fresh": 0, "Approaching Expiry": 0, "Expired": 0}

    for item in items:
        item_dict = {
            "id": item.id,
            "name": item.name,
            "batch_number": item.batch_number,
            "category": item.category,
            "quantity": item.quantity,
            "unit": item.unit,
            "storage_location": item.storage_location,
            "expiry_date": item.expiry_date,
            "manufacture_date": item.manufacture_date,
            "status": item.status,
            "freshness_score": item.freshness_score,
            "current_temperature": item.current_temperature,
            "current_humidity": item.current_humidity,
            "air_circulation": item.air_circulation,
            "light_exposure": item.light_exposure,
            "packaging_type": item.packaging_type,
        }
        details = compute_item_freshness_details(item_dict)
        details["packaging_type"] = item.packaging_type or "Standard Box"

        # Categorize grade
        grade_str = details["quality_grade"].split(" - ")[0]
        if grade_str in grade_counts:
            grade_counts[grade_str] += 1
        elif "Grade F" in details["quality_grade"]:
            grade_counts["Grade F"] += 1

        status_counts[item.status] = status_counts.get(item.status, 0) + 1
        rows.append(details)

    avg_score = round(sum(r["overall_food_health_score"] for r in rows) / len(rows), 1) if rows else 0.0

    return {
        "report_title": "Freshness & Quality Audit Report",
        "generated_at": now.isoformat(),
        "total_items": len(rows),
        "average_freshness_score": avg_score,
        "grade_distribution": grade_counts,
        "status_distribution": status_counts,
        "scoring_model": {
            "name": "Weighted Freshness Scoring Model",
            "weights": {
                "visual_condition_pct": 40,
                "storage_conditions_pct": 25,
                "shelf_life_prediction_pct": 20,
                "product_age_pct": 15,
            },
            "formula": "Freshness Score = (Visual 40%) + (Storage 25%) + (Shelf-Life 20%) + (Product Age 15%)"
        },
        "items": rows
    }


def generate_waste_reduction_report_data(db: Session) -> dict:
    """Calculates waste diversion statistics, potential financial loss, and actionable rescues."""
    items = db.query(models.FoodItem).all()
    now = datetime.now(timezone.utc)

    rescued_count = 0
    at_risk_count = 0
    expired_count = 0
    total_waste_value = 0.0
    recoverable_value = 0.0

    rescue_candidates = []
    expired_items = []

    for item in items:
        expiry = item.expiry_date
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)
        days_left = (expiry - now).total_seconds() / 86400.0

        est_price_per_unit = 50.0  # Estimated price in INR (₹)
        batch_value = item.quantity * est_price_per_unit

        if days_left <= 0:
            expired_count += 1
            total_waste_value += batch_value
            expired_items.append({
                "id": item.id,
                "name": item.name,
                "category": item.category,
                "batch_number": item.batch_number,
                "quantity": item.quantity,
                "unit": item.unit,
                "storage_location": item.storage_location,
                "expiry_date": item.expiry_date.isoformat() if hasattr(item.expiry_date, "isoformat") else str(item.expiry_date),
                "days_expired": abs(round(days_left, 1)),
                "loss_value_inr": round(batch_value, 2),
                "status": "Expired",
                "recommended_action": "Quarantine & Compost / Biomass Disposal",
                "waste_reason": "Exceeded shelf-life threshold"
            })
        elif days_left <= 3:
            at_risk_count += 1
            recoverable_value += (batch_value * 0.70) # 70% recoverable with fast sale
            rescue_candidates.append({
                "name": item.name,
                "batch": item.batch_number,
                "quantity": item.quantity,
                "days_left": round(days_left, 1),
                "location": item.storage_location,
                "suggested_action": "Apply 30%-50% discount or donate to local food rescue",
                "estimated_recovery": round(batch_value * 0.70, 2)
            })
        else:
            rescued_count += 1

    return {
        "report_title": "Waste Reduction & Economic Impact Report",
        "generated_at": now.isoformat(),
        "total_batches_monitored": len(items),
        "expired_count": expired_count,
        "at_risk_count": at_risk_count,
        "rescued_count": rescued_count,
        "expired_loss_value_usd": round(total_waste_value, 2),
        "expired_loss_value_inr": round(total_waste_value, 2),
        "at_risk_recoverable_usd": round(recoverable_value, 2),
        "at_risk_recoverable_inr": round(recoverable_value, 2),
        "diversion_rate_pct": round((rescued_count / len(items) * 100) if items else 100.0, 1),
        "rescue_candidates": rescue_candidates,
        "expired_items": expired_items
    }


def generate_storage_compliance_report_data(db: Session) -> dict:
    """Compiles audit log of cold storage zones and compliance scores."""
    zones = get_all_zones_telemetry()
    now = datetime.now(timezone.utc)

    compliant_count = sum(1 for z in zones if z.get("compliance_status") == "Compliant")
    compliance_rate = round((compliant_count / len(zones) * 100) if zones else 100.0, 1)

    return {
        "report_title": "Storage Zone & Cold-Chain Compliance Audit",
        "generated_at": now.isoformat(),
        "total_zones": len(zones),
        "compliant_zones": compliant_count,
        "overall_compliance_rate_pct": compliance_rate,
        "zones": zones
    }


def generate_csv_export(report_type: str, db: Session) -> str:
    """Generates RFC 4180 compliant CSV string for export to Excel."""
    output = io.StringIO()
    writer = csv.writer(output)

    if report_type == "freshness" or report_type == "inventory":
        data = generate_freshness_report_data(db)
        writer.writerow([
            "ID", "Batch Number", "Item Name", "Category", "Quantity", "Unit",
            "Storage Location", "Overall Food Health Score", "Quality Grade",
            "Freshness Confidence (%)", "Visual Score (40%)", "Storage Score (25%)",
            "Shelf-Life Score (20%)", "Product Age Score (15%)", "Days Remaining",
            "Status", "Storage Temp (°C)", "Storage Humidity (%)"
        ])
        for r in data["items"]:
            writer.writerow([
                r.get("id"),
                r.get("batch_number"),
                r.get("name"),
                r.get("category"),
                r.get("quantity"),
                r.get("unit"),
                r.get("storage_location"),
                r.get("overall_food_health_score"),
                r.get("quality_grade"),
                r.get("freshness_confidence_pct"),
                r.get("visual_condition_score"),
                r.get("storage_condition_score"),
                r.get("shelf_life_score"),
                r.get("product_age_score"),
                r.get("days_remaining"),
                r.get("status"),
                r.get("temperature_c"),
                r.get("humidity_pct"),
            ])

    elif report_type == "compliance":
        data = generate_storage_compliance_report_data(db)
        writer.writerow(["Zone Name", "Type", "Temperature (°C)", "Humidity (%)", "Compliance Status", "Door Status", "Power Status", "Violations Count"])
        for z in data["zones"]:
            writer.writerow([
                z.get("zone_name"), z.get("zone_type"), z.get("temperature_c"), z.get("humidity_pct"),
                z.get("compliance_status"), z.get("door_status"), z.get("power_status"), len(z.get("violations", []))
            ])

    elif report_type == "waste":
        data = generate_waste_reduction_report_data(db)
        writer.writerow(["Item Name", "Batch Number", "Quantity", "Days Until Expiry", "Location", "Suggested Action", "Estimated Recovery (₹)"])
        for c in data["rescue_candidates"]:
            writer.writerow([
                c["name"], c["batch"], c["quantity"], c["days_left"],
                c["location"], c["suggested_action"], c["estimated_recovery"]
            ])

    return output.getvalue()
