'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '../../lib/utils';
import { Layers } from 'lucide-react';

interface CostBreakdownProps {
  data: {
    fixed: number;
    variable: number;
    essential: number;
    discretionary: number;
  };
}

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="bg-slate-900 border border-slate-700 px-3.5 py-2 rounded-xl shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shadow-sm"
            style={{ backgroundColor: item.payload?.color || item.color || '#10b981' }}
          />
          <span className="text-xs font-semibold text-slate-200">{item.name}:</span>
          <span className="text-xs font-extrabold text-white">
            {formatCurrency(item.value)}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export function CostBreakdownChart({ data }: CostBreakdownProps) {
  const totalCost = (data.fixed || 0) + (data.variable || 0) || 1;

  const fixedVsVariableData = [
    { name: 'Custos Fixos', value: data.fixed || 0, color: '#6366f1' },
    { name: 'Custos Variáveis', value: data.variable || 0, color: '#f59e0b' },
  ].filter((d) => d.value > 0);

  const essentialVsDiscretionaryData = [
    { name: 'Essenciais', value: data.essential || 0, color: '#10b981' },
    { name: 'Supérfluos / Estilo', value: data.discretionary || 0, color: '#ec4899' },
  ].filter((d) => d.value > 0);

  const fixedPercent = Math.round(((data.fixed || 0) / totalCost) * 100);
  const variablePercent = 100 - fixedPercent;
  const essentialPercent = Math.round(((data.essential || 0) / totalCost) * 100);
  const discretionaryPercent = 100 - essentialPercent;

  return (
    <div className="glass-card p-6 rounded-2xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shadow-sm">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100">Classificação de Gastos</h3>
            <p className="text-xs text-slate-400">Comportamento e natureza das despesas</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quadrant 1: Fixos vs Variáveis */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-700/60 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Fixos vs Variáveis
              </h4>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                Total: {formatCurrency(totalCost)}
              </span>
            </div>

            {/* Visual Segmented Distribution Bar */}
            <div className="w-full h-3.5 bg-slate-800 rounded-full overflow-hidden flex border border-slate-700/50 mt-3 shadow-inner">
              <div
                style={{ width: `${fixedPercent}%` }}
                className="bg-indigo-500 transition-all duration-500 hover:opacity-90"
                title={`Fixos: ${fixedPercent}%`}
              />
              <div
                style={{ width: `${variablePercent}%` }}
                className="bg-amber-500 transition-all duration-500 hover:opacity-90"
                title={`Variáveis: ${variablePercent}%`}
              />
            </div>
          </div>

          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height={128}>
              <PieChart>
                <Pie
                  data={
                    fixedVsVariableData.length > 0
                      ? fixedVsVariableData
                      : [{ name: 'Sem dados', value: 1, color: '#334155' }]
                  }
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={56}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {fixedVsVariableData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-2 text-slate-200 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm" />
                Custos Fixos: {formatCurrency(data.fixed || 0)}
              </span>
              <span className="font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                {fixedPercent}%
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-2 text-slate-200 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />
                Custos Variáveis: {formatCurrency(data.variable || 0)}
              </span>
              <span className="font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                {variablePercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Quadrant 2: Essenciais vs Supérfluos */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-700/60 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Essenciais vs Supérfluos
              </h4>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                Total: {formatCurrency(totalCost)}
              </span>
            </div>

            {/* Visual Segmented Distribution Bar */}
            <div className="w-full h-3.5 bg-slate-800 rounded-full overflow-hidden flex border border-slate-700/50 mt-3 shadow-inner">
              <div
                style={{ width: `${essentialPercent}%` }}
                className="bg-emerald-500 transition-all duration-500 hover:opacity-90"
                title={`Essenciais: ${essentialPercent}%`}
              />
              <div
                style={{ width: `${discretionaryPercent}%` }}
                className="bg-pink-500 transition-all duration-500 hover:opacity-90"
                title={`Supérfluos: ${discretionaryPercent}%`}
              />
            </div>
          </div>

          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height={128}>
              <PieChart>
                <Pie
                  data={
                    essentialVsDiscretionaryData.length > 0
                      ? essentialVsDiscretionaryData
                      : [{ name: 'Sem dados', value: 1, color: '#334155' }]
                  }
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={56}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {essentialVsDiscretionaryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-2 text-slate-200 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                Essenciais: {formatCurrency(data.essential || 0)}
              </span>
              <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                {essentialPercent}%
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-2 text-slate-200 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-500 shadow-sm" />
                Supérfluos: {formatCurrency(data.discretionary || 0)}
              </span>
              <span className="font-bold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-md border border-pink-500/20">
                {discretionaryPercent}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
