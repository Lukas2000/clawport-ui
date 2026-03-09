import { notFound } from "next/navigation"
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
    getCrons(),
  ])

  if (!agent) {
    notFound()
  }

  const agentCrons = allCrons.filter((cr) => cr.agentId === id)

  return (
    <AgentDetailClient
      agent={agent}
      allAgents={allAgents}
      crons={agentCrons}
    />
  )
}
