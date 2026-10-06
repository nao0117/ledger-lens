import { describe, expect, it } from 'vitest';
import { inset, squarify, type Rect } from './squarify.ts';
import { layoutTreemap } from './layout.ts';
import { toCellNodes } from './chartData.ts';

const EPS = 1e-6;
const area = (r: Rect) => r.width * r.height;
const inside = (c: Rect, p: Rect) =>
  c.x >= p.x - EPS && c.y >= p.y - EPS && c.x + c.width <= p.x + p.width + EPS && c.y + c.height <= p.y + p.height + EPS;
const overlaps = (a: Rect, b: Rect) =>
  Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > EPS &&
  Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > EPS;
const noOverlap = (rs: Rect[]) => rs.every((a, i) => rs.every((b, j) => i >= j || !overlaps(a, b)));

describe('squarify', () => {
  const box = { x: 10, y: 20, width: 300, height: 200 };
  const values = [6, 6, 4, 3, 2, 2, 1];
  const rects = squarify(values, box);

  it('入力と同じ順・同じ数の矩形を返し、面積は値に比例する', () => {
    expect(rects).toHaveLength(values.length);
    const total = values.reduce((a, v) => a + v, 0);
    rects.forEach((r, i) => expect(area(r)).toBeCloseTo((area(box) * (values[i] ?? 0)) / total, 6));
  });
  it('親からはみ出さず、重ならず、面積の合計が親と一致する', () => {
    expect(rects.every((r) => inside(r, box))).toBe(true);
    expect(noOverlap(rects)).toBe(true);
    expect(rects.reduce((a, r) => a + area(r), 0)).toBeCloseTo(area(box), 6);
  });
  it('並び順に依存しない（入力の順を保つ）', () => {
    const r2 = squarify([1, 6, 2], box);
    expect(area(r2[1]!)).toBeGreaterThan(area(r2[0]!));
    expect(area(r2[0]!)).toBeCloseTo(area(box) / 9, 6);
  });
  it('要素 1 個なら親と同じ矩形', () => {
    expect(squarify([5], box)).toEqual([box]);
  });
  it('0 以下・NaN は面積 0、残りで敷き詰める', () => {
    const r = squarify([0, 3, -1, Number.NaN, 1], box);
    expect(area(r[0]!)).toBe(0);
    expect(area(r[2]!)).toBe(0);
    expect(area(r[3]!)).toBe(0);
    expect(area(r[1]!) + area(r[4]!)).toBeCloseTo(area(box), 6);
    expect(area(r[1]!)).toBeCloseTo(area(box) * 0.75, 6);
  });
  it('空・合計 0・大きさ 0 の矩形でも壊れない', () => {
    expect(squarify([], box)).toEqual([]);
    expect(squarify([0, 0], box).every((r) => area(r) === 0)).toBe(true);
    expect(squarify([1, 2], { x: 0, y: 0, width: 0, height: 100 }).every((r) => area(r) === 0)).toBe(true);
  });
  it('極端に細長い矩形にならない（縦横比がほどほど）', () => {
    const r = squarify([1, 1, 1, 1], { x: 0, y: 0, width: 100, height: 100 });
    r.forEach((x) => expect(Math.max(x.width / x.height, x.height / x.width)).toBeLessThanOrEqual(1 + EPS));
  });
});

describe('inset', () => {
  it('四辺を縮め、縮めきれなければ 0', () => {
    expect(inset({ x: 0, y: 0, width: 10, height: 10 }, 2)).toEqual({ x: 2, y: 2, width: 6, height: 6 });
    expect(inset({ x: 0, y: 0, width: 2, height: 10 }, 2).width).toBe(0);
  });
});

describe('layoutTreemap', () => {
  const tree = [
    { name: '架空証券X', value: 70, children: [
      { name: '口座P', value: 50, children: [
        { name: '銘柄1', value: 30, id: 'x1', assetClass: '投資信託' },
        { name: '銘柄2', value: 20, id: 'x2', assetClass: '米国株' },
      ] },
      { name: '口座Q', value: 20, children: [{ name: '銘柄3', value: 20, id: 'x3', assetClass: '国内株' }] },
    ] },
    { name: '架空証券Y', value: 30, children: [
      { name: '口座P', value: 30, children: [{ name: '銘柄4', value: 30, id: 'y1', assetClass: '未分類' }] },
    ] },
  ];
  const nodes = toCellNodes(tree, 100);
  const box = { x: 0, y: 0, width: 360, height: 400 };
  const l = layoutTreemap(nodes, box);

  it('すべての階層の箱を返す', () => {
    expect(l.brokers.map((b) => b.node.name)).toEqual(['架空証券X', '架空証券Y']);
    expect(l.accounts).toHaveLength(3);
    expect(l.leaves.map((x) => x.node.id)).toEqual(['x1', 'x2', 'x3', 'y1']);
  });
  it('子は親の箱の内側に収まり、兄弟どうしは重ならない', () => {
    expect(l.brokers.every((b) => inside(b.rect, box))).toBe(true);
    expect(noOverlap(l.brokers.map((b) => b.rect))).toBe(true);
    for (const a of l.accounts) {
      const parent = l.brokers.find((b) => b.node.path[0] === a.node.path[0]);
      expect(parent && inside(a.rect, parent.rect)).toBe(true);
    }
    for (const leaf of l.leaves) {
      const parent = l.accounts.find((a) => a.node.path.join('/') === leaf.node.path.slice(0, 2).join('/'));
      expect(parent && inside(leaf.rect, parent.rect)).toBe(true);
    }
    expect(noOverlap(l.accounts.map((a) => a.rect))).toBe(true);
    expect(noOverlap(l.leaves.map((x) => x.rect))).toBe(true);
  });
  it('十分大きい証券会社の箱には見出し帯があり、銘柄は帯の下に置く', () => {
    const x = l.brokers[0]!;
    expect(x.header).toBe(true);
    const leaf = l.leaves[0]!;
    expect(leaf.rect.y).toBeGreaterThanOrEqual(x.rect.y + 20);
  });
  it('同じ口座区分の中では面積が値に比例する', () => {
    const [a, b] = l.leaves;
    expect(area(a!.rect) / area(b!.rect)).toBeCloseTo(30 / 20, 6);
  });
  it('小さすぎる箱では見出し帯を省略する', () => {
    const small = layoutTreemap(nodes, { x: 0, y: 0, width: 60, height: 40 });
    expect(small.brokers.every((b) => !b.header)).toBe(true);
  });
  it('空・大きさ 0 でも壊れない', () => {
    expect(layoutTreemap([], box)).toEqual({ brokers: [], accounts: [], leaves: [] });
    expect(layoutTreemap(nodes, { x: 0, y: 0, width: 0, height: 0 }).leaves).toEqual([]);
  });
});
