import { useMoney } from '../Money.tsx';
import { DIRECTION_MARK, direction, formatSignedPercent, signedYen } from './slices.ts';

type Props = {
  title: string;
  /** 比較対象なしのとき null */
  change: { amount: number; percent: number | null; date: string } | null;
};

export function ChangeCard({ title, change }: Props) {
  const { yen } = useMoney();
  return (
    <div className="card dash-change">
      <h3 className="dash-card-title">{title}</h3>
      {change === null ? (
        <p className="note">比較できるデータがありません</p>
      ) : (
        <>
          <p className={`dash-delta dash-${direction(change.amount)}`}>
            <span aria-hidden="true">{DIRECTION_MARK[direction(change.amount)]}</span>{' '}
            <span className="money">{signedYen(change.amount, yen)}</span>
            <span className="dash-percent">（{formatSignedPercent(change.percent)}）</span>
          </p>
          <p className="note">比較日: {change.date}</p>
        </>
      )}
    </div>
  );
}
