from fastapi import Cookie, Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session

from app.core.audit import audit
from app.core.security import decode_token
from app.db.session import get_db
from app.models import User


def get_current_user(request: Request, db: Session = Depends(get_db),
                     ks_token: str | None = Cookie(default=None),
                     authorization: str | None = Header(default=None)) -> User:
    token = ks_token
    if not token and authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:]
    uid = decode_token(token) if token else None
    user = db.get(User, uid) if uid else None
    if not user or not user.is_active:
        raise HTTPException(401, "Not authenticated")
    return user


def user_permissions(user: User) -> set[str]:
    return {p.code for p in user.role.permissions}


def require(*codes: str):
    """Require ALL listed permissions. Roles come from the DB, never from the client."""
    def dep(user: User = Depends(get_current_user)) -> User:
        have = user_permissions(user)
        if not all(c in have for c in codes):
            raise HTTPException(403, "Forbidden")
        return user
    return dep


def require_sensitive(code: str, action: str):
    """Permission check that also writes an audit record (for sensitive executive/finance reads)."""
    def dep(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
        if code not in user_permissions(user):
            raise HTTPException(403, "Forbidden")
        audit(db, user.id, action)
        db.commit()
        return user
    return dep
