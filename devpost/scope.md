---
doc: scope
status: approved
updated: 2026-10-20
---

# Axis

An AI-assisted productivity command center for student freelancers juggling coursework, client deliverables and personal commitments across disconnected apps.

## User-Requested Architecture Update — October 20, 2026

The user explicitly requested an update to the backend architecture. They chose a **deterministic engine to decide task order**, with AI extracting supported facts and communicating decisions. They also requested separate storage for task facts/source evidence and priority assessments, preparation for future user login, and a dedicated **`Backend/engine/`** directory outside `services/`.

This revision supersedes the earlier LLM-driven prioritization and browser-only persistence plan. The product audience, visual identity and human-approved plan-change experience remain the direction.

## The Unique Kernel

Explainable deterministic prioritization based on deadlines, available working time, explicit impact, importance and waiting age. The engine returns rankings, Now/Next/Later buckets, proposed work blocks and decision facts. AI may explain these outputs but does not assign scores or change the order.

## Who It's For

Student freelancers coordinating Gmail, Notion, GitHub, Canvas, Google Calendar and personal tasks. Axis helps them understand what needs attention and whether their commitments fit the available time.

## The Core Loop

1. **Consolidate:** Read different source formats through integration-specific adapters.
2. **Validate:** Map explicit fields; extract additional stated facts with evidence. Unknown values stay unknown and uncertain extraction requires review.
3. **Prioritize:** Run validated task facts and calendar constraints through the deterministic engine.
4. **Understand:** Show scores, capacity warnings and source evidence; attach an AI explanation when available.
5. **Adapt and execute:** Interpret user constraints, rerun the engine and present plan changes for approval before applying them.

## Backend Data Flow

```text
Mock fixtures / future integration APIs
  → source adapters and structured field mapping
  → extraction of additional facts
  → validation and normalization
  → database: versioned task facts + source evidence
  → deterministic priority engine
  → database: priority assessments and decision facts
  → AI explanation attached to its assessment
  → frontend
```

Calendar events become availability constraints rather than task cards. Manual tasks map directly from user fields. Informational messages can produce no tasks.

## The POC Boundary

- React/TypeScript frontend with the existing dark focus dashboard, timeline, task interactions, integration views and assistant.
- Python FastAPI backend with PostgreSQL persistence and user-scoped models.
- Mock ingestion for Gmail, Notion, GitHub, Canvas, Google Calendar and manual tasks.
- Gemini AI extraction with offline recorded fixtures for resilience and testing.
- Versioned task facts, evidence and assessments; deterministic engine in its own package.
- Future AI explanations grounded in engine outputs, with explicit pending/failure states.
- A local user can own data before login is implemented. Login flows remain pending.

## Current Implementation Boundary

Backend schemas, user ownership, deterministic ranking, preview routes and mock ingestion with persistence support are implemented. The new ingestion fixtures produce five tasks, one calendar event and one ignored newsletter from seven records. Existing frontend seeds are a separate legacy demo dataset.

The frontend still uses the legacy task API. It is not yet connected to the new task-fact/assessment flow. The current chat service is scripted. AI explanation generation, review UI, authenticated routes and engine-backed conversational overrides remain pending; they must not be presented as completed demo features.

## Inspiration & Identity

- **Feel:** Calm, focused and transparent.
- **Visual direction:** Dark neutral surfaces, violet accents, clear source and priority labels, a prominent focus task and supporting schedule/capacity widgets.
- **Learning purpose:** Build fluency in source normalization, deterministic decision systems, evidence-based AI assistance and explicit service boundaries.

## What "Working" Looks Like

The target 60-second walkthrough, after the remaining wiring is complete:

1. Show varied incoming mock sources and a validated task with supporting evidence.
2. Run deterministic prioritization and inspect its score, time allocation and warnings.
3. Ask for a change, inspect an engine-evaluated proposal and approve or reject it.

Until then, demonstrate backend previews separately and label fixture extraction and scripted chat honestly.

## Later

- Live OAuth, vendor webhooks and complete vendor API clients.
- Login implementation, authenticated read/write routes and account settings.
- Queue workers, pub/sub and an ingestion-record table. Replayable fixture files are sufficient for this synchronous mock pipeline.
- Global schedule optimization, dependency urgency propagation and sticky overrides.
- Cross-device sync and native mobile apps.

## Explicitly Cut

- Autonomous external actions such as sending email or changing calendar events.
- Team collaboration and shared-account permissions for this individual-user POC.
- A broker solely to process mock fixtures.
