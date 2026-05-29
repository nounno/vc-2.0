"""
Shared Authentication & DB utilities for VC 2.0 API.
Eliminates duplicate JWT logic and provides context-manager DB access.

Phase 2 A-001 (shared auth), A-002 (context manager DB)
"""
import os
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from typing import Optional

import pymysql
import bcrypt
from fastapi import HTTPException, Request
from jose import jwt


# ─── JWT Config ───────────────────────────────────────────────────────────────
SECRET_KEY = os.environ["SECRET_KEY"]  # Must be set in environment, no default
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24  # 30 days


# ─── DB helper as context manager ─────────────────────────────────────────────
@contextmanager
def get_db():
    """
    Context manager for DB connections.
    Ensures cursor and connection are always closed, even on exceptions.

    Usage:
        with get_db() as db:
            cur = db.cursor()
            cur.execute(...)
    """
    db = pymysql.connect(
        host=os.getenv("MYSQL_HOST", "mysql"),
        port=int(os.getenv("MYSQL_PORT", 3306)),
        user="valuecube",
        password=os.getenv("MYSQL_PASSWORD", "Vc@2026#db"),
        database="valuecube",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
        charset="utf8mb4",
    )
    try:
        yield db
    finally:
        db.close()


# ─── JWT Helpers ─────────────────────────────────────────────────────────────
def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def get_password_hash(password: str) -> str:
    """Hash a password."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


# ─── Auth dependency factory ─────────────────────────────────────────────────
def require_auth(allowed_roles: list[str] | None = None):
    """
    Extract & verify JWT from access_token cookie.
    Returns user info dict or raises 401.
    Supports optional role-based access control.

    Usage:
        @router.get("/")
        def my_route(current_user: dict = Depends(require_auth())):
            ...

        # With role restriction
        @router.get("/admin-only")
        def admin_route(current_user: dict = Depends(require_auth(allowed_roles=["admin"]))):
            ...
    """
    def dependency(request: Request):
        access_token = request.cookies.get("access_token")
        # Also accept Bearer token via Authorization header (for API clients)
        if not access_token:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                access_token = auth_header[7:]

        if not access_token:
            raise HTTPException(status_code=401, detail="未登录")
        try:
            payload = jwt.decode(access_token, SECRET_KEY, algorithms=[ALGORITHM])
            username = payload.get("sub")
            role = payload.get("role")
            if not username or not role:
                raise HTTPException(status_code=401, detail="令牌载荷无效")
            if allowed_roles and role not in allowed_roles:
                raise HTTPException(status_code=403, detail="权限不足")
            # Re-fetch from DB to ensure user still exists
            with get_db() as db:
                cur = db.cursor()
                cur.execute(
                    "SELECT id, username, role, supplier_id FROM auth_users WHERE username=%s",
                    (username,)
                )
                row = cur.fetchone()
                cur.close()
            if not row:
                raise HTTPException(status_code=401, detail="用户不存在")
            return row
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="令牌已过期")
        except jwt.JWTError:
            raise HTTPException(status_code=401, detail="令牌无效")
    return dependency
