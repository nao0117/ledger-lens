import type { ParseWarning } from '../../parser/index.ts';
import { hrefFor } from '../../router.ts';
import { WarningsBanner } from '../WarningsBanner.tsx';

type Props = { unclassifiedCount: number; warnings: readonly ParseWarning[] };

/** 確認が必要: 未分類の銘柄とシートの確認事項。どちらもなければ控えめに表示する。 */
export function CheckCard({ unclassifiedCount, warnings }: Props) {
  const ok = unclassifiedCount === 0 && warnings.length === 0;
  return (
    <section className={`card home-card home-check${ok ? ' home-check-ok' : ''}`} aria-labelledby="home-check-h">
      <h3 id="home-check-h" className="home-card-title">
        確認が必要
      </h3>
      {ok ? (
        <p className="note">
          確認事項はありません（未分類の銘柄・シートの確認事項ともに 0 件）
        </p>
      ) : (
        <>
          {unclassifiedCount > 0 ? (
            <div className="check-row check-warn check-unc">
              <p className="check-text">
                未分類の銘柄が <b className="num">{unclassifiedCount}</b> 件あります
                <small>銘柄マスタに追加すると資産クラスに振り分けられます</small>
              </p>
              <a className="check-go" href={hrefFor('/holdings', { unclassified: '1' })}>
                銘柄で確認<span aria-hidden="true"> ›</span>
              </a>
            </div>
          ) : (
            <p className="check-row note">未分類の銘柄はありません</p>
          )}
          {warnings.length > 0 && (
            <div className="check-row check-warn">
              <WarningsBanner warnings={warnings} />
            </div>
          )}
        </>
      )}
    </section>
  );
}
