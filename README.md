# Axis

An AI-powered productivity command center that consolidates scattered responsibilities from email, school portals, calendars, and task trackers into a unified, intelligently prioritized daily action plan.

## Project Structure

```
Axis/
├── Frontend/   ← Vite + React + TypeScript (the UI)
├── Backend/    ← Python FastAPI + LLM integration (the API)
└── devpost/    ← Planning docs (scope, PRD, spec)
```

## Running the App

### Frontend
```bash
cd Frontend
npm install
npm run dev
```
Open `http://localhost:5173`

### Backend
```bash
cd Backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
> The backend is under active development. The frontend currently runs standalone using a local heuristic engine.

## Tech Stack

| | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Python 3.12 + FastAPI + Uvicorn |
| LLM | Google Gemini / OpenAI (via Backend) |
| Icons | Lucide React |

## Docs
- [`devpost/scope.md`](devpost/scope.md) — Product scope & POC boundary
- [`devpost/prd.md`](devpost/prd.md) — Product requirements
- [`devpost/spec.md`](devpost/spec.md) — Technical specification & file structure