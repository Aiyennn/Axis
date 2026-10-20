"""python -m Backend.ingestion [--persist --user-id local-demo --create-user]"""
import argparse
import json
from pathlib import Path

from dotenv import load_dotenv


def main():
    parser = argparse.ArgumentParser(description="Replay mock sources through task ingestion")
    parser.add_argument("--user-id", default="local-demo")
    parser.add_argument("--timezone", default="Asia/Shanghai")
    parser.add_argument("--extractor", choices=["fixture", "gemini"], default="fixture")
    parser.add_argument("--persist", action="store_true")
    parser.add_argument("--create-user", action="store_true")
    args = parser.parse_args()
    load_dotenv()
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
    from .extraction import FixtureExtractor, GeminiExtractor
    from .pipeline import preview_import
    extractor = FixtureExtractor() if args.extractor == "fixture" else GeminiExtractor()
    preview = preview_import(user_id=args.user_id, timezone=args.timezone, extractor=extractor)
    summary = preview.model_dump(mode="json")
    if args.persist:
        from Backend.database import Base, engine, SessionLocal
        from Backend.models.db_models import UserModel
        from .store import persist_import
        Base.metadata.create_all(engine)
        with SessionLocal.begin() as db:
            if args.create_user and db.get(UserModel, args.user_id) is None:
                db.add(UserModel(id=args.user_id, display_name="Local mock user"))
                db.flush()
            summary["persistence"] = persist_import(db, user_id=args.user_id, preview=preview)
    print(json.dumps(summary, indent=2))
    return 1 if any(i["code"] == "RECORD_REJECTED" for i in preview.issues) else 0


if __name__ == "__main__":
    raise SystemExit(main())
