import type { AdminStats } from "../../types";
import { DonutChart } from "../charts/DonutChart";
import { MoneyBars } from "../charts/MoneyBars";

interface AdminChartsProps {
  stats: AdminStats;
}

export function AdminCharts({ stats }: AdminChartsProps) {
  const answeredPct =
    stats.total === 0 ? 0 : Math.round((stats.answered / stats.total) * 100);

  return (
    <div className="charts">
      <div className="chartcard">
        <h3 className="chartcard__title">Escolhas</h3>
        <DonutChart
          centerValue={`${answeredPct}%`}
          centerLabel="responderam"
          segments={[
            { label: "Só Blusa", value: stats.onlyBlusa, color: "#29d3f0" },
            {
              label: "Blusa + Short",
              value: stats.blusaShort,
              color: "#7b6cff",
            },
            {
              label: "Sem resposta",
              value: stats.pending,
              color: "#3a4170",
            },
          ]}
        />
      </div>

      <div className="chartcard">
        <h3 className="chartcard__title">Valores</h3>
        <MoneyBars
          bars={[
            { label: "Previsto", value: stats.expected, color: "#7b6cff" },
            { label: "Arrecadado", value: stats.collected, color: "#34d399" },
            { label: "Pendente", value: stats.outstanding, color: "#fb7185" },
          ]}
        />
      </div>
    </div>
  );
}
