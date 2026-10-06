import { formatDateJa } from '../trend/model.ts';
import { Delta } from './Delta.tsx';
import type { Movers } from './movers.ts';

type Props = {
  movers: Movers | null;
  /** 前回の日付（説明用） */
  previousDate: string | null;
  colorOf: (assetClass: string) => string;
};

/** 今月の動き: 前回比の寄与が大きい銘柄。横棒は最大の絶対値を基準に、増加は右・減少は左へ伸ばす。 */
export function MoversCard({ movers, previousDate, colorOf }: Props) {
  return (
    <section className="card home-card home-movers" aria-labelledby="home-movers-h">
      <div className="home-card-head">
        <h3 id="home-movers-h" className="home-card-title">
          今月の動き
        </h3>
        {movers && previousDate && <small className="note">{formatDateJa(previousDate)}からの変化</small>}
      </div>
      {movers === null ? (
        <p className="note">前回のデータがないため表示できません</p>
      ) : movers.items.length === 0 ? (
        <p className="note">前回から変化した銘柄はありません</p>
      ) : (
        <>
          <ol className="mv-list">
            {movers.items.map((m) => (
              <li key={m.id} className="mv">
                <span className="mv-name">
                  <span className="mv-dot" style={{ background: colorOf(m.assetClass) }} aria-hidden="true" />
                  <span className="mv-name-text">{m.name}</span>
                </span>
                <span className="mv-amt">
                  <Delta amount={m.amount} />
                </span>
                <span className="mv-bar" aria-hidden="true">
                  <i className={m.amount > 0 ? 'mv-pos' : 'mv-neg'} style={{ width: `${m.scale * 50}%` }} />
                </span>
              </li>
            ))}
          </ol>
          {movers.rest.count > 0 && (
            <p className="mv-rest">
              <span>ほか {movers.rest.count} 銘柄</span>
              <Delta amount={movers.rest.amount} />
            </p>
          )}
        </>
      )}
    </section>
  );
}
