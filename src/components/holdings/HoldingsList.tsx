import type { HoldingRow } from '../../domain/index.ts';
import { assetClassColor } from '../colors.ts';
import { useMoney } from '../Money.tsx';
import { changeDisplay, formatPercent } from './holdingsView.ts';

/** スマホ用の2行リスト。1行目に銘柄名と評価額、2行目に口座と前回比。 */
export function HoldingsList({ rows, assetClasses }: { rows: HoldingRow[]; assetClasses: string[] }) {
  const { yen, mask } = useMoney();
  return (
    <ul className="hl" aria-label="銘柄">
      {rows.map((r) => {
        const change = changeDisplay(r, yen, mask);
        return (
          <li key={r.id} className={`hl-row${r.unclassified ? ' is-unc' : ''}`}>
            <div className="hl-r1">
              <span
                className="hl-sw"
                style={{ background: assetClassColor(r.assetClass, assetClasses.indexOf(r.assetClass)) }}
                aria-hidden="true"
              />
              <span className="hl-name" title={r.name}>{r.name}</span>
              {r.unclassified && <span className="h-badge">未分類</span>}
              <span className={`hl-val${r.value < 0 ? ' h-down' : ''}`}>{yen(r.value)}</span>
            </div>
            <div className="hl-r2">
              <span className="hl-meta">
                {r.unclassified ? '' : <span className="sr-only">{r.assetClass}・</span>}
                {r.broker}・{r.account}・構成比 {formatPercent(r.ratio)}
              </span>
              <span className={`hl-chg h-${change.kind}`}>
                <span className="sr-only">前回比 </span>
                {change.symbol && <span aria-hidden="true">{change.symbol} </span>}
                {change.text}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
