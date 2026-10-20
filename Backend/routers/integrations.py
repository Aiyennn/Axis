from fastapi import APIRouter
from Backend.ingestion.pipeline import ImportPreview, preview_import

router = APIRouter(prefix="/api/integrations", tags=["integrations"])


@router.post("/mock/preview", response_model=ImportPreview)
def preview_mock_integrations():
    """Replay bundled fixtures offline. No private DB access or provider call."""
    return preview_import(user_id="local-demo")
