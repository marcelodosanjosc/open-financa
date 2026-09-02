'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '../../components/layout/header';
import { BudgetResponseDto, CategoryResponseDto } from '@repo/shared';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import {
  Target,
  PlusCircle,
  AlertTriangle,
  CheckCircle,
  Trash2,
  PieChart,
} from 'lucide-react';

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<BudgetResponseDto[]>([]);
  const [categories, setCategories] = useState<CategoryResponseDto[]>([]);

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);

  const [newCategoryId, setNewCategoryId] = useState('');
  const [newMonthlyLimit, setNewMonthlyLimit] = useState('');
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bRes, cRes] = await Promise.all([
        api.getBudgets(selectedYear, selectedMonth),
        api.getCategories(true),
      ]);
      setBudgets(bRes);
      setCategories(cRes);
      if (cRes.length > 0 && !newCategoryId) setNewCategoryId(cRes[0].id);
    } catch (err) {
      console.error('Error loading budgets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear, selectedMonth]);

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const limit = parseFloat(newMonthlyLimit.replace(',', '.'));
    if (isNaN(limit) || limit <= 0) return;

    try {
      await api.saveBudget({
        categoryId: newCategoryId,
        monthlyLimit: limit,
        referenceYear: selectedYear,
        referenceMonth: selectedMonth,
      });
      setNewMonthlyLimit('');
      loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    if (!confirm('Deseja excluir este orçamento?')) return;
    try {
      await api.deleteBudget(id);
      loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const totalBudgeted = budgets.reduce((acc, b) => acc + b.monthlyLimit, 0);
  const totalSpent = budgets.reduce((acc, b) => acc + b.spentAmount, 0);

  return (
    <div>
      <Header
        title="Orçamentos & Metas Mensais"
        subtitle="Definição de limites de gastos por categoria e acompanhamento em tempo real"
      />

      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* Month Selector & Summary */}
        <div className="glass-card p-6 rounded-2xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-300">Mês de Referência:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2"
            >
              {[
                'Janeiro',
                'Fevereiro',
                'Março',
                'Abril',
                'Maio',
                'Junho',
                'Julho',
                'Agosto',
                'Setembro',
                'Outubro',
                'Novembro',
                'Dezembro',
              ].map((m, idx) => (
                <option key={idx} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2"
            >
              {[2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-6">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Total Orçado</p>
              <p className="text-xl font-extrabold text-slate-100">{formatCurrency(totalBudgeted)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Total Realizado</p>
              <p className="text-xl font-extrabold text-emerald-400">{formatCurrency(totalSpent)}</p>
            </div>
          </div>
        </div>

        {/* Set Budget Form */}
        <div className="glass-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-slate-100">Definir / Atualizar Limite Orçamentário</h3>
          </div>

          <form onSubmit={handleSaveBudget} className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <select
                value={newCategoryId}
                onChange={(e) => setNewCategoryId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.classification})
                  </option>
                ))}
              </select>
            </div>

            <div className="w-44">
              <input
                type="text"
                required
                placeholder="Limite (R$) Ex: 800,00"
                value={newMonthlyLimit}
                onChange={(e) => setNewMonthlyLimit(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              Salvar Orçamento
            </button>
          </form>
        </div>

        {/* Budgets List with Progress Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {budgets.map((b) => {
            const pct = Math.min(100, b.consumedPercentage);
            const isExceeded = b.isExceeded;
            const isWarning = b.consumedPercentage >= 80 && !isExceeded;

            let barColor = 'bg-emerald-500';
            if (isExceeded) barColor = 'bg-rose-500';
            else if (isWarning) barColor = 'bg-amber-500';

            return (
              <div
                key={b.id}
                className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-base text-slate-100 flex items-center gap-2">
                      {b.categoryName}
                      {isExceeded && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          Estourado
                        </span>
                      )}
                    </h4>
                    <button
                      onClick={() => handleDeleteBudget(b.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-400">
                    Classificação: <span className="text-slate-300 font-semibold">{b.categoryClassification}</span>
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Gasto: <b className="text-slate-200">{formatCurrency(b.spentAmount)}</b></span>
                    <span className="text-slate-400">Limite: <b className="text-slate-200">{formatCurrency(b.monthlyLimit)}</b></span>
                  </div>

                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`${barColor} h-full rounded-full transition-all duration-300`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
                    <span>{b.consumedPercentage}% consumido</span>
                    <span className={isExceeded ? 'text-rose-400 font-semibold' : 'text-emerald-400'}>
                      {isExceeded
                        ? `Ultrapassado em ${formatCurrency(Math.abs(b.remainingAmount))}`
                        : `Saldo disponível: ${formatCurrency(b.remainingAmount)}`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
