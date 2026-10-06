import { useMoney } from '../Money.tsx';
import { TOTAL_LABEL, formatDateJa, seriesLabel, type TrendModel } from './model.ts';

/** グラフと同じ値の表（折りたたみ）。新しい日付が上。 */
export default function TrendTable({ model }: { model: TrendModel }) {
  const { yen } = useMoney();
  const single = model.keys.length === 1;
  const rows = [...model.rows].reverse();
  return (
    <details className="trend-table-wrap">
      <summary>表で見る</summary>
      {rows.length === 0 ? (
        <p className="note">表示できるデータがありません。</p>
      ) : (
        <div className="trend-scroll" tabIndex={0}>
          <table className="trend-table">
            <caption className="sr-only">{TOTAL_LABEL}の推移（日付ごと）</caption>
            <thead>
              <tr>
                <th scope="col">日付</th>
                {!single && model.keys.map((k) => <th key={k} scope="col">{seriesLabel(model, k)}</th>)}
                <th scope="col">{TOTAL_LABEL}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.date}>
                  <th scope="row">{formatDateJa(r.date)}</th>
                  {!single && model.keys.map((k) => <td key={k}>{yen(r.values[k] ?? 0)}</td>)}
                  <td>{yen(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </details>
  );
}
