import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { UNCLASSIFIED } from '../../parser/index.ts';
import { assetClassColor } from '../colors.ts';
import { cellKey, fitLabel, isUnclassified, legendClasses, ratioText, truncateToWidth, type CellNode } from './chartData.ts';
import { ACCOUNT_LABEL_H, HEADER_H, layoutGrouped, layoutTreemap } from './layout.ts';

type Size = { width: number; height: number };

/** 要素の大きさを ResizeObserver で測る。 */
function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setSize((s) => (s.width === r.width && s.height === r.height ? s : { width: r.width, height: r.height }));
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

type Props = {
  nodes: CellNode[];
  /** 選択中のセルのキー（cellKey） */
  selectedKey: string | null;
  onSelect: (cell: CellNode) => void;
  /** account: 証券会社 → 口座区分 → 銘柄 / security: 資産クラス → 銘柄 */
  variant?: 'account' | 'security';
};

/** 証券会社 → 口座区分 → 銘柄（または 資産クラス → 銘柄）のツリーマップ。銘柄セルは資産クラス色。 */
export default function CompositionTree({ nodes, selectedKey, onSelect, variant = 'account' }: Props) {
  const [ref, size] = useSize<HTMLDivElement>();
  const patternId = `cmp-unc-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const security = variant === 'security';
  const layout = useMemo(() => {
    const box = { x: 0, y: 0, width: size.width, height: size.height };
    if (security) {
      const g = layoutGrouped(nodes, box);
      return { brokers: g.groups, accounts: [], leaves: g.leaves };
    }
    return layoutTreemap(nodes, box);
  }, [nodes, security, size.width, size.height]);
  const classes = useMemo(() => legendClasses(nodes), [nodes]);
  const fillOf = (cell: CellNode) =>
    isUnclassified(cell) ? `url(#${patternId})` : assetClassColor(cell.assetClass ?? '', classes.indexOf(cell.assetClass ?? ''));
  const selected = layout.leaves.find((l) => cellKey(l.node) === selectedKey) ?? null;

  const onKeyDown = (e: KeyboardEvent, cell: CellNode) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(cell);
    }
  };

  return (
    <div>
      <div ref={ref} className="cmp-chart">
        {size.width > 0 && size.height > 0 && (
          <svg
            width={size.width}
            height={size.height}
            className={selected ? 'cmp-svg cmp-has-sel' : 'cmp-svg'}
            role="group"
            aria-label={security ? '銘柄別の構成のツリーマップ（面積は評価額）' : '構成のツリーマップ（面積は評価額）'}
          >
            <defs>
              <pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="6" height="6" className="cmp-unc-bg" />
                <line x1="0" y1="0" x2="0" y2="6" className="cmp-unc-line" />
              </pattern>
            </defs>

            {layout.brokers.map(({ node, rect, header }) => {
              const ratio = ratioText(node.ratio, 1);
              const ratioW = ratio.length * 7 + 6;
              const swatch = security ? 12 : 0;
              const name = header ? truncateToWidth(node.name, rect.width - 12 - ratioW - swatch) : null;
              return (
                <g key={cellKey(node)} aria-hidden="true">
                  <rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} rx={6} className="cmp-broker" />
                  {header && security && (
                    <rect x={rect.x + 6} y={rect.y + 5} width={9} height={9} rx={2} className="cmp-group-swatch" style={{ fill: fillOf(node) }} />
                  )}
                  {header && (
                    <>
                      {name !== null && (
                        <text x={rect.x + 6 + swatch} y={rect.y + HEADER_H - 6} className="cmp-broker-name">{name}</text>
                      )}
                      <text x={rect.x + rect.width - 6} y={rect.y + HEADER_H - 6} textAnchor="end" className="cmp-broker-ratio">
                        {ratio}
                      </text>
                    </>
                  )}
                </g>
              );
            })}

            {layout.accounts.map(({ node, rect, label }) => {
              const name = label ? truncateToWidth(node.name, rect.width - 6, 10) : null;
              return (
                <g key={cellKey(node)} aria-hidden="true">
                  <rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} rx={3} className="cmp-account" />
                  {name !== null && (
                    <text x={rect.x + 3} y={rect.y + ACCOUNT_LABEL_H - 4} className="cmp-account-name">{name}</text>
                  )}
                </g>
              );
            })}

            {layout.leaves.map(({ node, rect }) => {
              const key = cellKey(node);
              const isSel = key === selectedKey;
              const label = fitLabel(rect.width, rect.height, node.name);
              const ratio = ratioText(node.ratio, 1);
              const unc = isUnclassified(node);
              return (
                <g
                  key={key}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSel}
                  aria-label={`${node.path.join('、')}、構成比 ${ratio}${unc ? `、${UNCLASSIFIED}` : ''}`}
                  className={isSel ? 'cmp-cell is-sel' : 'cmp-cell'}
                  onClick={() => onSelect(node)}
                  onFocus={() => onSelect(node)}
                  onKeyDown={(e) => onKeyDown(e, node)}
                >
                  <rect
                    x={rect.x}
                    y={rect.y}
                    width={rect.width}
                    height={rect.height}
                    rx={3}
                    className="cmp-rect"
                    style={{ fill: fillOf(node) }}
                  />
                  {label && (
                    <text x={rect.x + 4} y={rect.y + 15} className={unc ? 'cmp-label cmp-label-unc' : 'cmp-label'}>
                      {label.name}
                      {label.showRatio && (
                        <tspan x={rect.x + 4} dy={15} className="cmp-label-sub">{ratio}</tspan>
                      )}
                    </text>
                  )}
                </g>
              );
            })}

            {selected && (
              <rect
                x={selected.rect.x + 1}
                y={selected.rect.y + 1}
                width={Math.max(0, selected.rect.width - 2)}
                height={Math.max(0, selected.rect.height - 2)}
                rx={3}
                className="cmp-sel-ring"
                aria-hidden="true"
              />
            )}
          </svg>
        )}
      </div>
      <ul className="cmp-legend" aria-label="資産クラスの凡例">
        {classes.map((c, i) => (
          <li key={c}>
            <span
              className={c === UNCLASSIFIED ? 'cmp-swatch cmp-swatch-unc' : 'cmp-swatch'}
              style={c === UNCLASSIFIED ? undefined : { background: assetClassColor(c, i) }}
              aria-hidden="true"
            />
            {c}
          </li>
        ))}
      </ul>
    </div>
  );
}
