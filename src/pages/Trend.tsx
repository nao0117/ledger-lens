import { useState } from 'react';
import type { Period } from '../domain/index.ts';
import TrendChart, { seriesColor } from '../components/trend/TrendChart.tsx';
import TrendTable from '../components/trend/TrendTable.tsx';
import { buildTrendModel, type TrendBy } from '../components/trend/model.ts';
import { useData } from '../state/data.tsx';
import { usePrefs } from '../state/prefs.tsx';
import './Trend.css';

const BY_OPTIONS: { value: TrendBy; label: string }[] = [
  { value: 'none', label: 'なし' },
  { value: 'assetClass', label: '資産クラス別' },
  { value: 'broker', label: '証券会社別' },
  { value: 'account', label: '口座区分別' },
];
const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '1y', label: '1年' },
  { value: '3y', label: '3年' },
  { value: 'all', label: '全期間' },
];

export default function Trend() {
  const { data } = useData();
  const { period, setPeriod } = usePrefs();
  const [by, setBy] = useState<TrendBy>('none');
  const model = buildTrendModel(data, by, period);

  return (
    <section className="trend">
      <h2>推移</h2>
      <div className="trend-controls">
        <div role="group" aria-label="内訳">
          {BY_OPTIONS.map((o) => (
            <button key={o.value} type="button" aria-pressed={by === o.value} onClick={() => setBy(o.value)}>
              {o.label}
            </button>
          ))}
        </div>
        <div role="group" aria-label="期間">
          {PERIOD_OPTIONS.map((o) => (
            <button key={o.value} type="button" aria-pressed={period === o.value} onClick={() => setPeriod(o.value)}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <div className="card">
        {model.rows.length === 0 ? (
          <p className="note">表示できるデータがありません。</p>
        ) : (
          <>
            {model.rows.length === 1 && <p className="note">データが1日分しかないため、推移は表示できません（点のみ）。</p>}
            <TrendChart model={model} />
            {model.keys.length > 1 && (
              <ul className="trend-legend" aria-label="凡例">
                {model.keys.map((k, i) => (
                  <li key={k}>
                    <span className="trend-swatch" style={{ background: seriesColor(i) }} aria-hidden="true" />
                    {k}
                  </li>
                ))}
                <li>
                  <span className="trend-swatch trend-swatch-line" aria-hidden="true" />
                  総資産（破線）
                </li>
              </ul>
            )}
          </>
        )}
        <TrendTable model={model} />
      </div>
    </section>
  );
}
