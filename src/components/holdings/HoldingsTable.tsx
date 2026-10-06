import type { HoldingRow } from '../../domain/index.ts';
import { assetClassColor } from '../colors.ts';
import { useMoney } from '../Money.tsx';
import {
  changeKind, formatPercent, isNewHolding, SORT_LABELS, type ChangeSource, type Sort, type SortKey,
} from './holdingsView.ts';

type Column = { key: SortKey; label: string; numeric?: boolean };

const NUMERIC_KEYS: ReadonlySet<SortKey> = new Set(['value', 'ratio', 'changeAmount', 'changePercent']);

export const COLUMNS: Column[] = (Object.keys(SORT_LABELS) as SortKey[]).map((key) => ({
  key,
  label: SORT_LABELS[key],
  numeric: NUMERIC_KEYS.has(key),
}));

const ARROW = { up: '▲', down: '▼', flat: '±', none: '' } as const;

export function ariaSort(sort: Sort, key: SortKey): 'ascending' | 'descending' | 'none' {
  if (sort.key !== key) return 'none';
  return sort.dir === 'asc' ? 'ascending' : 'descending';
}

export function ChangeAmount({ row }: { row: ChangeSource }) {
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

export function ChangePercent({ row }: { row: ChangeSource }) {
  const kind = changeKind(row);
  if (!row.change) return <span className="h-muted">―</span>;
  if (row.change.percent === null) {
    return <span className="h-muted">{isNewHolding(row) ? '新規' : '―'}</span>;
  }
  return (
    <span className={`h-change h-${kind}`}>
      <span aria-hidden="true">{ARROW[kind]} </span>
      {formatPercent(row.change.percent / 100, true)}
    </span>
  );
}

/** PC 用の表。見出しのクリックで並べ替える。assetClasses は資産クラス色の割り当て順。 */
export function HoldingsTable({
  rows, sort, onSort, assetClasses,
}: {
  rows: HoldingRow[];
  sort: Sort;
  onSort: (key: SortKey) => void;
  assetClasses: string[];
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
            <th scope="row" className="h-name">
              <span>{r.name}</span>
              {r.unclassified && <span className="h-badge">未分類</span>}
            </th>
            <td>{r.broker}</td>
            <td>{r.account}</td>
            <td>
              <span className="h-swatch" style={{ background: assetClassColor(r.assetClass, assetClasses.indexOf(r.assetClass)) }} aria-hidden="true" />
              {r.assetClass}
            </td>
            <td className={`h-num${r.value < 0 ? ' h-down' : ''}`}>{yen(r.value)}</td>
            <td className="h-num">{formatPercent(r.ratio)}</td>
            <td className="h-num"><ChangeAmount row={r} /></td>
            <td className="h-num"><ChangePercent row={r} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
