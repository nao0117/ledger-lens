import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { AutoLock } from '../auth/index.ts';
import { hrefFor, ROUTES, useRoute, type RoutePath } from '../router.ts';
import { useData } from '../state/data.tsx';
import { usePrefs, type Theme } from '../state/prefs.tsx';
import {
  ChevronDownIcon,
  CompositionIcon,
  EyeIcon,
  EyeOffIcon,
  HomeIcon,
  ListIcon,
  LogoIcon,
  LogoutIcon,
  MoreIcon,
  ReloadIcon,
  ShieldIcon,
  ThemeIcon,
} from './icons.tsx';
import { formatBaseDateLong, formatBaseDateOption, formatFetchedAt } from './layoutFormat.ts';
import { LockCountdown, LockWarning } from './LockWarning.tsx';

const THEME_LABELS: Record<Theme, string> = { system: '自動', light: 'ライト', dark: 'ダーク' };
const THEMES: Theme[] = ['system', 'light', 'dark'];

const NAV_ICONS: Record<RoutePath, (p: { size?: number }) => ReactNode> = {
  '/': HomeIcon,
  '/composition': CompositionIcon,
  '/holdings': ListIcon,
};

type Props = {
  children: ReactNode;
  /** 省略時（デモ）は再読み込みを出さない。 */
  onReload?: () => void;
  onLogout?: () => void;
  /** 再読み込み中。 */
  busy?: boolean;
  /** 最後に読み込みに成功した時刻（メモリのみ）。 */
  lastFetchedAt?: Date | null;
  /** 自動ロック。残り時間の表示と予告に使う。 */
  autoLock?: AutoLock | null;
};

export function Layout({ children, onReload, onLogout, busy = false, lastFetchedAt = null, autoLock = null }: Props) {
  const route = useRoute();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app">
      {/* PC: 左サイドバー */}
      <aside className="app-side">
        <div className="side-logo">
          <span className="logo-mark">
            <LogoIcon size={14} />
          </span>
          <span>Ledger Lens</span>
        </div>
        <Nav route={route} className="side-nav" iconSize={20} />
        <div className="side-foot">
          <div className="side-status">
            {lastFetchedAt && (
              <div className="status-row">
                <span className="muted">最終取得</span>
                <FetchedAt at={lastFetchedAt} />
              </div>
            )}
            {autoLock && (
              <div className="status-row status-lock">
                <span className="muted">自動ロックまで</span>
                <LockCountdown lock={autoLock} bar />
              </div>
            )}
            {onReload && <ReloadButton onReload={onReload} busy={busy} className="side-btn" iconSize={16} />}
          </div>
          <p className="side-memo">
            <ShieldIcon size={14} />
            データはメモリ上だけで扱い、保存しません
          </p>
          <ThemeSegment />
          {onLogout && <LogoutControl onLogout={onLogout} className="side-logout" />}
        </div>
      </aside>

      <div className="app-body">
        {/* スマホ: 1行ヘッダー＋マスク帯 */}
        <div className="m-top">
          <header className="m-header">
            <h1 className="m-brand">Ledger Lens</h1>
            <BaseDateSelect variant="chip" />
            <span className="spacer" />
            <MaskToggle variant="icon" />
            <button
              type="button"
              className="icon-btn"
              aria-label="メニュー"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <MoreIcon />
            </button>
          </header>
          <MaskBand />
        </div>

        {/* PC: メイン上部のツールバー */}
        <div className="pc-toolbar">
          <BaseDateSelect variant="field" />
          <MaskToggle variant="text" />
        </div>
        <div className="pc-maskband">
          <MaskBand />
        </div>

        <main className="app-main">{children}</main>
      </div>

      {/* スマホ: 下部タブバー */}
      <Nav route={route} className="tabbar" iconSize={22} />

      <MenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onReload={onReload}
        onLogout={onLogout}
        busy={busy}
        lastFetchedAt={lastFetchedAt}
        autoLock={autoLock}
      />

      {autoLock && <LockWarning lock={autoLock} />}
    </div>
  );
}

function Nav({ route, className, iconSize }: { route: RoutePath; className: string; iconSize: number }) {
  return (
    <nav className={className} aria-label="画面">
      {ROUTES.map((r) => {
        const Icon = NAV_ICONS[r.path];
        return (
          <a key={r.path} href={hrefFor(r.path)} aria-current={r.path === route ? 'page' : undefined}>
            <Icon size={iconSize} />
            <span>{r.label}</span>
          </a>
        );
      })}
    </nav>
  );
}

function BaseDateSelect({ variant }: { variant: 'chip' | 'field' }) {
  const { data, baseDate, setBaseDate } = useData();
  const latest = data.dates[data.dates.length - 1] ?? null;
  const select = (
    <select
      aria-label="基準日"
      title={baseDate ? formatBaseDateLong(baseDate) : undefined}
      value={baseDate ?? ''}
      onChange={(e) => setBaseDate(e.target.value)}
      disabled={baseDate === null}
    >
      {[...data.dates].reverse().map((d) => (
        <option key={d} value={d}>
          {formatBaseDateOption(d, latest)}
        </option>
      ))}
    </select>
  );
  if (variant === 'chip') {
    return (
      <span className="date-chip">
        {select}
        <ChevronDownIcon size={14} />
      </span>
    );
  }
  return (
    <label className="date-field">
      <span className="muted">基準日</span>
      <span className="date-field-select">
        {select}
        <ChevronDownIcon size={14} />
      </span>
    </label>
  );
}

