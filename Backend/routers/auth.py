from fastapi import APIRouter, Depends, Request, Response
from Backend.config import COOKIE, AuthSettings, auth_settings
from Backend.dependencies import auth_service, current_user, check_origin, throttle, login_limiter, set_session_cookie
from Backend.models.auth import Credentials
from Backend.services.auth import AuthService, LoginLimiter, public_user

router = APIRouter(prefix="/api/auth", tags=["authentication"])


@router.post("/register")
def register(body: Credentials, request: Request, response: Response,
             service: AuthService = Depends(auth_service), settings: AuthSettings = Depends(auth_settings),
             limiter: LoginLimiter = Depends(login_limiter)):
    check_origin(request, settings)
    throttle(request, limiter)
    result = service.register(body.email, body.password)
    set_session_cookie(response, result.token, settings)
    return result.user


@router.post("/login")
def login(body: Credentials, request: Request, response: Response,
          service: AuthService = Depends(auth_service), settings: AuthSettings = Depends(auth_settings),
          limiter: LoginLimiter = Depends(login_limiter)):
    check_origin(request, settings)
    throttle(request, limiter)
    result = service.login(body.email, body.password, request.cookies.get(COOKIE))
    set_session_cookie(response, result.token, settings)
    return result.user


@router.get("/me")
def me(user=Depends(current_user)):
    return public_user(user)


@router.post("/logout")
def logout(request: Request, response: Response, user=Depends(current_user),
           service: AuthService = Depends(auth_service)):
    service.logout(request.cookies[COOKIE])
    response.delete_cookie(COOKIE, path="/")
    return {"ok": True}
