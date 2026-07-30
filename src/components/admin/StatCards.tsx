import type { AdminStats } from "../../types";
import { money } from "../../utils/format";

interface StatCardsProps {
  stats: AdminStats;
}

interface Card {
  label: string;
  value: string;
  tone: "neutral" | "cyan" | "unpaid" | "violet" | "paid";
  sub?: string;
}

export function StatCards({ stats }: StatCardsProps) {
  const cards: Card[] = [
    { label: "Alunos", value: String(stats.total), tone: "neutral" },
    { label: "Responderam", value: String(stats.answered), tone: "cyan" },
    { label: "Faltam responder", value: String(stats.pending), tone: "unpaid" },
    { label: "Só Blusa", value: String(stats.onlyBlusa), tone: "neutral" },
    { label: "Blusa + Short", value: String(stats.blusaShort), tone: "violet" },
    { label: "Valor previsto", value: money(stats.expected), tone: "neutral" },
    { label: "Arrecadado", value: money(stats.collected), tone: "paid" },
    { label: "Pendente", value: money(stats.outstanding), tone: "unpaid" },
    {
      label: "Links compartilhados",
      value: `${stats.sharedCount}/${stats.total}`,
      sub: `${stats.sharedPct}% enviados`,
      tone: "cyan",
    },
  ];

  return (
    <div className="statcards">
      {cards.map((c) => (
        <div key={c.label} className={`statcard statcard--${c.tone}`}>
          <span className="statcard__value">{c.value}</span>
          <span className="statcard__label">{c.label}</span>
          {c.sub && <span className="statcard__sub">{c.sub}</span>}
        </div>
      ))}
    </div>
  );
}
