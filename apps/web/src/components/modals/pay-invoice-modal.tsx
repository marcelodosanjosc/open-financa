'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Wallet } from 'lucide-react';
import { InvoiceResponseDto, AccountResponseDto } from '@repo/shared';
import { api } from '../../lib/api';
import { formatCurrency, formatMonthYear } from '../../lib/utils';

interface PayInvoiceModalProps {
  invoice: InvoiceResponseDto | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PayInvoiceModal({
  invoice,
  isOpen,
  onClose,
  onSuccess,
}: PayInvoiceModalProps) {
  const [accountId, setAccountId] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [accounts, setAccounts] = useState<AccountResponseDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getAccounts().then((accs) => {
        setAccounts(accs.filter((a) => a.isActive));
        if (accs.length > 0 && !accountId) setAccountId(accs[0].id);
      });
    }
  }, [isOpen]);

  if (!isOpen || !invoice) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.payInvoice(invoice.id, {
        accountId,
        paymentDate,
      });
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
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-lg text-slate-100">Pagar Fatura</h3>
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

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 mb-5 space-y-1">
          <p className="text-xs text-slate-400">
            Fatura: <span className="font-semibold text-slate-200">{invoice.creditCardName}</span>
          </p>
          <p className="text-xs text-slate-400">
            Referência:{' '}
            <span className="font-semibold text-slate-200">
              {formatMonthYear(`${invoice.referenceYear}-${String(invoice.referenceMonth).padStart(2, '0')}`)}
            </span>
          </p>
          <div className="pt-2 flex justify-between items-center">
            <span className="text-xs font-semibold uppercase text-slate-400">Valor Total:</span>
            <span className="text-lg font-extrabold text-emerald-400">
              {formatCurrency(invoice.totalAmount)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Debitar da Conta *
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} (Saldo: {formatCurrency(a.currentBalance)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Data do Pagamento *
            </label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
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
              {loading ? 'Processando...' : 'Confirmar Pagamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
