"""Configure the container database, migrate, then replace this process with ASGI."""
import os

from sqlalchemy.engine import URL


def main():
    # URL.create escapes special characters in credentials. Never print the URL.
    os.environ["DATABASE_URL"] = URL.create(
        "postgresql+psycopg",
        username=os.environ["POSTGRES_USER"],
        password=os.environ["POSTGRES_PASSWORD"],
        host=os.environ["DB_HOST"],
        port=5432,
        database=os.environ["POSTGRES_DB"],
    ).render_as_string(hide_password=False)
    from Backend.migrate import migrate
    migrate()
    os.execvp("uvicorn", [
        "uvicorn", "Backend.main:app", "--host", "0.0.0.0", "--port", "8000",
    ])


if __name__ == "__main__":
    main()
