"""Create and explain a local priority run, or explain an existing run."""
import argparse
import json
from pathlib import Path
from dotenv import load_dotenv


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--user-id", required=True)
    parser.add_argument("--run-id")
    parser.add_argument("--context", help="JSON file matching PriorityContext for a new run")
    parser.add_argument("--rules", action="store_true", help="Use deterministic fallback text only")
    parser.add_argument("--retry", action="store_true")
    args = parser.parse_args()
    if not args.run_id and not args.context:
        parser.error("Provide --run-id or --context; calendar context must be explicit")
    load_dotenv()
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
    from Backend.database import SessionLocal
    from Backend.models.priority import PriorityContext
    from Backend.services.priority_store import create_priority_run
    from .service import explain_run, current_run_view
    run_id = args.run_id
    if run_id is None:
        context = PriorityContext.model_validate_json(Path(args.context).read_text(encoding="utf-8"))
        with SessionLocal.begin() as db:
            run_id, _ = create_priority_run(db, user_id=args.user_id, context=context)
    state = explain_run(SessionLocal, user_id=args.user_id, run_id=run_id,
                        retry=args.retry, use_ai=not args.rules)
    with SessionLocal() as db:
        print(json.dumps(dict(requestedRunId=run_id, generationStatus=state,
                              current=current_run_view(db, user_id=args.user_id)), indent=2))


if __name__ == "__main__":
    main()
