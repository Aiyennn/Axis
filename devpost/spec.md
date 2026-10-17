---
doc: spec
status: draft
---

# Axis — Technical Specification

A platform-independent, desktop-first command center built with Vite, React, TypeScript, and Tailwind CSS. Axis consolidates scattered mock feeds (emails, school portal, calendar, tasks) into an explainable, prioritized daily plan with conversational override controls.

## How This Works, In Plain Language
Axis is a single-page application that runs entirely in the user's browser. It is organized into three connected engines:
1. **The Ingestion & Store Engine (`AppContext`):** Holds the current state of tasks, calendar commitments, and integration feeds in browser memory and syncs them to `localStorage`. It starts pre-loaded with a realistic student-freelancer scenario (urgent client email revision, Canvas exam & paper, lecture schedule).
2. **The Prioritization & Timeline Engine (`prioritizer.ts`, `scheduler.ts`):** Evaluates every task using a multi-factor 0–100 heuristic scoring model. It calculates proximity to deadline, hard vs. flexible consequences, duration, and open time slots between calendar events. It groups tasks into "Do Now" (score ≥ 80), "Do Next" (50–79), and "Do Later" (< 50), and checks if total work hours exceed available free hours to trigger the Schedule Overload warning.
3. **The Dialogic Assistant Engine (`assistant.ts`):** A conversational copilot that parses natural language challenges (e.g., *"I need to study for the CS exam first"*). Rather than silently rearranging tasks, it generates a structured **"Approve Plan Changes"** proposal card detailing the score shifts and trade-offs (e.g., client revision pushed back, risk of missing noon deadline), requiring user approval before updating the board and timeline.

This client-side architecture was chosen deliberately over a containerized Docker/database setup to eliminate reviewer friction, prevent external network or port failures, and ensure the 60-second video walkthrough is 100% reliable and instantaneous.

## The Core Journey Through the System
1. **Load:** The app initializes from `localStorage` (or falls back to `seedData.ts`), loading mock feeds from Email, Canvas, Calendar, and Tasks into `AppContext`.
   *PRD ref:* `prd.md > The Core Journey (Step 1)`.
2. **Score & Triage:** `prioritizer.ts` runs on all active tasks, calculating scores and sorting them into `Do Now`, `Do Next`, and `Do Later`. `scheduler.ts` maps calendar events and calculates `availableFreeHours` vs. `totalWorkloadHours`.
   *PRD ref:* `prd.md > Features and Behavior (1. Daily Briefing & Schedule Overload Detection)`.
3. **Display:** `DailyBriefing.tsx` renders the top summary with capacity metrics and overload alert. `PriorityColumns.tsx` renders the task cards with duration chips and deadline badges. `DailyTimeline.tsx` plots fixed events and focus blocks.
   *PRD ref:* `prd.md > Screens and Layout`, `prd.md > Features and Behavior (2. Prioritized Task Columns & 3. Daily Timeline Visualizer)`.
4. **Card Interactions:** The user checks a task complete (updates state and recalculates capacity immediately) or clicks to open `TaskReasonModal.tsx` showing the mathematical breakdown of why the task was prioritized.
   *PRD ref:* `prd.md > Features and Behavior (2. Prioritized Task Columns)`.
5. **AI Dialogue Challenge:** The user sends a prompt in `AIAssistant.tsx`. `assistant.ts` computes an alternative plan and returns an inline `ApprovePlanCard.tsx`. Clicking "Approve" dispatches an update to `AppContext`, shifting the cards and timeline; clicking "Reject" preserves the existing layout.
   *PRD ref:* `prd.md > Features and Behavior (4. AI Assistant Dialogue & "Approve Plan Changes" Flow)`.
6. **Rehearsal & Reset:** On `/integrations`, the user can click "Reset Demo Data" in `ResetDemoModal.tsx` to cleanly restore the initial seed state for their next demo rehearsal.
   *PRD ref:* `prd.md > Features and Behavior (5. Mock Integrations Manager & Demo Controls)`.

