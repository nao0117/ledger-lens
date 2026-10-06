import { useId, useState } from 'react';
import type { HoldingRow, SecurityRow } from '../../domain/index.ts';
import { assetClassColor } from '../colors.ts';
import { useMoney } from '../Money.tsx';
import { ariaSort, ChangeAmount, ChangePercent } from './HoldingsTable.tsx';
import { formatPercent, isExpandable, SECURITY_SORT_KEYS, SORT_LABELS, type Sort, type SortKey } from './holdingsView.ts';
import { MarginProfit } from './SecurityParts.tsx';

type Column = { key: SortKey | 'accounts'; label: string; numeric?: boolean };

const NUMERIC_KEYS: ReadonlySet<SortKey> = new Set(['value', 'ratio', 'changeAmount', 'changePercent']);

/** 銘柄名 / 口座数 / 資産クラス / 評価額 / 構成比 / 前回比（金額）/ 前回比（%） */
export const SECURITY_COLUMNS: Column[] = [
  { key: 'name', label: SORT_LABELS.name },
  { key: 'accounts', label: '口座数', numeric: true },
  ...SECURITY_SORT_KEYS.filter((k) => k !== 'name').map((key) => ({ key, label: SORT_LABELS[key], numeric: NUMERIC_KEYS.has(key) })),
];

/** 内訳の行（口座ごと）。字下げして表示する。 */
function SubRow({ row, margin, id, hidden, showClass }: { row: HoldingRow; margin: boolean; id: string; hidden: boolean; showClass: boolean }) {
  const { yen } = useMoney();
  return (
    <tr id={id} className="h-subrow" hidden={hidden}>
      <th scope="row" className="h-subname">
        {row.broker}・{margin ? '信用（損益）' : row.account}
      </th>
      <td />
      <td className="h-muted">{showClass ? row.assetClass : ''}</td>
      <td className="h-num">
        {margin ? <MarginProfit value={row.value} /> : <span className={row.value < 0 ? 'h-down' : undefined}>{yen(row.value)}</span>}
      </td>
      <td className="h-num">{margin ? '' : formatPercent(row.ratio)}</td>
      <td className="h-num"><ChangeAmount row={row} /></td>
      <td className="h-num"><ChangePercent row={row} /></td>
    </tr>
  );
}

function SecurityRows({ row, color, baseId }: { row: SecurityRow; color: string; baseId: string }) {
  const { yen } = useMoney();
  const [open, setOpen] = useState(false);
  const expandable = isExpandable(row);
  const subs = [...row.members.map((m) => ({ m, margin: false })), ...row.marginMembers.map((m) => ({ m, margin: true }))];
  const ids = subs.map((_, i) => `${baseId}-${i}`);
  return (
    <>
      <tr className={row.unclassified ? 'h-row-unclassified' : undefined}>
        <th scope="row" className="h-name">
          <span className="h-name-cell">
            {expandable ? (
              <button
                type="button"
                className="h-expand"
                aria-expanded={open}
                aria-controls={ids.join(' ')}
                aria-label={`${row.name}の内訳を${open ? '閉じる' : '開く'}`}
                onClick={() => setOpen((o) => !o)}
              >
                <span aria-hidden="true" className={`h-expand-mark${open ? ' is-open' : ''}`}>▸</span>
              </button>
            ) : (
              <span className="h-expand-space" aria-hidden="true" />
            )}
            <span>{row.name}</span>
            {row.unclassified && <span className="h-badge">未分類</span>}
            {row.classConflict && <span className="h-badge">分類が不一致</span>}
          </span>
        </th>
        <td className="h-num">
          {(row.marginOnly ? row.marginMembers : row.members).length}
          {!row.marginOnly && row.marginMembers.length > 0 && <span className="h-muted">＋信用</span>}
        </td>
        <td>
          <span className="h-swatch" style={{ background: color }} aria-hidden="true" />
          {row.assetClass}
        </td>
        <td className="h-num">
          {row.marginOnly ? (
            <MarginProfit value={row.value} />
          ) : (
            <span className={row.value < 0 ? 'h-down' : undefined}>{yen(row.value)}</span>
          )}
          {!row.marginOnly && row.marginValue !== null && (
            <MarginProfit value={row.marginValue} prefix="＋" className="h-margin-note" />
          )}
        </td>
        <td className="h-num">{formatPercent(row.ratio)}</td>
        <td className="h-num"><ChangeAmount row={row} /></td>
        <td className="h-num"><ChangePercent row={row} /></td>
      </tr>
      {expandable &&
        subs.map(({ m, margin }, i) => (
          <SubRow key={m.id} row={m} margin={margin} id={ids[i]!} hidden={!open} showClass={row.classConflict} />
        ))}
    </>
  );
}

/** PC 用の表（銘柄ごと）。見出しのクリックで並べ替え、口座が複数・信用がある行は内訳を開ける。 */
export function SecurityTable({
  rows, sort, onSort, assetClasses,
}: {
  rows: SecurityRow[];
  sort: Sort;
  onSort: (key: SortKey) => void;
  assetClasses: string[];
}) {
  const baseId = useId();
  return (
    <table className="h-table h-table-sec">
      <thead>
        <tr>
          {SECURITY_COLUMNS.map((c) =>
            c.key === 'accounts' ? (
              <th key={c.key} scope="col" className="h-num h-plain">{c.label}</th>
            ) : (
              <th key={c.key} scope="col" aria-sort={ariaSort(sort, c.key)} className={c.numeric ? 'h-num' : undefined}>
                <SortButton label={c.label} active={sort.key === c.key} dir={sort.dir} onClick={() => onSort(c.key as SortKey)} />
              </th>
            ),
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <SecurityRows
            key={r.key}
            row={r}
            color={assetClassColor(r.assetClass, assetClasses.indexOf(r.assetClass))}
            baseId={`${baseId}-r${i}`}
          />
        ))}
      </tbody>
    </table>
  );
}

function SortButton({ label, active, dir, onClick }: { label: string; active: boolean; dir: Sort['dir']; onClick: () => void }) {
  return (
    <button type="button" className="h-sort" onClick={onClick}>
      {label}
      <span aria-hidden="true" className="h-sort-mark">{active ? (dir === 'asc' ? '▲' : '▼') : ''}</span>
    </button>
  );
}