function MaskToggle({ variant }: { variant: 'icon' | 'text' }) {
  const { mask, setMask } = usePrefs();
  const label = mask ? '金額を表示' : '金額を隠す';
  const icon = mask ? <EyeOffIcon /> : <EyeIcon />;
  if (variant === 'icon') {
    return (
      <button type="button" className="icon-btn mask-toggle" aria-pressed={mask} aria-label={label} onClick={() => setMask(!mask)}>
        {icon}
      </button>
    );
  }
  return (
    <button type="button" className="mask-toggle-text" aria-pressed={mask} onClick={() => setMask(!mask)}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function MaskBand() {
  const { mask, setMask } = usePrefs();
  if (!mask) return null;
  return (
    <div className="mask-band" role="status">
      <EyeOffIcon size={14} />
      <span>金額を隠しています</span>
      <button type="button" className="link-btn" onClick={() => setMask(false)}>
        表示する
      </button>
    </div>
  );
}

function FetchedAt({ at }: { at: Date }) {
  // 表示の基準となる「今」は描画のたびに変える必要がないので、最初に一度だけ取る
  const [now] = useState(() => new Date());
  return (
    <time className="num" dateTime={at.toISOString()}>
      {formatFetchedAt(at, now)}
    </time>
  );
}

function ReloadButton({
  onReload,
  busy,
  lastFetchedAt = null,
  className,
  iconSize = 20,
}: {
  onReload: () => void;
  busy: boolean;
  lastFetchedAt?: Date | null;
  className?: string;
  iconSize?: number;
}) {
  return (
    <button type="button" className={className} onClick={onReload} disabled={busy} aria-busy={busy}>
      {busy ? <span className="spinner" aria-hidden="true" /> : <ReloadIcon size={iconSize} />}
      <span className="btn-text">
        <span>{busy ? '読み込み中…' : '再読み込み'}</span>
        {lastFetchedAt && !busy && (
          <small>
            最終取得 <FetchedAt at={lastFetchedAt} />
          </small>
        )}
      </span>
    </button>
  );
}

function ThemeSegment() {
  const { theme, setTheme } = usePrefs();
  return (
    <div className="seg" role="group" aria-label="テーマ">
      {THEMES.map((t) => (
        <button key={t} type="button" aria-pressed={theme === t} onClick={() => setTheme(t)}>
          {THEME_LABELS[t]}
        </button>
      ))}
    </div>
  );
}

/** ログアウトは確認を挟む（confirm() は使わない）。 */
function LogoutControl({ onLogout, className }: { onLogout: () => void; className?: string }) {
  const [confirming, setConfirming] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const wasConfirming = useRef(false);

  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
    else if (wasConfirming.current) triggerRef.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  if (!confirming) {
    return (
      <button type="button" ref={triggerRef} className={`logout-btn ${className ?? ''}`} onClick={() => setConfirming(true)}>
        <LogoutIcon size={18} />
        <span>ログアウト…</span>
      </button>
    );
  }
  return (
    <div className={`logout-confirm ${className ?? ''}`} role="group" aria-labelledby={titleId}>
      <p id={titleId}>ログアウトしますか？</p>
      <div className="logout-confirm-actions">
        <button type="button" ref={cancelRef} onClick={() => setConfirming(false)}>
          キャンセル
        </button>
        <button type="button" className="danger" onClick={onLogout}>
          ログアウト
        </button>
      </div>
    </div>
  );
}

type MenuSheetProps = {
  open: boolean;
  onClose: () => void;
  onReload?: () => void;
  onLogout?: () => void;
  busy: boolean;
  lastFetchedAt: Date | null;
  autoLock: AutoLock | null;
};

/** ︙メニュー（ボトムシート）。ネイティブ dialog を showModal で開く。Esc・背面タップで閉じる。 */
function MenuSheet({ open, onClose, onReload, onLogout, busy, lastFetchedAt, autoLock }: MenuSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        // 背面（::backdrop）のタップは dialog 自身へのクリックになる
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      {open && (
        <div className="sheet-body">
          <div className="sheet-grab" aria-hidden="true" />
          <h2 id={titleId} className="sr-only">
            メニュー
          </h2>
          {onReload && <ReloadButton onReload={onReload} busy={busy} lastFetchedAt={lastFetchedAt} className="menu-item" />}
          <div className="menu-item static">
            <ThemeIcon />
            <span className="btn-text">テーマ</span>
            <ThemeSegment />
          </div>
          {autoLock && (
            <p className="menu-note">
              自動ロックまで <LockCountdown lock={autoLock} />
            </p>
          )}
          <p className="menu-note">データはメモリ上だけで扱い、保存しません</p>
          {onLogout && (
            <>
              <hr />
              <LogoutControl onLogout={onLogout} className="menu-item" />
            </>
          )}
        </div>
      )}
    </dialog>
  );
}
