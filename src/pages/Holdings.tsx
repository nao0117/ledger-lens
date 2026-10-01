import { useMemo, useState } from 'react';
import { buildHoldingRows } from '../domain/index.ts';
import { useData } from '../state/data.tsx';
import { HoldingsFilters } from '../components/holdings/HoldingsFilters.tsx';
import { COLUMNS, HoldingsTable } from '../components/holdings/HoldingsTable.tsx';
import {
  DEFAULT_SORT, defaultDir, EMPTY_FILTERS, filterOptions, filterRows, nextSort, sortRows,
  type Filters, type Sort, type SortDir, type SortKey,
} from '../components/holdings/holdingsView.ts';
import './Holdings.css';

export default function Holdings() {
  const { data, baseDate } = useData();
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const all = useMemo(() => buildHoldingRows(data, baseDate ?? undefined), [data, baseDate]);
  const options = useMemo(() => filterOptions(all), [all]);
  const visible = useMemo(() => sortRows(filterRows(all, filters), sort), [all, filters, sort]);
  const unclassifiedCount = useMemo(() => all.filter((r) => r.unclassified).length, [all]);

  return (
    <section className="holdings">
      <h2>銘柄一覧</h2>
      {all.length === 0 ? (
        <p className="note">表示できる銘柄がありません。</p>
      ) : (
        <>
          <p className="note">
            基準日 {baseDate} の評価額です。同じ銘柄でも口座が違えば別の行で表示します。信用は損益を表示します。
          </p>
          {unclassifiedCount > 0 && (
            <p className="h-alert" role="status">
              未分類の銘柄が {unclassifiedCount} 件あります。銘柄マスタに追加してください。
            </p>
          )}
          <HoldingsFilters
            filters={filters}
            options={options}
            onChange={setFilters}
            onReset={() => setFilters(EMPTY_FILTERS)}
          />
          <div className="h-sort-mobile">
            <label className="h-field">
              <span>並べ替え</span>
              <select value={sort.key} onChange={(e) => { const key = e.target.value as SortKey; setSort({ key, dir: defaultDir(key) }); }}>
                {COLUMNS.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </label>
            <label className="h-field">
              <span>順序</span>
              <select value={sort.dir} onChange={(e) => setSort({ ...sort, dir: e.target.value as SortDir })}>
                <option value="desc">降順</option>
                <option value="asc">昇順</option>
              </select>
            </label>
          </div>
          <p className="note" aria-live="polite">
            {visible.length} 件を表示（全 {all.length} 件）
          </p>
          {visible.length === 0 ? (
            <p className="card">条件に合う銘柄がありません。</p>
          ) : (
            <div className="h-table-wrap">
              <HoldingsTable rows={visible} sort={sort} onSort={(key) => setSort((s) => nextSort(s, key))} />
            </div>
          )}
        </>
      )}
    </section>
  );
}
