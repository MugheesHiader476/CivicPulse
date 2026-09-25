import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.repositories.seed import seed


def main():
    engine = create_engine(os.environ["DATABASE_URL"])
    try:
        count = seed(sessionmaker(engine))
        print(f"Inserted {count} complaints")
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
