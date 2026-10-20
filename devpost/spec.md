---
doc: spec
status: approved
updated: 2026-10-20
---

# Axis — Technical Specification

## User-Requested Architecture Update

On October 20, 2026, the user explicitly requested a backend architecture update: deterministic prioritization, AI for extraction and communication, separate task-fact/evidence and assessment storage, future login readiness, and an engine package at **`Backend/engine/`**, outside services.

This supersedes the earlier browser-first storage and LLM-driven ranking design. This specification distinguishes the target architecture from current implementation.

## Stack

- Frontend: Vite, React, TypeScript, Tailwind, React Context and existing local cache.
- Backend: Python 3.12, FastAPI, Pydantic, SQLAlchemy and psycopg.
- Persistence: PostgreSQL; `docker-compose.yml` defines PostgreSQL 16 for local use.
- Optional extraction: `google-genai`, configured by `GEMINI_API_KEY` and `GEMINI_MODEL`.
- Testing: unittest, disposable SQLite persistence tests and HTTPX ASGI API tests.
- Time handling: offset-aware datetimes, `zoneinfo` and `tzdata`.
- Exact package requirements live in `Backend/requirements.txt`.

## How This Works, In Plain Language

1. Source adapters map explicit fields from different provider shapes.
2. Extraction proposes additional facts with quotes. Fixture mode uses recorded mock output; Gemini mode calls a real model.
3. Validation checks shapes, field constraints and quote presence. Direct source fields win over extraction; unsupported dates remain unresolved.
4. Accepted tasks are saved with source evidence as user-owned revisions.
5. The deterministic engine computes metrics, applies ranking policy, repairs avoidable deadline ordering where its heuristic permits, and allocates capacity.
6. Assessments store decisions against exact task revisions.
7. Planned: AI generates explanations from finalized decisions, and the frontend reads the current assessment together with the task facts.

AI does not control scores or order. Extraction can influence input facts, so retained extracted values are marked for confirmation.

## Components and File Structure

```text
Backend/
  main.py
  database.py
  models/
    integrations.py       Source contracts and NormalizedTask
    priority.py           Engine input/output contracts
    db_models.py          Users, task revisions, calendar sources, assessments, legacy models
    schemas.py            Existing demo API contracts
  integrations/
    adapters.py           Mappings for six source types
    fixtures/
      sources.json        Vendor-shaped mock subsets plus connection context
      extractions.json    Recorded extraction responses
  ingestion/
    extraction.py         Fixture and Gemini extractors
    validation.py         Evidence checks and normalization
    pipeline.py           Synchronous preview orchestration
    store.py              User-scoped, replay-aware persistence
    __main__.py            CLI preview/import
    README.md
  engine/
    __init__.py           Public rank_tasks entry point
    pipeline.py           Engine orchestration
    calendar.py           Working-time calculations
    metrics.py            Deadline, slack, uncertainty and dependency metrics
    policy.py             Scoring tables and tier precedence
    scheduling.py         Allocation and conservative deadline-order repair
    assessment.py         Output facts and buckets
  services/
    priority_store.py     Load latest user task revisions and persist assessments
    seeder.py             Legacy demo seeds
    llm.py                Existing scripted chat behavior
  routers/
    tasks.py
    calendar.py
    chat.py
    plan.py
    priority.py
    integrations.py
  tests/
  PRIORITY_ENGINE.md
```

`Frontend/` retains its components, Context store, API client and local heuristic engine until the new backend flow is connected. The focus dashboard, briefing, timeline, rationale modal and approval card consume these legacy contracts today.

## Ingestion Contracts and Validation

Sources: Gmail, Notion, GitHub, Canvas, Google Calendar and manual tasks. Integration APIs are not expected to share a shape. Adapters produce Axis-owned records; extraction and validation produce `NormalizedTask`.

Source identity includes integration, account, source record and source item key. One email may yield zero or multiple tasks; structured task sources keep one primary task. Calendar events remain commitments, not tasks.

Task facts include title, description, deadline timestamp or date, deadline strictness, effort, importance, consequences, status, dependencies and evidence. Unknown fields remain null. Source fields override conflicting extracted fields. Milestone dates, labels and assignment points do not automatically become task deadlines or importance.

Every extracted non-null field needs a quote present in mapped source text. Quote presence is not proof of semantic correctness; retained extracted values require review. Relative Gmail dates use message time, not retrieval time. Adapter coverage and the explicit date grammar are documented in [the ingestion guide](../Backend/ingestion/README.md).

No ingestion table or broker is needed for the current mock flow. Fixture files provide replayability. Accepted task snapshots retain raw source content, mapped fields, extractor mode and fingerprints. Same-content replay does not create a revision; changed facts or source content do. Fetch time alone is ignored. Real-source deletion reconciliation and stable LLM action matching remain pending.

## Database Model

| Model/table | Responsibility |
|---|---|
| `UserModel` / `users` | Local identity and optional future provider/subject identity; no login endpoints or passwords |
| `TaskFactsModel` / `task_facts` | Composite key `(user_id, id, version)`; facts, source identity, evidence and source snapshot |
| `PriorityAssessmentModel` / `priority_assessments` | Composite FK to the exact owned task revision; run, rank, score, bucket, policy version, decision facts and explanation state |
| `CalendarSourceModel` / `calendar_sources` | Normalized calendar JSON scoped by user/account/source |
| Legacy `tasks`, `calendar_events`, `chat_messages` | Existing demo routes and frontend |

An assessment cannot reference another user's task revision. Run/task and run/rank uniqueness are scoped by user. Model constraints do not replace API authentication or user-filtered queries.

