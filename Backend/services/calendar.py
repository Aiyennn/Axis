"""Calendar snapshot persistence; transaction ownership stays with the caller."""
from sqlalchemy import select
from Backend.models.db_models import CalendarSourceModel
from Backend.services.ownership import lock_owner


def reconcile_calendar(db, user_id, preview, *, selected):
    # A rejected or unselected feed must not erase the last accepted snapshot.
    if not selected or any(issue.get("integration") == "google_calendar" for issue in preview.issues):
        return
    lock_owner(db, user_id)
    current_ids = {(record.accountId, record.sourceId) for record in preview.calendarEvents}
    for stored in db.scalars(select(CalendarSourceModel).where(CalendarSourceModel.user_id == user_id)):
        if (stored.account_id, stored.source_id) not in current_ids:
            db.delete(stored)
    db.flush()
