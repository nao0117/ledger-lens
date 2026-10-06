import type { ParseWarning } from '../parser/index.ts';
import { Money } from './Money.tsx';

/**
 * パース時の警告（ホームの「確認が必要」カードの中に出す）。件数を見せ、詳細は折りたたむ。
 * メッセージ文に金額は含まれず、差額は Money 経由（マスク対象）で出す。
 */
export function WarningsBanner({ warnings }: { warnings: readonly ParseWarning[] }) {
  if (warnings.length === 0) return null;
  return (
    <details className="warnings">
      <summary>
        <span className="warnings-badge" aria-hidden="true">
          {warnings.length}
        </span>
        シートの確認事項が {warnings.length} 件あります
      </summary>
      <ul>
        {warnings.map((w, i) => (
          <li key={i}>
            {w.date ? `${w.date}: ` : ''}
            {w.message}
            {w.difference !== undefined && (
              <>
                （シート − 明細: <Money value={w.difference} />）
              </>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
