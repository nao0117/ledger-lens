import { useMemo } from 'react';
import { buildHoldingRows, composition, previousDate, summarize } from '../domain/index.ts';
import { AllocationCard } from '../components/dashboard/AllocationCard.tsx';
import { buildAllocation, cashStockRatio } from '../components/dashboard/allocation.ts';
import { CheckCard } from '../components/dashboard/CheckCard.tsx';
import { MoversCard } from '../components/dashboard/MoversCard.tsx';
import { topMovers } from '../components/dashboard/movers.ts';
import { SummaryCard } from '../components/dashboard/SummaryCard.tsx';
import { assetClassColor } from '../components/colors.ts';
import TrendSection from '../components/trend/TrendSection.tsx';
import { useData } from '../state/data.tsx';
import './Dashboard.css';

const MOVERS_COUNT = 5;

/** ホーム（サマリーファースト）。すべて基準日時点の値で、推移も基準日を終点にする。 */
export default function Dashboard() {
  const { data, baseDate } = useData();
  const summary = useMemo(() => (baseDate === null ? null : summarize(data, baseDate)), [data, baseDate]);
  const allocation = useMemo(
    () => (baseDate === null ? [] : buildAllocation(composition(data, 'assetClass', baseDate))),
    [data, baseDate],
  );
  const rows = useMemo(() => (baseDate === null ? [] : buildHoldingRows(data, baseDate)), [data, baseDate]);
  const movers = useMemo(() => topMovers(rows, MOVERS_COUNT), [rows]);
  const unclassifiedCount = useMemo(() => rows.filter((r) => r.unclassified && r.held).length, [rows]);

  if (summary === null || baseDate === null) {
    return (
      <section className="home">
        <h2 className="sr-only">ホーム</h2>
        <p className="note">表示できるデータがありません</p>
      </section>
    );
  }

  // 資産クラスの色は配分の並び順で決め、今月の動きの印と揃える
  const colors = new Map(allocation.map((a, i) => [a.key, assetClassColor(a.key, i)]));
  const colorOf = (assetClass: string) => colors.get(assetClass) ?? assetClassColor(assetClass);
  const { cash, stock } = summary.totals;
  const cashStock = cashStockRatio(cash, stock);
  const sortedDates = [...data.dates].sort();

  return (
    <section className="home">
      <h2 className="sr-only">ホーム</h2>
      <SummaryCard summary={summary} cashStock={cashStock} />
      <TrendSection data={data} endDate={baseDate} />
      <MoversCard movers={movers} previousDate={previousDate(sortedDates, baseDate)} colorOf={colorOf} />
      <AllocationCard items={allocation} cash={cash} stock={stock} cashStock={cashStock} colorOf={colorOf} />
      <CheckCard unclassifiedCount={unclassifiedCount} warnings={data.warnings} />
    </section>
  );
}
