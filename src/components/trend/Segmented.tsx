import { useEffect, useRef } from 'react';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** 切り替えボタン（収まらないときは横スクロール）（role="group" ＋ aria-pressed）。 */
export default function Segmented<T extends string>({ label, options, value, onChange }: Props<T>) {
  const ref = useRef<HTMLDivElement>(null);
  // 横スクロールになるとき、選択中のボタンが画面外に隠れないようにする
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    el?.scrollIntoView?.({ inline: 'nearest', block: 'nearest' });
  }, [value]);
  return (
    <div className="seg" role="group" aria-label={label} ref={ref}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
