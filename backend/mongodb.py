"""
Secondary NoSQL Database Connector (MongoDB)
Stores unstructured Computer Vision telemetry, raw feature tensors,
color distribution histograms, GLCM matrices, and segmentation polygon coordinates.
Provides graceful local in-memory fallback if MongoDB daemon is unreachable.
"""
import os
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger("food_freshness.mongodb")

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "food_freshness")

# In-memory storage fallback for offline/development mode
_IN_MEMORY_COLLECTIONS: Dict[str, List[Dict[str, Any]]] = {
    "food_cv_telemetry": [],
    "model_benchmarks": []
}

class MongoDBManager:
    def __init__(self):
        self.client = None
        self.db = None
        self.is_connected = False
        self._init_connection()

    def _init_connection(self):
        try:
            import pymongo
            self.client = pymongo.MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
            # Test connection
            self.client.admin.command('ping')
            self.db = self.client[MONGO_DB_NAME]
            self.is_connected = True
            logger.info("Successfully connected to MongoDB at %s (Database: %s)", MONGO_URI, MONGO_DB_NAME)
        except Exception as e:
            self.is_connected = False
            self.client = None
            self.db = None
            logger.warning(
                "MongoDB is not available (%s); operating with resilient in-memory NoSQL document store.", 
                str(e)
            )

    def insert_cv_telemetry(self, telemetry_doc: Dict[str, Any]) -> str:
        """
        Store raw Computer Vision & ML feature tensors into MongoDB collection 'food_cv_telemetry'.
        Returns inserted document ID or generated UUID.
        """
        import uuid
        doc_id = str(uuid.uuid4())
        doc_to_save = {
            "_id": doc_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            **telemetry_doc
        }

        if self.is_connected and self.db is not None:
            try:
                self.db["food_cv_telemetry"].insert_one(doc_to_save)
                return doc_id
            except Exception as e:
                logger.error("Failed to insert telemetry to MongoDB: %s. Storing in fallback store.", e)

        # In-memory fallback
        _IN_MEMORY_COLLECTIONS["food_cv_telemetry"].append(doc_to_save)
        return doc_id

    def get_cv_telemetry(self, telemetry_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve unstructured CV telemetry by ID"""
        if self.is_connected and self.db is not None:
            try:
                doc = self.db["food_cv_telemetry"].find_one({"_id": telemetry_id})
                if doc:
                    return doc
            except Exception as e:
                logger.error("Error reading from MongoDB: %s", e)

        for item in _IN_MEMORY_COLLECTIONS["food_cv_telemetry"]:
            if item.get("_id") == telemetry_id:
                return item
        return None

    def get_recent_telemetry(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get recent inspection telemetry records"""
        if self.is_connected and self.db is not None:
            try:
                cursor = self.db["food_cv_telemetry"].find().sort("created_at", -1).limit(limit)
                return list(cursor)
            except Exception as e:
                logger.error("Error querying recent telemetry: %s", e)

        return sorted(
            _IN_MEMORY_COLLECTIONS["food_cv_telemetry"], 
            key=lambda x: x.get("created_at", ""), 
            reverse=True
        )[:limit]

# Singleton instance
mongo_manager = MongoDBManager()
