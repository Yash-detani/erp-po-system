import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# This loads the variables from your .env file
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# PRO-TIP: Some cloud providers provide strings starting with 'postgres://'
# SQLAlchemy 1.4+ requires 'postgresql://'. This fix prevents a common crash.
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()