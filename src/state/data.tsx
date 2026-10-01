import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { ParsedAnnual } from '../parser/index.ts';

type DataContextValue = {
  data: ParsedAnnual;
  /** 基準日（YYYY-MM-DD）。dates が空のときは null。 */
  baseDate: string | null;
  setBaseDate: (date: string) => void;
};

const DataContext = createContext<DataContextValue | null>(null);

/** データはメモリ上でだけ持つ。保存はしない。 */
export function DataProvider({ data, children }: { data: ParsedAnnual; children: ReactNode }) {
  const latest = data.dates[data.dates.length - 1] ?? null;
  const [picked, setPicked] = useState<string | null>(null);
  // 再読み込みで日付が変わっても、存在しない基準日は使わず最新日に戻す
  const baseDate = picked !== null && data.dates.includes(picked) ? picked : latest;

  const value = useMemo(() => ({ data, baseDate, setBaseDate: setPicked }), [data, baseDate]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('DataProvider の外で useData を使っています');
  return ctx;
}
