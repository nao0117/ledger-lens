import { useMemo, useState } from 'react';
import CompositionDetail from '../components/composition/CompositionDetail.tsx';
import CompositionList from '../components/composition/CompositionList.tsx';
import CompositionTree from '../components/composition/CompositionTree.tsx';
import { cellKey, dateJa, legendClasses, toCellNodes, type CellNode } from '../components/composition/chartData.ts';
import { Money } from '../components/Money.tsx';
import { buildHoldingRows, buildTree } from '../domain/index.ts';
import { useData } from '../state/data.tsx';
import './Composition.css';

export default function Composition() {
  const { data, baseDate } = useData();
  const tree = useMemo(() => (baseDate === null ? null : buildTree(data, baseDate)), [data, baseDate]);
  const nodes = useMemo(() => (tree ? toCellNodes(tree.nodes, tree.shownTotal) : []), [tree]);
  const classes = useMemo(() => legendClasses(nodes), [nodes]);
  const rows = useMemo(
    () => new Map((baseDate === null ? [] : buildHoldingRows(data, baseDate)).map((r) => [r.id, r])),
    [data, baseDate],
  );
  const [selected, setSelected] = useState<CellNode | null>(null);
  // 基準日やデータが変わったら、同じ銘柄が残っていればそれを選び直す
  const current = useMemo(() => {
    if (selected === null) return null;
    const key = cellKey(selected);
    const find = (ns: CellNode[]): CellNode | null => {
      for (const n of ns) {
        if (cellKey(n) === key) return n;
        const c = find(n.children ?? []);
        if (c) return c;
      }
      return null;
    };
    return find(nodes);
  }, [selected, nodes]);

  return (
    <section className="cmp-page">
      <h2 className="sr-only">構成</h2>
      {tree === null || nodes.length === 0 ? (
        <p className="note">表示できるデータがありません。</p>
      ) : (
        <>
          <p className="note cmp-caption">
            {dateJa(baseDate ?? '')} 時点（証券会社 → 口座区分 → 銘柄）。面積は評価額です。
          </p>
          <div className="cmp-layout">
            <div className="card cmp-main">
              <CompositionTree
                nodes={nodes}
                selectedKey={current ? cellKey(current) : null}
                onSelect={setSelected}
              />
              {tree.excludedTotal !== 0 && (
                <p className="note">
                  信用の損失 <Money value={tree.excludedTotal} /> は図に含まれません。
                </p>
              )}
              <CompositionList nodes={nodes} />
            </div>
            <aside className="cmp-side" aria-label="選択したセルの詳細">
              <CompositionDetail
                cell={current}
                row={current?.id !== undefined ? rows.get(current.id) : undefined}
                classes={classes}
                onClose={() => setSelected(null)}
              />
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
