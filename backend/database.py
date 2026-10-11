import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Primary: PostgreSQL (specified in tech stack), Fallback: SQLite for flexible dev execution
POSTGRES_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres:postgrespassword@localhost:5432/food_freshness"
)

# Attempt to connect to PostgreSQL, fallback gracefully to SQLite if PostgreSQL service isn't active
try:
    if POSTGRES_URL.startswith("postgresql"):
        engine = create_engine(POSTGRES_URL, connect_args={"connect_timeout": 3})
        # Test connection
        with engine.connect() as conn:
            pass
        print("Connected to PostgreSQL database successfully! (postgresql://...:5432/food_freshness)")
    else:
        engine = create_engine(POSTGRES_URL)
        print("Connected to database successfully!")
except Exception as e:
    # SQLite fallback
    SQLITE_URL = "sqlite:///./food_freshness.db"
    engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
    print(f"PostgreSQL unavailable ({e}); using SQLite fallback (food_freshness.db)")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
