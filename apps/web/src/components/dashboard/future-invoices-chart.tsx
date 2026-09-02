'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import { FutureInvoiceMonthSummaryDto } from '@repo/shared';
import { formatCurrency, formatMonthYear } from '../../lib/utils';
import { CalendarRange, Sparkles } from 'lucide-react';

interface FutureInvoicesChartProps {
  timeline: {
    finalPayoffMonth: string;
    totalFutureCommitted: number;
    months: FutureInvoiceMonthSummaryDto[];
  };
}

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    const period = item.payload?.period;
    return (
      <div className="bg-slate-900 border border-slate-700 px-3.5 py-2.5 rounded-xl shadow-2xl backdrop-blur-md">
        <p className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider mb-1">
          {period ? formatMonthYear(period) : label}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-300 font-medium">Comprometido:</span>
          <span className="text-xs font-extrabold text-white font-mono">
            {formatCurrency(item.value)}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export function FutureInvoicesChart({ timeline }: FutureInvoicesChartProps) {
  const chartData = timeline.months.map((m) => ({
    period: m.period,
    name: m.period.slice(5) + '/' + m.period.slice(2, 4), // MM/YY
    total: m.totalCommitted,
    invoices: m.invoiceCount,
  }));

  return (
    <div className="glass-card p-6 rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shadow-sm">
            <CalendarRange className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100">Linha do Tempo de Faturas Futuras</h3>
            <p className="text-xs text-slate-400">
              Projeção linear das parcelas já contratadas nos cartões
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 flex items-center gap-2">
            <span className="text-slate-400">Total Futuro:</span>
            <span className="font-bold text-slate-100">
              {formatCurrency(timeline.totalFutureCommitted)}
            </span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-xs text-emerald-300 font-semibold flex items-center gap-1.5 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            Livre em: {formatMonthYear(timeline.finalPayoffMonth)}
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={256}>
            <BarChart data={chartData} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#94a3b8"
                tick={{ fill: '#cbd5e1', fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fill: '#cbd5e1', fontSize: 12 }}
                tickLine={false}
                tickFormatter={(val) =>
                  `R$ ${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`
                }
              />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(51, 65, 85, 0.4)' }} />
              <Bar dataKey="total" radius={[8, 8, 0, 0]} maxBarSize={56}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === chartData.length - 1 ? '#10b981' : '#06b6d4'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
            <p>Nenhuma fatura futura comprometida encontrada.</p>
          </div>
        )}
      </div>
    </div>
  );
}
