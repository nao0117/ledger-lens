import { useMemo } from 'react';
import { composition, summarize } from '../domain/index.ts';
import { ChangeCard } from '../components/dashboard/ChangeCard.tsx';
import { DonutCard } from '../components/dashboard/DonutCard.tsx';
import { buildSlices } from '../components/dashboard/slices.ts';
import { Money } from '../components/Money.tsx';
import { useData } from '../state/data.tsx';
import './Dashboard.css';

export default function Dashboard() {
  const { data, baseDate } = useData();
  const summary = useMemo(() => (baseDate === null ? null : summarize(data, baseDate)), [data, baseDate]);
  const classSlices = useMemo(
    () => (baseDate === null ? [] : buildSlices(composition(data, 'assetClass', baseDate).map((c) => ({ key: c.key, value: c.value })))),
    [data, baseDate],
  );

  if (summary === null) {
    return (
      <section>
        <h2>ダッシュボード</h2>
        <p className="note">表示できるデータがありません</p>
      </section>
    );
  }

  const { totals } = summary;
  const cashStock = buildSlices([
    { key: '現金', value: totals.cash },
    { key: '株式', value: totals.stock },
  ].sort((a, b) => b.value - a.value));

  return (
    <section className="dash">
      <h2>ダッシュボード</h2>
      <div className="card dash-total">
        <h3 className="dash-card-title">総資産（{summary.date}）</h3>
        <p className="dash-total-value">
          <Money value={totals.total} />
        </p>
      </div>
      <div className="dash-grid">
        <ChangeCard title="前回比" change={summary.vsPrevious} />
        <ChangeCard title="前年同時期比" change={summary.vsYearAgo} />
      </div>
      <div className="dash-grid">
        <DonutCard title={"現金と株式の比率"} slices={cashStock} />
        <DonutCard title="資産クラス別の比率" slices={classSlices} />
      </div>
    </section>
  );
}
