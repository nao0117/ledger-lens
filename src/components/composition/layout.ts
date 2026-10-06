import type { CellNode } from './chartData.ts';
import { inset, squarify, type Rect } from './squarify.ts';

export type BrokerBox = { node: CellNode; rect: Rect; /** 見出し帯を描くか */ header: boolean };
export type AccountBox = { node: CellNode; rect: Rect; /** 左上の小さなラベルを描くか */ label: boolean };
export type LeafBox = { node: CellNode; rect: Rect };
export type TreemapLayout = { brokers: BrokerBox[]; accounts: AccountBox[]; leaves: LeafBox[] };

/** 証券会社の箱どうしの隙間（片側） */
export const BROKER_GAP = 2;
/** 証券会社の見出し帯の高さ */
export const HEADER_H = 20;
/** 証券会社の箱の内側の余白 */
export const BROKER_PAD = 3;
/** 口座区分の箱の内側の余白 */
export const ACCOUNT_PAD = 2;
/** 口座区分のラベル帯の高さ */
export const ACCOUNT_LABEL_H = 14;

/** 見出し帯を取ってもなお中身が描ける大きさか */
function fitsHeader(r: Rect): boolean {
  return r.height >= HEADER_H * 2.5 && r.width >= 48;
}

function fitsAccountLabel(r: Rect): boolean {
  return r.height >= ACCOUNT_LABEL_H * 3.5 && r.width >= 40;
}

/**
 * 証券会社 → 口座区分 → 銘柄 の階層レイアウト。
 * 証券会社の箱は上部に見出し帯（小さい箱では省略）と内側の余白を取り、
 * 口座区分の箱は内側に小さな余白（余裕があればラベル帯）を取って、その中に銘柄を詰める。
 * 面積は同じ親の中で値に比例する（見出し・余白のぶん、親をまたいだ比較はおおよそ）。
 */
export function layoutTreemap(nodes: CellNode[], rect: Rect): TreemapLayout {
  const brokers: BrokerBox[] = [];
  const accounts: AccountBox[] = [];
  const leaves: LeafBox[] = [];
  const brokerRects = squarify(nodes.map((n) => n.value), rect);
  nodes.forEach((broker, bi) => {
    const outer = inset(brokerRects[bi] ?? rect, BROKER_GAP);
    if (outer.width <= 0 || outer.height <= 0) return;
    const header = fitsHeader(outer);
    brokers.push({ node: broker, rect: outer, header });
    // 見出し帯の下は余白なしで詰める
    const body: Rect = header
      ? {
          x: outer.x + BROKER_PAD,
          y: outer.y + HEADER_H,
          width: Math.max(0, outer.width - BROKER_PAD * 2),
          height: Math.max(0, outer.height - HEADER_H - BROKER_PAD),
        }
      : inset(outer, BROKER_PAD);
    const accountNodes = broker.children ?? [];
    const accountRects = squarify(accountNodes.map((n) => n.value), body);
    accountNodes.forEach((account, ai) => {
      const ar = accountRects[ai];
      if (!ar || ar.width <= 0 || ar.height <= 0) return;
      const label = fitsAccountLabel(ar);
      accounts.push({ node: account, rect: ar, label });
      const padded = inset(ar, ACCOUNT_PAD);
      const content = label
        ? { ...padded, y: ar.y + ACCOUNT_LABEL_H, height: Math.max(0, padded.y + padded.height - (ar.y + ACCOUNT_LABEL_H)) }
        : padded;
      const leafNodes = account.children ?? [];
      const leafRects = squarify(leafNodes.map((n) => n.value), content);
      leafNodes.forEach((leaf, li) => {
        const lr = leafRects[li];
        if (lr && lr.width > 0 && lr.height > 0) leaves.push({ node: leaf, rect: lr });
      });
    });
  });
  return { brokers, accounts, leaves };
}
