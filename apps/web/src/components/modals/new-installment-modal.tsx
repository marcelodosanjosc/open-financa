'use client';

import React, { useState, useEffect } from 'react';
import { X, CreditCard, Layers } from 'lucide-react';
import {
  CreditCardResponseDto,
  CategoryResponseDto,
  FinancialMathUtils,
} from '@repo/shared';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';

interface NewInstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewInstallmentModal({ isOpen, onClose, onSuccess }: NewInstallmentModalProps) {
  const [creditCardId, setCreditCardId] = useState('');
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [totalInstallments, setTotalInstallments] = useState(1);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState('');

  const [creditCards, setCreditCards] = useState<CreditCardResponseDto[]>([]);
  const [categories, setCategories] = useState<CategoryResponseDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getCreditCards().then((cards) => {
        setCreditCards(cards);
        if (cards.length > 0 && !creditCardId) setCreditCardId(cards[0].id);
      });
      api.getCategories(true).then((cats) => {
        setCategories(cats);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const numAmount = parseFloat(totalAmount.replace(',', '.')) || 0;
  const installmentsPreview =
    numAmount > 0 && totalInstallments > 0
      ? FinancialMathUtils.splitAmount(numAmount, totalInstallments)
      : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (numAmount <= 0) {
        throw new Error('Informe um valor válido maior que zero');
      }

      await api.createInstallmentPurchase({
        creditCardId,
        description,
        totalAmount: numAmount,
        totalInstallments,
        purchaseDate,
        categoryId: categoryId || undefined,
      });

      setDescription('');
      setTotalAmount('');
      setTotalInstallments(1);
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
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-lg text-slate-100">Lançar Compra no Cartão</h3>
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
          {/* Credit Card Selection */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Cartão de Crédito *
            </label>
            <select
              value={creditCardId}
              onChange={(e) => setCreditCardId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
            >
              {creditCards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (Fecha dia {c.closingDay} / Vence dia {c.dueDay})
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Descrição da Compra *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Notebook Dell 16GB"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Total Amount & Installments */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Valor Total (R$) *
              </label>
              <input
                type="text"
                required
                placeholder="0,00"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Número de Parcelas *
              </label>
              <select
                value={totalInstallments}
                onChange={(e) => setTotalInstallments(parseInt(e.target.value, 10))}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
              >
                {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}x {n === 1 ? '(À vista)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Data da Compra *
              </label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Categoria
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="">(Sem categoria)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cent Split Calculation Preview */}
          {totalInstallments > 1 && installmentsPreview.length > 0 && (
            <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-indigo-300 mb-1.5">
                <Layers className="w-3.5 h-3.5" />
                Divisão Exata de Parcelas (com ajuste de centavos):
              </div>
              <p className="text-slate-300">
                1ª parcela de <span className="font-bold text-slate-100">{formatCurrency(installmentsPreview[0])}</span> +{' '}
                {totalInstallments - 1}x de{' '}
                <span className="font-bold text-slate-100">{formatCurrency(installmentsPreview[1])}</span>
              </p>
            </div>
          )}

          {/* Action buttons */}
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
              {loading ? 'Lançando...' : 'Confirmar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
