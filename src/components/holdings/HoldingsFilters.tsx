import type { FilterOptions, Filters } from './holdingsView.ts';

function Select({
  label, value, options, onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="h-field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">すべて</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
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
    <form className="h-filters card" role="search" aria-label="銘柄の絞り込み" onSubmit={(e) => e.preventDefault()}>
      <label className="h-field h-field-wide">
        <span>銘柄名で検索</span>
        <input
          type="search"
          value={filters.query}
          placeholder="銘柄名の一部"
          autoComplete="off"
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
        />
      </label>
      <Select label="証券会社" value={filters.broker} options={options.brokers} onChange={(broker) => onChange({ ...filters, broker })} />
      <Select label="口座区分" value={filters.account} options={options.accounts} onChange={(account) => onChange({ ...filters, account })} />
      <Select label="資産クラス" value={filters.assetClass} options={options.assetClasses} onChange={(assetClass) => onChange({ ...filters, assetClass })} />
      <label className="h-check">
        <input
          type="checkbox"
          checked={filters.unclassifiedOnly}
          onChange={(e) => onChange({ ...filters, unclassifiedOnly: e.target.checked })}
        />
        未分類のみ
      </label>
      <button type="button" className="h-reset" onClick={onReset}>条件をクリア</button>
    </form>
  );
}
