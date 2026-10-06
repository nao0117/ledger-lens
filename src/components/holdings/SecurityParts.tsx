import type { HoldingsGrouping } from '../../state/prefs.tsx';
import { useMoney } from '../Money.tsx';
import { profitDisplay } from './holdingsView.ts';

const GROUPING_LABELS: Readonly<Record<HoldingsGrouping, string>> = { security: '銘柄ごと', account: '口座ごと' };

/** 表示単位の切り替え（銘柄ごと / 口座ごと）。 */
export function GroupingToggle({ value, onChange }: { value: HoldingsGrouping; onChange: (next: HoldingsGrouping) => void }) {
  return (
    <div className="h-seg" role="group" aria-label="表示単位">
      {(Object.keys(GROUPING_LABELS) as HoldingsGrouping[]).map((g) => (
        <button key={g} type="button" className="h-seg-btn" aria-pressed={value === g} onClick={() => onChange(g)}>
          {GROUPING_LABELS[g]}
        </button>
      ))}
    </div>
  );
}

/** 信用の損益（例: `信用 損益 ▲ +¥12,000`）。prefix は先頭に付ける文言（例: `＋`）。 */
export function MarginProfit({ value, prefix = '', className = '' }: { value: number; prefix?: string; className?: string }) {
  const { yen, mask } = useMoney();
  const d = profitDisplay(value, yen, mask);
  return (
    <span className={`h-margin ${className}`.trim()}>
      {prefix}信用 損益 <span className={`h-${d.kind}`}>
        {d.symbol && <span aria-hidden="true">{d.symbol} </span>}
        {d.text}
      </span>
    </span>
  );
}
