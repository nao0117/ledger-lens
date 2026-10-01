import type { Cell } from './types.ts';

/**
 * ラベルの表記ゆれを正規化する。
 * 全角・半角の統一（NFKC）、前後の空白とタブの除去、途中の連続する空白を1つにまとめる。
 */
export function normalizeLabel(cell: Cell): string {
  if (cell === null || cell === undefined) return '';
  return String(cell).normalize('NFKC').replace(/\s+/g, ' ').trim();
}

export function isBlank(cell: Cell): boolean {
  return cell === null || cell === undefined || (typeof cell === 'string' && cell.trim() === '');
}
