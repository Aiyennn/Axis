# Axis — Backend

The backend uses FastAPI, SQLAlchemy/PostgreSQL, and Gemini for extraction and
explanations. The redesigned pipeline is:

Raw integration data → adapters → extraction → validation → task facts and source
evidence → deterministic priority engine → saved assessments → whole-run briefing
and task explanations.

## Code ownership

| Directory | Responsibility |
|---|---|
| `integrations/` | Source contracts, adapters, and mock fixtures |
| `ingestion/` | Extraction, validation, versioned persistence, and import CLI |
| `engine/` | Deterministic scoring, ranking, and proposed work allocation |
| `explanations/` | Run context, Gemini explanations, rule fallback, and generation CLI |
| `services/priority_store.py` | Read latest task facts and persist a priority run |
| `services/ownership.py` | Shared per-user transaction lock |
| `models/` | Database models and API/pipeline contracts |
| `routers/` | HTTP endpoints |

See [ingestion](ingestion/README.md), [priority engine](PRIORITY_ENGINE.md),
and [explanations](explanations/README.md) for usage and limitations.

## Run

From the repository root, configure `DATABASE_URL` and start PostgreSQL, then:

```bash
pip install -r Backend/requirements.txt
uvicorn Backend.main:app --reload --port 8000
```

Existing databases need the migration described in the explanations guide.
Application startup creates missing tables and seeds the frontend demo.

## Frontend compatibility

The frontend still calls the seeded `/api/tasks`, `/api/calendar`, `/api/chat`,
and `/api/plan` routes. Their `TaskModel`, `CalendarEventModel`, `ChatMessageModel`,
schemas, and seeder remain required until the frontend moves to priority runs.
`services/demo_chat.py` supplies scripted demo replies and proposals; it does
not call an LLM. Demo scores and explanations are separate from the new pipeline.

The redesigned pipeline currently has priority and mock-ingestion preview routes
plus internal persistence services and CLIs. Authentication and authenticated
run endpoints are not implemented yet; user-scoped models accommodate them.

## Tests

```bash
python -m unittest discover -s Backend/tests -v
```

