import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatManYen } from '../../domain/index.ts';
import { useMoney } from '../Money.tsx';
import { TOTAL_LABEL, formatDateJa, formatMonthLabel, tickInterval, type TrendModel, type TrendRow } from './model.ts';

export const seriesColor = (i: number) => `var(--series-${i + 1})`;

type TipProps = { active?: boolean; payload?: { payload: TrendRow }[]; keys: string[]; yen: (v: number) => string };

function TrendTooltip({ active, payload, keys, yen }: TipProps) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="trend-tip">
      <strong>{formatDateJa(row.date)}</strong>
      {keys.length > 1 && (
        <ul>
          {keys.map((k, i) => (
            <li key={k}>
              <span className="trend-swatch" style={{ background: seriesColor(i) }} aria-hidden="true" />
              {k}: {yen(row.values[k] ?? 0)}
            </li>
          ))}
        </ul>
      )}
      <div>{TOTAL_LABEL}: {yen(row.total)}</div>
    </div>
  );
}

/** 積み上げ面（符号付き積み上げ）＋総資産の線。マスク時は軸・ツールチップの金額を伏せる。 */
export default function TrendChart({ model }: { model: TrendModel }) {
  const { mask, yen } = useMoney();
  const { keys, rows } = model;
  const single = keys.length === 1;
  return (
    <div className="trend-chart" role="img" aria-label={`${TOTAL_LABEL}の推移グラフ。同じ値は下の表で確認できます。`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} stackOffset="sign" margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatMonthLabel}
            interval={tickInterval(rows.length, 6)}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            stroke="var(--border)"
          />
          <YAxis
            width={mask ? 48 : 60}
            tickFormatter={(v: number) => formatManYen(v, mask)}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            stroke="var(--border)"
          />
          <Tooltip content={<TrendTooltip keys={keys} yen={yen} />} />
          {keys.map((k, i) => (
            <Area
              key={k}
              type="monotone"
              stackId="s"
              dataKey={(r: TrendRow) => r.values[k] ?? 0}
              name={k}
              stroke={seriesColor(i)}
              fill={seriesColor(i)}
              fillOpacity={single ? 0.25 : 0.7}
              strokeWidth={single ? 2 : 1}
              isAnimationActive={false}
            />
          ))}
          {!single && (
            <Line
              type="monotone"
              dataKey="total"
              name={TOTAL_LABEL}
              stroke="var(--text)"
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={false}
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
