import type { Change, HoldingRow, SecurityRow } from '../../domain/index.ts';
import { UNCLASSIFIED } from '../../parser/index.ts';
import { assetClassColor } from '../colors.ts';
import { useMoney } from '../Money.tsx';
import { changeView, isUnclassified, ratioText, type CellNode } from './chartData.ts';

type Props = {
  cell: CellNode | null;
  /** 選択中の銘柄の行（前回比を引く）。見つからなければ undefined */
  row: HoldingRow | undefined;
  /** 銘柄別のとき: 選択中の銘柄（口座をまたいでまとめた行）。口座別では undefined */
  security?: SecurityRow | undefined;
  /** 凡例と同じ色にするための、資産クラスの並び */
  classes: string[];
  onClose: () => void;
};

function ChangeText({ change }: { change: Change | null }) {
  const { mask, yen } = useMoney();
  const cv = changeView(change);
  if (cv.kind === 'none') return <>前回なし</>;
  return (
    <>
      {cv.symbol}
      {!mask && change && <> {change.amount > 0 ? '+' : ''}{yen(change.amount)}</>}
      <small> {cv.percent ?? '新規'}</small>
    </>
  );
}

/** 選択したセルの詳細。画面下部（PC では右カラム）に出す。マスク ON では金額を出さない。 */
export default function CompositionDetail({ cell, row, security, classes, onClose }: Props) {
  const { yen } = useMoney();
  if (cell === null) {
    return (
      <div className="cmp-detail" aria-live="polite">
        <p className="cmp-detail-hint">セルをタップすると詳細を表示します</p>
      </div>
    );
  }
  const unc = isUnclassified(cell);
  const ac = cell.assetClass ?? '';
  const change = security ? security.change : (row?.change ?? null);
  const cv = changeView(change);
  return (
    <div className="cmp-detail" aria-live="polite">
      <div className="cmp-detail-head">
        <p className="cmp-detail-path">
          {cell.path.slice(0, -1).map((p, i) => (
            <span key={i}>{p} › </span>
          ))}
        </p>
        <button type="button" className="cmp-detail-close" onClick={onClose} aria-label="詳細を閉じる">
          <svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M4 4l10 10M14 4L4 14" />
          </svg>
        </button>
      </div>
      <p className="cmp-detail-name">
        <span
          className={unc ? 'cmp-swatch cmp-swatch-unc' : 'cmp-swatch'}
          style={unc ? undefined : { background: assetClassColor(ac, classes.indexOf(ac)) }}
          aria-hidden="true"
        />
        <strong>{cell.name}</strong>
        {ac !== '' && <span className="cmp-detail-class">{unc ? UNCLASSIFIED : ac}</span>}
      </p>
      <dl className="cmp-kv">
        <div>
          <dt>評価額</dt>
          <dd>{yen(cell.value)}</dd>
        </div>
        <div>
          <dt>{security ? '構成比（総資産）' : '構成比'}</dt>
          <dd>{ratioText(cell.ratio, 1)}</dd>
        </div>
        <div>
          <dt>前回比</dt>
          <dd className={`cmp-chg-${cv.kind}`}>
            <ChangeText change={change} />
          </dd>
        </div>
      </dl>
      {security && <SecurityBreakdown security={security} />}
    </div>
  );
}

/** 銘柄別: 口座ごとの内訳。信用の行（値は損益）は評価額に含めないので別に出す。 */
function SecurityBreakdown({ security }: { security: SecurityRow }) {
  const { yen } = useMoney();
  const members = security.marginOnly ? [] : security.members;
  return (
    <div className="cmp-members">
      {members.length > 0 && (
        <>
          <h3 className="cmp-members-title">口座ごとの内訳</h3>
          <ul className="cmp-members-list">
            {members.map((m) => (
              <li key={m.id}>
                <span className="cmp-member-name">{m.broker} ・ {m.account}</span>
                <span className="cmp-member-value">{yen(m.value)}</span>
                <span className={`cmp-member-chg cmp-chg-${changeView(m.change).kind}`}>
                  <ChangeText change={m.change} />
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {security.marginMembers.length > 0 && (
        <>
          <h3 className="cmp-members-title">信用（損益）</h3>
          <ul className="cmp-members-list">
            {security.marginMembers.map((m) => (
              <li key={m.id}>
                <span className="cmp-member-name">{m.broker} ・ {m.account}</span>
                <span className="cmp-member-value">{yen(m.value)}</span>
                <span className={`cmp-member-chg cmp-chg-${changeView(m.change).kind}`}>
                  <ChangeText change={m.change} />
                </span>
              </li>
            ))}
          </ul>
          <p className="cmp-members-note">信用は損益の値で、評価額と図には含まれません。</p>
        </>
      )}
    </div>
  );
}
