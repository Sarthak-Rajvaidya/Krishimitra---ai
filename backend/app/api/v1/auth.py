import time
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, user_permissions
from app.core.config import get_settings
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models import FarmerProfile, Role, RoleName, User

router = APIRouter(prefix="/auth", tags=["auth"])
_attempts: dict[str, list[float]] = defaultdict(list)


def rate_limit(key: str, limit: int, window: int = 60) -> None:
    limit *= get_settings().rate_limit_multiplier
    now = time.time()
    _attempts[key] = [t for t in _attempts[key] if now - t < window]
    if len(_attempts[key]) >= limit:
        raise HTTPException(429, "Too many requests, try again shortly")
    _attempts[key].append(now)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    full_name: str = Field(min_length=2, max_length=160)
    phone: str | None = Field(default=None, max_length=20)
    district: str | None = None
    state: str | None = None


def user_out(u: User) -> dict:
    return {"id": u.id, "email": u.email, "full_name": u.full_name, "role": u.role.name.value,
            "permissions": sorted(user_permissions(u)), "language": u.language, "is_demo": u.is_demo}


def _set_cookie(resp: Response, uid: int) -> None:
    s = get_settings()
    resp.set_cookie("ks_token", create_access_token(uid), httponly=True, samesite="lax",
                    secure=s.cookie_secure, max_age=s.access_token_expire_minutes * 60, path="/")


@router.post("/login")
def login(body: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)):
    rate_limit(f"login:{request.client.host if request.client else 'x'}", 10)
    u = db.scalar(select(User).where(User.email == body.email.lower()))
    if not u or not u.is_active or not verify_password(body.password, u.password_hash):
        raise HTTPException(401, "Invalid email or password")
    _set_cookie(response, u.id)
    return {"user": user_out(u), "token": create_access_token(u.id)}


@router.post("/register", status_code=201)
def register(body: RegisterIn, request: Request, response: Response, db: Session = Depends(get_db)):
    rate_limit(f"reg:{request.client.host if request.client else 'x'}", 5)
    if db.scalar(select(User).where(User.email == body.email.lower())):
        raise HTTPException(409, "Email already registered")
    role = db.scalar(select(Role).where(Role.name == RoleName.FARMER))  # role is never taken from the client
    u = User(email=body.email.lower(), full_name=body.full_name, phone=body.phone,
             password_hash=hash_password(body.password), role_id=role.id)
    u.profile = FarmerProfile(district=body.district, state=body.state)
    db.add(u)
    db.commit()
    _set_cookie(response, u.id)
    return {"user": user_out(u)}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("ks_token", path="/")
    return {"ok": True}


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return user_out(user)
