"""Shared transaction locking for writes to a user's pipeline state."""
from sqlalchemy import select

from Backend.models.db_models import UserModel


def lock_owner(db, user_id):
    """Require an existing owner and serialize their writes on PostgreSQL.

    The caller owns the transaction. This is not an authentication check;
    user_id must already come from trusted application context.
    """
    owner = db.execute(
        select(UserModel).where(UserModel.id == user_id).with_for_update()
    ).scalar_one_or_none()
    if owner is None:
        raise ValueError("User does not exist")
