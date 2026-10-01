import { formatYen } from '../domain/index.ts';
import { usePrefs } from '../state/prefs.tsx';

/** 金額表示。マスク ON のときは伏せ字にする。金額は必ずこれか useMoney 経由で出す。 */
export function useMoney() {
  const { mask } = usePrefs();
  return { mask, yen: (v: number) => formatYen(v, mask) };
}

export function Money({ value }: { value: number }) {
  const { yen } = useMoney();
  return <span className="money">{yen(value)}</span>;
}
