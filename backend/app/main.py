from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uuid

from app.config import get_settings
from app.routers import notebooks, sources, chat, audio, video, research, study, notes, api_keys, global_chat, studio

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="NotebookLM Reimagined - An API-first research intelligence platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request ID middleware
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.status_code,
                "message": exc.detail,
            }
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": 500,
                "message": "Internal server error",
                "details": str(exc) if settings.debug else None,
            }
        },
    )


# Include routers
app.include_router(api_keys.router, prefix="/api/v1")
app.include_router(notebooks.router, prefix="/api/v1")
app.include_router(sources.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(audio.router, prefix="/api/v1")
app.include_router(video.router, prefix="/api/v1")
app.include_router(research.router, prefix="/api/v1")
app.include_router(study.router, prefix="/api/v1")
app.include_router(notes.router, prefix="/api/v1")
app.include_router(studio.router, prefix="/api/v1")
app.include_router(global_chat.router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
