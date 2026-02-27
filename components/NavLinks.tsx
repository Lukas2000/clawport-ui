"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { href: "/", icon: "🗺️", label: "Manor Map" },
  { href: "/crons", icon: "⏰", label: "Cron Monitor" },
  { href: "/memory", icon: "🧠", label: "Memory" },
];

export function NavLinks() {
  const pathname = usePathname();
  const [agentCount, setAgentCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((agents: unknown[]) => setAgentCount(agents.length))
      .catch(() => {});
  }, []);

  return (
    <nav className="flex-1 p-3 space-y-1">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive
                ? "bg-[#1a1a24] text-[#f5c518]"
                : "text-[#f5f5f7] hover:bg-[#1a1a24]"
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
            {item.href === "/" && agentCount !== null && (
              <span className="ml-auto text-xs text-[#86869b]">({agentCount})</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
