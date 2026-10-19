# Axis — Backend

This directory will contain the Python **FastAPI** backend service responsible for:

- **LLM orchestration** — Prompt chaining, context management, and structured response parsing via the Google Gemini / OpenAI API.
- **Plan generation** — Evaluating user constraints and generating `ApprovePlanCard` proposal payloads.
- **Task reasoning** — Producing natural language priority explanations and trade-off analyses.
- **REST API layer** — Serving JSON endpoints consumed by the React frontend at `http://localhost:8000`.

## Planned Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI (Python 3.12+) |
| LLM SDK | Google Generative AI / OpenAI Python SDK |
| Server | Uvicorn (ASGI) |
| Env management | `python-dotenv` |

## Planned Start Command

```bash
cd Backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Status

> 🚧 **Not yet implemented.** The frontend currently uses a local heuristic engine (`Frontend/src/engine/`) as a stand-in. Backend wiring begins next.

