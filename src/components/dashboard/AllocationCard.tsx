import { UNCLASSIFIED } from '../../parser/index.ts';
import { CASH_COLOR, STOCK_COLOR } from '../colors.ts';
import { Money } from '../Money.tsx';
import type { AllocationItem, CashStock } from './allocation.ts';
import { formatRatio } from './format.ts';

type Props = {
  items: AllocationItem[];
  cash: number;
  stock: number;
  cashStock: CashStock;
  colorOf: (assetClass: string) => string;
};

/** 配分: 資産クラスの 100% 積み上げ横棒と凡例、現金/株式の比率。同じ値を表でも見られる。 */
export function AllocationCard({ items, cash, stock, cashStock, colorOf }: Props) {
  const drawable = items.filter((i) => i.width > 0);
  return (
    <section className="card home-card home-alloc" aria-labelledby="home-alloc-h">
      <div className="home-card-head">
        <h3 id="home-alloc-h" className="home-card-title">
          配分
        </h3>
        <small className="note">資産クラス</small>
      </div>
      {items.length === 0 ? (
        <p className="note">表示できるデータがありません</p>
      ) : (
        <>
          {drawable.length > 0 && (
            <div
              className="alloc-stack"
              role="img"
              aria-label={`資産クラスの配分: ${items.map((i) => `${i.key} ${formatRatio(i.ratio)}`).join('、')}`}
            >
              {drawable.map((i) => (
                <span
                  key={i.key}
                  className={i.key === UNCLASSIFIED ? 'alloc-unc' : undefined}
                  style={{ width: `${i.width * 100}%`, background: i.key === UNCLASSIFIED ? undefined : colorOf(i.key) }}
                />
              ))}
            </div>
          )}
          <ul className="alloc-legend">
            {items.map((i) => (
              <li key={i.key}>
                <span
                  className={`alloc-swatch${i.key === UNCLASSIFIED ? ' alloc-unc' : ''}`}
                  style={i.key === UNCLASSIFIED ? undefined : { background: colorOf(i.key) }}
                  aria-hidden="true"
                />
                <span className="alloc-name">{i.key}</span>
                <span className="alloc-ratio num">{formatRatio(i.ratio)}</span>
                <span className="alloc-value num">
                  <Money value={i.value} />
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="alloc-cs">
        {cashStock ? (
          <>
            <p className="alloc-cs-text">
              <span>
                現金 <b className="num">{formatRatio(cashStock.cashRatio)}</b>
              </span>
              <span aria-hidden="true"> ／ </span>
              <span>
                株式 <b className="num">{formatRatio(cashStock.stockRatio)}</b>
              </span>
            </p>
            <div className="alloc-cs-bar" aria-hidden="true">
              <span style={{ width: `${cashStock.cashRatio * 100}%`, background: CASH_COLOR }} />
              <span style={{ width: `${cashStock.stockRatio * 100}%`, background: STOCK_COLOR }} />
            </div>
          </>
        ) : (
          <p className="note">現金と株式の比率は計算できません（合計が 0 以下、または負の値があります）</p>
        )}
      </div>
      {items.length > 0 && (
        <details className="home-table">
          <summary>表で見る</summary>
          <div className="home-table-wrap">
            <table>
              <caption className="sr-only">資産クラス別の評価額と比率</caption>
              <thead>
                <tr>
                  <th scope="col">資産クラス</th>
                  <th scope="col">評価額</th>
                  <th scope="col">比率</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.key}>
                    <th scope="row">{i.key}</th>
                    <td className="num">
                      <Money value={i.value} />
                    </td>
                    <td className="num">{formatRatio(i.ratio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table>
              <caption className="sr-only">現金と株式の評価額と比率</caption>
              <thead>
                <tr>
                  <th scope="col">区分</th>
                  <th scope="col">評価額</th>
                  <th scope="col">比率</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">現金</th>
                  <td className="num">
                    <Money value={cash} />
                  </td>
                  <td className="num">{cashStock ? formatRatio(cashStock.cashRatio) : '-'}</td>
                </tr>
                <tr>
                  <th scope="row">株式</th>
                  <td className="num">
                    <Money value={stock} />
                  </td>
                  <td className="num">{cashStock ? formatRatio(cashStock.stockRatio) : '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}
