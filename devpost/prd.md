---
doc: prd
status: approved
---

# Axis — Product Requirements Document (PRD)

An AI-powered productivity command center that consolidates scattered responsibilities from email, school portals, calendars, and task trackers into a unified, intelligently prioritized daily action plan.

*Source:* `scope.md > The Unique Kernel`, `scope.md > Who It's For`, `scope.md > The POC Boundary`

## The Core Journey
1. **Launch & Ingestion:** The user opens Axis and immediately sees their daily command center pre-seeded with incoming inputs across mock integrations: client email revision requests, an upcoming exam and paper from Canvas, calendar events (lectures and meetings), and personal to-dos.
2. **Daily Briefing & Capacity Triage:** The top Daily Briefing displays a consolidated overview: total pending tasks, urgent deadlines, total estimated work hours vs. available free calendar hours, and an immediate status indicator (Normal or Schedule Overload with actionable warnings).
3. **Review Prioritized Columns:** The user evaluates three distinct columns side-by-side:
   - **Do Now:** Immediate high-urgency, high-impact items with approaching hard deadlines (e.g., client revisions due by noon).
   - **Do Next:** Important items scheduled for later today (e.g., studying for tomorrow's exam).
   - **Do Later:** Flexible or distant tasks that can safely wait (e.g., essay due next week).
   Each card displays estimated duration, hard vs. flexible deadline badges, and an expandable AI rationale breakdown.
4. **Inspect the Daily Timeline:** Below the columns, the full-width timeline maps out the day: fixed calendar commitments (classes, client calls), reserved focus blocks for "Do Now" tasks, and planned breaks.
5. **AI Assistant Dialogue & Proactive Trade-Offs:** The user interacts with the right-hand AI assistant (e.g., *"I need to study for the exam before doing the client revision"*). Axis analyzes the request, generates an **"Approve Plan Changes"** review card detailing the trade-offs (e.g., client revision pushed back 2.5 hours, risks missing deadline), and waits for user confirmation before rearranging the columns or timeline.
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
  - Feed cards for Email, Canvas School Portal, Calendar, and Task Manager showing mock synced items.
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
  - [ ] Briefing calculates total workload and free time dynamically based on active tasks and calendar events.
  - [ ] If free time is exceeded, the Overload warning banner appears with deficit hours and risk tags.

### 2. Prioritized Task Columns (Do Now / Do Next / Do Later)
- Tasks are categorized into three columns using a multi-factor score:
  - Proximity to deadline (hard vs. flexible).
  - Importance and urgency weights.
  - Duration vs. remaining available blocks.
- **Card Capabilities:**
  - Checkbox / button to mark task complete (immediately strikes through and updates metrics).
  - Click to expand AI reasoning modal/card (displays source feed, deadline, duration, score breakdown, and risk of delay).
  - Quick priority selector dropdown/button to manually move a task between columns.
  - "Ask AI" shortcut button that pre-fills the assistant chat with a query about this task.
- *Acceptance Criteria:*
  - [ ] Each card clearly displays title, source badge (Email, Canvas, etc.), duration, and deadline.
  - [ ] Completing a task updates the briefing hours count immediately.
  - [ ] Expanding a card reveals the explicit rationale behind its priority assignment.
  - [ ] Manually changing priority shifts the card between columns without silent overrides.

### 3. Daily Timeline Visualizer
- Visual 8:00 AM – 10:00 PM horizontal timeline showing:
  - Fixed calendar blocks (e.g., CS Lecture 10:00–11:30 AM, Client Standup 2:00–2:30 PM).
  - AI-allocated focus blocks for "Do Now" tasks slotted into open intervals.
  - Breaks and open unstructured time.
- *Acceptance Criteria:*
  - [ ] Fixed calendar events are visually distinct from allocated task focus blocks.
  - [ ] Reordering or completing tasks updates the timeline allocations accordingly.

### 4. AI Assistant Dialogue & "Approve Plan Changes" Flow
- Conversational chat panel understanding natural user constraints (e.g., *"I want to study for the CS exam first"* or *"I only have 1 hour before my lecture"*).
- **Interactive Review Card:**
  - Before modifying the schedule, the AI presents an inline "Approve Plan Changes" card.
  - Details: (1) Proposed movements, (2) Tasks affected, (3) Explicit trade-offs (e.g., *"Client revisions moved to 3:00 PM — warning: 1 hour buffer before deadline"*).
  - Actions: **Approve Changes** (applies new plan to columns and timeline) and **Reject** (discards proposal and keeps current plan).
- *Acceptance Criteria:*
  - [ ] Challenging the schedule in chat triggers a structured review card before modifying the board.
  - [ ] Clicking "Approve" moves the target cards and updates the timeline; clicking "Reject" preserves the existing state.

### 5. Mock Integrations Manager & Demo Controls
- Dedicated Integrations view displaying the status and simulated item feeds for:
  - **Client Email** (e.g., revision requests, feedback).
  - **Canvas School Portal** (e.g., midterm exams, project submissions).
  - **Google/Apple Calendar** (e.g., lectures, team meetings).
  - **Task Tracker** (e.g., personal errands, gym).
- **"Reset Demo Data" Action:** A prominent button with confirmation dialog that resets all tasks, calendar events, completion states, and chat history back to the default seed state for seamless 60-second walkthrough rehearsals.
- **"Add Mock Task" Form:** Simple modal form allowing the user to create a custom task (Title, Source, Deadline, Duration, Importance) which is immediately ingested and scored by the prioritization engine.
- *Acceptance Criteria:*
  - [ ] Integrations page displays cards for each of the 4 mock sources with live item counts.
  - [ ] Clicking "Reset Demo Data" restores the initial state cleanly after confirmation.
  - [ ] Adding a custom mock task updates the dashboard columns and briefing immediately.

## States and Boundaries

- **Default Seeded State (Demo Ready):** Pre-populated with a realistic student-freelancer profile: 1 urgent client email revision due today, 1 university exam tomorrow morning, 1 flexible essay due in 4 days, 2 scheduled lectures, and 1 client call.
- **Schedule Overload State:** Triggered when urgent tasks exceed free calendar hours; flags deficit and highlights high-risk hard deadlines.
- **All-Tasks-Complete State:** When all Do Now/Next tasks are completed, the briefing displays a congratulatory all-clear state with available leisure/recovery hours.
- **Persistence:** State persists in browser `localStorage` across page reloads.

## Product Decisions
- **Pre-approval for AI Plan Changes:** The AI never silently alters the user's schedule; every major re-weighting surfaces an "Approve Plan Changes" card with explicit trade-off explanations.
- **Mock Over Real OAuth:** Cut live third-party APIs to guarantee instant, 100% reliable execution during hackathon video recording without token expiration or auth hurdles.
- **Capacity Deficit Transparency:** Overload situations are directly communicated as capacity gaps rather than compressing impossible tasks into unavailable time.

## What We're Building
- Desktop-first responsive single-page application with sidebar, central dashboard, right AI assistant, and integrations view.
- Multi-factor heuristic prioritization engine.
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

## Open Questions
- None blocking specification. All core journeys, edge cases, and acceptance criteria are resolved.

