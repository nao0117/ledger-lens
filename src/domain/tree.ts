import type { ParsedAnnual } from '../parser/index.ts';
import { indexValues } from './totals.ts';

export type TreeNode = {
  name: string;
  /** 子がある場合は子の合計 */
  value: number;
  children?: TreeNode[];
};

export type Tree = {
  /** 証券会社（現金も 1 つの「証券会社」として含む）→ 口座区分 → 銘柄 */
  nodes: TreeNode[];
  /** ツリーに載せた値の合計 */
  shownTotal: number;
  /** ツリーから除いた銘柄の値の合計（0 以下）。総資産 = shownTotal + excludedTotal */
  excludedTotal: number;
};

/**
 * ツリーマップは面積で表すので負の値は描けない。信用の損益のように値が 0 以下の銘柄は
 * ツリーから除き（評価額ではなく損益で、面積に意味がないため）、除いた合計を excludedTotal で返す。
 * 正の損益は評価額と同じく加算されるので載せる。
 */
export function buildTree(data: Pick<ParsedAnnual, 'holdings' | 'snapshots'>, baseDate: string): Tree {
  const values = indexValues(data).get(baseDate);
  const brokers = new Map<string, Map<string, TreeNode[]>>();
  let shownTotal = 0;
  let excludedTotal = 0;
  for (const h of data.holdings) {
    const v = values?.get(h.id) ?? 0;
    if (v <= 0) {
      excludedTotal += v;
      continue;
    }
    shownTotal += v;
    const accounts = brokers.get(h.broker) ?? new Map<string, TreeNode[]>();
    brokers.set(h.broker, accounts);
    const leaves = accounts.get(h.account) ?? [];
    accounts.set(h.account, leaves);
    leaves.push({ name: h.name, value: v });
  }
  const sum = (ns: TreeNode[]) => ns.reduce((a, n) => a + n.value, 0);
  const bySize = (a: TreeNode, b: TreeNode) => b.value - a.value || a.name.localeCompare(b.name);
  const nodes = [...brokers].map(([broker, accounts]) => {
    const children = [...accounts].map(([account, leaves]): TreeNode => ({
      name: account,
      value: sum(leaves),
      children: leaves.sort(bySize),
    }));
    children.sort(bySize);
    return { name: broker, value: sum(children), children } satisfies TreeNode;
  });
  nodes.sort(bySize);
  return { nodes, shownTotal, excludedTotal };
}
