import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatTRY, formatTRYCompact } from '@renderer/lib/currency';

const PALETTE = [
  '#3b82f6',
  '#10b981',
  '#f97316',
  '#a855f7',
  '#ef4444',
  '#06b6d4',
  '#84cc16',
  '#f59e0b',
  '#6366f1',
  '#14b8a6',
];

const tickStyle = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };

export function CompareBarChart({
  data,
}: {
  data: Array<{ label: string; income: number; expense: number; remaining: number }>;
}): React.ReactElement {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="label" tick={tickStyle} />
        <YAxis tick={tickStyle} tickFormatter={formatTRYCompact} />
        <Tooltip formatter={(v: number) => formatTRY(v)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar name="Gelir" dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar name="Gider" dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
        <Bar name="Kalan" dataKey="remaining" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PieBreakdown({
  data,
  colors,
}: {
  data: Array<{ name: string; value: number }>;
  colors?: string[];
}): React.ReactElement {
  const filtered = data.filter((d) => d.value > 0);
  if (filtered.length === 0) {
    return <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">Veri yok</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={filtered}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
        >
          {filtered.map((_, i) => (
            <Cell key={i} fill={(colors ?? PALETTE)[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => formatTRY(v)} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function HorizontalBars({
  data,
  color = '#3b82f6',
}: {
  data: Array<{ name: string; value: number }>;
  color?: string;
}): React.ReactElement {
  if (data.length === 0) {
    return <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">Veri yok</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 12 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
        <XAxis type="number" tick={tickStyle} tickFormatter={formatTRYCompact} />
        <YAxis type="category" dataKey="name" tick={tickStyle} width={100} />
        <Tooltip formatter={(v: number) => formatTRY(v)} />
        <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendLineChart({
  data,
}: {
  data: Array<{ label: string; income: number; expense: number }>;
}): React.ReactElement {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="label" tick={tickStyle} />
        <YAxis tick={tickStyle} tickFormatter={formatTRYCompact} />
        <Tooltip formatter={(v: number) => formatTRY(v)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line name="Gelir" type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
        <Line name="Gider" type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
