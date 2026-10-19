---
doc: scope
status: approved
---

# Axis

An AI-powered productivity command center that consolidates scattered responsibilities into a single, intelligently prioritized daily action plan.

## The Unique Kernel
A multi-factor, explainable AI prioritization engine that evaluates deadlines, urgency, importance, duration, dependencies, and calendar commitments—grouping tasks into "Do Now," "Do Next," and "Do Later" with transparent rationales and instant trade-off rebalancing when challenged by the user.

## Who It's For
Student freelancers who juggle coursework, exams, client deliverables, and personal commitments across disconnected apps (Canvas, Gmail, Notion, GitHub, Calendar). They start their day overwhelmed, wasting time triaging what to touch first, paralyzed by competing deadlines.

## The Core Loop
1. **Consolidate:** View or refresh simulated feeds from email, Notion, GitHub, calendar, task manager, and school portals.
2. **Prioritize:** Axis scores and buckets items into "Do Now," "Do Next," and "Do Later" with clear reasoning tags and suggested calendar time blocks.
3. **Dialogue & Adapt:** The user reviews the plan, challenges priorities or adds constraints via the AI assistant ("I need to study for tomorrow's exam first"), and Axis re-evaluates trade-offs with immediate schedule updates.
4. **Execute:** Check off tasks or re-plan as new urgent items emerge.

## Inspiration & Identity
- **Feel:** Modern, premium, clean, high-focus command center.
- **Tone:** Calm, decisive, reassuring, and transparent—never a black-box task list.
- **Aesthetic:** Dark-mode/neutral high-contrast dashboard with crisp visual hierarchy (clear priority badges, timeline visualization, and an interactive assistant panel).

## Why This Matters to the Learner
To demonstrate how intelligent agents can transform overwhelming digital chaos into actionable clarity, while building fluency in end-to-end agent-first architecture and development.

## What "Working" Looks Like
A compelling 60-second walkthrough with three verifiable beats:
1. **Scattered Workload (0–15s):** Open the Mock Integrations page showing realistic incoming items from Email (urgent client revisions), GitHub (security patch PR review), Notion (sprint roadmap specs), School Portal (upcoming exam, paper due tomorrow), and Calendar events.
2. **Intelligent Prioritization (15–40s):** Navigate to Dashboard, trigger AI prioritization, and see tasks unified into "Do Now," "Do Next," and "Do Later" with explicit rationale cards and realistic time estimates.
3. **Challenge & Adapt (40–60s):** Prompt the AI assistant to prioritize exam prep before client work; Axis recalculates priorities, surfaces the trade-offs, and updates the daily plan under user control.

## The POC Boundary
- Functional web command center with responsive modern dark UI, code living in **`Frontend/`**.
- Python FastAPI backend in **`Backend/`** serving as the intelligent orchestration API and LLM bridge.
- LLM-powered assistant & prioritization engine that generates contextual task definitions, evaluates trade-offs, and powers the conversational override drawer.
- Mock integrations manager with rich pre-loaded presets (School Portal, Freelance Email, Notion, GitHub, Calendar, Tasks) and toggle/refresh controls.
- Interactive Dashboard with Daily Briefing summary, "Do Now / Do Next / Do Later" task cards, and visual Daily Timeline.

## Later
- Real OAuth integrations (Google Workspace, Canvas LMS, Microsoft 365, Notion, GitHub, Slack).
- Autonomous agent delegation (e.g., drafting client email responses, auto-declining conflicting calendar invites).
- Cross-device sync and native mobile applications.

## Explicitly Cut
- **Live external third-party OAuth flows:** Avoids authentication friction and rate limits during hackathon evaluation.
- **Multi-user collaboration & team accounts:** Unnecessary for single-user student/freelancer proof of concept.

