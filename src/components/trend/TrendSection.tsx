import { useMemo, useState } from 'react';
import type { Period } from '../../domain/index.ts';
import type { ParsedAnnual } from '../../parser/index.ts';
import { usePrefs } from '../../state/prefs.tsx';
import { Delta } from '../dashboard/Delta.tsx';
import { formatRatio } from '../dashboard/format.ts';
import Segmented from './Segmented.tsx';
import TrendChart from './TrendChart.tsx';
import TrendTable from './TrendTable.tsx';
import { buildLegend, buildTrendModel, formatMonthLabel, periodChange, type TrendBy } from './model.ts';

const BY_OPTIONS: { value: TrendBy; label: string }[] = [
  { value: 'none', label: '合計' },
  { value: 'assetClass', label: '資産クラス' },
  { value: 'broker', label: '証券会社' },
  { value: 'account', label: '口座' },
];
const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '1y', label: '1年' },
  { value: '3y', label: '3年' },
  { value: 'all', label: '全期間' },
];
const PERIOD_SUMMARY_LABEL: Record<Period, string> = { '1y': 'この1年', '3y': 'この3年', all: '全期間' };

type Props = {
  data: Pick<ParsedAnnual, 'holdings' | 'snapshots' | 'dates'>;
  /** 基準日。推移の終点になる */
  endDate: string | null;
  className?: string;
};

/** ホームの推移カード。期間・内訳の切り替え、期間の増減、グラフ、凡例、同じ値の表。 */
export default function TrendSection({ data, endDate, className = '' }: Props) {
  const { period, setPeriod } = usePrefs();
  const [by, setBy] = useState<TrendBy>('none');
  const model = useMemo(() => buildTrendModel(data, by, period, endDate), [data, by, period, endDate]);
  const change = periodChange(model.rows);
  const legend = by === 'none' ? [] : buildLegend(model, by);

  return (
    <section className={`card home-card home-trend ${className}`} aria-labelledby="home-trend-h">
      <h3 id="home-trend-h" className="home-card-title">
        推移
      </h3>
      <div className="trend-controls">
        <Segmented label="期間" options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
        <Segmented label="内訳" options={BY_OPTIONS} value={by} onChange={setBy} />
      </div>
      {model.rows.length === 0 ? (
        <p className="note">表示できるデータがありません。</p>
      ) : (
        <>
          {change ? (
            <p className="trend-summary">
              <span>
                {PERIOD_SUMMARY_LABEL[period]} <Delta amount={change.amount} percent={change.percent} />
              </span>
              <span className="trend-range num">
                {formatMonthLabel(change.from)} → {formatMonthLabel(change.to)}
              </span>
            </p>
          ) : (
            <p className="note">データが1日分しかないため、推移は表示できません（点のみ）。</p>
          )}
          <TrendChart model={model} by={by} />
          {legend.length > 0 && (
            <ul className="trend-legend" aria-label="凡例">
              {legend.map((l) => (
                <li key={l.key}>
                  <span className="trend-swatch" style={{ background: l.color }} aria-hidden="true" />
                  <span className="trend-legend-name">{l.key}</span>
                  <span className="trend-legend-ratio num">{l.ratio === null ? '-' : formatRatio(l.ratio)}</span>
                </li>
              ))}
              {model.keys.length > 1 && (
                <li>
                  <span className="trend-swatch trend-swatch-line" aria-hidden="true" />
                  総資産（破線）
                </li>
              )}
            </ul>
          )}
        </>
      )}
      <TrendTable model={model} />
    </section>
  );
}
