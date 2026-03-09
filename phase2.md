## Phase 2: Extensions to Build

These are the pages/features to add to your ClawPort fork.
Feed this section to Claude Code in VS Code as build instructions.

### Extension 1: Team Page (Beautiful Org Chart)

**Route:** `/team`
**Inspired by:** Alex Finn screenshot 6

Replace the default org map with a styled page that includes:
- Mission statement banner at top (italic, styled quote block on dark bg)
- "Meet the Team" heading with agent count subtitle
- Hierarchical cards grouped by team (Executive, Product, Engineering, Growth, Operations)
- Each card: emoji avatar, name, role title, one-line description, skill tags as colored badges, "View Profile →" link
- Machine label showing "Mac Studio M3 Ultra" for the engineering group
- Flow indicators between hierarchy levels

Read mission statement from a `mission.json` file in workspace/clawport/.

### Extension 2: Projects Page

**Route:** `/projects`
**Inspired by:** Alex Finn screenshot 3

Add SQLite table for projects (use better-sqlite3). Fields: id, name, description, status (planning/active/paused/completed), priority, lead_agent_id, progress (0-100), created_at.

Grid of project cards showing: name, description (2 lines), status badge, progress bar with percentage, lead agent avatar, priority badge.

### Extension 3: Task Management (Full Plane Replacement)

**Route:** `/tasks` (enhance existing kanban)
**Inspired by:** Alex Finn screenshot 1

Extend ClawPort's existing kanban with SQLite persistence:
- Tasks table: id, title, description, status, priority, project_id, assigned_agent_id, labels (JSON), due_date, recurring_cron, created_at, completed_at
- Task comments table for agent update audit trail
- Stats bar: this week count, in progress, total, completion %
- Filter by agent and project
- Right-side Live Activity panel (already exists in ClawPort as activity console)

### Extension 4: Calendar Page

**Route:** `/calendar`
**Inspired by:** Alex Finn screenshot 2

Weekly view showing OpenClaw cron jobs as color-coded blocks.
"Always Running" section at top for persistent pollers.
Each block: task name, time, agent color.
Click to edit cron expression.
Reads from OpenClaw cron API.

### Extension 5: AGENTS.md Editor

**In:** Agent detail page (extend existing agent profile)

Add a tab to the agent detail page with a textarea/code editor that:
- Reads the agent's AGENTS.md file from the filesystem
- Lets you edit inline with markdown preview
- Saves directly to the file on disk
- Shows last modified timestamp
- This is the killer differentiator — edit agent behavior from the browser.

### Extension 6: Mission & Values Page

**Route:** `/mission`

Full-page view with:
- Company mission statement (large, centered)
- Core values as cards (editable)
- Vision statement
- Company context from shared/USER.md (rendered markdown)
- All stored in workspace/clawport/mission.json, editable from UI

### Extension 7: Document Browser

**Route:** `/docs`
**Inspired by:** Alex Finn screenshot 5

Two-panel layout: file list on left with search + tag filters, markdown preview on right.
Reads recursively from workspace/docs/.
Auto-generates tags from subdirectory names and file extensions.

### Extension 8: Approvals Queue

**Route:** `/approvals`

SQLite-backed list of pending decisions. Agents create approval requests (via activity log or task comments). CEO approves/rejects from UI.

---

## Upgraded AGENTS.md Structure

Adopt the agency-agents template structure while keeping our anti-personality stance.
Each AGENTS.md should follow this format:

```markdown
# [Role Name] — ideiusllc

## Identity
- **Agent ID:** [openclaw-id]
- **Team:** [Executive/Product/Engineering/Growth/Operations]
- **Model:** [M2.5 or Qwen3-4B]
- **Heartbeat:** [interval]
- **Reports To:** [parent agent]
- **Direct Reports:** [child agents]

## Core Mission
[2-3 sentences: what this agent does, why it matters, what success looks like]

## Critical Rules
- Never write secrets/tokens/keys to any file
- [domain-specific rules]
- No generic AI language (Anti-Slop Rules from shared/USER.md)
- Read shared/USER.md and shared/TOOLS.md at session start
- Follow HEARTBEAT.md checklist on every heartbeat

## Responsibilities & Deliverables
[Specific outputs with acceptance criteria]

## Workflow
[Step-by-step process for how this agent handles incoming work]

## Inter-Agent Communication
- **Receives work from:** [agents]
- **Delegates to:** [agents]
- **Escalates to:** [agent]
- **Method:** sessions_send with task_id + instruction + context

## Memory Protocol
- Write daily notes to memory/YYYY-MM-DD.md
- Promote important facts to MEMORY.md (<100 lines)
- Review LEARNINGS.md at session start

## Self-Improvement Protocol
After ANY mistake: fix → write lesson to LEARNINGS.md → write prevention rule → review at session start.

## Success Metrics
[How to measure if this agent is performing well]
```

---

## What NOT to Build

- Don't rebuild chat (ClawPort's is excellent with streaming, vision, voice)
- Don't rebuild org map visualization (React Flow is already there)
- Don't rebuild activity console/live streaming (already works)
- Don't rebuild memory browser (already works)
- Don't rebuild cost tracking (already works)
- Don't rebuild cron monitoring (already works)
- Don't rebuild theming (5 themes already)

Focus all effort on: Tasks, Projects, Team page, Calendar, AGENTS.md editor, Mission page, Docs browser, Approvals.
