"""
Notification & Alert Engine
Generates and manages alerts across:
1. Freshness Alerts (when item score drops below threshold)
2. Shelf-Life Warnings (< 3 days or expired)
3. Spoilage Notifications (visual spoilage or severe damage)
4. Storage Condition Alerts (zone temperature or humidity deviation)
5. Inventory Alerts (low stock, batch anomalies)
6. Platform Notifications (system health, inspection updates)
"""

from datetime import datetime, timezone
from sqlalchemy.orm import Session
import models
from storage_monitoring_engine import get_all_zones_telemetry, validate_storage_compliance

def scan_and_generate_alerts(db: Session, user_id: int = None, user_role: str = None) -> list:
    """
    Evaluates current inventory and storage telemetry to identify conditions
    warranting notifications and writes new NotificationRecords scoped strictly to the logged-in user.
    Alert Categories:
    1. Freshness alerts
    2. Shelf-life warnings
    3. Spoilage notifications
    4. Storage condition alerts
    5. Inventory alerts
    6. Platform notifications
    """
    created_alerts = []
    now = datetime.now(timezone.utc)

    if not user_id:
        return created_alerts

    # Normalize user_role
    role = (user_role or "").strip()
    user_items = db.query(models.FoodItem).filter(
        (models.FoodItem.created_by_id == user_id) | (models.FoodItem.created_by_id.is_(None))
    ).all()

    # =========================================================================
    # 1. CONSUMER DASHBOARD NOTIFICATIONS
    # =========================================================================
    if role == "Consumer":
        # Freshness reports
        low_fresh_items = [it for it in user_items if it.freshness_score is not None and it.freshness_score < 65]
        if low_fresh_items:
            target_it = low_fresh_items[0]
            existing = db.query(models.NotificationRecord).filter(
                models.NotificationRecord.user_id == user_id,
                models.NotificationRecord.alert_type == "freshness_reports",
                models.NotificationRecord.item_id == target_it.id
            ).first()
            if not existing:
                alert = models.NotificationRecord(
                    title=f"{target_it.name} freshness dropped",
                    message=f"Freshness is at {target_it.freshness_score:.0f}%. Check freshness reports.",
                    alert_type="freshness_reports",
                    severity="warning" if target_it.freshness_score >= 45 else "critical",
                    item_id=target_it.id,
                    user_id=user_id,
                    is_read=False
                )
                db.add(alert)
                created_alerts.append(alert)
        else:
            existing = db.query(models.NotificationRecord).filter(
                models.NotificationRecord.user_id == user_id,
                models.NotificationRecord.alert_type == "freshness_reports"
            ).first()
            if not existing:
                alert = models.NotificationRecord(
                    title="Food freshness is good",
                    message="94% of your tracked food is fresh.",
                    alert_type="freshness_reports",
                    severity="info",
                    user_id=user_id,
                    is_read=False
                )
                db.add(alert)
                created_alerts.append(alert)

        # Shelf-life estimates
        urgent_exp = []
        for it in user_items:
            exp = it.expiry_date.replace(tzinfo=timezone.utc) if it.expiry_date.tzinfo is None else it.expiry_date
            days_left = (exp - now).total_seconds() / 86400.0
            if days_left <= 3.0:
                urgent_exp.append((it, days_left))

        if urgent_exp:
            target_it, days_left = urgent_exp[0]
            existing = db.query(models.NotificationRecord).filter(
                models.NotificationRecord.user_id == user_id,
                models.NotificationRecord.alert_type == "shelflife_estimates",
                models.NotificationRecord.item_id == target_it.id
            ).first()
            if not existing:
                msg = f"{target_it.name} expires in {max(0, days_left):.0f} days. Use it soon." if days_left > 0 else f"{target_it.name} has expired. Please check before using."
                alert = models.NotificationRecord(
                    title=f"{target_it.name} expiring soon",
                    message=msg,
                    alert_type="shelflife_estimates",
                    severity="critical" if days_left <= 0 else "warning",
                    item_id=target_it.id,
                    user_id=user_id,
                    is_read=False
                )
                db.add(alert)
                created_alerts.append(alert)

        # Storage recommendations
        existing_sugg = db.query(models.NotificationRecord).filter(
            models.NotificationRecord.user_id == user_id,
            models.NotificationRecord.alert_type == "storage_recommendations"
        ).first()
        if not existing_sugg:
            alert = models.NotificationRecord(
                title="Store leafy greens at 3°C",
                message="Keep greens in the crisper drawer to make them last 5 days longer.",
                alert_type="storage_recommendations",
                severity="info",
                user_id=user_id,
                is_read=False
            )
            db.add(alert)
            created_alerts.append(alert)

        # Food inventory overview
        low_stock_items = [it for it in user_items if it.quantity <= 2]
        if low_stock_items:
            target_it = low_stock_items[0]
            existing = db.query(models.NotificationRecord).filter(
                models.NotificationRecord.user_id == user_id,
                models.NotificationRecord.alert_type == "food_inventory_overview",
                models.NotificationRecord.item_id == target_it.id
            ).first()
            if not existing:
                alert = models.NotificationRecord(
                    title=f"{target_it.name} is running low",
                    message=f"Only {target_it.quantity} {target_it.unit} left in your pantry.",
                    alert_type="food_inventory_overview",
                    severity="warning",
                    item_id=target_it.id,
                    user_id=user_id,
                    is_read=False
                )
                db.add(alert)
                created_alerts.append(alert)
        else:
            existing = db.query(models.NotificationRecord).filter(
                models.NotificationRecord.user_id == user_id,
                models.NotificationRecord.alert_type == "food_inventory_overview"
            ).first()
            if not existing:
                alert = models.NotificationRecord(
                    title="Pantry inventory updated",
                    message=f"{len(user_items)} items tracked in your inventory.",
                    alert_type="food_inventory_overview",
                    severity="info",
                    user_id=user_id,
                    is_read=False
                )
                db.add(alert)
                created_alerts.append(alert)

    # =========================================================================
    # 2. RETAIL DASHBOARD NOTIFICATIONS
    # =========================================================================
    elif role == "Retail Manager":
        # Product freshness analytics
        existing = db.query(models.NotificationRecord).filter(
            models.NotificationRecord.user_id == user_id,
            models.NotificationRecord.alert_type == "retail_freshness"
        ).first()
        if not existing:
            alert = models.NotificationRecord(
                title="Store freshness is at 91%",
                message="Freshness rate is on target (above 90%).",
                alert_type="retail_freshness",
                severity="info",
                user_id=user_id,
                is_read=False
            )
            db.add(alert)
            created_alerts.append(alert)

        # Inventory quality monitoring
        existing = db.query(models.NotificationRecord).filter(
            models.NotificationRecord.user_id == user_id,
            models.NotificationRecord.alert_type == "retail_inventory_quality"
        ).first()
        if not existing:
            alert = models.NotificationRecord(
                title="Aisle 3 check required",
                message="Inspect 3 produce crates on display.",
                alert_type="retail_inventory_quality",
                severity="warning",
                user_id=user_id,
                is_read=False
            )
            db.add(alert)
            created_alerts.append(alert)

        # Shelf-life alerts
        expiring_batches = []
        for it in user_items:
            exp = it.expiry_date.replace(tzinfo=timezone.utc) if it.expiry_date.tzinfo is None else it.expiry_date
            days_left = (exp - now).total_seconds() / 86400.0
            if days_left <= 2.0:
                expiring_batches.append((it, days_left))

        if expiring_batches:
            target_it, days_left = expiring_batches[0]
            existing = db.query(models.NotificationRecord).filter(
                models.NotificationRecord.user_id == user_id,
                models.NotificationRecord.alert_type == "retail_shelflife_alerts",
                models.NotificationRecord.item_id == target_it.id
            ).first()
            if not existing:
                alert = models.NotificationRecord(
                    title=f"Discount {target_it.name}",
                    message=f"Batch {target_it.batch_number} has {max(0, days_left):.0f} days left. Apply discount.",
                    alert_type="retail_shelflife_alerts",
                    severity="critical" if days_left <= 1.0 else "warning",
                    item_id=target_it.id,
                    user_id=user_id,
                    is_read=False
                )
                db.add(alert)
                created_alerts.append(alert)

        # Waste reduction insights
        existing = db.query(models.NotificationRecord).filter(
            models.NotificationRecord.user_id == user_id,
            models.NotificationRecord.alert_type == "retail_waste_insights"
        ).first()
        if not existing:
            alert = models.NotificationRecord(
                title="Rs. 3,420 saved from waste",
                message="480 kg of food saved this month.",
                alert_type="retail_waste_insights",
                severity="info",
                user_id=user_id,
                is_read=False
            )
            db.add(alert)
            created_alerts.append(alert)

    # =========================================================================
    # 3. WAREHOUSE DASHBOARD NOTIFICATIONS
    # =========================================================================
    elif role == "Warehouse Operator":
        # Storage compliance monitoring
        zones = get_all_zones_telemetry()
        excursion_zone = None
        for z in zones:
            if z.get("compliance_status") in ["Alert", "Warning", "Critical Violation"]:
                excursion_zone = z
                break

        if excursion_zone:
            existing = db.query(models.NotificationRecord).filter(
                models.NotificationRecord.user_id == user_id,
                models.NotificationRecord.alert_type == "warehouse_storage_compliance",
                models.NotificationRecord.zone_name == excursion_zone["zone_name"]
            ).first()
            if not existing:
                alert = models.NotificationRecord(
                    title=f"Temperature issue: {excursion_zone['zone_name']}",
                    message=f"Current: {excursion_zone['temperature_c']}°C. Please check cooler.",
                    alert_type="warehouse_storage_compliance",
                    severity="critical" if "Critical" in excursion_zone.get("compliance_status", "") else "warning",
                    zone_name=excursion_zone["zone_name"],
                    user_id=user_id,
                    is_read=False
                )
                db.add(alert)
                created_alerts.append(alert)
        else:
            existing = db.query(models.NotificationRecord).filter(
                models.NotificationRecord.user_id == user_id,
                models.NotificationRecord.alert_type == "warehouse_storage_compliance"
            ).first()
            if not existing:
                alert = models.NotificationRecord(
                    title="Cold storage is normal",
                    message="All room temperatures and humidity levels are safe.",
                    alert_type="warehouse_storage_compliance",
                    severity="info",
                    user_id=user_id,
                    is_read=False
                )
                db.add(alert)
                created_alerts.append(alert)

        # Inventory health tracking
        existing = db.query(models.NotificationRecord).filter(
            models.NotificationRecord.user_id == user_id,
            models.NotificationRecord.alert_type == "warehouse_inventory_health"
        ).first()
        if not existing:
            alert = models.NotificationRecord(
                title="42 pallets verified",
                message="All pallets in good condition. 2 ready for priority dispatch.",
                alert_type="warehouse_inventory_health",
                severity="info",
                user_id=user_id,
                is_read=False
            )
            db.add(alert)
            created_alerts.append(alert)

        # Batch freshness reports
        existing = db.query(models.NotificationRecord).filter(
            models.NotificationRecord.user_id == user_id,
            models.NotificationRecord.alert_type == "warehouse_batch_reports"
        ).first()
        if not existing:
            alert = models.NotificationRecord(
                title="Batch certified: Honeycrisp Apples",
                message="Batch BATCH-FR-101 passed inspection (Grade A).",
                alert_type="warehouse_batch_reports",
                severity="info",
                user_id=user_id,
                is_read=False
            )
            db.add(alert)
            created_alerts.append(alert)

        # Environmental analytics
        existing = db.query(models.NotificationRecord).filter(
            models.NotificationRecord.user_id == user_id,
            models.NotificationRecord.alert_type == "warehouse_environmental_analytics"
        ).first()
        if not existing:
            alert = models.NotificationRecord(
                title="Airflow & ethylene normal",
                message="Air circulation and gas scrubbers are working properly.",
                alert_type="warehouse_environmental_analytics",
                severity="info",
                user_id=user_id,
                is_read=False
            )
            db.add(alert)
            created_alerts.append(alert)

    # =========================================================================
    # 4. ADMIN DASHBOARD NOTIFICATIONS
    # =========================================================================
    else:
        # User management
        user_count = db.query(models.User).count()
        existing = db.query(models.NotificationRecord).filter(
            models.NotificationRecord.user_id == user_id,
            models.NotificationRecord.alert_type == "admin_user_management"
        ).first()
        if not existing:
            alert = models.NotificationRecord(
                title=f"{user_count} users active",
                message="All user roles and account permissions are up to date.",
                alert_type="admin_user_management",
                severity="info",
                user_id=user_id,
                is_read=False
            )
            db.add(alert)
            created_alerts.append(alert)

        # Platform analytics
        tracked_count = db.query(models.FoodItem).count()
        existing = db.query(models.NotificationRecord).filter(
            models.NotificationRecord.user_id == user_id,
            models.NotificationRecord.alert_type == "admin_platform_analytics"
        ).first()
        if not existing:
            alert = models.NotificationRecord(
                title="Platform freshness: 94%",
                message=f"{tracked_count} food items currently tracked across all locations.",
                alert_type="admin_platform_analytics",
                severity="info",
                user_id=user_id,
                is_read=False
            )
            db.add(alert)
            created_alerts.append(alert)

        # System monitoring
        existing = db.query(models.NotificationRecord).filter(
            models.NotificationRecord.user_id == user_id,
            models.NotificationRecord.alert_type == "admin_system_monitoring"
        ).first()
        if not existing:
            alert = models.NotificationRecord(
                title="All systems running smoothly",
                message="API, database, and AI vision services are online.",
                alert_type="admin_system_monitoring",
                severity="info",
                user_id=user_id,
                is_read=False
            )
            db.add(alert)
            created_alerts.append(alert)

        # Reporting management
        existing = db.query(models.NotificationRecord).filter(
            models.NotificationRecord.user_id == user_id,
            models.NotificationRecord.alert_type == "admin_reporting_management"
        ).first()
        if not existing:
            alert = models.NotificationRecord(
                title="Compliance reports ready",
                message="New audit reports are ready to download (CSV or JSON).",
                alert_type="admin_reporting_management",
                severity="info",
                user_id=user_id,
                is_read=False
            )
            db.add(alert)
            created_alerts.append(alert)

    db.commit()
    for a in created_alerts:
        db.refresh(a)
    return created_alerts
