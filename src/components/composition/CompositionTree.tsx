import { useState } from 'react';
import { ResponsiveContainer, Treemap, type TreemapNode } from 'recharts';
import { useMoney } from '../Money.tsx';
import { fitLabel, ratioText, SHADE_COUNT, type CellNode } from './chartData.ts';

const COLOR_COUNT = 8;
const SHADE_OPACITY = [0.95, 0.75, 0.55];

function colorVar(index: number): string {
  return index < COLOR_COUNT ? `var(--cmp-${index + 1})` : 'var(--cmp-other)';
}

/** ホバー・タップ・フォーカスで選んだセルの説明欄（ツールチップ代わり）。マスク ON では金額を出さない。 */
function Detail({ cell }: { cell: CellNode | null }) {
  const { mask, yen } = useMoney();
  return (
    <p className="cmp-detail" aria-live="polite">
      {cell === null ? (
        'セルにカーソルを合わせる（タップする）と、詳細を表示します。'
      ) : (
        <>
          <strong>{cell.path.join(' › ')}</strong>
          {' '}
          構成比 {ratioText(cell.ratio, 1)}
          {mask ? null : <> ／ {yen(cell.value)}</>}
        </>
      )}
    </p>
  );
}

export default function CompositionTree({ nodes }: { nodes: CellNode[] }) {
  const [active, setActive] = useState<CellNode | null>(null);

  const renderCell = (props: TreemapNode) => {
    const { x, y, width, height, depth, name } = props;
    if (depth !== 3) return <g />; // 面積の見え方は銘柄（葉）で決まる。親は枠だけ別に描かない
    const cell = props as unknown as CellNode & TreemapNode;
    const label = fitLabel(width, height, name);
    const fill = colorVar(cell.colorIndex);
    const opacity = SHADE_OPACITY[cell.shade % SHADE_COUNT] ?? 0.75;
    return (
      <g
        tabIndex={0}
        role="img"
        aria-label={`${cell.path.join('、')}、構成比 ${ratioText(cell.ratio, 1)}`}
        onMouseEnter={() => setActive(cell)}
        onFocus={() => setActive(cell)}
        onClick={() => setActive(cell)}
        className="cmp-cell"
      >
        <rect x={x} y={y} width={width} height={height} fill={fill} fillOpacity={opacity} className="cmp-rect" />
        {label && (
          <text x={x + 4} y={y + 16} className="cmp-label">
            {label.name}
            {label.showRatio && (
              <tspan x={x + 4} dy={15} className="cmp-label-sub">
                {ratioText(cell.ratio, 1)}
              </tspan>
            )}
          </text>
        )}
      </g>
    );
  };

  const brokers = nodes.map((n) => n);
  return (
    <div>
      <Detail cell={active} />
      <div className="cmp-chart">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={nodes}
            dataKey="value"
            nameKey="name"
            content={renderCell}
            isAnimationActive={false}
            aspectRatio={1}
          />
        </ResponsiveContainer>
      </div>
      <ul className="cmp-legend" aria-label="証券会社の凡例">
        {brokers.map((b) => (
          <li key={b.name}>
            <span className="cmp-swatch" style={{ background: colorVar(b.colorIndex) }} aria-hidden="true" />
            {b.name} {ratioText(b.ratio, 1)}
          </li>
        ))}
      </ul>
    </div>
  );
}
