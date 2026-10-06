import { useId, useState } from 'react';
import type { HoldingRow, SecurityRow } from '../../domain/index.ts';
import { assetClassColor } from '../colors.ts';
import { useMoney } from '../Money.tsx';
import { changeDisplay, formatPercent, isExpandable, profitDisplay, securityAccountLabel, type ChangeSource } from './holdingsView.ts';
import { MarginProfit } from './SecurityParts.tsx';

function Change({ row }: { row: ChangeSource }) {
  const { yen, mask } = useMoney();
  const change = changeDisplay(row, yen, mask);
  return (
    <span className={`hl-chg h-${change.kind}`}>
      <span className="sr-only">前回比 </span>
      {change.symbol && <span aria-hidden="true">{change.symbol} </span>}
      {change.text}
    </span>
  );
}

/** 内訳の1行（口座ごと）。信用は値が損益なので明記する。 */
function DetailRow({ row, margin }: { row: HoldingRow; margin: boolean }) {
  const { yen, mask } = useMoney();
  const p = profitDisplay(row.value, yen, mask);
  return (
    <li className="hl-d">
      <span className="hl-d-name">
        {row.broker}・{margin ? '信用（損益）' : row.account}
      </span>
      {margin ? (
        <span className={`hl-d-val h-${p.kind}`}>
          {p.symbol && <span aria-hidden="true">{p.symbol} </span>}
          {p.text}
        </span>
      ) : (
        <span className={`hl-d-val${row.value < 0 ? ' h-down' : ''}`}>{yen(row.value)}</span>
      )}
      <Change row={row} />
    </li>
  );
}

function SecurityItem({ row, color, detailId }: { row: SecurityRow; color: string; detailId: string }) {
  const { yen } = useMoney();
  const [open, setOpen] = useState(false);
  const expandable = isExpandable(row);
  const body = (
    <>
      <span className="hl-r1">
        <span className="hl-sw" style={{ background: color }} aria-hidden="true" />
        <span className="hl-name" title={row.name}>{row.name}</span>
        {row.unclassified && <span className="h-badge">未分類</span>}
        {row.classConflict && <span className="h-badge">分類が不一致</span>}
        {expandable && <span className={`hl-caret${open ? ' is-open' : ''}`} aria-hidden="true">▾</span>}
        {row.marginOnly ? (
          <MarginProfit value={row.value} className="hl-val" />
        ) : (
          <span className={`hl-val${row.value < 0 ? ' h-down' : ''}`}>{yen(row.value)}</span>
        )}
      </span>
      <span className="hl-r2">
        <span className="hl-meta">
          {row.unclassified ? '' : <span className="sr-only">{row.assetClass}・</span>}
          {securityAccountLabel(row)}・構成比 {formatPercent(row.ratio)}
        </span>
        <Change row={row} />
      </span>
      {!row.marginOnly && row.marginValue !== null && (
        <span className="hl-r3">
          <MarginProfit value={row.marginValue} prefix="＋" />
        </span>
      )}
    </>
  );
  return (
    <li className={`hl-row hl-sec${row.unclassified ? ' is-unc' : ''}`}>
      {expandable ? (
        <>
          <button
            type="button"
            className="hl-main hl-toggle"
            aria-expanded={open}
            aria-controls={detailId}
            onClick={() => setOpen((o) => !o)}
          >
            {body}
          </button>
          <ul id={detailId} className="hl-detail" aria-label={`${row.name}の内訳`} hidden={!open}>
            {row.members.map((m) => <DetailRow key={m.id} row={m} margin={false} />)}
            {row.marginMembers.map((m) => <DetailRow key={m.id} row={m} margin />)}
          </ul>
        </>
      ) : (
        <div className="hl-main">{body}</div>
      )}
    </li>
  );
}

/** スマホ用の2行リスト（銘柄ごと）。口座が複数・信用がある銘柄はタップで内訳を開く。 */
export function SecurityList({ rows, assetClasses }: { rows: SecurityRow[]; assetClasses: string[] }) {
  const baseId = useId();
  return (
    <ul className="hl" aria-label="銘柄">
      {rows.map((r, i) => (
        <SecurityItem
          key={r.key}
          row={r}
          color={assetClassColor(r.assetClass, assetClasses.indexOf(r.assetClass))}
          detailId={`${baseId}-d${i}`}
        />
      ))}
    </ul>
  );
}
