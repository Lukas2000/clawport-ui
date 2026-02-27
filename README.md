# 🏰 Manor UI

**A visual command centre for your AI agent team.**

Manor UI is an open-source dashboard for managing, monitoring, and talking directly to your OpenClaw AI agents. Built with Next.js 14, React Flow, and a dark command-centre aesthetic.

![Manor UI](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript) ![Tailwind](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwind-css) ![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

---

## Features

- **Manor Map** — Interactive org chart of your entire agent team. Nodes show hierarchy, cron status, voice capabilities, and relationships at a glance.
- **Call Box** — Chat directly with any agent using their SOUL.md as the system prompt. Streaming responses via GPT-4o.
- **Agent Detail** — Full profile: SOUL.md viewer, tool list, hierarchy, associated crons, voice ID.
- **Cron Monitor** — Live status of all scheduled jobs. Filter by status, sort errors to top, expand for error details. Auto-refreshes every 60 seconds.
- **Memory Browser** — Read team memory, long-term memory, and daily logs. Markdown rendering and JSON syntax highlighting built-in.

---

## Setup

### Prerequisites
- [OpenClaw](https://openclaw.ai) installed and running
- Node.js 18+
- An OpenAI API key

### Install

```bash
git clone https://github.com/[your-username]/manor-ui.git
cd manor-ui
npm install
```

### Configure

Copy the environment template:

```bash
cp .env.example .env.local
```

Fill in your values:

```env
WORKSPACE_PATH=/path/to/your/.openclaw/workspace
OPENCLAW_BIN=/path/to/openclaw
OPENAI_API_KEY=your-openai-key
ELEVENLABS_API_KEY=your-elevenlabs-key   # optional, for voice indicators
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Adding Agents

Edit `lib/agents.ts` and add an entry to the registry array:

```typescript
{
  id: 'my-agent',
  name: 'MY-AGENT',
  title: 'What they do',
  reportsTo: 'jarvis',           // parent agent id
  directReports: [],
  soulPath: 'agents/my-agent/SOUL.md',  // relative to WORKSPACE_PATH
  voiceId: null,                 // ElevenLabs voice ID if they have one
  color: '#06b6d4',              // node color on the map
  emoji: '🤖',
  tools: ['read', 'write'],
  description: 'One-liner description.',
}
```

They appear automatically in the map, detail pages, and chat. No other changes needed.

---

## Architecture

```
lib/
  agents.ts       — Agent registry + SOUL.md reader
  crons.ts        — Cron data via openclaw CLI
  memory.ts       — Memory file reader
  types.ts        — Shared TypeScript types

app/
  page.tsx        — Manor Map (React Flow org chart)
  agents/[id]/    — Agent detail page
  chat/[id]/      — Direct chat (call box)
  crons/          — Cron monitor
  memory/         — Memory file browser
  api/            — REST endpoints for all of the above

components/
  ManorMap.tsx    — React Flow graph with auto-layout
  AgentNode.tsx   — Custom node component
  NavLinks.tsx    — Active-aware sidebar navigation
```

---

## Stack

- [Next.js 14](https://nextjs.org) (App Router)
- [TypeScript](https://typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [React Flow (@xyflow/react)](https://reactflow.dev)
- [OpenAI SDK](https://github.com/openai/openai-node) — GPT-4o for agent chat

---

## Built by

[John Rice](https://github.com/johnrice) · Orchestrated by Jarvis (OpenClaw AI)

---

## License

MIT
