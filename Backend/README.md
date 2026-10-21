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

Before startup, with application writers stopped, run:

```bash
python -m Backend.migrate
```

This applies the PostgreSQL priority-run migration to existing databases and
creates missing tables, including credentials and sessions. It preserves data.
Fresh SQLite databases are also supported for offline development.
`DATABASE_URL` is required; see `.env.example`. Root `.env` takes precedence over
`Backend/.env`; process environment variables take precedence over both.

## End-to-end mock workspace

Start the frontend with `npm run dev` from `Frontend/`. Vite proxies `/api` to
port 8000. Create an account (password: at least 12 characters), then select
**Import mock feeds**. Each account owns independent task facts and priority runs.

The mock scenario uses **October 20, 2026 at 08:00, Asia/Shanghai** deliberately,
so replayable fixture deadlines do not drift with the real clock. Gmail, GitHub,
Canvas, Notion, calendar, and manual inputs are local fixtures. Extraction uses
recorded structured outputs by default. Set `EXTRACTION_MODE=gemini` to extract
facts from those same local fixtures using Gemini instead. There are no live
integration clients or tokens.

Import validates and persists facts, derives busy intervals from stored calendar
records, saves deterministic rankings, then generates the briefing and per-card
explanations outside the ranking transaction. Requests wait for completion; the
UI shows progress and keeps errors visible. Replaying unchanged fixtures keeps
user edits. Edit estimates, confirm evidence, complete tasks, or reopen them
from Integrations; every edit creates a new revision and recalculates the run.
Stale version edits return 409 instead of overwriting another change.

`EXPLANATION_MODE=rules` (default) is fully offline. Set it to `gemini` and supply
`GEMINI_API_KEY` plus `GEMINI_MODEL` (or `GEMINI_EXPLANATION_MODEL`) to enable
whole-run AI explanations. Provider failures preserve rankings and display
rule-based explanations. Refresh priorities retries by creating a new run.
The UI always labels the explanation source. Mock extraction is not an AI call.

The frontend reads saved backend state; it no longer uses seeded localStorage,
client scoring, or independently generated schedules. The assistant displays
saved explanations and does not generate chat-based priority changes.

## HTTP routes

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`,
  `GET /api/auth/me`: local accounts and revocable HttpOnly cookie sessions.
- `GET /api/workspace`: current saved cards, briefing, capacity, and calendar.
- `POST /api/workspace/sync-mock`: import fixtures and run the complete pipeline.
- `POST /api/workspace/refresh`: recalculate saved facts and explanations.
- `PATCH /api/workspace/tasks/{id}`: version-checked effort, importance, status,
  and evidence-confirmation changes.
- Priority and integration preview routes remain stateless fixture tools.

Workspace routes require login; mutations require `X-Axis-Request: 1` and an
allowed browser origin. Production must serve frontend and API on the same
origin (proxy `/api`), use HTTPS with `COOKIE_SECURE=true`, and deploy a shared
login rate limiter if running multiple workers. Password reset, email verification,
background jobs, and live integrations are outside this mock implementation.

Legacy demo routers and tables are preserved for historical data but are no
longer mounted. No legacy demo records are automatically seeded.

## Tests

```bash
python -m unittest discover -s Backend/tests -v
```

