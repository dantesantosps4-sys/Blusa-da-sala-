export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  centerLabel?: string;
  centerValue?: string;
}

export function DonutChart({
  segments,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const arcs = segments.map((seg, i) => {
    const fraction = total === 0 ? 0 : seg.value / total;
    const length = fraction * circumference;
    const dash = `${length} ${circumference - length}`;
    const el = (
      <circle
        key={i}
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke={seg.color}
        strokeWidth="14"
        strokeDasharray={dash}
        strokeDashoffset={-offset}
        strokeLinecap="butt"
        transform="rotate(-90 60 60)"
        className="donut__arc"
      />
    );
    offset += length;
    return el;
  });

  return (
    <div className="donut">
      <svg viewBox="0 0 120 120" width="140" height="140" role="img">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="14"
        />
        {total > 0 && arcs}
        {centerValue && (
          <text
            x="60"
            y="56"
            textAnchor="middle"
            className="donut__center-value"
          >
            {centerValue}
          </text>
        )}
        {centerLabel && (
          <text
            x="60"
            y="74"
            textAnchor="middle"
            className="donut__center-label"
          >
            {centerLabel}
          </text>
        )}
      </svg>
      <ul className="donut__legend">
        {segments.map((seg, i) => (
          <li key={i}>
            <span
              className="donut__swatch"
              style={{ background: seg.color }}
              aria-hidden="true"
            />
            {seg.label}
            <strong>{seg.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
