"""Initialize a fresh database or upgrade the prior priority-assessment schema.

Run with application writers stopped: python -m Backend.migrate
"""
from pathlib import Path
from sqlalchemy import inspect
from Backend.database import Base, engine
from Backend.models import db_models, auth  # Register all tables.


def migrate():
    tables = inspect(engine).get_table_names()
    if engine.dialect.name == "postgresql" and "priority_assessments" in tables:
        script = (Path(__file__).parent / "migrations/001_priority_runs.sql").read_text()
        with engine.connect() as connection:
            connection.exec_driver_sql(script)
    Base.metadata.create_all(engine)
    print("Database schema is ready.")


if __name__ == "__main__":
    migrate()
