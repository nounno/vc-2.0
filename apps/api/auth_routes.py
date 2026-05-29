"""
Authentication Routes — JWT + httpOnly Cookie
Phase 2: A-001 (shared auth), A-002 (context manager)
"""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Response, Request, Depends
from pydantic import BaseModel
import bcrypt
from jose import jwt

from app.auth import create_access_token, get_db, require_auth, verify_password

router = APIRouter(prefix="/api/v1", tags=["auth"])

# ─── Config ───────────────────────────────────────────────────────────────────
SECRET_KEY = os.environ["SECRET_KEY"]  # Must be set in environment, no default
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24  # 30 days

# ─── Pydantic models ──────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenPayload(BaseModel):
    sub: str
    role: str
    exp: Optional[datetime] = None

class UserInfo(BaseModel):
    id: int
    username: str
    role: str

# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/auth/login")
def login(payload: LoginRequest, response: Response):
    """
    Authenticate user, return JWT in httpOnly cookie + body token.
    """
    with get_db() as db:
        cur = db.cursor()
        cur.execute(
            "SELECT id, username, password_hash, role, supplier_id FROM auth_users WHERE username=%s",
            (payload.username,)
        )
        user = cur.fetchone()
        cur.close()

    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    token = create_access_token({"sub": user["username"], "role": user["role"], "supplier_id": user.get("supplier_id")})
    # Set both cookies for backward compatibility
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=os.getenv("ENVIRONMENT", "production") == "production",
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    # Also set vc_session cookie for the new auth guard system
    response.set_cookie(
        key="vc_session",
        value=token,
        httponly=True,
        secure=os.getenv("ENVIRONMENT", "production") == "production",
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "supplier_id": user.get("supplier_id"),
        },
        "message": "登录成功",
    }


@router.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie(key="access_token")
    return {"message": "已退出登录"}


@router.get("/auth/me")
def get_me(request: Request, current_user: dict = Depends(require_auth())):
    """Return current authenticated user info."""
    return {
        "id": current_user["id"],
        "username": current_user["username"],
        "role": current_user["role"],
    }