## Stack
- **Framework & Build Tool:** [Vite](https://vitejs.dev/) with [React](https://react.dev/) 18+ and [TypeScript](https://www.typescriptlang.org/) — Selected for instant sub-second hot reloading, strong type safety across task models, and zero backend configuration.
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS configured to match the approved zinc/neutral palette and violet accents from `prd.md > Look and Feel`.
- **Icons:** [Lucide React](https://lucide.dev/) — Clean, consistent SVG icon set for calendar events, sources, urgency badges, and actions.
- **State Management & Persistence:** React Context API (`AppContext`) + Browser `localStorage` — Self-contained, zero-dependency persistence that survives browser refresh without database servers.

## Where It Runs and How Someone Tries It
- **Runtime:** Standard modern web browser (Chrome, Edge, Firefox, Safari) running on Windows, macOS, or Linux. Node.js (v18+) and npm installed locally.
- **Start Command:**
  ```bash
  npm install
  npm run dev
  ```
- **What to Open:** `http://localhost:5173`
- **Submission Recording:** The short 1-minute video demo will be recorded directly from the running browser window using the 3-act walkthrough defined in `scope.md > What "Working" Looks Like`.

## Look and Feel
Carried forward directly from `prd.md > Look and Feel`:
- **Palette:** Deep zinc/neutral surfaces (`#09090B`, `#121215`, `#18181B`, `#27272A`), violet brand accents (`#7C3AED`, `#8B5CF6`), and functional status indicators (Rose `#F43F5E` for Do Now/Overload, Amber `#F59E0B` for Do Next, Emerald `#10B981` for Do Later).
- **Typography:** System sans-serif (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`) with monospace numbers and time chips (`ui-monospace, SFMono-Regular`).
- **Aesthetic:** High-density, professional command center cockpit (inspired by Linear and Raycast) with crisp 1px borders and no unnecessary decorative gradients.

## Components

### `AppContext` & State Store
- Central state container managing `tasks`, `calendarEvents`, `chatMessages`, `activeView` (Dashboard vs. Integrations), and `pendingProposal`.
- Provides helper dispatchers: `toggleTaskComplete`, `updateTaskPriority`, `applyPlanProposal`, `addMockTask`, and `resetToDemoSeed`.
- *PRD ref:* `prd.md > Features and Behavior (1, 2, 4, 5)`.

### `DailyBriefing`
- Computes aggregate metrics: active task count, total workload hours, available free hours, and net capacity deficit.
- Renders the high-contrast **Schedule Overload Alert** when workload exceeds free calendar hours.
- *PRD ref:* `prd.md > Features and Behavior (1. Daily Briefing & Schedule Overload Detection)`.

### `PriorityColumns` & `TaskCard`
- Renders the three side-by-side columns: **Do Now**, **Do Next**, and **Do Later**.
- Each `TaskCard` displays source tag (Email, Canvas, Calendar, Tasks), hard vs. flexible deadline badge, estimated duration, complete checkbox, and manual priority dropdown.
- *PRD ref:* `prd.md > Features and Behavior (2. Prioritized Task Columns)`.

### `TaskReasonModal`
- Expandable modal/drawer surfacing the transparent 0–100 score breakdown (Deadline Proximity, Commitment Consequence, Calendar Fit, Importance Weight) and explicit delay risks.
- *PRD ref:* `prd.md > Features and Behavior (2. Prioritized Task Columns)`.

### `DailyTimeline`
- Visual 8:00 AM – 10:00 PM horizontal bar visualizing scheduled commitments (lectures, standups) in muted dark blocks, and AI-allocated focus blocks for "Do Now" tasks in violet.
- *PRD ref:* `prd.md > Features and Behavior (3. Daily Timeline Visualizer)`.

### `AIAssistant` & `ApprovePlanCard`
- Persistent right-hand chat drawer with conversation history and quick suggestion chips.
- Inline `ApprovePlanCard` displaying structured diffs of proposed movements, affected tasks, explicit trade-off warnings, and "Approve" / "Reject" action buttons.
- *PRD ref:* `prd.md > Features and Behavior (4. AI Assistant Dialogue & "Approve Plan Changes" Flow)`.

### `IntegrationsView`, `AddMockTaskModal`, `ResetDemoModal`
- Multi-source feed manager displaying mock status for Client Email, Canvas Portal, Calendar, and Tasks.
- Modals for adding custom mock tasks and confirming demo resets.
- *PRD ref:* `prd.md > Features and Behavior (5. Mock Integrations Manager & Demo Controls)`.

## Data Model

```typescript
export type SourceType = 'email' | 'canvas' | 'calendar' | 'task';
export type PriorityBucket = 'now' | 'next' | 'later';
export type ImportanceLevel = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  description: string;
  source: SourceType;
  sourceLabel: string; // e.g. "Client Email", "CS401 Canvas"
  deadline: string; // ISO or readable string e.g. "Today, 12:00 PM"
  deadlineDate: Date;
  isHardDeadline: boolean; // true = external consequence (client, exam); false = flexible
  estimatedHours: number; // e.g. 2.0
  importance: ImportanceLevel;
  status: 'pending' | 'completed';
  priorityScore: number; // 0 - 100
  priorityBucket: PriorityBucket;
  scoreBreakdown: {
    deadlineProximity: number; // 0 - 40
    consequenceWeight: number; // 0 - 25
    calendarFit: number; // 0 - 20
    importanceScore: number; // 0 - 15
  };
  reasoning: string;
  consequencesOfDelay: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startHour: number; // e.g. 9.5 for 9:30 AM
  endHour: number; // e.g. 11.0 for 11:00 AM
  displayTime: string; // "9:30 AM – 11:00 AM"
  type: 'class' | 'meeting' | 'busy';
}

export interface PlanChangeProposal {
  id: string;
  requestedPrompt: string;
  moves: Array<{
    taskId: string;
    taskTitle: string;
    fromBucket: PriorityBucket;
    toBucket: PriorityBucket;
  }>;
  tradeOffs: string[];
  requiresApproval: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  proposal?: PlanChangeProposal;
}
```

## File Structure

```
Axis/
├── src/
│   ├── components/
│   │   ├── assistant/
│   │   │   ├── AIAssistant.tsx
│   │   │   └── ApprovePlanCard.tsx
│   │   ├── dashboard/
│   │   │   ├── DailyBriefing.tsx
│   │   │   ├── DailyTimeline.tsx
│   │   │   ├── PriorityColumns.tsx
│   │   │   ├── TaskCard.tsx
│   │   │   └── TaskReasonModal.tsx
│   │   ├── integrations/
│   │   │   ├── AddMockTaskModal.tsx
│   │   │   ├── IntegrationsView.tsx
│   │   │   └── ResetDemoModal.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       └── Sidebar.tsx
│   ├── context/
│   │   └── AppContext.tsx
│   ├── data/
│   │   └── seedData.ts
│   ├── engine/
│   │   ├── assistant.ts
│   │   ├── prioritizer.ts
│   │   └── scheduler.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── devpost/
│   ├── learner-profile.md
│   ├── scope.md
│   ├── scope.html
│   ├── prd.md
│   ├── prd.html
│   ├── spec.md
│   └── spec.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

## External Services and Dependencies
- **External Network Services:** None. The prototype is completely self-contained and operates 100% offline without external API keys, tokens, or rate limits.
- **Dependencies:**
  - `react`, `react-dom` (^18.3.0) — Core UI framework.
  - `lucide-react` (^0.300.0) — Modern SVG icons.
  - `tailwindcss`, `postcss`, `autoprefixer` — Styling pipeline.
  - `vite`, `@vitejs/plugin-react` — Fast dev server and bundler.

## Important Failure Modes
1. **Total Urgent Work Exceeds Daily Hours (Capacity Deficit):**
   - *What happens:* `prioritizer.ts` flags an overload state.
   - *User experience:* The Daily Briefing displays a prominent rose warning banner with the exact hour deficit, flags high-risk hard deadlines, and suggests flexible tasks to defer rather than overflowing the schedule.
2. **Conflicting Re-prioritization Request:**
   - *What happens:* User asks the AI assistant to prioritize a task that directly causes a hard deadline failure.
   - *User experience:* The AI assistant does not execute the change silently; it presents the `ApprovePlanCard` with explicit warning badges (*"⚠️ Delaying this task causes it to miss the 12:00 PM hard client deadline"*), leaving the decision explicitly in the user's hands.
3. **Corrupted or Missing Local Storage:**
   - *What happens:* Browser storage is cleared or malformed.
   - *User experience:* The app catches parsing exceptions and automatically falls back to `seedData.ts`, ensuring the prototype always loads cleanly and never renders a blank crash screen.

## What Was Simplified and Why
- **Local Heuristic Prioritization Engine instead of Live Remote LLM API:** Built directly in TypeScript with realistic instant responses and deterministic trade-off cards. This eliminates API key requirements, network latency, token costs, and API outages during hackathon video recording.
- **Mock Integrations instead of Live OAuth (Google / Canvas APIs):** Avoids third-party authentication flows, OAuth callback redirects, and API permission approvals, ensuring the prototype is ready to test the moment it boots.
- **Client-Side `localStorage` instead of PostgreSQL in Docker:** We discussed containerizing Postgres with Docker, but agreed to use client-side state to keep the project friction-free for hackathon judges and reviewers who clone the repository.

## Decisions and Open Issues
- **Docker vs. Local-First Architecture:** The learner asked about using PostgreSQL in Docker. We evaluated the tradeoffs (rich database schema vs. Docker Desktop installation dependency for evaluators and added setup moving parts) and agreed to go with Option A (Vite + React + TypeScript + local storage).
- **Prioritization Scoring Formula:** Agreed on the 4-factor model (Deadline Proximity: 40pts, Commitment Type: 25pts, Calendar Fit: 20pts, Urgency Weight: 15pts).
- **Human-in-the-Loop Override:** Agreed that all AI-proposed major re-schedules require explicit user approval via the `ApprovePlanCard` before updating columns or timeline.

