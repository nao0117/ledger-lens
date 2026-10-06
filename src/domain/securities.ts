import { CASH_BROKER, MARGIN_ACCOUNT, UNCLASSIFIED, normalizeLabel, type Holding } from '../parser/index.ts';
import type { HoldingRow } from './holdingRows.ts';
import { computeChange, type Change } from './totals.ts';

/**
 * 名寄せキー。名寄せ名（銘柄マスタの D 列）があればそれを、なければ銘柄名を正規化したもの。
 * 表記が違う銘柄を自動でまとめることはしない（名前が似ていても別のファンドがあるため）。
 * 現金は銘柄ではないので、行ごとに別のキーにする。
 */
export function securityKeyOf(h: Pick<Holding, 'id' | 'broker' | 'name' | 'securityName'>): string {
  if (h.broker === CASH_BROKER) return `${CASH_BROKER}|${h.id}`;
  return normalizeLabel(h.securityName ?? h.name);
}

export function isMargin(h: Pick<Holding, 'account'>): boolean {
  return h.account === MARGIN_ACCOUNT;
}

/** 口座をまたいで同じ銘柄をまとめた行。 */
export type SecurityRow = {
  key: string;
  /** 表示名（名寄せ名。なければ銘柄名） */
  name: string;
  assetClass: string;
  region: string;
  /** 評価額のある行（信用以外）。評価額の大きい順 */
  members: HoldingRow[];
  /** 信用の行（値は損益）。評価額には足さない */
  marginMembers: HoldingRow[];
  /** 信用の行しかない（value は損益の合計） */
  marginOnly: boolean;
  /** members の評価額の合計。marginOnly のときは信用の損益の合計 */
  value: number;
  /** 信用の損益の合計。信用の行がなければ null */
  marginValue: number | null;
  /** value と同じ範囲の前回の値。前回の日付がなければ null */
  previousValue: number | null;
  /** value と同じ範囲の前回比（合計どうしで計算する） */
  change: Change | null;
  /** 信用を含むすべての行の前回比の金額の合計（総資産の増減への寄与）。前回の日付がなければ null */
  totalChange: number | null;
  /** value / 総資産 */
  ratio: number;
  unclassified: boolean;
  /** まとめた行どうしで資産クラスか地域が食い違う */
  classConflict: boolean;
  /** 基準日にいずれかの口座で保有している（セルが空欄でない行がある） */
  held: boolean;
};

/** 基準日に保有している、または前回から評価額が変わった行。 */
const isPresent = (r: HoldingRow) => r.held || (r.change !== null && r.change.amount !== 0);

const byValue = (a: HoldingRow, b: HoldingRow) => b.value - a.value || a.id.localeCompare(b.id);
const sum = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0);
const sumNullable = (xs: readonly (number | null)[]) => (xs.length === 0 || xs.some((x) => x === null) ? null : sum(xs as number[]));

/**
 * 銘柄一覧の行を、名寄せキーでまとめる（純粋関数）。評価額の大きい順。
 * 構成比は buildHoldingRows が総資産で割った ratio を足すので、絞り込んだ行を渡しても分母は総資産のまま。
 */
export function groupBySecurity(rows: readonly HoldingRow[]): SecurityRow[] {
  const groups = new Map<string, HoldingRow[]>();
  for (const r of rows) {
    const key = securityKeyOf(r);
    const g = groups.get(key);
    if (g) g.push(r);
    else groups.set(key, [r]);
  }
  const out = [...groups].map(([key, all]): SecurityRow => {
    // 基準日に保有しておらず前回からの変化もない行（昔の行など）は、口座として数えない。
    // すべてがそうなら（保有なしの銘柄）、名前と分類を取るために全行を使う。
    const present = all.filter(isPresent);
    const rows = present.length > 0 ? present : all;
    const members = rows.filter((r) => !isMargin(r)).sort(byValue);
    const marginMembers = rows.filter(isMargin).sort(byValue);
    const marginOnly = members.length === 0;
    const basis = marginOnly ? marginMembers : members;
    const value = sum(basis.map((r) => r.value));
    const previousValue = sumNullable(basis.map((r) => r.previousValue));
    const lead = basis[0]!;
    const classes = new Set(rows.map((r) => r.assetClass));
    const regions = new Set(rows.map((r) => r.region));
    return {
      key,
      name: lead.securityName ?? lead.name,
      assetClass: lead.assetClass,
      region: lead.region,
      members,
      marginMembers,
      marginOnly,
      value,
      marginValue: marginMembers.length === 0 ? null : sum(marginMembers.map((r) => r.value)),
      previousValue,
      change: computeChange(value, previousValue),
      totalChange: sumNullable(rows.map((r) => (r.change ? r.change.amount : null))),
      ratio: sum(basis.map((r) => r.ratio)),
      unclassified: all.some((r) => r.unclassified),
      classConflict: classes.size > 1 || regions.size > 1,
      held: present.some((r) => r.held),
    };
  });
  return out.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'ja'));
}

/** 同じ名寄せキーで資産クラスか地域が食い違う銘柄（表示名の一覧）。未分類は食い違いとして扱わない。 */
export function findClassConflicts(holdings: readonly Holding[]): string[] {
  const groups = new Map<string, { name: string; classes: Set<string>; regions: Set<string> }>();
  for (const h of holdings) {
    if (h.broker === CASH_BROKER || h.assetClass === UNCLASSIFIED) continue;
    const key = securityKeyOf(h);
    const g = groups.get(key) ?? { name: h.securityName ?? h.name, classes: new Set(), regions: new Set() };
    g.classes.add(h.assetClass);
    g.regions.add(h.region);
    groups.set(key, g);
  }
  return [...groups.values()].filter((g) => g.classes.size > 1 || g.regions.size > 1).map((g) => g.name);
}
