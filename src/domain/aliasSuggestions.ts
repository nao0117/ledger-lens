import { CASH_BROKER, type Holding } from '../parser/index.ts';
import { securityKeyOf } from './securities.ts';

/*
 * 名寄せの候補（同じ銘柄かもしれない、表記の違う名前）を見つける。自動ではまとめず、利用者に確認してもらう。
 * 文字列の類似度は使わない。「Slim の有無」「先進国と全世界」のように、似ていても別のファンドがあるため。
 * 代わりに、愛称の括弧書き・運用会社の接頭辞・「インデックスファンド」などの省略だけを取り除いて比べる。
 */

/** 省略されやすい語。長いものから取り除く。 */
const GENERIC_WORDS = ['インデックスファンド', 'インデックス・ファンド', 'インデックス', 'ファンド'];

/** 片方にだけあれば別の銘柄とみなす語（小文字で比べる）。 */
const DISTINGUISHING_WORDS = [
  'slim',
  'ヘッジ',
  '毎月',
  '隔月',
  '年1回',
  '年2回',
  '年4回',
  '年6回',
  '高配当',
  'レバレッジ',
  'ブル',
  'ベア',
  'クラスa',
  'クラスb',
  'クラスc',
];

/** 含まれる関係で候補にするときの、短い方の最小の長さ（短い社名どうしの誤一致を防ぐ）。 */
const MIN_CONTAINED_LENGTH = 6;

/** 比較用の中核部分。純粋関数。 */
export function coreName(name: string): string {
  let s = name.normalize('NFKC').toLowerCase();
  s = s.replace(/\([^)]*\)/g, ''); // 愛称などの括弧書き
  s = s.replace(/^[^\s・-]{1,4}-/, ''); // 「○○-」のような短い運用会社名の接頭辞
  for (const w of GENERIC_WORDS) s = s.split(w).join('');
  return s.replace(/[\s・\-&]/g, '');
}

function distinguishing(name: string): string {
  const s = name.normalize('NFKC').toLowerCase();
  return DISTINGUISHING_WORDS.filter((w) => s.includes(w)).join('|');
}

/** 2つの名前が、同じ銘柄の表記違いの候補か。 */
export function looksLikeSameSecurity(a: string, b: string): boolean {
  if (distinguishing(a) !== distinguishing(b)) return false;
  const ca = coreName(a);
  const cb = coreName(b);
  if (ca === '' || cb === '') return false;
  if (ca === cb) return true;
  const [short, long] = ca.length <= cb.length ? [ca, cb] : [cb, ca];
  return short.length >= MIN_CONTAINED_LENGTH && long.includes(short);
}

/**
 * 名寄せキーが違うのに、同じ銘柄の表記違いに見える名前のまとまり（表示名の配列の配列）。
 * すでに同じ名寄せ名でまとまっているものは対象外。現金は対象外。
 */
export function suggestSameSecurities(holdings: readonly Holding[]): string[][] {
  const names = new Map<string, string>(); // 名寄せキー → 表示名
  for (const h of holdings) {
    if (h.broker === CASH_BROKER) continue;
    const key = securityKeyOf(h);
    if (!names.has(key)) names.set(key, h.securityName ?? h.name);
  }
  const keys = [...names.keys()].sort((a, b) => a.localeCompare(b, 'ja'));

  // 候補の組を、つながりごとのまとまりにする（union-find）
  const parent = new Map(keys.map((k) => [k, k]));
  const find = (k: string): string => {
    const p = parent.get(k)!;
    if (p === k) return k;
    const root = find(p);
    parent.set(k, root);
    return root;
  };
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = keys[i]!;
      const b = keys[j]!;
      if (looksLikeSameSecurity(names.get(a)!, names.get(b)!)) parent.set(find(a), find(b));
    }
  }
  const groups = new Map<string, string[]>();
  for (const k of keys) {
    const root = find(k);
    groups.set(root, [...(groups.get(root) ?? []), names.get(k)!]);
  }
  return [...groups.values()].filter((g) => g.length > 1);
}
