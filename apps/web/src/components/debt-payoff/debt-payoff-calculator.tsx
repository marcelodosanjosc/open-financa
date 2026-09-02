'use client';

import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  DebtPayoffStrategy,
  DebtItem,
  DebtPayoffSimulationResult,
} from '@repo/shared';
import { api } from '../../lib/api';
import { formatCurrency, formatMonthYear } from '../../lib/utils';
import {
  TrendingDown,
  Sparkles,
  Zap,
  PiggyBank,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

interface DebtPayoffCalculatorProps {
  initialDebts?: DebtItem[];
}

const CustomAreaTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    const date = item.payload?.date;
    return (
      <div className="bg-slate-900 border border-slate-700 px-3.5 py-2.5 rounded-xl shadow-2xl backdrop-blur-md">
        <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
          {date ? formatMonthYear(date) : label}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-300 font-medium">Saldo Devedor:</span>
          <span className="text-xs font-extrabold text-white font-mono">
            {formatCurrency(item.value)}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export function DebtPayoffCalculator({ initialDebts }: DebtPayoffCalculatorProps) {
  const [contribution, setContribution] = useState<number>(800);
  const [strategy, setStrategy] = useState<DebtPayoffStrategy>(DebtPayoffStrategy.AVALANCHE);
  const [loading, setLoading] = useState<boolean>(false);
  const [simulation, setSimulation] = useState<DebtPayoffSimulationResult | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function runSim() {
      setLoading(true);
      try {
        const res = await api.simulateDebtPayoff({
          debts: initialDebts,
          monthlyContribution: contribution,
          strategy,
        });
        if (isMounted) {
          setSimulation(res);
        }
      } catch (err) {
        console.error('Error running debt payoff simulation:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    const timer = setTimeout(runSim, 200);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [contribution, strategy, initialDebts]);

  const chartData =
    simulation?.timeline.map((item) => ({
      name: item.date.slice(5) + '/' + item.date.slice(2, 4),
      date: item.date,
      saldo: item.totalRemainingBalance,
      jurosPago: item.totalInterestPaidMonth,
    })) || [];

  return (
    <div className="glass-card p-6 rounded-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-sm">
            <TrendingDown className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100">Simulador de Quitação Acelerada de Dívidas</h3>
            <p className="text-xs text-slate-400">
              Descubra em qual mês você estará 100% livre com amortização inteligente
            </p>
          </div>
        </div>

        {simulation && (
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center gap-2.5 shadow-lg shadow-emerald-500/10">
              <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
              <div>
                <p className="text-[10px] uppercase font-bold text-emerald-300">
                  Data da Liberdade Financeira
                </p>
                <p className="text-sm font-extrabold text-slate-100">
                  {formatMonthYear(simulation.debtFreeDate)} ({simulation.monthsToDebtFree} meses)
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Controls & Metrics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Slider & Contribution */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-700/60 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Aporte Mensal Dedicado
              </label>
              <span className="text-base font-extrabold text-emerald-400">
                {formatCurrency(contribution)}
              </span>
            </div>
            <input
              type="range"
              min={100}
              max={5000}
              step={50}
              value={contribution}
              onChange={(e) => setContribution(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1.5 font-semibold">
              <span>R$ 100</span>
              <span>R$ 2.500</span>
              <span>R$ 5.000</span>
            </div>
          </div>

          {/* Quick preset buttons */}
          <div className="flex items-center gap-2 mt-4">
            {[300, 600, 1000, 1500].map((preset) => (
              <button
                key={preset}
                onClick={() => setContribution(preset)}
                className={`flex-1 py-1 text-xs rounded-lg border font-semibold transition-colors ${
                  contribution === preset
                    ? 'bg-emerald-500/25 border-emerald-500/50 text-emerald-300 shadow-sm'
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                R$ {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Strategy Selector */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-700/60">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-200 block mb-2.5">
            Estratégia de Amortização
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setStrategy(DebtPayoffStrategy.AVALANCHE)}
              className={`p-3 rounded-xl border text-left transition-all ${
                strategy === DebtPayoffStrategy.AVALANCHE
                  ? 'bg-indigo-600/30 border-indigo-400/60 text-indigo-200 shadow-sm'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Zap className="w-3.5 h-3.5 text-indigo-400" />
                Avalanche
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">Maior taxa de juros primeiro</p>
            </button>

            <button
              onClick={() => setStrategy(DebtPayoffStrategy.SNOWBALL)}
              className={`p-3 rounded-xl border text-left transition-all ${
                strategy === DebtPayoffStrategy.SNOWBALL
                  ? 'bg-pink-600/30 border-pink-400/60 text-pink-200 shadow-sm'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <PiggyBank className="w-3.5 h-3.5 text-pink-400" />
                Bola de Neve
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">Menor saldo devedor primeiro</p>
            </button>
          </div>
        </div>

        {/* Savings Badge */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-emerald-950/40 border border-emerald-500/30 flex flex-col justify-between shadow-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
              Economia Estimada em Juros
            </p>
            <h4 className="text-2xl font-extrabold text-emerald-400 tracking-tight">
              {formatCurrency(simulation?.interestSavedComparedToMinimum || 0)}
            </h4>
            <p className="text-xs text-slate-300 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Economia comparada ao pagamento mínimo
            </p>
          </div>
          <div className="text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-800 flex justify-between">
            <span>Total a Pagar (Principal + Juros):</span>
            <span className="font-bold text-slate-200">
              {formatCurrency(simulation?.totalPaid || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Amortization Chart */}
      <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-700/60">
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">
          Curva de Eliminação da Dívida
        </h4>
        <div className="h-56 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={224}>
              <AreaChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="debtGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  tick={{ fill: '#cbd5e1', fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: '#cbd5e1', fontSize: 11 }}
                  tickLine={false}
                  tickFormatter={(val) =>
                    `R$ ${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`
                  }
                />
                <Tooltip content={<CustomAreaTooltip />} />
                <Area
                  type="monotone"
                  dataKey="saldo"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#debtGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-400 mr-2" />
              Parabéns! Nenhuma dívida ativa no momento.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
