import { notFound, permanentRedirect } from "next/navigation"
import { getAgents, getAgent } from "@/lib/agents"
import { getCrons } from "@/lib/crons"
import { AgentDetailClient } from "./_components/AgentDetailClient"

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [agent, allAgents, allCrons] = await Promise.all([
    getAgent(id),
    getAgents(),
    getCrons().catch(() => []),
  ])

  if (!agent) {
    notFound()
  }

  // Redirect from old directory-based ID to the canonical name-based ID
  if (agent.legacyId === id && agent.id !== id) {
    permanentRedirect(`/agents/${agent.id}`)
  }

  const agentCrons = allCrons.filter((cr) => cr.agentId === agent.id || cr.agentId === agent.legacyId)

  return (
    <AgentDetailClient
      agent={agent}
      allAgents={allAgents}
      crons={agentCrons}
    />
  )
}
