/** 矩形（SVG の座標系。左上が原点）。 */
export type Rect = { x: number; y: number; width: number; height: number };

/** 行（列）に並べたときの、最も細長い要素の縦横比（1 に近いほど正方形）。 */
function worst(sum: number, min: number, max: number, side: number): number {
  const s2 = side * side;
  const sum2 = sum * sum;
  return Math.max((s2 * max) / sum2, sum2 / (s2 * min));
}

/**
 * squarified treemap（Bruls ほか）のレイアウト。
 * 値に比例した面積で rect を敷き詰め、入力と同じ順の矩形を返す。
 * 0 以下・数値でない値は、面積 0 の矩形（rect の左上）にする。
 */
export function squarify(values: number[], rect: Rect): Rect[] {
  const out: Rect[] = values.map(() => ({ x: rect.x, y: rect.y, width: 0, height: 0 }));
  const width = Math.max(0, rect.width);
  const height = Math.max(0, rect.height);
  const items = values
    .map((v, i) => ({ i, v: Number.isFinite(v) && v > 0 ? v : 0 }))
    .filter((it) => it.v > 0)
    .sort((a, b) => b.v - a.v || a.i - b.i);
  const total = items.reduce((a, it) => a + it.v, 0);
  if (total <= 0 || width <= 0 || height <= 0) return out;

  const scale = (width * height) / total;
  const areas = items.map((it) => it.v * scale);
  const free = { x: rect.x, y: rect.y, w: width, h: height };
  let k = 0;
  while (k < items.length) {
    const side = Math.min(free.w, free.h);
    let sum = areas[k] ?? 0;
    let min = sum;
    let max = sum;
    let j = k + 1;
    while (j < items.length) {
      const a = areas[j] ?? 0;
      const next = worst(sum + a, Math.min(min, a), Math.max(max, a), side);
      if (next > worst(sum, min, max, side)) break;
      sum += a;
      min = Math.min(min, a);
      max = Math.max(max, a);
      j += 1;
    }
    const last = j >= items.length;
    if (free.w >= free.h) {
      // 左端に縦 1 列を置く
      const colW = last ? free.w : sum / free.h;
      let y = free.y;
      for (let n = k; n < j; n += 1) {
        const h = n === j - 1 ? free.y + free.h - y : (areas[n] ?? 0) / colW;
        out[items[n]!.i] = { x: free.x, y, width: colW, height: h };
        y += h;
      }
      free.x += colW;
      free.w = Math.max(0, free.w - colW);
    } else {
      // 上端に横 1 行を置く
      const rowH = last ? free.h : sum / free.w;
      let x = free.x;
      for (let n = k; n < j; n += 1) {
        const w = n === j - 1 ? free.x + free.w - x : (areas[n] ?? 0) / rowH;
        out[items[n]!.i] = { x, y: free.y, width: w, height: rowH };
        x += w;
      }
      free.y += rowH;
      free.h = Math.max(0, free.h - rowH);
    }
    k = j;
  }
  return out;
}

/** 四辺を d だけ内側に縮める。縮めきれないときは幅・高さ 0。 */
export function inset(r: Rect, d: number): Rect {
  const width = Math.max(0, r.width - d * 2);
  const height = Math.max(0, r.height - d * 2);
  return { x: r.x + Math.min(d, r.width / 2), y: r.y + Math.min(d, r.height / 2), width, height };
}
