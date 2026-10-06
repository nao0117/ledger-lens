import { Area, CartesianGrid, ComposedChart, Line, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMoney } from '../Money.tsx';
import {
  TOTAL_LABEL,
  axisYenFormatter,
  formatDateJa,
  formatMonthLabel,
  maxAbsValue,
  tickInterval,
  trendColor,
  type TrendBy,
  type TrendModel,
  type TrendRow,
} from './model.ts';

type TipProps = {
  active?: boolean;
  payload?: { payload: TrendRow }[];
  keys: string[];
  by: TrendBy;
  yen: (v: number) => string;
};

function TrendTooltip({ active, payload, keys, by, yen }: TipProps) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="trend-tip">
      <strong>{formatDateJa(row.date)}</strong>
      {keys.length > 1 && (
        <ul>
          {keys.map((k, i) => (
            <li key={k}>
              <span className="trend-swatch" style={{ background: trendColor(by, k, i) }} aria-hidden="true" />
              {k}: {yen(row.values[k] ?? 0)}
            </li>
          ))}
        </ul>
      )}
      <div>
        {TOTAL_LABEL}: {yen(row.total)}
      </div>
    </div>
  );
}

/** 積み上げ面（符号付き積み上げ）＋総資産の線。終点（基準日）を強調する。マスク時は軸・ツールチップの金額を伏せる。 */
export default function TrendChart({ model, by }: { model: TrendModel; by: TrendBy }) {
  const { mask, yen } = useMoney();
  const { keys, rows } = model;
  const single = keys.length === 1;
  const last = rows[rows.length - 1];
  const endColor = single ? trendColor(by, keys[0] ?? TOTAL_LABEL, 0) : 'var(--text)';
  const formatTick = axisYenFormatter(maxAbsValue(rows), mask);
  const range = rows.length > 0 ? `${formatDateJa(rows[0]!.date)}から${formatDateJa(last!.date)}まで` : '';
  return (
    <div className="trend-chart" role="img" aria-label={`${TOTAL_LABEL}の推移グラフ（${range}）。同じ値は下の表で確認できます。`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} stackOffset="sign" margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatMonthLabel}
            interval={tickInterval(rows.length, 6)}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            stroke="var(--border)"
          />
          <YAxis
            width={mask ? 40 : 56}
            tickFormatter={formatTick}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            stroke="var(--border)"
          />
          <Tooltip content={<TrendTooltip keys={keys} by={by} yen={yen} />} />
          {keys.map((k, i) => (
            <Area
              key={k}
              type="monotone"
              stackId="s"
              dataKey={(r: TrendRow) => r.values[k] ?? 0}
              name={k}
              stroke={trendColor(by, k, i)}
              fill={trendColor(by, k, i)}
              fillOpacity={single ? 0.16 : 0.7}
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
          {last && <ReferenceDot x={last.date} y={last.total} r={5} fill="var(--surface)" stroke={endColor} strokeWidth={2.5} />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
