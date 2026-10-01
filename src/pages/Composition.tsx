import { useMemo } from 'react';
import CompositionList from '../components/composition/CompositionList.tsx';
import CompositionTree from '../components/composition/CompositionTree.tsx';
import { toCellNodes } from '../components/composition/chartData.ts';
import { Money } from '../components/Money.tsx';
import { buildTree } from '../domain/index.ts';
import { useData } from '../state/data.tsx';
import './Composition.css';

export default function Composition() {
  const { data, baseDate } = useData();
  const tree = useMemo(() => (baseDate === null ? null : buildTree(data, baseDate)), [data, baseDate]);
  const nodes = useMemo(() => (tree ? toCellNodes(tree.nodes, tree.shownTotal) : []), [tree]);

  return (
    <section>
      <h2>構成</h2>
      {tree === null || nodes.length === 0 ? (
        <p className="note">表示できるデータがありません。</p>
      ) : (
        <div className="card">
          <p className="note">
            {baseDate} 時点（証券会社 → 口座区分 → 銘柄）。面積は評価額です。
          </p>
          {tree.excludedTotal !== 0 && (
            <p className="note">
              信用の損失 <Money value={tree.excludedTotal} /> は図に含まれません。
            </p>
          )}
          <CompositionTree nodes={nodes} />
          <CompositionList nodes={nodes} />
        </div>
      )}
    </section>
  );
}
