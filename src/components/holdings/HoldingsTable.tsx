import type { HoldingRow } from '../../domain/index.ts';
import { useMoney } from '../Money.tsx';
import { changeKind, formatPercent, isNewHolding, type Sort, type SortKey } from './holdingsView.ts';

type Column = { key: SortKey; label: string; numeric?: boolean };

export const COLUMNS: Column[] = [
  { key: 'name', label: '銘柄名' },
  { key: 'broker', label: '証券会社' },
  { key: 'account', label: '口座区分' },
  { key: 'assetClass', label: '資産クラス' },
  { key: 'value', label: '評価額', numeric: true },
  { key: 'ratio', label: '構成比', numeric: true },
  { key: 'changeAmount', label: '前回比（金額）', numeric: true },
  { key: 'changePercent', label: '前回比（%）', numeric: true },
];

const ARROW = { up: '▲', down: '▼', flat: '±', none: '' } as const;

function ariaSort(sort: Sort, key: SortKey): 'ascending' | 'descending' | 'none' {
  if (sort.key !== key) return 'none';
  return sort.dir === 'asc' ? 'ascending' : 'descending';
}

function ChangeAmount({ row }: { row: HoldingRow }) {
  const { yen, mask } = useMoney();
  const kind = changeKind(row);
  if (!row.change) return <span className="h-muted">―</span>;
  const amount = row.change.amount;
  const text = mask ? yen(amount) : kind === 'flat' ? '変化なし' : `${amount > 0 ? '+' : ''}${yen(amount)}`;
  return (
    <span className={`h-change h-${kind}`}>
      <span aria-hidden="true">{ARROW[kind]} </span>
      {text}
    </span>
  );
}

function ChangePercent({ row }: { row: HoldingRow }) {
  const kind = changeKind(row);
  if (!row.change) return <span className="h-muted">―</span>;
  if (row.change.percent === null) {
    return <span className="h-muted">{isNewHolding(row) ? '新規' : '―'}</span>;
  }
  return (
    <span className={`h-change h-${kind}`}>
      <span aria-hidden="true">{ARROW[kind]} </span>
      {formatPercent(row.change.percent, true)}
    </span>
  );
}

export function HoldingsTable({
  rows, sort, onSort,
}: {
  rows: HoldingRow[];
  sort: Sort;
  onSort: (key: SortKey) => void;
}) {
  const { yen } = useMoney();
  return (
    <table className="h-table">
      <thead>
        <tr>
          {COLUMNS.map((c) => (
            <th key={c.key} scope="col" aria-sort={ariaSort(sort, c.key)} className={c.numeric ? 'h-num' : undefined}>
              <button type="button" className="h-sort" onClick={() => onSort(c.key)}>
                {c.label}
                <span aria-hidden="true" className="h-sort-mark">
                  {sort.key === c.key ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className={r.unclassified ? 'h-row-unclassified' : undefined}>
            <th scope="row" className="h-name" data-label="銘柄名">
              <span>{r.name}</span>
              {r.unclassified && <span className="h-badge">未分類</span>}
            </th>
            <td data-label="証券会社">{r.broker}</td>
            <td data-label="口座区分">{r.account}</td>
            <td data-label="資産クラス">{r.assetClass}</td>
            <td data-label="評価額" className={`h-num${r.value < 0 ? ' h-down' : ''}`}>{yen(r.value)}</td>
            <td data-label="構成比" className="h-num">{formatPercent(r.ratio)}</td>
            <td data-label="前回比（金額）" className="h-num"><ChangeAmount row={r} /></td>
            <td data-label="前回比（%）" className="h-num"><ChangePercent row={r} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
