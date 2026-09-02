'use client';

import React, { useState, useEffect } from 'react';
import { X, ArrowDownRight, ArrowUpRight, ArrowLeftRight } from 'lucide-react';
import {
  TransactionType,
  AccountResponseDto,
  CategoryResponseDto,
} from '@repo/shared';
import { api } from '../../lib/api';

interface NewTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewTransactionModal({ isOpen, onClose, onSuccess }: NewTransactionModalProps) {
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const [accounts, setAccounts] = useState<AccountResponseDto[]>([]);
  const [categories, setCategories] = useState<CategoryResponseDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getAccounts().then((accs) => {
        setAccounts(accs);
        if (accs.length > 0 && !accountId) setAccountId(accs[0].id);
        if (accs.length > 1 && !destinationAccountId) setDestinationAccountId(accs[1].id);
      });
      api.getCategories(true).then((cats) => {
        setCategories(cats);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const numAmount = parseFloat(amount.replace(',', '.'));
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('Informe um valor válido maior que zero');
      }

      await api.createTransaction({
        type,
        description,
        amount: numAmount,
        date,
        accountId,
        destinationAccountId: type === TransactionType.TRANSFER ? destinationAccountId : undefined,
        categoryId: type !== TransactionType.TRANSFER && categoryId ? categoryId : undefined,
      });

      setDescription('');
      setAmount('');
      onSuccess();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="glass-card w-full max-w-lg rounded-2xl p-6 border border-slate-700/80 shadow-2xl relative animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-5">
          <h3 className="font-bold text-lg text-slate-100">Nova Transação</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Selector */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setType(TransactionType.EXPENSE)}
              className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                type === TransactionType.EXPENSE
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              Despesa
            </button>
            <button
              type="button"
              onClick={() => setType(TransactionType.INCOME)}
              className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                type === TransactionType.INCOME
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Receita
            </button>
            <button
              type="button"
              onClick={() => setType(TransactionType.TRANSFER)}
              className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                type === TransactionType.TRANSFER
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Transferência
            </button>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Valor (R$) *
              </label>
              <input
                type="text"
                required
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Data da Transação *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Descrição *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Supermercado Pão de Açúcar"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Account */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              {type === TransactionType.TRANSFER ? 'Conta de Origem *' : 'Conta Bancária *'}
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Destination Account (if Transfer) */}
          {type === TransactionType.TRANSFER && (
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Conta de Destino *
              </label>
              <select
                value={destinationAccountId}
                onChange={(e) => setDestinationAccountId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
              >
                {accounts
                  .filter((a) => a.id !== accountId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Category (if not transfer) */}
          {type !== TransactionType.TRANSFER && (
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Categoria (Opcional)
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="">(Sem categoria)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-sm font-medium border border-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-md shadow-emerald-500/20 active:scale-95"
            >
              {loading ? 'Salvando...' : 'Salvar Transação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
