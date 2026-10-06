import type { Summary } from '../../domain/index.ts';
import { useMoney } from '../Money.tsx';
import { formatDateJa } from '../trend/model.ts';
import { Delta } from './Delta.tsx';
import { formatRatio, monthLabel } from './format.ts';
import type { CashStock } from './allocation.ts';

/** 総資産額。「¥」を少し小さくする（マスク時は ¥***,***）。 */
function TotalAmount({ value }: { value: number }) {
  const { yen } = useMoney();
  const text = yen(value);
  const m = /^(-?)¥(.*)$/.exec(text);
  return (
    <span className="money">
      {m ? (
        <>
          {m[1]}
          <span className="home-yen">¥</span>
          {m[2]}
        </>
      ) : (
        text
      )}
    </span>
  );
}

/** 総資産のサマリー（スマホ: 一文＋チップ、PC: KPI の横並び）。 */
export function SummaryCard({ summary, cashStock }: { summary: Summary; cashStock: CashStock }) {
  const { date, totals, vsPrevious, vsYearAgo } = summary;
  const month = monthLabel(date);
  return (
    <section className="card home-card home-summary" aria-labelledby="home-summary-h">
      <div className="home-hero">
        <h3 id="home-summary-h" className="home-label">
          総資産（{formatDateJa(date)}）
        </h3>
        <p className="home-total num">
          <TotalAmount value={totals.total} />
        </p>
      </div>
      <div className="home-kpi home-kpi-prev">
        <span className="home-kpi-label only-pc">前回比</span>
        {vsPrevious ? (
          <p className="home-sentence" title={`前回（${formatDateJa(vsPrevious.date)}）との比較`}>
            <span className="only-mobile">{month ? `${month}は ` : '前回比 '}</span>
            <Delta amount={vsPrevious.amount} percent={vsPrevious.percent} />
            <span className="home-kpi-date only-pc">{formatDateJa(vsPrevious.date)}比</span>
          </p>
        ) : (
          <p className="home-sentence note">前回のデータがないため、前回比はありません</p>
        )}
      </div>
      <div className="home-kpi home-kpi-yoy">
        <span className="home-kpi-label only-pc">前年同期比</span>
        {vsYearAgo ? (
          <p className="home-chip" title={`前年同時期（${formatDateJa(vsYearAgo.date)}）との比較`}>
            <span className="only-mobile">前年同期比 </span>
            <Delta amount={vsYearAgo.amount} percent={vsYearAgo.percent} />
            <span className="home-kpi-date">{formatDateJa(vsYearAgo.date)}比</span>
          </p>
        ) : (
          <p className="home-chip note">前年同期比: 1年前のデータがありません</p>
        )}
      </div>
      <div className="home-kpi home-kpi-stock only-pc">
        <span className="home-kpi-label">株式比率</span>
        <p className="home-kpi-value num">{cashStock ? formatRatio(cashStock.stockRatio) : '-'}</p>
      </div>
    </section>
  );
}
