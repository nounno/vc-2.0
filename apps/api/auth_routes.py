"""
Authentication Routes — JWT + httpOnly Cookie
"""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Response, Request, Depends
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt

router = APIRouter(prefix="/api/v1", tags=["auth"])

# ─── Config ───────────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("JWT_SECRET", "vc2-super-secret-key-change-in-production-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ─── DB helper ────────────────────────────────────────────────────────────────
def get_db():
    import pymysql
    return pymysql.connect(
        host=os.getenv("MYSQL_HOST", "mysql"),
        port=int(os.getenv("MYSQL_PORT", 3306)),
        user="valuecube",
        password=os.getenv("MYSQL_PASSWORD", "Vc@2026#db"),
        database="valuecube",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
        charset="utf8mb4",
    )

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

# ─── Helpers ──────────────────────────────────────────────────────────────────
def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)

def get_password_hash(password: str) -> str:
    return pwd_ctx.hash(password)

# ─── Auth dependency (cookie-aware) ────────────────────────────────────────────
def require_auth(allowed_roles: list[str] | None = None):
    """
    Extract & verify JWT from access_token cookie.
    Returns user info dict or raises 401.
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
            db = get_db()
            cur = db.cursor()
            cur.execute("SELECT id, username, role FROM auth_users WHERE username=%s", (username,))
            row = cur.fetchone()
            cur.close()
            db.close()
            if not row:
                raise HTTPException(status_code=401, detail="用户不存在")
            return row
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="令牌已过期")
        except jwt.JWTError:
            raise HTTPException(status_code=401, detail="令牌无效")
    return dependency

# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/auth/login")
def login(payload: LoginRequest, response: Response):
    """
    Authenticate user, return JWT in httpOnly cookie + body token.
    """
    db = get_db()
    cur = db.cursor()
    cur.execute(
        "SELECT id, username, password_hash, role FROM auth_users WHERE username=%s",
        (payload.username,)
    )
    user = cur.fetchone()
    cur.close()
    db.close()

    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    token = create_access_token({"sub": user["username"], "role": user["role"]})
    # Set both cookies for backward compatibility
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,  # set True in production with HTTPS
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    # Also set vc_session cookie for the new auth guard system
    response.set_cookie(
        key="vc_session",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
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
