# Whole-run explanations

The engine owns ranking. One explanation request receives the entire finalized
run: scheduling context, calculated capacity summary, task facts/evidence, final
ranks/buckets, score breakdowns, decision facts, proposed blocks and warnings.
It returns a shared briefing plus an explanation for every assessment.

## Lifecycle

1. `create_priority_run()` writes one `PriorityRunModel` with the shared snapshot
   and linked assessment rows. A per-user generation number orders runs.
2. It immediately stores rules-based briefing/card text with status `pending`.
   Commit this transaction before generation.
3. `explain_run(SessionLocal, user_id=..., run_id=...)` claims an attempt token,
   commits the claim, and calls Gemini outside any database transaction.
4. Validate exact assessment coverage, unique IDs, allowed fields, referenced
   decision codes and related-task membership. No score/rank/bucket fields are
   accepted in generated output.
5. Save briefing and all card explanations atomically as `ready`. Any provider
   or validation failure stores fallback templates as `fallback`, with a sanitized
   error class on the run. Never label templates as AI-generated.
6. Before saving, recheck the current generation, task versions, stored calendar
   fingerprints and attempt token. Stale or superseded responses cannot overwrite
   the current run. `current_run_view()` returns stale/needs-reprioritization instead
   of old cards when its snapshot no longer matches stored data.

The caller must create a new run for changes in preferences, supplied busy
intervals or the evaluation clock. Stored calendar changes are detected, but
building engine context from stored calendar records remains a separate step.

## Local usage

Create an explicit context file matching `PriorityContext`, including busy intervals,
working hours, timezone and evaluation time. From the repository root:

```powershell
# Rank stored tasks and persist an offline briefing and task explanations.
python -m Backend.explanations --user-id local-demo --context context.json --rules

# Generate Gemini explanations for an existing committed run.
python -m Backend.explanations --user-id local-demo --run-id RUN_ID --retry
```

Set `GEMINI_API_KEY` and either `GEMINI_EXPLANATION_MODEL` or `GEMINI_MODEL` in the
environment or Backend/.env. Missing configuration results in clearly labeled
fallback explanations. `--retry` explicitly replaces an earlier attempt; it can
recover a run left `generating` by a process crash. There is no background job
scheduler or automatic crash recovery yet.

Use the internal `current_run_view(db, user_id=...)` for a future authenticated
route. It returns the briefing and task explanations, status and source labels.
The legacy frontend card API is not automatically redirected to these records;
login and frontend integration remain separate work. No public user-ID-based
database route is exposed.

## Database upgrade

Fresh installations get `priority_runs` from metadata creation. For a database
created with the previous models, apply `../migrations/001_priority_runs.sql`
with application writers stopped. It backfills historical runs from their
assessment snapshots and adds the owner-scoped FK and explanation-details column.
`create_all()` alone cannot upgrade existing tables. The migration was supplied
but has not been executed against the user's PostgreSQL database.

New assessments no longer duplicate the whole run snapshot. Legacy snapshots
remain for historical compatibility. Empty runs are persisted and produce an
empty-task briefing without making an LLM request.

## Limits and tests

Quote/reference validation does not prove semantic entailment of every generated
sentence. The prompt prohibits invention and the response always retains the
engine's original warnings. Source facts requiring confirmation stay provisional.
The provider makes one bounded request with a 20-second timeout and a context
size limit; oversized, truncated or invalid responses use fallback text.

Tests use fake providers, including malformed output, timeout, missing/duplicate
assessments, stale task versions, newer runs and superseded attempts. No live
provider credentials or real database are required for the test suite.
