import { useMemo, useState } from 'react';
import { buildHoldingRows } from '../domain/index.ts';
import { useData } from '../state/data.tsx';
import { useRouteQuery } from '../router.ts';
import { useMoney } from '../components/Money.tsx';
import { HoldingsFilters, SortChip } from '../components/holdings/HoldingsFilters.tsx';
import { HoldingsList } from '../components/holdings/HoldingsList.tsx';
import { HoldingsTable } from '../components/holdings/HoldingsTable.tsx';
import {
  countLabel, DEFAULT_SORT, EMPTY_FILTERS, filterOptions, filterRows, formatJpDate, hasActiveFilters, nextSort,
  sortRows, sumValues, type Filters, type Sort,
} from '../components/holdings/holdingsView.ts';
import './Holdings.css';

export default function Holdings() {
  const { data, baseDate } = useData();
  const { yen } = useMoney();
  // ホームの「確認が必要」から `#/holdings?unclassified=1` で開かれたら未分類だけを表示する
  const unclassifiedParam = useRouteQuery().get('unclassified') === '1';
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT);
  const [filters, setFilters] = useState<Filters>(() => ({ ...EMPTY_FILTERS, unclassifiedOnly: unclassifiedParam }));
  const [prevParam, setPrevParam] = useState(unclassifiedParam);
  if (prevParam !== unclassifiedParam) {
    // クエリが変わったら追従する（描画中の state 調整。effect を使わない）
    setPrevParam(unclassifiedParam);
    setFilters((f) => ({ ...f, unclassifiedOnly: unclassifiedParam }));
  }

  const all = useMemo(() => buildHoldingRows(data, baseDate ?? undefined), [data, baseDate]);
  const options = useMemo(() => filterOptions(all), [all]);
  const visible = useMemo(() => sortRows(filterRows(all, filters), sort), [all, filters, sort]);
  const unclassifiedCount = useMemo(() => all.filter((r) => r.unclassified).length, [all]);
  const filtered = hasActiveFilters(filters);
  const reset = () => setFilters(EMPTY_FILTERS);

  return (
    <section className="holdings">
      <h2 className="sr-only">銘柄一覧</h2>
      {all.length === 0 ? (
        <p className="note">表示できる銘柄がありません。</p>
      ) : (
        <>
          <p className="h-lead">
            {baseDate ? `${formatJpDate(baseDate)} 時点の評価額。` : '評価額。'}信用は損益を表示
          </p>
          {unclassifiedCount > 0 && (
            <div className="h-alert" role="status">
              <span>未分類の銘柄が {unclassifiedCount} 件あります。銘柄マスタに追加してください。</span>
              <button
                type="button"
                className="h-alert-action"
                aria-pressed={filters.unclassifiedOnly}
                onClick={() => setFilters((f) => ({ ...f, unclassifiedOnly: !f.unclassifiedOnly }))}
              >
                {filters.unclassifiedOnly && <span aria-hidden="true">✓ </span>}
                未分類だけ表示
              </button>
            </div>
          )}
          <div className="h-tools">
            <HoldingsFilters filters={filters} options={options} onChange={setFilters} onReset={reset} />
            <div className="h-sumline">
              <p className="h-count" aria-live="polite">
                {countLabel(visible.length, all.length, filtered)}・合計 <b className="h-total">{yen(sumValues(visible))}</b>
              </p>
              <SortChip sort={sort} onChange={setSort} />
            </div>
          </div>
          {visible.length === 0 ? (
            <div className="h-empty">
              <p>条件に合う銘柄がありません。</p>
              <button type="button" className="h-chip" onClick={reset}>条件をクリア</button>
            </div>
          ) : (
            <>
              <HoldingsList rows={visible} assetClasses={options.assetClasses} />
              <div className="h-table-wrap">
                <HoldingsTable
                  rows={visible}
                  sort={sort}
                  onSort={(key) => setSort((s) => nextSort(s, key))}
                  assetClasses={options.assetClasses}
                />
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
