# Mock integration ingestion

Run from the repository root:

```powershell
# Offline preview: no database or LLM connection required.
python -m Backend.ingestion

# Persist accepted outputs and create a local user if needed.
python -m Backend.ingestion --persist --user-id local-demo --create-user

# Optional real extraction; requires GEMINI_API_KEY and GEMINI_MODEL.
python -m Backend.ingestion --extractor gemini
```

The CLI reads environment variables, the root `.env`, then `Backend/.env` without
overriding existing values. Never commit credentials. `--persist` uses DATABASE_URL
and creates missing tables; it does not migrate previously created table schemas.
It saves accepted records even if other records fail; the printed issues and exit
code 1 identify rejected records. Use preview first to inspect extraction results.

With the backend running, `POST /api/integrations/mock/preview` runs the bundled
offline fixtures. It accepts no user identity or arbitrary payload and performs
no database access. A public persistence endpoint is intentionally deferred until
authentication provides a trusted user context.

## Flow

```text
integrations/fixtures/sources.json
    → integrations/adapters.py
    → GmailRecord / NotionRecord / GitHubRecord / CanvasRecord
    → extractor (recorded fixture responses or Gemini)
    → validation.py (evidence + date normalization + source precedence)
    → NormalizedTask
    → store.py
    → task_facts with source_snapshot and evidence
```

Manual tasks map directly from user fields. Calendar events map directly into
`calendar_sources`, scoped by user, account and source ID. Calendar events are
not converted into tasks. The priority engine does not yet automatically load
these events; the caller still builds its `busyIntervals`.

No ingestion table, queue, worker or pub/sub broker is introduced. Fixture files
provide replayable raw input; accepted tasks retain raw source content, mapped
fields, extraction mode and a fingerprint in `source_snapshot`.

## Fixture coverage

Seven records cover Gmail, Notion, GitHub, Canvas, Google Calendar and manual
tasks. The default preview yields five tasks, one calendar event and one ignored
newsletter. Fixtures use fixed October 2026 dates for repeatability.

`sources.json` contains vendor-shaped subsets plus adapter context. Context such
as `accountId`, Canvas course names and calendar IDs would be supplied by a real
connector. These are not full vendor response schemas. Notion's mock adapter
maps configured-in-code `Name`, `Due`, and `Status` properties, plus a flattened
paragraph-block subset. Gmail supports text/plain body parts, not attachment
fetching or a full HTML/MIME traversal. Real OAuth, pagination, deletions, archived
items and source-specific status reconciliation are outside this mock harness.

`extractions.json` is explicitly recorded mock output, not an AI model. It passes
through the same extraction schema, quote checks and normalization as Gemini.
Missing recorded responses cause an explicit rejected-record issue.

## Validation and persistence

- Explicit structured fields take precedence over extracted values.
- Positive finite effort estimates are required for extracted values. Unknown
  effort, importance and deadline strictness remain null.
- Every extracted non-null field must have a nonempty quote present in the
  mapped source text. Deadline expressions must also appear in their quote.
- Quote matching proves source presence, not semantic correctness. Retained
  extracted facts are marked `needsConfirmation` / `requiresReview`; a review
  UI and confirmation workflow are not implemented.
- Relative Gmail dates use `receivedAt`, rather than retrieval time. Other
  sources use update time when supplied, otherwise fetch time. The date grammar
  accepts ISO dates/offset timestamps and `noon|midnight|h:mm AM/PM today|tomorrow`.
  Unsupported expressions remain unknown and produce an unresolved-date issue.
- Milestone deadlines, security labels and assignment points do not silently
  become task deadlines or importance. Submission state is not task completion.
- One email may yield zero or multiple tasks; structured task sources keep one
  `primary` task. Stable `itemKey` values determine task identity.
- Deterministic task IDs include the owner and source identity. Identical replay
  leaves the existing version intact; changed accepted facts or source content
  create a new task revision. Fetch time alone does not create a new revision.
- Writes lock the owning user row on PostgreSQL and commit through the caller's
  transaction. This prevents cooperating import calls from allocating the same
  version concurrently.

Gemini output keys can vary between calls. Matching extracted actions across
rewritten emails, superseded source updates, or renamed item keys needs a future
reconciliation policy; removed actions are not automatically cancelled here.
The existing demo task API and frontend are not switched to these new records.

Tests: `python -m unittest discover -s Backend/tests -v`.
