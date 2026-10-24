# Axis

**An AI-powered command center to understand your workload and decide what to do next.**

Axis is an AI-powered productivity command center for students and people balancing work across several tools. Gemini extracts structured task information from source content, generates daily briefings and priority explanations, and powers assistant conversations. Axis brings those tasks, deadlines, effort estimates, and calendar commitments into a single workspace, ranks what needs attention, and proposes focus blocks that fit the available day.

Instead of repeatedly checking email, a school portal, a calendar, and task trackers, you can review a daily briefing, start with the highest-priority task, and see why it comes first. Adjusting an estimate or completing a task recalculates the saved plan.

This proof of concept uses simulated Gmail, Canvas, Google Calendar, GitHub, Notion, and personal-task feeds. It demonstrates the complete import-to-plan workflow without connecting real accounts. **Configure Gemini for the full AI experience**, including extraction from these simulated feeds. An offline demo fallback uses recorded extraction outputs and rule-based explanations so the core workflow can also be explored without an API key. The example environment files default to this fallback; the setup below shows how to enable AI.

## What you can do

- **Find your next focus:** review the top task, upcoming work, and available capacity in the dashboard.
- **Explore your workload:** switch between the list and interactive graph views.
- **Understand priorities:** inspect score factors, source evidence, deadline risks, and task explanations.
- **Plan around commitments:** view proposed work blocks alongside stored calendar events in the timeline.
- **Refine the plan:** update effort estimates, confirm evidence, and complete or reopen tasks.
- **Try different inputs:** select simulated feeds and run the import from Integrations.
- **Ask for context:** talk to the Gemini-powered assistant about task priorities and workload.

## App preview

### Dashboard

The daily briefing, current focus, and proposed schedule bring the most important work into one view.

![Axis dashboard with a daily briefing, highest-priority task, and proposed schedule](screenshots/dashboard_list.png)

Upcoming tasks and the capacity summary show how much work fits into the day.

![Upcoming tasks, later tasks, and daily focus capacity](screenshots/dashboard_list-2.png)

### Graph view

Explore tasks around the Axis hub, with proximity representing urgency.

![Interactive graph showing tasks around the Axis hub](screenshots/dashboard_graph.png)

### Timeline

See proposed focus blocks, fixed commitments, and remaining open time.

![Daily timeline with proposed task blocks and available capacity](screenshots/timeline.png)

### Task details

Inspect the priority breakdown and change an effort estimate to recalculate the plan.

![Task details showing a priority score, explanation, and effort controls](screenshots/details.png)

### Integrations

Choose which simulated sources to include in the import. All feeds in this demo are local fixtures.

![Mock integration feeds for Canvas, Google Calendar, Gmail, GitHub, Notion, and personal tasks](screenshots/integrations.png)

### Assistant

The assistant drawer provides a place to ask about priorities and workload. AI-generated chat replies require Gemini configuration.

![Axis assistant answering a question about the current focus task](screenshots/chatbot.png)

## Architecture

Axis has a React frontend, a FastAPI backend, and a SQLAlchemy persistence layer. The backend owns task facts, ranking, and proposed schedules; the frontend displays saved workspace state and submits user edits.

```mermaid
flowchart TD
    UI[React workspace] -->|/api requests| API[FastAPI routes and services]
    Feeds[Simulated source feeds] --> Adapters[Source adapters]
    Adapters --> Extraction[Gemini task extraction]
    Extraction --> Validation[Validation and source evidence]
    Validation --> DB[(SQLAlchemy: PostgreSQL or SQLite)]
    API --> DB
    DB --> Engine[Deterministic priority engine]
    Engine --> Runs[Saved rankings and proposed work blocks]
    Runs --> Explanations[Gemini briefings and explanations]
    Explanations --> DB
    DB --> API
    API --> UI
    API --> Chat[Gemini assistant]
```

### How a plan is produced

The diagram shows the AI configuration. Offline demo mode substitutes recorded extraction outputs and rule-based explanations, and chat returns a fallback message.

