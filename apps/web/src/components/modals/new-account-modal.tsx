'use client';

import React, { useState } from 'react';
import { X, Wallet } from 'lucide-react';
import { AccountType } from '@repo/shared';
import { api } from '../../lib/api';

interface NewAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewAccountModal({ isOpen, onClose, onSuccess }: NewAccountModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>(AccountType.CHECKING);
  const [initialBalance, setInitialBalance] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const numBalance = parseFloat(initialBalance.replace(',', '.')) || 0;
      await api.createAccount({
        name,
        type,
        initialBalance: numBalance,
      });

      setName('');
      setInitialBalance('');
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
      <div className="glass-card w-full max-w-md rounded-2xl p-6 border border-slate-700/80 shadow-2xl relative animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-5">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-lg text-slate-100">Nova Conta Bancária</h3>
          </div>
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
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Nome da Conta *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Nubank, Itaú, Carteira"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Tipo de Conta *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AccountType)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value={AccountType.CHECKING}>Conta Corrente</option>
              <option value={AccountType.SAVINGS}>Poupança / Reserva</option>
              <option value={AccountType.INVESTMENT}>Investimentos</option>
              <option value={AccountType.CASH}>Dinheiro / Carteira</option>
              <option value={AccountType.BENEFIT_CARD}>Cartão de Benefício (VA / VR / Flexível)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Saldo Inicial (R$)
            </label>
            <input
              type="text"
              placeholder="0,00"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

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
              {loading ? 'Salvando...' : 'Salvar Conta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
