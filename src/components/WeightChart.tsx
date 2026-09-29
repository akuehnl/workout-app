import { buildChart, type ChartPoint, type TrendLine } from '../lib/metrics'

/* ---------------------------------------------------------------------------
   Inline SVG. No charting library -- one line, one dashed goal line, an
   optional fitted trend and three tick labels is well inside what sixty lines
   of SVG does cleanly.

   Colours come from the theme tokens. The accent stays reserved for the goal;
   the trend is drawn in it too, because the trend exists only to answer a
   question about the goal.
   --------------------------------------------------------------------------- */
export default function WeightChart({
  points,
  goal,
  trend = null,
}: {
  points: ChartPoint[]
  goal: number | null
  trend?: TrendLine | null
}) {
  const chart = buildChart(points, goal, trend)

  if (!chart) {
    return (
      <p className="rounded-card bg-sunken p-4 text-small text-muted">
        No weigh-ins yet. Add one below and the chart starts here.
      </p>
    )
  }

  const { width, height, path, dots, goalY, yTicks, xLabels, trendPath, todayX } = chart

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ height: 'auto' }}
      role="img"
      aria-label={
        `Weight over time, ${points.length} ${points.length === 1 ? 'reading' : 'readings'}` +
        (goal !== null ? `, goal ${goal} pounds` : '') +
        (trend ? ', with a projected trend line' : '')
      }
    >
      {/* horizontal guides */}
      {yTicks.map((tick) => (
        <g key={tick.label + tick.y}>
          <line
            x1={32}
            x2={width - 10}
            y1={tick.y}
            y2={tick.y}
            stroke="var(--color-line)"
            strokeWidth={1}
          />
          <text x={27} y={tick.y + 3} textAnchor="end" fontSize={9} fill="var(--color-faint)">
            {tick.label}
          </text>
        </g>
      ))}

      {/* where the record stops and the guess begins */}
      {todayX !== null && (
        <line
          x1={todayX}
          x2={todayX}
          y1={10}
          y2={height - 20}
          stroke="var(--color-line-strong)"
          strokeWidth={1}
        />
      )}

      {/* the goal, dashed and in the accent -- the one thing being aimed at */}
      {goalY !== null && (
        <line
          x1={32}
          x2={width - 10}
          y1={goalY}
          y2={goalY}
          stroke="var(--color-accent)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
      )}

      {/* the fitted trend, drawn under the readings so the data stays on top */}
      {trendPath && (
        <path
          d={trendPath}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={2}
          strokeDasharray="1 4"
          strokeLinecap="round"
          opacity={0.9}
        />
      )}

      {/* the readings */}
      {points.length > 1 && (
        <path
          d={path}
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {dots.map((dot) => (
        <circle
          key={dot.date}
          cx={dot.x}
          cy={dot.y}
          r={dots.length > 12 ? 1.8 : 3}
          fill="var(--color-ink)"
        />
      ))}

      {xLabels.map((label) => (
        <text
          key={label.label + label.x}
          x={label.x}
          y={height - 6}
          textAnchor={label.anchor}
          fontSize={9}
          fill="var(--color-faint)"
        >
          {label.label}
        </text>
      ))}
    </svg>
  )
}
