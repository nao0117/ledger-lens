import { useMemo, useState } from 'react';
import { buildHoldingRows, groupBySecurity } from '../domain/index.ts';
import { usePrefs, type HoldingsGrouping } from '../state/prefs.tsx';
import { useData } from '../state/data.tsx';
import { useRouteQuery } from '../router.ts';
import { useMoney } from '../components/Money.tsx';
import { HoldingsFilters, SortChip } from '../components/holdings/HoldingsFilters.tsx';
import { HoldingsList } from '../components/holdings/HoldingsList.tsx';
import { HoldingsTable } from '../components/holdings/HoldingsTable.tsx';
import { SecurityList } from '../components/holdings/SecurityList.tsx';
import { SecurityTable } from '../components/holdings/SecurityTable.tsx';
import { GroupingToggle, MarginProfit } from '../components/holdings/SecurityParts.tsx';
import {
  countLabel, DEFAULT_SORT, EMPTY_FILTERS, filterOptions, filterRows, formatJpDate, hasActiveFilters, heldRows, heldSecurities, nextSort,
  SECURITY_SORT_KEYS, securityCountLabel, securityTotals, sortForSecurities, sortRows, sortSecurities, sumValues,
  type Filters, type Sort,
} from '../components/holdings/holdingsView.ts';
import './Holdings.css';

export default function Holdings() {
  const { data, baseDate } = useData();
  const { yen } = useMoney();
  const { holdingsGrouping: grouping, setHoldingsGrouping, showNotHeld, setShowNotHeld } = usePrefs();
  const bySecurity = grouping === 'security';
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

  const everything = useMemo(() => buildHoldingRows(data, baseDate ?? undefined), [data, baseDate]);
  // 基準日に保有していない銘柄（シートの空欄）は、設定で表示しない限り隠す。評価額 0 と入力されたものは表示する
  const all = useMemo(() => heldRows(everything, showNotHeld), [everything, showNotHeld]);
  const options = useMemo(() => filterOptions(all), [all]);
  const matched = useMemo(() => filterRows(all, filters), [all, filters]);
  const visible = useMemo(() => sortRows(matched, sort), [matched, sort]);
  // 銘柄ごと: 先に口座ごとの行で絞り込んでからまとめる（証券会社で絞ればその証券会社にある分だけの合計）
  const securityCount = useMemo(() => heldSecurities(everything, showNotHeld).length, [everything, showNotHeld]);
  const securities = useMemo(
    () => sortSecurities(heldSecurities(filterRows(everything, filters), showNotHeld), sort),
    [everything, filters, sort, showNotHeld],
  );
  const totals = useMemo(() => securityTotals(securities), [securities]);
  const unclassifiedCount = useMemo(() => all.filter((r) => r.unclassified).length, [all]);
  const notHeldCount = useMemo(
    () => (bySecurity ? groupBySecurity(everything).filter((s) => !s.held).length : everything.filter((r) => !r.held).length),
    [everything, bySecurity],
  );
  const filtered = hasActiveFilters(filters);
  const reset = () => setFilters(EMPTY_FILTERS);
  const changeGrouping = (g: HoldingsGrouping) => {
    setHoldingsGrouping(g);
    // 証券会社・口座区分の並べ替えは銘柄ごとでは使えないので、評価額の降順に戻す
    if (g === 'security') setSort(sortForSecurities);
  };
  const shownSort = bySecurity ? sortForSecurities(sort) : sort;
  const empty = bySecurity ? securities.length === 0 : visible.length === 0;

  return (
    <section className="holdings">
      <h2 className="sr-only">銘柄一覧</h2>
      {everything.length === 0 ? (
        <p className="note">表示できる銘柄がありません。</p>
      ) : (
        <>
          <p className="h-lead">
            {baseDate ? `${formatJpDate(baseDate)} 時点の評価額。` : '評価額。'}信用は損益を表示
            {bySecurity && '。同じ銘柄は口座をまたいでまとめて表示しています（信用の損益は評価額に含めません）'}
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
            <GroupingToggle value={grouping} onChange={changeGrouping} />
            <HoldingsFilters
              filters={filters}
              options={options}
              onChange={setFilters}
              onReset={reset}
              notHeld={{ count: notHeldCount, shown: showNotHeld, onToggle: () => setShowNotHeld(!showNotHeld) }}
            />
            <div className="h-sumline">
              {bySecurity ? (
                <p className="h-count" aria-live="polite">
                  {securityCountLabel(securities, securityCount, filtered)}・合計 <b className="h-total">{yen(totals.value)}</b>
                  {totals.margin !== null && (
                    <small className="h-count-note">
                      （<MarginProfit value={totals.margin} /> は含みません）
                    </small>
                  )}
                </p>
              ) : (
                <p className="h-count" aria-live="polite">
                  {countLabel(visible.length, all.length, filtered)}・合計 <b className="h-total">{yen(sumValues(visible))}</b>
                </p>
              )}
              <SortChip sort={shownSort} onChange={setSort} keys={bySecurity ? SECURITY_SORT_KEYS : undefined} />
            </div>
          </div>
          {empty ? (
            <div className="h-empty">
              <p>条件に合う銘柄がありません。</p>
              <button type="button" className="h-chip" onClick={reset}>条件をクリア</button>
            </div>
          ) : (
            bySecurity ? (
              <>
                <SecurityList rows={securities} assetClasses={options.assetClasses} />
                <div className="h-table-wrap">
                  <SecurityTable
                    rows={securities}
                    sort={shownSort}
                    onSort={(key) => setSort((s) => nextSort(sortForSecurities(s), key))}
                    assetClasses={options.assetClasses}
                  />
                </div>
              </>
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
            )
          )}
        </>
      )}
    </section>
  );
}
