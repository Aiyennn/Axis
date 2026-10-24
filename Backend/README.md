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

## Workspace architecture

`routers/workspace.py` handles HTTP requests and authenticated identity only.
`dependencies.py` composes `WorkspaceService` with a session factory and the
provider modes from `config.py`; tests can override either dependency.
`models/workspace.py` defines the unchanged request contracts. Expected
application errors live in `services/errors.py` and map to HTTP responses in
`main.py`.

`services/workspace.py` owns workflow transactions. Task edits and ranking commit
atomically; imports reconcile calendars, persist facts, and rank in one transaction.
`services/task_versions.py` appends revisions and updates evidence without changing
historical facts. `services/calendar.py` reconciles complete, accepted calendar
snapshots. These helpers flush but never commit. Owner locks serialize writes on
PostgreSQL, including reading calendar inputs for ranking. Extraction runs before
writes, and explanation generation runs after commit; existing attempt tokens and
snapshot checks prevent stale provider responses from overwriting newer state.

## Auth and chat architecture

`services/auth.py` owns credential checks, account/session transactions, password
hashing, and the local login limiter. Auth routes set or delete cookies only after
successful service calls. `dependencies.py` handles HTTP origin/header checks,
extracts session tokens, and injects services and configuration. Application
failures map to the existing HTTP errors in `main.py`. `config.py` centralizes
origins, secure-cookie settings, and chat provider configuration.

`services/chat.py` reads history and coordinates best-effort message persistence
and replies. `services/chat_provider.py` contains Gemini prompt construction and
SDK calls. User and assistant messages retain separate transactions, and no
transaction spans a provider call. Missing configuration, empty responses, and
provider/storage failures preserve the existing chat behavior. Chat and its
history retain their existing unauthenticated, shared-history API contract.

Workspace responses include `aiBriefingsEnabled` so the dashboard can hide AI
retry controls when explanations use rules. Saved briefing text remains visible
for fallback and interrupted generation states. Only a briefing request active
in the current page shows a waiting animation. An explicit briefing retry may
replace a saved `generating` attempt after a server restart; attempt tokens
prevent the older result from overwriting its replacement. Gemini briefing calls
use a 20-second request timeout and one attempt, then retain the rule-based
briefing on failure. Loading the workspace still does not call Gemini.

## Reading backend logs

Application logs use this layout:

```text
15:04:01.123 | INFO    | req=abc123 | POST /api/chat |    +0.002s | START | chat.database.save_user | elapsed_s=0.000
15:04:01.140 | INFO    | req=abc123 | POST /api/chat |    +0.019s | DONE  | chat.database.save_user | elapsed_s=0.017
15:04:01.141 | INFO    | req=abc123 | POST /api/chat |    +0.020s | START | chat.gemini.generate | model=... elapsed_s=0.000
15:04:06.142 | WARNING | req=abc123 | POST /api/chat |    +5.021s | WAIT  | chat.gemini.generate | model=... elapsed_s=5.001
```

Follow one `req` ID (also returned in the `X-Request-ID` response header).
The `+...s` column measures time since the request arrived; `elapsed_s` measures
only the named stage. `START`, `DONE`, and `FAIL` identify operation boundaries.
Stages still running emit `WAIT` every five seconds, retaining the originating
request ID even from worker threads. Startup work uses `background` instead of
an HTTP route. Existing dotted event names remain searchable.

Chat stages distinguish each database save, Gemini client initialization,
generation, and task tool use. The Gemini generation stage covers SDK requests,
automatic tool round trips, and any internal retries; it does not claim to time
individual network attempts. Authentication, workspace reads/imports/ranking,
and briefing preparation/generation/validation/saving also have stage markers.
Logs contain operation metadata and exception types, not chat bodies or keys.

## Tests

```bash
python -m unittest discover -s Backend/tests -v
```