Task changes should insert new versions. Historical-row immutability, review confirmation and current-assessment selection require service/API wiring. Each assessment currently repeats its run input snapshot; a separate run table is a later storage improvement.

## Deterministic Ranking Policy

Current versions: engine `2`, policy `slack-v2`.

1. Exclude completed/cancelled tasks. Calculate working blocks in the chosen timezone, subtracting busy intervals once even when they overlap.
2. Calculate slack: available working hours before deadline minus remaining effort. Date-only deadlines require an explicit time policy; unknown effort stays unknown.
3. Choose tiers: deadline at risk, time-sensitive, normal, blocked. A hard deadline is at risk when overdue, slack is within the safety buffer, or unknown-effort work has a deadline within that buffer.
4. Score using the fixed policy:

| Factor | Points |
|---|---|
| Urgency | Up to 50 using slack bands; overdue gets 50 |
| Explicit delay impact | Critical 25, significant 15, minor 5, unknown 0 |
| Importance | High 15, medium 10, low 5, unknown 0 |
| Waiting age | One per elapsed day, capped at 10 |

Sort initially by tier, descending score, deadline, creation time and task ID. Try earliest-deadline order for schedulable tasks only when it removes at least one projected miss and introduces none. Record changes as decision facts; final ranks follow the resulting order.

Allocate split work without double-booking capacity. Now includes at-risk or time-sensitive work and work allocated today; Next includes other future allocations; Later includes blocked/unallocated work. Unknown-effort urgent tasks request an estimate without reserving imaginary time.

Dependencies block tasks until prerequisites are completed. The current engine does not propagate urgency to prerequisites or schedule dependency chains. Review-required inputs are flagged but provisionally evaluated. Global optimization, sticky overrides and non-splittable work are not implemented.

Full policy and request example: [engine guide](../Backend/PRIORITY_ENGINE.md).

## Routes and Service Entry Points

| Entry | Current behavior |
|---|---|
| `POST /api/integrations/mock/preview` | Offline fixed-fixture ingestion preview; no DB or live LLM call |
| `python -m Backend.ingestion` | Preview; `--persist` saves accepted facts and calendar records |
| `POST /api/priority/preview` | Deterministic evaluation of submitted facts/context; no DB access |
| `create_priority_run(db, user_id=..., context=..., delay_impacts=...)` | Internal service loads latest owned revisions and flushes assessments; caller commits |
| `GET/POST /api/tasks` | Legacy list/create; creation still accepts client scores and reasoning |
| `PATCH /api/tasks/{id}/toggle` | Legacy completion toggle |
| `PATCH /api/tasks/{id}/bucket` | Legacy manual bucket change |
| `POST /api/tasks/reset` | Resets legacy tasks, calendar and chat; not new task facts/assessments |
| `GET /api/calendar` | Legacy decimal-hour calendar records |
| `GET /api/chat/history`, `POST /api/chat` | Legacy chat storage and scripted responses |
| `POST /api/plan/apply` | Applies submitted legacy bucket moves; no persisted approval verification |
| `GET /`, `GET /health` | Static service information; health does not execute a DB probe |

No login or authenticated assessment persistence route exists. New preview routes do not expose private database records. Legacy routes remain unscoped demo APIs and must not be treated as a deployed multi-user system.

## AI Explanation and Conversational Changes — Planned

Save deterministic assessments first with explanation status pending. Generate short explanations from task evidence and finalized decision facts; store model/prompt version and generation time on that assessment. Handle failures explicitly and reject stale output for superseded decisions when selecting current results.

For dialogue, AI translates requests into proposed constraints. Validated constraints go through the deterministic engine. The user approves a concrete change before application. Current scripted chat and legacy apply routes do not implement this complete behavior.

## Run and Verify

From the repository root:

```powershell
pip install -r Backend/requirements.txt
docker compose up -d
uvicorn Backend.main:app --reload --port 8000
```

Frontend: run `npm install` and `npm run dev` in `Frontend/`; open localhost:5173.

```powershell
python -m Backend.ingestion
python -m Backend.ingestion --persist --user-id local-demo --create-user
python -m Backend.ingestion --extractor gemini
python -m unittest discover -s Backend/tests -v
```

Default preview requires no database or LLM. Gemini mode requires credentials/model and has not been verified against a live provider in this work. Persistence requires the configured database. `create_all()` creates missing tables but does not migrate existing schemas. Tests use disposable SQLite, not live PostgreSQL.

## Important Failure Modes

- Invalid extraction: reject that record and return an issue; preserve other accepted records. CLI exits nonzero when records are rejected.
- Unsupported deadline or missing effort: retain uncertainty rather than invent facts.
- Provider failure: explicit rejected-record issues; no silent mock substitution.
- Capacity conflict: projected deadline-miss warning; repair is not a guarantee that every feasible schedule will be found.
- Repeated import: compare fingerprints and preserve unchanged versions.
- Stale explanation: future current-assessment selection must check task versions and context.
- User identity: trusted ownership is required for internal writes; login remains pending.

## Implementation Status and Remaining Work

Implemented and verified with 34 passing backend tests: source contracts, mock adapters, fixture extraction, validation, ingestion persistence behavior, user-owned database constraints, engine pipeline, previews and assessment storage.

Remaining: migrations for existing installs; authenticated API wiring; review/confirmation UI; calendar-to-engine context mapping; new backend results on the frontend; AI explanations; engine-backed dialogue and durable approval/override behavior; end-to-end demo verification.

The tests establish covered behavior, not optimal prioritization or live vendor integration correctness.
