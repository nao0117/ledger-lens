import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useMoney } from '../Money.tsx';
import { formatRatio, type Slice } from './slices.ts';

type Props = { title: string; slices: Slice[] };

/** ドーナツ＋凡例（名称・%）＋折りたたみの表。マスク ON のとき金額はどこにも出さない。 */
export function DonutCard({ title, slices }: Props) {
  const { yen, mask } = useMoney();
  const drawable = slices.filter((s) => s.drawable);

  return (
    <div className="card dash-donut">
      <h3 className="dash-card-title">{title}</h3>
      {drawable.length === 0 ? (
        <p className="note">表示できるデータがありません</p>
      ) : (
        <div className="dash-chart" role="img" aria-label={`${title}: ${drawable.map((s) => `${s.name} ${formatRatio(s.ratio)}`).join('、')}`}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={drawable}
                dataKey="value"
                nameKey="name"
                innerRadius="55%"
                outerRadius="90%"
                paddingAngle={1}
                stroke="var(--surface)"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {drawable.map((s) => (
                  <Cell key={s.name} fill={s.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  const item = active ? (payload?.[0]?.payload as Slice | undefined) : undefined;
                  if (!item) return null;
                  return (
                    <div className="dash-tooltip">
                      {item.name}: {formatRatio(item.ratio)}
                      {mask ? '' : `（${yen(item.value)}）`}
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
      {slices.length > 0 && (
        <>
          <ul className="dash-legend">
            {slices.map((s) => (
              <li key={s.name}>
                <span className="dash-swatch" style={{ background: s.color }} aria-hidden="true" />
                <span className="dash-legend-name">{s.name}</span>
                <span className="dash-legend-ratio">{formatRatio(s.ratio)}</span>
              </li>
            ))}
          </ul>
          <details className="dash-table">
            <summary>表で見る</summary>
            <div className="dash-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">名称</th>
                    <th scope="col">評価額</th>
                    <th scope="col">比率</th>
                  </tr>
                </thead>
                <tbody>
                  {slices.map((s) => (
                    <tr key={s.name}>
                      <th scope="row">{s.name}</th>
                      <td className="money">{yen(s.value)}</td>
                      <td>{formatRatio(s.ratio)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