1. **Import and extract:** adapters normalize selected mock feeds, and Gemini turns source content into structured task facts when `EXTRACTION_MODE=gemini`.
2. **Validate and save:** ingestion validates facts and preserves source evidence. Tasks have revisions so edits retain history.
3. **Rank and allocate:** the deterministic engine evaluates deadline slack, estimated effort, delay impact, importance, dependencies, and calendar availability. It produces rankings, warnings, and proposed work blocks.
4. **Explain with AI:** Gemini turns the saved run into a briefing and task explanations when `EXPLANATION_MODE=gemini`. Provider failures retain rankings and fall back to rule-based explanations.
5. **Review and update:** the UI reads the saved result. User edits create new revisions and recalculate the plan; version checks prevent stale edits from overwriting newer changes.

Gemini handles the language-based parts of the experience: extracting task facts, explaining the plan, and answering questions. The deterministic engine uses validated facts to calculate priorities and time allocation consistently. Together, these layers make the plan understandable and its calculations repeatable. Proposed blocks are displayed in Axis and are not written to an external calendar.

| Layer | Technology and responsibility |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, and Lucide icons |
| HTTP API | Python 3.12, FastAPI, and Pydantic |
| Persistence | SQLAlchemy with PostgreSQL; fresh SQLite databases supported for local development |
| Priority engine | Python rules for ranking, capacity calculation, and work allocation |
| AI extraction, explanations, and assistant | Google Gemini through the `google-genai` SDK |
| Local accounts | Password hashing and revocable HttpOnly cookie sessions |
| Docker setup | Nginx frontend, FastAPI backend, and PostgreSQL 16 |

### Project structure

```text
Axis/
├── Frontend/
│   ├── src/components/       # Dashboard, timeline, integrations, and assistant
│   ├── src/context/          # Shared workspace state
│   └── src/services/         # API client
├── Backend/
│   ├── routers/              # HTTP endpoints
│   ├── services/             # Workspace, authentication, chat, and persistence
│   ├── integrations/         # Source adapters and mock feeds
│   ├── ingestion/            # Extraction, validation, and revision storage
│   ├── engine/               # Deterministic ranking and allocation
│   ├── explanations/         # Briefings, task explanations, and fallback rules
│   ├── models/               # Database models and data contracts
│   └── tests/                # Backend tests
├── devpost/                  # Scope, PRD, specification, and submission material
├── screenshots/              # App previews
└── docker-compose.yml        # Full local stack
```

## How to run

After cloning the repository, building, and starting the app with either option below, you can register your own user account in Axis. Each account has its own workspace.

### Option 1: Docker Compose

Install Docker with Docker Compose, start Docker, and open a terminal in the repository root.

1. Copy `.env.example` to `.env` if you do not already have one. On Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

   On macOS/Linux, use `cp .env.example .env`. If `.env` already exists, merge the example settings into it rather than overwriting it.

2. In `.env`, replace `POSTGRES_PASSWORD` with a local database password and configure Gemini for the AI experience:

   ```dotenv
   GEMINI_API_KEY=your-api-key
   GEMINI_MODEL=your-model-id
   EXTRACTION_MODE=gemini
   EXPLANATION_MODE=gemini
   ```

   Use a model available to your Gemini account. For an offline demo without an API key, see **Offline demo fallback** below.

3. Build and start the stack:

   ```sh
   docker compose up --build -d
   ```

   Startup waits for PostgreSQL, initializes or migrates the database, and starts the API and frontend.

