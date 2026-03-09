import { getAgents } from "@/lib/agents"
import { getCrons } from "@/lib/crons"
import { HomeClient } from "./_components/HomeClient"

export default async function HomePage() {
  const [agents, crons] = await Promise.all([getAgents(), getCrons()])

  return <HomeClient agents={agents} crons={crons} />
}
