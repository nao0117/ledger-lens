import {
  defaultDir, filterChipLabel, hasActiveFilters, SORT_LABELS, sortArrow,
  type FilterOptions, type Filters, type Sort, type SortKey,
} from './holdingsView.ts';

function Chevron() {
  return (
    <svg className="h-chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/** ネイティブ select をチップ風に見せる。select は透明にして全面に重ね、ピッカーは OS のものを使う。 */
function SelectChip({
  label, value, options, onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <span className={`h-chip h-chip-select${value ? ' is-on' : ''}`}>
      <span aria-hidden="true">{filterChipLabel(label, value)}</span>
      <Chevron />
      <select aria-label={`${label}で絞り込み`} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">すべての{label}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </span>
  );
}

export function HoldingsFilters({
  filters, options, onChange, onReset,
}: {
  filters: Filters;
  options: FilterOptions;
  onChange: (next: Filters) => void;
  onReset: () => void;
}) {
  return (
    <form className="h-filters" role="search" aria-label="銘柄の絞り込み" onSubmit={(e) => e.preventDefault()}>
      <label className="h-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={filters.query}
          placeholder="銘柄名で検索"
          aria-label="銘柄名で検索"
          autoComplete="off"
          enterKeyHint="search"
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
        />
      </label>
      <div className="h-chips">
        <SelectChip label="証券会社" value={filters.broker} options={options.brokers} onChange={(broker) => onChange({ ...filters, broker })} />
        <SelectChip label="口座区分" value={filters.account} options={options.accounts} onChange={(account) => onChange({ ...filters, account })} />
        <SelectChip label="資産クラス" value={filters.assetClass} options={options.assetClasses} onChange={(assetClass) => onChange({ ...filters, assetClass })} />
        <button
          type="button"
          className={`h-chip h-chip-warn${filters.unclassifiedOnly ? ' is-on' : ''}`}
          aria-pressed={filters.unclassifiedOnly}
          onClick={() => onChange({ ...filters, unclassifiedOnly: !filters.unclassifiedOnly })}
        >
          未分類のみ
        </button>
        {hasActiveFilters(filters) && (
          <button type="button" className="h-chip h-chip-clear" onClick={onReset} aria-label="絞り込み条件をクリア">
            クリア
          </button>
        )}
      </div>
    </form>
  );
}

/** 並べ替え: キーを選ぶ select と、昇順・降順を切り替えるボタン。 */
export function SortChip({ sort, onChange }: { sort: Sort; onChange: (next: Sort) => void }) {
  const asc = sort.dir === 'asc';
  return (
    <span className="h-sortchip">
      <span className="h-chip h-chip-select">
        <span aria-hidden="true">{SORT_LABELS[sort.key]}</span>
        <Chevron />
        <select
          aria-label="並べ替えの項目"
          value={sort.key}
          onChange={(e) => {
            const key = e.target.value as SortKey;
            onChange({ key, dir: defaultDir(key) });
          }}
        >
          {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
            <option key={k} value={k}>{SORT_LABELS[k]}</option>
          ))}
        </select>
      </span>
      <button
        type="button"
        className="h-chip h-dir"
        aria-label={`${asc ? '昇順' : '降順'}で表示中。${asc ? '降順' : '昇順'}に切り替え`}
        onClick={() => onChange({ ...sort, dir: asc ? 'desc' : 'asc' })}
      >
        <span aria-hidden="true">{sortArrow(sort.dir)}</span>
      </button>
    </span>
  );
}
