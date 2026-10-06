import { useMemo, useState } from 'react';
import CompositionDetail from '../components/composition/CompositionDetail.tsx';
import CompositionList from '../components/composition/CompositionList.tsx';
import CompositionTree from '../components/composition/CompositionTree.tsx';
import { cellKey, dateJa, legendClasses, toCellNodes, toSecurityCellNodes, type CellNode } from '../components/composition/chartData.ts';
import { Money } from '../components/Money.tsx';
import { buildHoldingRows, buildTree } from '../domain/index.ts';
import { buildSecurityTree } from '../domain/tree.ts';
import { useData } from '../state/data.tsx';
import { usePrefs } from '../state/prefs.tsx';
import './Composition.css';

export default function Composition() {
  const { data, baseDate } = useData();
  const { compositionBy, setCompositionBy } = usePrefs();
  const security = compositionBy === 'security';
  const tree = useMemo(() => (baseDate === null ? null : buildTree(data, baseDate)), [data, baseDate]);
  const secTree = useMemo(() => (baseDate === null ? null : buildSecurityTree(data, baseDate)), [data, baseDate]);
  const nodes = useMemo(
    () => (security ? (secTree ? toSecurityCellNodes(secTree.nodes) : []) : tree ? toCellNodes(tree.nodes, tree.shownTotal) : []),
    [security, tree, secTree],
  );
  const excluded = security ? (secTree?.excludedMargin ?? 0) : (tree?.excludedTotal ?? 0);
  const classes = useMemo(() => legendClasses(nodes), [nodes]);
  const rows = useMemo(
    () => new Map((baseDate === null ? [] : buildHoldingRows(data, baseDate)).map((r) => [r.id, r])),
    [data, baseDate],
  );
  const [selected, setSelected] = useState<CellNode | null>(null);
  const switchBy = (by: 'account' | 'security') => {
    setSelected(null);
    setCompositionBy(by);
  };
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
      <div className="cmp-seg" role="group" aria-label="構成の切り口">
        <button type="button" className="cmp-seg-btn" aria-pressed={!security} onClick={() => switchBy('account')}>
          口座別
        </button>
        <button type="button" className="cmp-seg-btn" aria-pressed={security} onClick={() => switchBy('security')}>
          銘柄別
        </button>
      </div>
      {tree === null || nodes.length === 0 ? (
        <p className="note">表示できるデータがありません。</p>
      ) : (
        <>
          <p className="note cmp-caption">
            {security
              ? `${dateJa(baseDate ?? '')} 時点（資産クラス → 銘柄）。同じ銘柄は口座をまたいでまとめています。面積は評価額です。`
              : `${dateJa(baseDate ?? '')} 時点（証券会社 → 口座区分 → 銘柄）。面積は評価額です。`}
          </p>
          <div className="cmp-layout">
            <div className="card cmp-main">
              <CompositionTree
                nodes={nodes}
                selectedKey={current ? cellKey(current) : null}
                onSelect={setSelected}
                variant={compositionBy}
              />
              {excluded !== 0 && (
                <p className="note">
                  {security ? '信用の損益' : '信用の損失'} <Money value={excluded} /> は図に含まれません。
                </p>
              )}
              <CompositionList nodes={nodes} />
            </div>
            <aside className="cmp-side" aria-label="選択したセルの詳細">
              <CompositionDetail
                cell={current}
                row={!security && current?.id !== undefined ? rows.get(current.id) : undefined}
                security={security && current?.id !== undefined ? secTree?.securities.get(current.id) : undefined}
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
