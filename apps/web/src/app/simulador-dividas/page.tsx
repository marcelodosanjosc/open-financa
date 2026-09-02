'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '../../components/layout/header';
import { DebtPayoffCalculator } from '../../components/debt-payoff/debt-payoff-calculator';
import { DebtItem, DebtPayoffStrategy } from '@repo/shared';
import { api } from '../../lib/api';
import { formatCurrency, formatMonthYear } from '../../lib/utils';
import {
  TrendingDown,
  Sparkles,
  PlusCircle,
  Trash2,
  Zap,
  PiggyBank,
  CheckCircle,
} from 'lucide-react';

export default function DebtPayoffPage() {
  const [customDebts, setCustomDebts] = useState<DebtItem[]>([]);
  const [newDebtName, setNewDebtName] = useState('');
  const [newDebtBalance, setNewDebtBalance] = useState('');
  const [newDebtRate, setNewDebtRate] = useState('2.5');
  const [newDebtMinPay, setNewDebtMinPay] = useState('');

  const [avalancheResult, setAvalancheResult] = useState<any>(null);
  const [snowballResult, setSnowballResult] = useState<any>(null);

  const addCustomDebt = (e: React.FormEvent) => {
    e.preventDefault();
    const bal = parseFloat(newDebtBalance.replace(',', '.'));
    const rate = parseFloat(newDebtRate.replace(',', '.'));
    const minPay = parseFloat(newDebtMinPay.replace(',', '.')) || Math.max(50, bal * 0.15);

    if (isNaN(bal) || bal <= 0) return;

    const newDebt: DebtItem = {
      id: crypto.randomUUID(),
      name: newDebtName || `Dívida ${customDebts.length + 1}`,
      currentBalance: bal,
      interestRateMonthly: isNaN(rate) ? 2.5 : rate,
      minimumPayment: minPay,
    };

    setCustomDebts([...customDebts, newDebt]);
    setNewDebtName('');
    setNewDebtBalance('');
    setNewDebtMinPay('');
  };

  const removeDebt = (id: string) => {
    setCustomDebts(customDebts.filter((d) => d.id !== id));
  };

  // Run strategy comparison
  useEffect(() => {
    async function compare() {
      try {
        const debtsToUse = customDebts.length > 0 ? customDebts : undefined;
        const [ava, snow] = await Promise.all([
          api.simulateDebtPayoff({
            debts: debtsToUse,
            monthlyContribution: 800,
            strategy: DebtPayoffStrategy.AVALANCHE,
          }),
          api.simulateDebtPayoff({
            debts: debtsToUse,
            monthlyContribution: 800,
            strategy: DebtPayoffStrategy.SNOWBALL,
          }),
        ]);
        setAvalancheResult(ava);
        setSnowballResult(snow);
      } catch (err) {
        console.error('Error running comparison:', err);
      }
    }
    compare();
  }, [customDebts]);

  return (
    <div>
      <Header
        title="Motor de Quitação de Dívidas"
        subtitle="Simulações de liberdade financeira, amortização inteligente e economia em juros"
      />

      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* Main Interactive Calculator Widget */}
        <DebtPayoffCalculator initialDebts={customDebts.length > 0 ? customDebts : undefined} />

        {/* Side-by-Side Strategy Comparison Cards */}
        {avalancheResult && snowballResult && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Avalanche */}
            <div className="glass-card p-6 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-slate-900 to-indigo-950/20">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-100">Estratégia Avalanche</h4>
                  <p className="text-xs text-slate-400">Prioriza maiores taxas de juros</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-800 text-xs">
                <div>
                  <p className="text-slate-400">Meses até Quitação:</p>
                  <p className="text-lg font-bold text-indigo-300">
                    {avalancheResult.monthsToDebtFree} meses
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Livre em:</p>
                  <p className="text-lg font-bold text-slate-100">
                    {formatMonthYear(avalancheResult.debtFreeDate)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Total Pago em Juros:</p>
                  <p className="text-base font-bold text-slate-200">
                    {formatCurrency(avalancheResult.totalInterestPaid)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Economia em Juros:</p>
                  <p className="text-base font-extrabold text-emerald-400">
                    {formatCurrency(avalancheResult.interestSavedComparedToMinimum)}
                  </p>
                </div>
              </div>
            </div>

            {/* Snowball */}
            <div className="glass-card p-6 rounded-2xl border border-pink-500/30 bg-gradient-to-br from-slate-900 to-pink-950/20">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center">
                  <PiggyBank className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-100">Estratégia Bola de Neve</h4>
                  <p className="text-xs text-slate-400">Prioriza menores saldos (vitórias rápidas)</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-800 text-xs">
                <div>
                  <p className="text-slate-400">Meses até Quitação:</p>
                  <p className="text-lg font-bold text-pink-300">
                    {snowballResult.monthsToDebtFree} meses
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Livre em:</p>
                  <p className="text-lg font-bold text-slate-100">
                    {formatMonthYear(snowballResult.debtFreeDate)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Total Pago em Juros:</p>
                  <p className="text-base font-bold text-slate-200">
                    {formatCurrency(snowballResult.totalInterestPaid)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Economia em Juros:</p>
                  <p className="text-base font-extrabold text-emerald-400">
                    {formatCurrency(snowballResult.interestSavedComparedToMinimum)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Custom Debts Configurator */}
        <div className="glass-card p-6 rounded-2xl space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              Personalizar Dívidas e Empréstimos Adicionais
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Insira dívidas externas (financiamentos, consignados ou empréstimos pessoais) para simular junto com seus cartões.
            </p>
          </div>

          <form onSubmit={addCustomDebt} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Nome da Dívida
              </label>
              <input
                type="text"
                placeholder="Ex: Empréstimo Caixa"
                value={newDebtName}
                onChange={(e) => setNewDebtName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Saldo Devedor (R$) *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: 5000,00"
                value={newDebtBalance}
                onChange={(e) => setNewDebtBalance(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Taxa de Juros (% a.m.)
              </label>
              <input
                type="text"
                placeholder="2.5"
                value={newDebtRate}
                onChange={(e) => setNewDebtRate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Pagamento Mínimo (R$)
              </label>
              <input
                type="text"
                placeholder="Ex: 250,00"
                value={newDebtMinPay}
                onChange={(e) => setNewDebtMinPay(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                Adicionar Dívida
              </button>
            </div>
          </form>

          {customDebts.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-slate-400 uppercase bg-slate-900/60">
                  <tr>
                    <th className="p-3">Dívida / Empréstimo</th>
                    <th className="p-3">Saldo Devedor</th>
                    <th className="p-3">Taxa (% a.m.)</th>
                    <th className="p-3">Mínimo Mensal</th>
                    <th className="p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {customDebts.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-900/40">
                      <td className="p-3 font-semibold text-slate-200">{d.name}</td>
                      <td className="p-3 font-mono text-slate-100">
                        {formatCurrency(d.currentBalance)}
                      </td>
                      <td className="p-3 text-indigo-400 font-semibold">{d.interestRateMonthly}%</td>
                      <td className="p-3 text-slate-400 font-mono">
                        {formatCurrency(d.minimumPayment)}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => removeDebt(d.id)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
