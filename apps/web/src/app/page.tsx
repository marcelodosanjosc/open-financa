'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '../components/layout/header';
import { KpiCard } from '../components/dashboard/kpi-card';
import { CostBreakdownChart } from '../components/dashboard/cost-breakdown-chart';
import { BudgetProgressList } from '../components/dashboard/budget-progress-list';
import { FutureInvoicesChart } from '../components/dashboard/future-invoices-chart';
import { DebtPayoffCalculator } from '../components/debt-payoff/debt-payoff-calculator';
import { NewTransactionModal } from '../components/modals/new-transaction-modal';
import { NewInstallmentModal } from '../components/modals/new-installment-modal';
import {
  DashboardSummaryDto,
  FutureTimelineResponseDto,
  BudgetResponseDto,
} from '@repo/shared';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  TrendingUp,
  History,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [timeline, setTimeline] = useState<FutureTimelineResponseDto | null>(null);
  const [budgets, setBudgets] = useState<BudgetResponseDto[]>([]);
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isInstModalOpen, setIsInstModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, timeRes, budRes, recRes] = await Promise.all([
        api.getDashboardSummary(),
        api.getDebtTimeline(),
        api.getBudgets(),
        api.getRecentTransactions(),
      ]);
      setSummary(sumRes);
      setTimeline(timeRes);
      setBudgets(budRes);
      setRecentTx(recRes);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div>
      <Header
        title="Dashboard Geral"
        subtitle="Visão consolidada de patrimônio, fluxo de caixa e compromissos futuros"
        onOpenNewTransaction={() => setIsTxModalOpen(true)}
        onOpenNewInstallment={() => setIsInstModalOpen(true)}
      />

      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {loading && !summary ? (
          <div className="p-16 flex items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
            <span>Carregando dados financeiros...</span>
          </div>
        ) : (
          <>
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <KpiCard
                title="Saldo Total em Contas"
                amount={summary?.totalBalance || 0}
                subtitle="Contas bancárias e reservas ativas"
                icon={Wallet}
                variant="emerald"
              />
              <KpiCard
                title="Receitas do Mês"
                amount={summary?.monthIncome || 0}
                subtitle="Entradas liquidadas no período"
                icon={ArrowUpRight}
                variant="cyan"
              />
              <KpiCard
                title="Despesas do Mês"
                amount={summary?.monthExpense || 0}
                subtitle="Gastos diretos em conta"
                icon={ArrowDownRight}
                variant="rose"
              />
              <KpiCard
                title="Faturas de Cartão Abertas"
                amount={summary?.monthInvoicesOpen || 0}
                subtitle="Comprometido nas faturas do ciclo"
                icon={CreditCard}
                variant="amber"
              />
            </div>

            {/* Projected Net Cashflow Highlight Banner */}
            {summary && (
              <div
                className={`glass-card p-6 rounded-2xl border flex flex-wrap items-center justify-between gap-4 ${
                  summary.projectedNetCashflow < 0
                    ? 'border-rose-500/40 bg-gradient-to-r from-rose-950/30 via-slate-900/80 to-slate-900/60'
                    : 'border-emerald-500/40 bg-gradient-to-r from-emerald-950/30 via-slate-900/80 to-indigo-950/30'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold shadow-lg ${
                      summary.projectedNetCashflow < 0
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-rose-500/10'
                        : 'gradient-emerald text-slate-950 shadow-emerald-500/20'
                    }`}
                  >
                    {summary.projectedNetCashflow < 0 ? (
                      <ArrowDownRight className="w-6 h-6" />
                    ) : (
                      <TrendingUp className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <p
                      className={`text-xs uppercase font-bold tracking-wider ${
                        summary.projectedNetCashflow < 0
                          ? 'text-rose-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      Saldo Líquido Projetado do Mês
                    </p>
                    <h3
                      className={`text-2xl font-extrabold ${
                        summary.projectedNetCashflow < 0
                          ? 'text-rose-400'
                          : 'text-slate-100'
                      }`}
                    >
                      {formatCurrency(summary.projectedNetCashflow)}
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Receitas - (Despesas Diretas + Faturas de Cartão)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200">
                    Taxa de Poupança:{' '}
                    <span
                      className={`font-bold ${
                        summary.projectedNetCashflow > 0
                          ? 'text-emerald-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {summary.monthIncome > 0
                        ? `${Math.max(0, Math.round((summary.projectedNetCashflow / summary.monthIncome) * 100))}%`
                        : '0%'}
                    </span>
                  </span>
                </div>
              </div>
            )}

            {/* Charts Row: Cost Classification + Budget Tracking */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                {summary && <CostBreakdownChart data={summary.costBreakdown} />}
              </div>
              <div>
                <BudgetProgressList budgets={budgets} />
              </div>
            </div>

            {/* Future Invoices Timeline Chart */}
            {timeline && <FutureInvoicesChart timeline={timeline} />}

            {/* Interactive Debt Payoff Simulation Widget */}
            <DebtPayoffCalculator />

            {/* Recent Transactions Preview Ledger */}
            <div className="glass-card p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center border border-slate-700">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100">Últimos Lançamentos</h3>
                    <p className="text-xs text-slate-400">Atividades financeiras mais recentes</p>
                  </div>
                </div>

                <Link
                  href="/transacoes"
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  Ver Todas as Transações →
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-900/60">
                    <tr>
                      <th className="p-3">Data</th>
                      <th className="p-3">Descrição</th>
                      <th className="p-3">Conta</th>
                      <th className="p-3">Categoria</th>
                      <th className="p-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {recentTx.length > 0 ? (
                      recentTx.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="p-3 font-mono text-xs text-slate-400">
                            {formatDate(tx.date)}
                          </td>
                          <td className="p-3 font-medium text-slate-200">{tx.description}</td>
                          <td className="p-3 text-xs text-slate-300">
                            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                              {tx.accountName || 'Conta'}
                            </span>
                          </td>
                          <td className="p-3 text-xs">
                            <span className="text-slate-300">
                              {tx.categoryName || '(Sem categoria)'}
                            </span>
                          </td>
                          <td className="p-3 text-right font-semibold">
                            <span
                              className={
                                tx.type === 'INCOME' ? 'text-emerald-400' : 'text-slate-100'
                              }
                            >
                              {tx.type === 'INCOME' ? '+' : '-'} {formatCurrency(tx.amount)}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-500 text-sm">
                          Nenhuma transação registrada. Clique em "Nova Transação" ou "Importar Extrato".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <NewTransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        onSuccess={loadData}
      />
      <NewInstallmentModal
        isOpen={isInstModalOpen}
        onClose={() => setIsInstModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
}
