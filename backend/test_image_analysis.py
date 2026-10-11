"""
Automated Verification Suite for Food Image Analysis Engine
Tests:
1. Benchmark dataset loading (Fruits Freshness, Vegetable Freshness, Kaggle, Food-101)
2. Synthetic benchmark image generation & CV feature extraction
3. Color degradation (Browning Index), texture changes, mold, bruising, damage detection
4. Multi-factor Freshness Assessment Engine (Freshness score, 5 categories, spoilage probability)
5. Secondary NoSQL database (MongoDB / fallback store) telemetry persistence
6. Primary Relational DB (SQLAlchemy ImageAnalysisRecord) persistence
"""

import sys
import unittest
import numpy as np

import image_analysis
from mongodb import mongo_manager
from database import Base, engine, SessionLocal
import models, schemas

class TestFoodImageAnalysisEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.db = SessionLocal()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_benchmark_catalog(self):
        """Verify all 4 recommended datasets are represented in benchmarks"""
        benchmarks = image_analysis.DATASET_BENCHMARKS
        self.assertGreaterEqual(len(benchmarks), 4)
        dataset_refs = [b["dataset_reference"] for b in benchmarks]
        self.assertTrue(any("Fruits Freshness" in ref for ref in dataset_refs))
        self.assertTrue(any("Vegetable Freshness" in ref for ref in dataset_refs))
        self.assertTrue(any("Kaggle Food Freshness" in ref for ref in dataset_refs))
        self.assertTrue(any("Food-101" in ref for ref in dataset_refs))
        print("[PASS] Benchmark dataset catalog successfully verified.")

    def test_02_fresh_produce_analysis(self):
        """Test fresh produce analysis yields Fresh / Good and high freshness score"""
        res = image_analysis.run_full_image_analysis(benchmark_id="fruits-fresh-apple")
        self.assertIn("freshness_score", res)
        self.assertGreaterEqual(res["freshness_score"], 70.0)
        self.assertIn(res["freshness_category"], ["Fresh", "Good"])
        self.assertLess(res["spoilage_probability"], 35.0)
        self.assertIn("data:image/png;base64,", res["visual_overlays"]["diagnostic_overlay_base64"])
        print(f"[PASS] Fresh Apple: Score = {res['freshness_score']}%, Category = {res['freshness_category']}, Spoilage Prob = {res['spoilage_probability']}%")

    def test_03_spoiled_mold_detection(self):
        """Test spoiled produce with mold yields mold detection and Near Spoilage / Spoiled"""
        res = image_analysis.run_full_image_analysis(benchmark_id="fruits-spoiled-orange")
        features = res["features"]
        self.assertTrue(features["mold_detection"]["mold_detected"])
        self.assertGreater(features["mold_detection"]["mold_severity_pct"], 5.0)
        self.assertIn(res["freshness_category"], ["Near Spoilage", "Spoiled", "Acceptable"])
        self.assertGreater(res["spoilage_probability"], 35.0)
        print(f"[PASS] Spoiled Orange: Score = {res['freshness_score']}%, Mold Colonies = {features['mold_detection']['colony_count']}, Category = {res['freshness_category']}")

    def test_04_bruising_and_texture_analysis(self):
        """Test bruised produce analysis detects localized tissue softening / bruising"""
        res = image_analysis.run_full_image_analysis(benchmark_id="fruits-bruised-banana")
        features = res["features"]
        self.assertTrue(features["bruise_detection"]["bruise_detected"])
        self.assertGreater(features["bruise_detection"]["bruise_severity_pct"], 5.0)
        print(f"[PASS] Bruised Banana: Score = {res['freshness_score']}%, Bruise Severity = {features['bruise_detection']['bruise_severity_pct']}%")

    def test_05_freshness_categories_conformance(self):
        """Verify the 5 required freshness categories are strictly enforced"""
        valid_categories = {"Fresh", "Good", "Acceptable", "Near Spoilage", "Spoiled"}
        for b in image_analysis.DATASET_BENCHMARKS:
            res = image_analysis.run_full_image_analysis(benchmark_id=b["id"])
            self.assertIn(res["freshness_category"], valid_categories)
            self.assertIn(res["quality_grade"], [
                image_analysis.GRADE_A, image_analysis.GRADE_B, image_analysis.GRADE_C,
                image_analysis.GRADE_D, image_analysis.GRADE_F
            ])
            self.assertEqual(len(res["trend_projection"]), 8)  # Days 0 through 7
        print("[PASS] All benchmark items strictly conform to 5 Freshness Categories and Trend Projections.")

    def test_06_mongodb_and_postgres_persistence(self):
        """Verify dual database persistence (MongoDB NoSQL telemetry + PostgreSQL record)"""
        res = image_analysis.run_full_image_analysis(benchmark_id="vegetables-fresh-spinach")
        
        # 1. MongoDB telemetry insertion
        telemetry_doc = {
            "image_filename": res["image_filename"],
            "dataset_reference": res["dataset_reference"],
            "color_analysis": res["features"]["color_analysis"],
            "texture_analysis": res["features"]["texture_analysis"],
            "freshness_score": res["freshness_score"],
            "freshness_category": res["freshness_category"]
        }
        mongo_id = mongo_manager.insert_cv_telemetry(telemetry_doc)
        self.assertIsNotNone(mongo_id)
        retrieved_telemetry = mongo_manager.get_cv_telemetry(mongo_id)
        self.assertIsNotNone(retrieved_telemetry)
        self.assertEqual(retrieved_telemetry["freshness_score"], res["freshness_score"])

        # 2. PostgreSQL record insertion
        db_record = models.ImageAnalysisRecord(
            image_name=res["image_filename"],
            food_category=res["food_category"],
            detected_food_name=res["detected_food_name"],
            freshness_score=res["freshness_score"],
            freshness_category=res["freshness_category"],
            quality_grade=res["quality_grade"],
            spoilage_probability=res["spoilage_probability"],
            color_degradation_pct=res["features"]["color_analysis"]["color_degradation_pct"],
            texture_degradation_pct=res["features"]["texture_analysis"]["texture_degradation_pct"],
            mold_severity_pct=res["features"]["mold_detection"]["mold_severity_pct"],
            bruise_severity_pct=res["features"]["bruise_detection"]["bruise_severity_pct"],
            damage_severity_pct=res["features"]["physical_damage_detection"]["damage_severity_pct"],
            estimated_shelf_life_days=res["estimated_shelf_life_days"],
            recommendation=res["recommendation"],
            dataset_source=res["dataset_reference"],
            mongo_telemetry_id=mongo_id
        )
        self.db.add(db_record)
        self.db.commit()
        self.db.refresh(db_record)
        self.assertIsNotNone(db_record.id)
        print(f"[PASS] Dual DB persistence verified: Mongo Telemetry ID = {mongo_id}, PostgreSQL Record ID = {db_record.id}")

if __name__ == "__main__":
    unittest.main()
