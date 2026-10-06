import { Money } from '../Money.tsx';
import { cellKey, ratioText, type CellNode } from './chartData.ts';

function Row({ cell, strong }: { cell: CellNode; strong?: boolean }) {
  return (
    <>
      <span className={strong ? 'cmp-row-name cmp-strong' : 'cmp-row-name'}>{cell.name}</span>
      <span className="cmp-row-ratio">{ratioText(cell.ratio, 1)}</span>
      <span className="cmp-row-money"><Money value={cell.value} /></span>
    </>
  );
}

function Branch({ cell }: { cell: CellNode }) {
  const children = cell.children ?? [];
  if (children.length === 0) {
    return <li className="cmp-row cmp-leaf"><Row cell={cell} /></li>;
  }
  return (
    <li>
      <details open={cell.path.length > 1}>
        <summary className="cmp-row"><Row cell={cell} strong /></summary>
        <ul className="cmp-list">
          {children.map((c) => <Branch key={cellKey(c)} cell={c} />)}
        </ul>
      </details>
    </li>
  );
}

/** ツリーマップと同じ階層を、色に頼らず確認するための入れ子リスト（折りたたみ可）。 */
export default function CompositionList({ nodes }: { nodes: CellNode[] }) {
  return (
    <details className="cmp-table">
      <summary>表で確認する</summary>
      <div className="cmp-row cmp-head" aria-hidden="true">
        <span className="cmp-row-name">名前</span>
        <span className="cmp-row-ratio">構成比</span>
        <span className="cmp-row-money">評価額</span>
      </div>
      <ul className="cmp-list cmp-root">
        {nodes.map((n) => <Branch key={cellKey(n)} cell={n} />)}
      </ul>
    </details>
  );
}
