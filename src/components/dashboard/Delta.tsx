import { useMoney } from '../Money.tsx';
import { DIRECTION_MARK, direction, formatSignedPercent, signedYen } from './format.ts';

type Props = {
  amount: number;
  /** 変化率（%単位）。省略すると金額だけ出す。null は比較値が 0 のとき（`-` を出す） */
  percent?: number | null;
};

/** 増減の表示（▲▼＋符号付き金額＋%）。色だけに頼らず記号と符号を併記する。マスク時も % は残る。 */
export function Delta({ amount, percent }: Props) {
  const { yen } = useMoney();
  const dir = direction(amount);
  return (
    <span className={`delta delta-${dir}`}>
      <span aria-hidden="true">{DIRECTION_MARK[dir]}</span> <span className="num money">{signedYen(amount, yen)}</span>
      {percent !== undefined && <span className="num">（{formatSignedPercent(percent)}）</span>}
    </span>
  );
}
