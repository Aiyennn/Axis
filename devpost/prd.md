---
doc: prd
status: approved
updated: 2026-10-23
---

# Axis — Product Requirements Document (PRD)

An AI-powered productivity command center that consolidates scattered responsibilities from email, school portals, Notion workspaces, GitHub repositories, calendars, and task trackers into a unified, intelligently prioritized daily action plan.

*Source:* `scope.md > The Unique Kernel`, `scope.md > Who It's For`, `scope.md > The POC Boundary`

## User-Requested Architecture Update — October 20, 2026

The user explicitly requested an updated backend architecture: **AI extracts facts and communicates decisions; a deterministic engine owns task ranking and scheduling recommendations.** Task facts/source evidence and priority assessments are stored separately in PostgreSQL, scoped to users for future login. The engine lives in `Backend/engine/`, outside services.

The journey and acceptance criteria below describe the target product. Backend ingestion previews, versioned storage and deterministic ranking are implemented; frontend wiring, login, extracted-fact confirmation and real AI explanation generation remain pending. The existing task board uses the legacy API, and current chat responses are scripted. The new source fixtures and existing UI seeds are separate demo datasets.

## The Core Journey
1. **Launch & Ingestion:** The user opens Axis and immediately sees their daily command center populated from validated mock integration inputs (target backend flow): client email revision requests, GitHub PR review, Notion roadmap updates, an upcoming exam and paper from Canvas, calendar events (lectures and meetings), and personal to-dos.
2. **Daily Briefing & Capacity Triage:** The top Daily Briefing displays a consolidated overview: total pending tasks, urgent deadlines, total estimated work hours vs. available free calendar hours, and an immediate status indicator (Normal or Schedule Overload with actionable warnings).
3. **Review Prioritized Columns:** The user evaluates three distinct columns side-by-side:
   - **Do Now:** Immediate high-urgency, high-impact items with approaching hard deadlines (e.g., client revisions due by noon).
   - **Do Next:** Other tasks allocated to future work periods (e.g., studying for tomorrow's exam, GitHub PR review).
   - **Do Later:** Blocked or currently unallocated tasks; this label does not guarantee safe deferral (e.g., essay due next week, Notion roadmap sync).
   Each card displays known duration and deadline strictness, explicitly labels unknown values, and exposes the deterministic score breakdown with an AI explanation when available.
4. **Inspect the Daily Timeline:** Below the columns, the full-width timeline maps out the day: fixed calendar commitments (classes, client calls), reserved focus blocks for "Do Now" tasks, and planned breaks.
5. **AI Assistant Dialogue & Proactive Trade-Offs:** The user interacts with the right-hand AI assistant (e.g., *"I need to study for the exam before doing the client revision"*). AI translates the request into proposed constraints; the deterministic engine evaluates the alternative and produces an **"Approve Plan Changes"** review card detailing the trade-offs (e.g., client revision pushed back 2.5 hours, risks missing deadline), and waits for user confirmation before rearranging the columns or timeline.
6. **Execution & State Updates:** The user checks off completed tasks, manually shifts items between columns if desired, or resets the demo state via the Integrations page to rehearse their 60-second walkthrough.

## Screens and Layout
A three-part desktop layout with a responsive left navigation sidebar, central workspace, and right-hand AI copilot:
- **Left Navigation Sidebar:**
  - Branding: Axis logo and mode badge (`Prototype — Mock Integrations`).
  - Navigation links: **Dashboard** (primary), **My Tasks**, **Timeline**, **Integrations**, **Settings** (stubbed for POC).
- **Central Dashboard Surface:**
  - **Top:** Compact **Daily Briefing Banner** with metrics (Tasks, Workload vs. Available Hours, Overload Warning alert if applicable, and one-line AI recommendation).
  - **Middle:** **Three Priority Columns** side-by-side (Do Now, Do Next, Do Later) featuring task cards with priority badges, time tags, source icons, and quick actions.
  - **Bottom:** Full-width **Daily Timeline** bar with hourly markers (8 AM to 10 PM) visualizing scheduled blocks, classes, breaks, and focused task blocks.
- **Right Panel (AI Copilot):**
  - Persistent chat interface on desktop (collapsible slide-out drawer on tablet/mobile).
  - Displays conversation history, quick action prompts, and interactive **"Approve Plan Changes"** review cards.
- **Integrations Surface (`/integrations`):**
  - Feed cards for Email, Notion Workspace, GitHub Repositories, Canvas School Portal, Calendar, and Task Manager showing mock synced items.
  - Demo toolbar: **"Reset Demo Data"** button (with confirmation modal) and **"Add Mock Task"** modal form.

## Look and Feel
- **Visual Theme:** Modern, high-contrast dark theme with deep zinc/neutral surfaces (`#09090B`, `#121215`, `#18181B`, `#27272A`).
- **Accents:** Refined violet primary accents (`#7C3AED`, `#8B5CF6`, `#A78BFA`) for AI actions and active states; functional semantic indicators:
  - Do Now: Crimson / Rose (`#F43F5E`)
  - Do Next: Amber / Warm Gold (`#F59E0B`)
  - Do Later: Emerald (`#10B981`)
  - Overload Alert: High-contrast alert badge with explicit hour deficit.
- **Typography:** Clean, purposeful sans-serif (system stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`) with monospace accents (`ui-monospace, SFMono-Regular, "SF Mono"`) for timestamps, durations, and score metrics.
- **Aesthetic:** Minimalist, high-focus command center inspired by modern productivity tooling (Linear, Raycast) with consistent spacing, subtle borders, and zero generic decorative clutter.

## Features and Behavior

### 1. Daily Briefing & Schedule Overload Detection
- Aggregates all tasks for today and computes `Total Required Work Hours` vs. `Available Calendar Free Hours`.
- If `Required Hours > Available Hours`, activates the **Schedule Overload Alert**:
  - Displays the exact time deficit (e.g., *"6.0 hrs urgent work vs. 3.5 hrs available — 2.5 hr deficit"*).
  - Flags high-risk tasks at jeopardy of missing hard deadlines.
  - Surfaces AI suggestions on which flexible items to defer to "Do Later".
- *Acceptance Criteria:*
  - [x] Briefing calculates total workload and free time dynamically based on active tasks and calendar events.
  - [x] If free time is exceeded, the Overload warning banner appears with deficit hours and risk tags.

### 2. Prioritized Task Columns (Do Now / Do Next / Do Later)
- Tasks are ordered by deterministic tiers and scores, followed by conservative deadline-order repair and capacity allocation. Scoring uses urgency/slack (0–50), explicit impact (0–25), importance (0–15), and waiting age (0–10). Buckets reflect urgency and allocation, rather than score thresholds. Unknown input values produce warnings; the engine does not infer impact from prose.
- **Card Capabilities:**
  - Checkbox / button to mark task complete (immediately strikes through and updates metrics).
  - Click to expand AI reasoning modal/card (displays source feed, deadline, duration, score breakdown, and risk of delay).
  - Quick priority selector dropdown/button to manually move a task between columns.
  - "Ask AI" shortcut button that pre-fills the assistant chat with a query about this task.
- *Acceptance Criteria:*
  - [x] Each card clearly displays title, source badge (Email, Canvas, etc.), duration, and deadline.
  - [x] Completing a task updates the briefing hours count immediately.
  - [x] Expanding a card reveals the explicit rationale behind its priority assignment.
  - [x] Manually changing priority shifts the card between columns without silent overrides.

### 3. Daily Timeline Visualizer
- Visual 8:00 AM – 10:00 PM horizontal timeline showing:
  - Fixed calendar blocks (e.g., CS Lecture 10:00–11:30 AM, Client Standup 2:00–2:30 PM).
  - Engine-proposed focus blocks for "Do Now" tasks slotted into open intervals.
  - Breaks and open unstructured time.
- *Acceptance Criteria:*
  - [x] Fixed calendar events are visually distinct from allocated task focus blocks.
  - [x] Reordering or completing tasks updates the timeline allocations accordingly.

### 4. AI Assistant Dialogue & "Approve Plan Changes" Flow
- Conversational chat panel understanding natural user constraints (e.g., *"I want to study for the CS exam first"* or *"I only have 1 hour before my lecture"*).
- **Interactive Review Card:**
  - Before modifying the schedule, the AI presents an inline "Approve Plan Changes" card.
  - Details: (1) Proposed movements, (2) Tasks affected, (3) Explicit trade-offs (e.g., *"Client revisions moved to 3:00 PM — warning: 1 hour buffer before deadline"*).
  - Actions: **Approve Changes** (applies new plan to columns and timeline) and **Reject** (discards proposal and keeps current plan).
- *Acceptance Criteria:*
  - [x] Challenging the schedule in chat triggers a structured review card before modifying the board.
  - [x] Clicking "Approve" moves the target cards and updates the timeline; clicking "Reject" preserves the existing state.

### 5. Mock Integrations Manager & Demo Controls
- Dedicated Integrations view displaying the status and simulated item feeds for:
  - **Client Email** (e.g., revision requests, feedback).
  - **Notion Workspace** (e.g., sprint roadmap, specs, documentation).
  - **GitHub Repositories** (e.g., code reviews, pull requests, issue trackers).
  - **Canvas School Portal** (e.g., midterm exams, project submissions).
  - **Google Calendar** (e.g., lectures, team meetings).
  - **Task Tracker** (e.g., personal errands, gym).
- **"Reset Demo Data" Action:** A prominent button with confirmation dialog that resets all tasks, calendar events, completion states, and chat history back to the default seed state for seamless 60-second walkthrough rehearsals.
- **"Add Mock Task" Form:** Simple modal form allowing the user to create a custom task (Title, Source, Deadline, Duration, Importance) which is immediately ingested and scored by the prioritization engine.
- *Acceptance Criteria:*
  - [x] Integrations page displays cards for each of the mock sources (Email, Notion, GitHub, Canvas, Calendar, Tasks) with live item counts.
  - [x] Clicking "Reset Demo Data" restores the initial state cleanly after confirmation.
  - [x] Adding a custom mock task updates the dashboard columns and briefing immediately.

### 6. Validated Source Facts and Assessment Lifecycle
- Different source shapes map into a common task contract; explicit API fields take precedence over extraction.
- Unknown effort, importance and deadline strictness remain unknown. Unsupported relative dates require review.
- One email may produce zero or several tasks. Calendar events remain commitments; manual tasks map directly.
- Replaying identical fixtures does not duplicate tasks. Changed accepted facts create new revisions.
- Store source evidence with task facts and tie each assessment to the exact owned task revision.
- Save rankings before generating explanations; pending or failed explanation generation must not hide a usable ranking.
- User ownership is built into storage. Login, authenticated operations and account UI are pending; individual accounts do not imply team collaboration.
- For this POC, fixtures are the replay source. No ingestion record table or pub/sub broker is required.
- *Acceptance Criteria:*
  - [x] Backend mock preview produces five tasks, one calendar event and one ignored newsletter from seven records.
  - [x] Direct source deadlines take precedence; invalid quote evidence is rejected.
  - [x] Replays preserve unchanged revisions and writes enforce owner scope in tested persistence flows.
  - [x] Deterministic preview returns ranks, buckets, warnings and decision facts.
  - [x] Frontend shows fact-review states and supports confirmation before trusting uncertain inputs.
  - [x] Frontend reads current task facts and matching assessments, including pending/failed explanations.
  - [x] Verified authentication supplies ownership for protected API operations.
  - [x] Calendar-source records are converted into engine availability context automatically.

## States and Boundaries

- **Default Seeded State (Demo Ready):** Pre-populated with a realistic student-freelancer profile: 1 urgent client email revision due today, 1 GitHub PR review, 1 university exam tomorrow morning, 1 Notion sprint doc sync, 1 flexible essay, 2 scheduled lectures, and 1 client call.
- **Schedule Overload State:** Triggered when urgent tasks exceed free calendar hours; flags deficit and highlights high-risk hard deadlines.
- **All-Tasks-Complete State:** When all Do Now/Next tasks are completed, the briefing displays a congratulatory all-clear state with available leisure/recovery hours.
- **Persistence & API:** The target uses FastAPI and PostgreSQL for user-owned task revisions and priority assessments, while the browser caches display state. Existing demo APIs remain separate until migration and frontend wiring are complete.

## Product Decisions
- **Pre-approval for AI Plan Changes:** The AI never silently alters the user's schedule; every major re-weighting surfaces an "Approve Plan Changes" card with explicit trade-off explanations.
- **Deterministic Decisions, AI Communication:** The engine calculates priorities and decision facts. AI extracts supported source facts and explains finalized decisions. AI output cannot directly change scores or ordering. Retained extracted fields require confirmation; matching quotes alone do not establish semantic correctness.
- **Mock Over Real OAuth:** Use replayable provider-shaped fixtures and explicitly labeled recorded extraction for offline demonstrations. Gemini AI extraction is the live intelligence provider, paired with recorded fixtures for offline resilience and failure recovery.
- **Capacity Deficit Transparency:** Overload situations are directly communicated as capacity gaps rather than compressing impossible tasks into unavailable time.
- **`Frontend/` + `Backend/` Directory Split:** The codebase is organized into two clear top-level directories — `Frontend/` for the Vite + React + TypeScript client and `Backend/` for the Python FastAPI service — so each side has independent dependencies and can be run, tested, and iterated on without interfering with the other.

## What We're Building
- Desktop-first responsive web command center (in `Frontend/`) with sidebar, central dashboard, right AI assistant, and integrations view.
- Python FastAPI backend (in `Backend/`) powering LLM completions, task analysis, and proposal generations.
- Deterministic prioritization and capacity allocation with versioned policy and decision facts.
- Interactive timeline with task block mapping.
- Chat copilot with structured trade-off approval cards.
- Mock integrations manager with reset and task creation controls.

## Deferred From the POC
- Multi-day weekly calendar views (kept to single-day daily plan for POC clarity).
- Drag-and-drop between columns (manual dropdown priority selector proves the functionality cleanly).
- Live OAuth connections and third-party webhooks.

## Non-Goals
- Autonomous email sending or task delegation without human review.
- Multi-user collaboration, team accounts, or role permissions.
- Mobile native apps (iOS/Android builds).

## Remaining Product Decisions
- How to confirm or correct extracted facts and handle unresolved effort in the UI.
- Which authentication provider and login experience to use.
- How long manual overrides persist across engine runs.
- How to reconcile source edits that rename or remove extracted actions.
- How to select current assessments when calendar context changes, and reject stale explanations.

These are remaining decisions; the implemented engine does not yet solve dependency-chain scheduling, global optimization or persistent overrides.
