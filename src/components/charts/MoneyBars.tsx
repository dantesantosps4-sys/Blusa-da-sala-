import { money } from "../../utils/format";

export interface MoneyBar {
  label: string;
  value: number;
  color: string;
}

interface MoneyBarsProps {
  bars: MoneyBar[];
}

export function MoneyBars({ bars }: MoneyBarsProps) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <div className="moneybars">
      {bars.map((b, i) => (
        <div className="moneybars__row" key={i}>
          <div className="moneybars__head">
            <span>{b.label}</span>
            <strong>{money(b.value)}</strong>
          </div>
          <div className="moneybars__track">
            <div
              className="moneybars__fill"
              style={{
                width: `${(b.value / max) * 100}%`,
                background: b.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
