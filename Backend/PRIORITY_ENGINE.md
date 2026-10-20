# Deterministic priority engine

`engine/` evaluates validated facts without AI or database calls.
Identical inputs, including `context.now`, produce identical ordered results.

## Package structure

```text
engine/
  __init__.py     Public rank_tasks entry point
  pipeline.py     Orchestrates the calculation stages
  calendar.py     Working blocks and available hours
  metrics.py      Deadline resolution, slack, dependencies and uncertainty
  policy.py       Scoring tables and ordered tier rules
  scheduling.py   Capacity allocation and conservative deadline-order repair
  assessment.py   Output construction, buckets and decision facts
```

The router and database service continue importing `rank_tasks` from
`Backend.engine`. Persistence stays in `priority_store.py`;
the pipeline does not access the database. Policy values and precedence are
centralized, and immutable metrics and allocation records pass between stages.

## Policy slack-v2 (engine version 2)

1. Exclude completed and cancelled tasks. Input must contain exactly one current
   revision per task ID, including completed prerequisites.
2. Build free working blocks in the user's timezone, excluding nonworking days and
   supplied busy intervals. Overlapping busy intervals consume capacity only once.
   Calendar input is authoritative for the configured horizon, including future days.
3. Calculate `slack = free working hours before deadline - estimated remaining effort`.
   Date-only deadlines require an explicit `dateOnlyDeadlineTime` policy. Missing
   effort or deadlines remain unknown. Capacity beyond the horizon is unknown.
4. Choose tiers: hard deadline overdue or slack <= safety buffer: `deadline_at_risk`;
   a hard deadline within the safety buffer is also at risk when effort is unknown;
   otherwise due within 24 elapsed hours: `time_sensitive`; otherwise `normal`.
   Tasks with unresolved dependencies go to `blocked`, after actionable tasks,
   keeping deadline warnings. Missing, cancelled, cyclic and pending prerequisites
   are unresolved; only completed prerequisites count as satisfied.
5. Score within each tier:

| Factor | Points |
|---|---|
| Slack <=0 / <=1 / <=3 / <=8 / >8 hours | 50 / 45 / 35 / 25 / 10 |
| Overdue deadline | 50 urgency points |
| Unknown slack, including deadlines beyond horizon | 0 urgency points |
| Critical / significant / minor / unknown delay impact | 25 / 15 / 5 / 0 |
| High / medium / low / unknown importance | 15 / 10 / 5 / 0 |
| Each full elapsed day waiting | 1, capped at 10 |

   Impact must be supplied explicitly, never inferred from prose or source type.
   Sort by tier, descending score, earliest deadline, oldest creation, then task ID.
6. Compare the policy order with earliest-deadline order for schedulable tasks.
   Adopt the alternative only if its missed-task set is a strict subset of the
   original missed-task set: at least one miss removed and no new misses.
   Unknown-effort and blocked tasks retain their positions. A changed order gets
   `DEADLINE_ORDER_REPAIRED` decision facts, and final ranks match allocation order.
   This bounded repair can cross tiers and scores to preserve deadlines, but is
   not a global optimization algorithm.
7. Reserve free work blocks in final ranking order, consuming each block only once.
   The engine assumes work can be split and `estimatedHours` means remaining
   effort. This is a proposed allocation, not a calendar write. Dependency-blocked
   tasks are not allocated, even if their prerequisite has a proposed completion.
   Unknown-effort tasks cannot reserve time and receive an explicit warning.
8. Bucket: `now` for at-risk/time-sensitive tasks or tasks allocated time today;
   `next` for other tasks allocated later; `later` for blocked/unallocated tasks.
   Unknown-effort urgent tasks stay in `now` and emit an `ACTION_REQUIRED` fact
   requesting an effort estimate; they do not reserve imaginary work time.
   Buckets describe the tier and allocation, rather than independent score thresholds.

Every result carries the score breakdown, structured decision facts, slack, planned
blocks and warnings. Competing tasks may individually have positive slack but still
miss deadlines after higher-ranked tasks consume capacity. `PROJECTED_DEADLINE_MISS`
reports that conflict. Overdue tasks remain actionable and can consume future time;
the engine does not silently drop them. It does not automatically promote blocked
tasks' prerequisites, optimize the global schedule, or support sticky manual overrides
in this version. Review-required facts are flagged but still provisionally evaluated.

## Preview API

`POST /api/priority/preview` validates and evaluates submitted inputs only. It does
not query users, read private records, persist assessments, or require an LLM key.
The existing demo task board and scripted chat continue using their current routes.

Example request:

```json
{
  "context": {
    "now": "2026-10-20T09:00:00+08:00",
    "timezone": "Asia/Shanghai",
    "workdayStart": "09:00:00",
    "workdayEnd": "18:00:00",
    "busyIntervals": []
  },
  "tasks": [{
    "version": 1,
    "createdAt": "2026-10-20T08:00:00+08:00",
    "delayImpact": "critical",
    "task": {
      "id": "task-1",
      "source": {
        "integration": "gmail",
        "accountId": "account-1",
        "sourceId": "message-1",
        "sourceItemKey": "hero-revision"
      },
      "title": "Client Hero Revision",
      "deadlineAt": "2026-10-20T12:00:00+08:00",
      "isHardDeadline": true,
      "estimatedHours": 2,
      "importance": "high",
      "ingestedAt": "2026-10-20T08:00:00+08:00"
    }
  }]
}
```

## Database entry point

`services/priority_store.py:create_priority_run(db, user_id=..., context=...,
delay_impacts=...)` loads each user's latest task revisions, preserves original
ingestion time for waiting age, and flushes linked `PriorityAssessmentModel` rows.
The caller commits or rolls back the transaction. The full input snapshot, including
explicit impact classifications, is saved once on `PriorityRunModel` so runs can be
reproduced. Explanations start as `pending` with deterministic fallback text.
An empty task set persists a run without assessment rows. After committing, call
`Backend.explanations.service.explain_run` for the shared briefing and per-task
AI explanations. See [the explanation guide](explanations/README.md).

This is an internal service: its owner must come from trusted application context.
No user-ID-based public database endpoint is exposed before login exists. The
application must select assessments for the latest task versions and context when
serving the board. Existing databases still require the previously discussed model
migration; no live schema changes are applied by this implementation.

Run checks: `python -m unittest discover -s Backend/tests -v`.
