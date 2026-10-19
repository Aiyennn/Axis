---
doc: checklist
status: approved
---

# Build Checklist

Build mode: learn

## Slices

- [x] **1. Scaffolding, Seed Store, and Tri-Bucket Columns**
  Becomes usable: A running local web application at `http://localhost:5173` showing the command center desktop layout: left sidebar, central workspace with pre-seeded student-freelancer tasks in "Do Now," "Do Next," and "Do Later," and interactive task completion toggles that strike through items and persist in browser storage.
  Why now: Boots the project end-to-end (Vite, React, TypeScript, Tailwind CSS, AppContext, TaskCard components) so all subsequent engine logic has a real, responsive surface to land on.
  PRD ref: `prd.md > The Core Journey` (Steps 1–3), `prd.md > Screens and Layout`, `prd.md > Features and Behavior (2. Prioritized Task Columns)`
  Spec ref: `spec.md > Stack`, `spec.md > Components (AppContext, PriorityColumns, TaskCard)`, `spec.md > File Structure`
  Build: Initialize Vite React TypeScript project with Tailwind CSS, create type definitions and `seedData.ts`, implement `AppContext.tsx` with local storage synchronization, render layout with sidebar and three priority columns, and enable task completion checkboxes.
  Verify (mechanical): Run `npm run build` and launch dev server; verify page renders three columns with seed tasks; verify checking off a task updates state and persists across page reload.
  Learner check: Open `http://localhost:5173`, observe the three columns with realistic student-freelancer tasks, mark a task as complete, and confirm it strikes through.
  Commit: `Initialize command center with seed data and tri-bucket columns`

- [x] **2. Multi-Factor Prioritization Engine and Rationale Modal**
  Becomes usable: Every task is evaluated by a multi-factor 0–100 scoring algorithm (evaluating deadline proximity, hard vs. flexible consequences, calendar fit, and urgency). Clicking any card opens `TaskReasonModal.tsx` showing the mathematical breakdown of why the task received its priority.
  Why now: Proves the Unique Kernel immediately on top of the running board—tasks are prioritized intelligently rather than by naive due dates.
  PRD ref: `prd.md > Features and Behavior (2. Prioritized Task Columns)`
  Spec ref: `spec.md > Prioritization Engine (prioritizer.ts)`, `spec.md > Components (TaskReasonModal)`
  Build: Implement `Frontend/src/engine/prioritizer.ts` with 4-factor scoring logic (0-40 deadline proximity, 0-25 consequence weight, 0-20 calendar fit, 0-15 urgency), categorize tasks into Now (≥80), Next (50-79), and Later (<50), and build `TaskReasonModal.tsx` to surface the transparent score breakdown and delay risks.
  Verify (mechanical): Execute test script verifying score calculation across different deadline proximity inputs; click a task card in the browser and confirm the rationale modal displays with correct point breakdown.
  Learner check: Click the "Client Revision" card and the "Exam Study" card, review their AI score breakdown, and verify why one sits in Do Now while the other sits in Do Next.
  Commit: `Implement multi-factor priority scoring engine and rationale modal`

- [x] **3. Daily Briefing and Schedule Overload Detection**
  Becomes usable: The Daily Briefing banner at the top dynamically computes total workload hours against open calendar hours. When urgent tasks exceed available time, the high-contrast Schedule Overload alert activates with the exact deficit and recommended deferrals.
  Why now: Delivers the core capacity triage behavior: Axis warns the user when their day is overcommitted rather than pretending everything can fit.
  PRD ref: `prd.md > Features and Behavior (1. Daily Briefing & Schedule Overload Detection)`
  Spec ref: `spec.md > Components (DailyBriefing)`, `spec.md > Prioritization Engine (scheduler.ts)`
  Build: Implement `Frontend/src/engine/scheduler.ts` capacity calculations (workload hours vs. free calendar hours) and `DailyBriefing.tsx` banner displaying active tasks, workload chips, and the Overload Alert badge with capacity deficit tag.
  Verify (mechanical): Verify briefing correctly calculates total hours; verify overload badge appears when workload > free hours (6.0h vs. 4.5h), and verifies deficit clears when tasks are completed.
  Learner check: Check the top briefing banner; verify the 6.0h workload vs 4.5h free time displays the 1.5h overload warning; complete the 2.0h client task and verify the warning clears.
  Commit: `Add daily briefing banner and schedule overload detection`

- [x] **4. Interactive Daily Timeline Visualizer**
  Becomes usable: A continuous horizontal 8:00 AM – 10:00 PM timeline bar at the bottom of the dashboard plotting fixed commitments (lectures, standups) in dark blocks and AI-allocated focus blocks for "Do Now" tasks in violet.
  Why now: Connects "what to do" with "when to do it" across the user's day, answering both questions at a glance.
  PRD ref: `prd.md > Features and Behavior (3. Daily Timeline Visualizer)`
  Spec ref: `spec.md > Components (DailyTimeline)`, `spec.md > Prioritization Engine (scheduler.ts)`
  Build: Implement `DailyTimeline.tsx` with proportional hour track, rendering fixed calendar events from `AppContext` and automatically slotting Do Now tasks into open intervals.
  Verify (mechanical): Verify fixed calendar events and focus blocks render accurately along the 8 AM - 10 PM track without overlapping.
  Learner check: Look at the timeline; confirm your 9:30 AM CS lecture and 2:00 PM call are blocked out, with the urgent client revision slotted into the open morning window.
  Commit: `Implement interactive daily timeline with task block mapping`

