'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '../../components/layout/header';
import { NewTransactionModal } from '../../components/modals/new-transaction-modal';
import { NewInstallmentModal } from '../../components/modals/new-installment-modal';
import {
  TransactionResponseDto,
  AccountResponseDto,
  CategoryResponseDto,
  TransactionType,
} from '@repo/shared';
import { api } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import {
  Search,
  Filter,
  CheckCircle,
  Circle,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  RefreshCw,
  CreditCard,
} from 'lucide-react';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionResponseDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [accounts, setAccounts] = useState<AccountResponseDto[]>([]);
  const [categories, setCategories] = useState<CategoryResponseDto[]>([]);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isInstModalOpen, setIsInstModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [txRes, accRes, catRes] = await Promise.all([
        api.getTransactions({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          accountId: selectedAccountId || undefined,
          categoryId: selectedCategoryId || undefined,
          type: selectedType ? (selectedType as TransactionType) : undefined,
          limit: 100,
        }),
        api.getAccounts(),
        api.getCategories(true),
      ]);
      setTransactions(txRes.data);
      setTotal(txRes.total);
      setAccounts(accRes);
      setCategories(catRes);
    } catch (err) {
      console.error('Error loading transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate, selectedAccountId, selectedCategoryId, selectedType]);

  const handleToggleReconcile = async (id: string, current: boolean) => {
    try {
      await api.toggleReconcile(id, !current);
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isReconciled: !current } : t)),
      );
    } catch (err) {
      console.error('Error toggling reconciliation:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta transação?')) return;
    try {
      await api.deleteTransaction(id);
      loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div>
      <Header
        title="Extrato de Transações"
        subtitle="Livro-razão financeiro unificado com conciliação bancária"
        onOpenNewTransaction={() => setIsTxModalOpen(true)}
        onOpenNewInstallment={() => setIsInstModalOpen(true)}
      />

      <div className="p-8 space-y-6 max-w-7xl mx-auto">
        {/* Filters Bar */}
        <div className="glass-card p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Account filter */}
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
            >
              <option value="">Todas as Contas</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            {/* Category filter */}
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
            >
              <option value="">Todas as Categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parentId ? `↳ ${c.name}` : `📂 ${c.name}`}
                </option>
              ))}
            </select>

            {/* Type filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
            >
              <option value="">Todos os Tipos</option>
              <option value={TransactionType.INCOME}>Receitas</option>
              <option value={TransactionType.EXPENSE}>Despesas</option>
              <option value={TransactionType.TRANSFER}>Transferências</option>
              <option value={TransactionType.INVOICE_PAYMENT}>Pagamento de Fatura</option>
            </select>

            {/* Date range filters */}
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
            />
            <span className="text-slate-500 text-xs">até</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
            />

            {(selectedAccountId || selectedCategoryId || selectedType || startDate || endDate) && (
              <button
                onClick={() => {
                  setSelectedAccountId('');
                  setSelectedCategoryId('');
                  setSelectedType('');
                  setStartDate('');
                  setEndDate('');
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all"
              >
                Limpar Filtros
              </button>
            )}
          </div>

          <div className="text-xs text-slate-400 font-semibold">
            {total} transações encontradas
          </div>
        </div>

        {/* Transactions Table */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-400 uppercase bg-slate-900/80">
                <tr>
                  <th className="p-4 w-12 text-center">Concil.</th>
                  <th className="p-4">Data</th>
                  <th className="p-4">Descrição</th>
                  <th className="p-4">Conta</th>
                  <th className="p-4">Categoria</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4 text-right">Valor</th>
                  <th className="p-4 w-12 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-400" />
                    </td>
                  </tr>
                ) : transactions.length > 0 ? (
                  transactions.map((tx) => {
                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-slate-900/40 transition-colors group"
                      >
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleToggleReconcile(tx.id, tx.isReconciled)}
                            title={
                              tx.isReconciled
                                ? 'Conciliado (clique para desmarcar)'
                                : 'Pendente (clique para conciliar)'
                            }
                            className="text-slate-500 hover:text-emerald-400 transition-colors"
                          >
                            {tx.isReconciled ? (
                              <CheckCircle className="w-5 h-5 text-emerald-400" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-600" />
                            )}
                          </button>
                        </td>
                        <td className="p-4 font-mono text-xs text-slate-300">
                          {formatDate(tx.date)}
                        </td>
                        <td className="p-4 font-medium text-slate-100">
                          <div>{tx.description}</div>
                          {tx.externalId && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              id: {tx.externalId.slice(0, 16)}...
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-xs text-slate-300">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">
                            {tx.accountName}
                            {tx.destinationAccountName ? ` → ${tx.destinationAccountName}` : ''}
                          </span>
                        </td>
                        <td className="p-4 text-xs">
                          {tx.categoryName ? (
                            <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                              {tx.categoryName}
                            </span>
                          ) : (
                            <span className="text-slate-500 italic">(Sem categoria)</span>
                          )}
                        </td>
                        <td className="p-4 text-xs">
                          {tx.type === TransactionType.INCOME && (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 w-fit">
                              <ArrowUpRight className="w-3 h-3" /> Receita
                            </span>
                          )}
                          {tx.type === TransactionType.EXPENSE && (
                            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 w-fit">
                              <ArrowDownRight className="w-3 h-3" /> Despesa
                            </span>
                          )}
                          {tx.type === TransactionType.TRANSFER && (
                            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 w-fit">
                              <ArrowLeftRight className="w-3 h-3" /> Transferência
                            </span>
                          )}
                          {tx.type === TransactionType.INVOICE_PAYMENT && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 w-fit">
                              <CreditCard className="w-3 h-3" /> Fatura
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right font-bold">
                          <span
                            className={
                              tx.type === TransactionType.INCOME
                                ? 'text-emerald-400'
                                : 'text-slate-100'
                            }
                          >
                            {tx.type === TransactionType.INCOME ? '+' : '-'} {formatCurrency(tx.amount)}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all"
                            title="Excluir transação"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-slate-500 text-sm">
                      Nenhuma transação encontrada com os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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
