'use client';

import React, { useState, useEffect } from 'react';
import { X, CreditCard } from 'lucide-react';
import { AccountResponseDto } from '@repo/shared';
import { api } from '../../lib/api';

interface NewCreditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewCreditCardModal({ isOpen, onClose, onSuccess }: NewCreditCardModalProps) {
  const [name, setName] = useState('');
  const [lastFourDigits, setLastFourDigits] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [closingDay, setClosingDay] = useState(25);
  const [dueDay, setDueDay] = useState(5);
  const [interestRate, setInterestRate] = useState('2.5');
  const [defaultAccountId, setDefaultAccountId] = useState('');

  const [accounts, setAccounts] = useState<AccountResponseDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getAccounts().then((accs) => {
        setAccounts(accs.filter((a) => a.isActive));
        if (accs.length > 0 && !defaultAccountId) setDefaultAccountId(accs[0].id);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const numLimit = parseFloat(creditLimit.replace(',', '.'));
      if (isNaN(numLimit) || numLimit <= 0) {
        throw new Error('Informe um limite de crédito válido');
      }

      await api.createCreditCard({
        name,
        lastFourDigits: lastFourDigits || undefined,
        creditLimit: numLimit,
        closingDay: Number(closingDay),
        dueDay: Number(dueDay),
        interestRate: parseFloat(interestRate.replace(',', '.')) || 0,
        defaultAccountId: defaultAccountId || undefined,
      });

      setName('');
      setCreditLimit('');
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
            <CreditCard className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-lg text-slate-100">Novo Cartão de Crédito</h3>
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
              Nome do Cartão *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Nubank Mastercard, C6 Carbon"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Limite Total (R$) *
              </label>
              <input
                type="text"
                required
                placeholder="5000,00"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Últimos 4 Dígitos
              </label>
              <input
                type="text"
                maxLength={4}
                placeholder="1234"
                value={lastFourDigits}
                onChange={(e) => setLastFourDigits(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Dia de Fechamento *
              </label>
              <input
                type="number"
                min={1}
                max={31}
                required
                value={closingDay}
                onChange={(e) => setClosingDay(parseInt(e.target.value, 10))}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Dia de Vencimento *
              </label>
              <input
                type="number"
                min={1}
                max={31}
                required
                value={dueDay}
                onChange={(e) => setDueDay(parseInt(e.target.value, 10))}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Taxa Rotativo (% a.m.)
              </label>
              <input
                type="text"
                placeholder="2.5"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Conta Padrão de Débito
              </label>
              <select
                value={defaultAccountId}
                onChange={(e) => setDefaultAccountId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="">(Nenhuma)</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
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
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-md shadow-indigo-600/20 active:scale-95"
            >
              {loading ? 'Salvando...' : 'Salvar Cartão'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
