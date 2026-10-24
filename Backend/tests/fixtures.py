"""Explicit calendar input for tests; production demo feeds may omit calendars."""
from Backend.ingestion.pipeline import load_fixtures


def fixtures_with_calendar():
    envelopes = load_fixtures()
    envelopes.insert(-1, {
        "integration": "google_calendar", "accountId": "test-calendar",
        "fetchedAt": "2026-10-20T08:00:00+08:00",
        "payload": {
            "id": "meeting", "calendar_id": "primary", "summary": "Team meeting",
            "start": {"dateTime": "2026-10-20T10:00:00+08:00", "timeZone": "Asia/Shanghai"},
            "end": {"dateTime": "2026-10-20T11:00:00+08:00", "timeZone": "Asia/Shanghai"},
        },
    })
    return envelopes
