export const runtime = 'nodejs'

import { getAgent, getAgents, buildTeamContext, sanitizeSoulForTeam } from '@/lib/agents'
import { validateChatMessages } from '@/lib/validation'
import { hasImageContent, extractImageAttachments, buildTextPrompt, sendViaOpenClaw } from '@/lib/anthropic'

import OpenAI from 'openai'

// Route through the OpenClaw gateway — no separate API key needed
const openai = new OpenAI({
  baseURL: 'http://localhost:18789/v1',
  apiKey: process.env.OPENCLAW_GATEWAY_TOKEN,
})

const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || ''

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const [agent, allAgents] = await Promise.all([getAgent(id), getAgents()])

  if (!agent) {
    return new Response(JSON.stringify({ error: 'Agent not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON in request body.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const result = validateChatMessages(body)
  if (!result.ok) {
    return new Response(
      JSON.stringify({ error: result.error }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { messages } = result

  const rawBody = body as Record<string, unknown>
  const operatorName = typeof rawBody.operatorName === 'string' ? rawBody.operatorName : 'Operator'

  const hasTeam = allAgents.length > 1
  const teamContext = buildTeamContext(agent, allAgents)
  const cleanSoul = agent.soul ? sanitizeSoulForTeam(agent.soul, hasTeam) : null

  // Build system prompt with explicit framing to prevent OpenClaw's pre-built
  // SOUL.md from overriding ClawPort's team roster.
  //
  // Structure:
  //   1. PERSONALITY section (from soul) — wrapped with explicit caveat that
  //      any team/org assertions inside are OUTDATED and must be ignored
  //   2. TEAM ROSTER section — marked as authoritative ground truth
  //   3. Chat instructions
  //
  // This framing approach works regardless of how OpenClaw phrases its
  // "no team" assertions — we don't need to regex-match every variation.
  let systemPrompt: string
  if (cleanSoul && hasTeam) {
    systemPrompt = [
      '=== PERSONALITY & CHARACTER ===',
      'The section below defines your personality and workflow. It may list many specialist agents',
      'as "available" or "spawnable" — those are templates. Your PERMANENT team members are',
      'different and listed in the TEAM ROSTER section after your personality.',
      'Any claim below that "no agents are permanently assigned" or "no team exists" is OUTDATED.',
      'Ignore it. Your personality and workflow remain valid; only the team composition claims are wrong.\n',
      cleanSoul,
      '\n=== PERMANENT TEAM ROSTER (overrides any "no team" claims above) ===',
      'Unlike the spawnable specialist agents in your personality doc, the following are',
      'permanently assigned team members who are always available and report to you.\n',
      teamContext,
      `\nYou are speaking directly with ${operatorName}, your operator. Stay fully in character. Be concise — this is a live chat. 2-4 sentences unless detail is asked for. No em dashes.`,
    ].join('\n')
  } else if (cleanSoul) {
    systemPrompt = `${cleanSoul}\n\n${teamContext}\n\nYou are speaking directly with ${operatorName}, your operator. Stay fully in character. Be concise — this is a live chat. 2-4 sentences unless detail is asked for. No em dashes.`
  } else {
    systemPrompt = `${teamContext}\n\nYou are ${agent.name}, ${agent.title}. Respond in character. Be concise. No em dashes.`
  }

  // When the LATEST user message contains images, use the OpenClaw gateway's
  // chat.send pipeline. Only check the last message — older messages with images
  // should not force all future messages through this path.
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
  const latestHasImages = lastUserMsg ? hasImageContent([lastUserMsg]) : false

  if (latestHasImages && GATEWAY_TOKEN) {
    const attachments = extractImageAttachments([lastUserMsg!])
    const textPrompt = buildTextPrompt(systemPrompt, messages)

    const response = await sendViaOpenClaw({
      gatewayToken: GATEWAY_TOKEN,
      message: textPrompt,
      attachments,
    })

    // Return as a non-streaming SSE response (complete text at once)
    const encoder = new TextEncoder()
    const content = response || 'I had trouble processing that image. Could you try again or describe what you see?'
    const streamBody = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    return new Response(streamBody, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }

  try {
    const stream = await openai.chat.completions.create({
      model: 'claude-sonnet-4-6',
      stream: true,
      messages: [
        { role: 'system' as const, content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ] as OpenAI.ChatCompletionMessageParam[],
    })

    const streamBody = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
              )
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } catch (err) {
          console.error('Stream error:', err)
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(streamBody, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err: unknown) {
    console.error('Chat API error:', err)

    let userMessage = 'Chat failed. Make sure OpenClaw gateway is running.'
    if (err instanceof Error && 'status' in err && (err as { status: number }).status === 405) {
      userMessage = 'Gateway returned 405. Enable the HTTP endpoint: set gateway.http.endpoints.chatCompletions.enabled = true in ~/.openclaw/openclaw.json, then restart the gateway.'
    }

    return new Response(
      JSON.stringify({ error: userMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