4. Open [Axis at localhost:8080](http://localhost:8080). If you changed `WEB_PORT`, use that port instead.

To inspect startup or stop the stack:

```sh
docker compose ps
docker compose logs -f backend
docker compose down
```

The database is retained in the Compose volume when the stack stops.

### Option 2: Run the development servers

Install **Python 3.12**, **Node.js 22**, and npm. Run backend commands from the repository root so Python can resolve the `Backend` package.

1. Create a Python environment:

   ```sh
   python -m venv .venv
   ```

   Activate it on Windows PowerShell:

   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```

   On macOS/Linux, use `source .venv/bin/activate`. Then install dependencies:

   ```sh
   python -m pip install -r Backend/requirements.txt
   ```

2. Create `Backend/.env` from `Backend/.env.example` if it does not already exist. For a fresh local demo without PostgreSQL, set:

   ```dotenv
   DATABASE_URL=sqlite:///./axis-local.db
   GEMINI_API_KEY=your-api-key
   GEMINI_MODEL=your-model-id
   EXTRACTION_MODE=gemini
   EXPLANATION_MODE=gemini
   COOKIE_SECURE=false
   FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
   ```

   Alternatively, start your own PostgreSQL database and set `DATABASE_URL=postgresql+psycopg://USER:PASSWORD@localhost:5432/axis_db` with your credentials. Root `.env` values take precedence over `Backend/.env`; process environment variables take precedence over both. Keep the SQLite database file local and out of commits.

3. Initialize the database, then start the backend:

   ```sh
   python -m Backend.migrate
   python -m uvicorn Backend.main:app --reload --port 8000
   ```

   Stop an existing backend before running migrations. API documentation is available at [localhost:8000/docs](http://localhost:8000/docs), with a database health check at [localhost:8000/health](http://localhost:8000/health).

4. In a second terminal, start the frontend:

   ```sh
   cd Frontend
   npm ci
   npm run dev
   ```

5. Open [Axis at localhost:5173](http://localhost:5173). Vite forwards `/api` requests to the backend on port 8000. Both servers must be running.

### Try the demo

1. Create an account using a password of at least 12 characters.
2. Select **Import mock feeds**, or open **Integrations**, choose sources, and click **Run mock integrations**.
3. Review the dashboard's saved briefing, highest-priority task, upcoming work, and daily capacity.
4. Switch to the graph or timeline view to explore the same plan.
5. Open a task's priority breakdown, change its effort estimate, or complete it, then inspect the recalculated plan.

The fixture scenario uses **October 20, 2026 at 08:00 in Asia/Shanghai** so deadlines and results remain repeatable. This is a simulated clock rather than the current date. Screenshots show an example run; explanations vary with provider settings.

### AI configuration

The main setup above configures Gemini for extraction, briefings, task explanations, and chat. Use the root `.env` for Docker Compose, or `Backend/.env` for the development backend, respecting the environment precedence described above:

```dotenv
GEMINI_API_KEY=your-api-key
GEMINI_MODEL=your-model-id
EXPLANATION_MODE=gemini
EXTRACTION_MODE=gemini
```

Restart the development backend, or run `docker compose up -d --build` for Docker after changing configuration. Import feeds to run AI extraction, or refresh priorities to generate new explanations for saved facts. Provider calls require internet access and may incur usage charges. Keep credentials in local environment files.

The current chat API has shared history and is separate from the per-account workspace; chat does not apply priority changes.

### Offline demo fallback

To explore the core workflow without a Gemini key, leave `GEMINI_API_KEY` and `GEMINI_MODEL` empty and use:

```dotenv
EXTRACTION_MODE=fixture
EXPLANATION_MODE=rules
```

This mode uses recorded structured extraction outputs and rule-based briefings and explanations. Import, ranking, task editing, and proposed schedules work offline after dependencies are installed; chat returns a fallback message. It demonstrates the underlying workflow but does not make AI calls. To try the full AI experience, use the Gemini configuration above.

## Development checks

From the repository root with backend dependencies installed:

```sh
python -m unittest discover -s Backend/tests -v
```

From `Frontend/`:

```sh
npm test
npm run build
```

## Documentation

- [Project scope](devpost/scope.md)
- [Product requirements](devpost/prd.md)
- [Technical specification](devpost/spec.md)
- [Backend setup and API details](Backend/README.md)
- [Ingestion pipeline](Backend/ingestion/README.md)
- [Priority engine policy](Backend/PRIORITY_ENGINE.md)
- [Explanation generation](Backend/explanations/README.md)

## License

Axis is licensed under the [MIT License](LICENSE).