- [ ] **5. AI Assistant Dialogue and "Approve Plan Changes" Flow (FastAPI + LLM Copilot)**
  Becomes usable: The conversational AI Copilot powered by the Python FastAPI backend service (`Backend/routers/chat.py` and `Frontend/src/components/assistant/AIAssistantDrawer.tsx`). When the user types or clicks *"I want to study for the CS exam first"*, Axis dispatches the request to FastAPI, evaluates trade-offs via LLM prompt chaining, and returns an inline `ApprovePlanCard.tsx` proposal. Clicking "Approve" moves tasks between columns and updates the timeline; clicking "Keep Current" preserves the existing plan.
  Why now: Delivers the core conversational override loop and human-in-the-loop safety contract, proving Act 3 of the 60-second video demo.
  PRD ref: `prd.md > Features and Behavior (4. AI Assistant Dialogue & "Approve Plan Changes" Flow)`
  Spec ref: `spec.md > Components (AIAssistant, ApprovePlanCard)`, `spec.md > Stack (FastAPI)`, `spec.md > File Structure (Backend/)`
  Build: Implement FastAPI endpoints (`Backend/routers/chat.py`, `Backend/routers/plan.py`) with LLM integration and fallback heuristic parser, connected to `AIAssistantDrawer.tsx` chat panel with `ApprovePlanCard.tsx`.
  Verify (mechanical): Send prompt *"I want to study for the exam first"*; verify proposal card appears with diff; click "Approve" and verify cards move between columns and timeline updates.
  Learner check: Prompt the AI assistant to prioritize exam prep; review the trade-off warning; click "Approve Changes" and watch Do Now and Do Next update.
  Commit: `Add AI assistant dialogue, FastAPI backend endpoints, and trade-off approval review cards`

- [ ] **6. Mock Integrations Hub and Demo Rehearsal Controls**
  Becomes usable: A dedicated `/integrations` view displaying simulated feeds for Email, Notion Workspace, GitHub Repositories, Canvas School Portal, Calendar, and Personal Tasks, an "Add Mock Task" form, and a "Reset Demo Data" button with confirmation modal to restore baseline state for repeatable 60-second video recordings.
  Why now: Completes the full application lifecycle and equips the user with everything needed to rehearse and record their Devpost video submission.
  PRD ref: `prd.md > Features and Behavior (5. Mock Integrations Manager & Demo Controls)`
  Spec ref: `spec.md > Components (IntegrationsView, AddMockTaskModal, ResetDemoModal)`
  Build: Implement `IntegrationsView.tsx` with feed cards, `AddMockTaskModal.tsx` for custom task injection, and `ResetDemoModal.tsx` with one-click restore.
  Verify (mechanical): Create a custom mock task and verify it appears on the dashboard; click "Reset Demo Data" and verify all mutations reset to seed baseline.
  Learner check: Go to Integrations, add a mock task, observe it on the dashboard, then click "Reset Demo Data" to verify you can return to a clean demo state anytime.
  Commit: `Add mock integrations manager and demo reset rehearsal controls`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — Slice 2 (Tri-bucket board with scoring engine and rationale modal live)
- [ ] Final kick-the-tires exploration and feedback completed — Slice 6 (Full command center with timeline, AI override, and demo reset)

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: [to be recorded during learning wrap-up]
Route and stops: [to be recorded during learning wrap-up]
Edit outcome: [to be recorded during learning wrap-up]
Reflection: [to be recorded during learning wrap-up]
Activity mode: [to be recorded during learning wrap-up]

## Revisions

- Adapted dashboard layout to user-provided focus architecture: replaced 3 equal side-by-side columns with a primary 2-column layout featuring a prominent "YOUR FOCUS" hero card, streamlined "Coming Up" and "Later" rows, and right-column widgets for Today's Schedule, Capacity, and AI status to dramatically reduce cognitive overload.
- Architectural reorganization: Split root into `Frontend/` (Vite + React + TypeScript + Tailwind) and `Backend/` (Python 3.12 + FastAPI + Uvicorn) to isolate client and server concerns cleanly.
- Confirmed backend technology: Python FastAPI explicitly selected as the API server to coordinate LLM orchestration, prompt chaining, contextual task analysis, and structured proposal diff generation.
- Expanded integrations suite: Added **Notion** (workspace sprint roadmap, documentation) and **GitHub** (pull requests, code reviews, issue tracking) alongside Gmail, Canvas, Calendar, and Tasks to directly represent modern developer/student workflows.


