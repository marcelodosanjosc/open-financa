'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '../../components/layout/header';
import { NewCreditCardModal } from '../../components/modals/new-credit-card-modal';
import { NewInstallmentModal } from '../../components/modals/new-installment-modal';
import { PayInvoiceModal } from '../../components/modals/pay-invoice-modal';
import { CreditCardResponseDto, InvoiceResponseDto, InvoiceStatus } from '@repo/shared';
import { api } from '../../lib/api';
import { formatCurrency, formatDate, formatMonthYear } from '../../lib/utils';
import {
  CreditCard,
  PlusCircle,
  Calendar,
  Layers,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export default function CreditCardsPage() {
  const [cards, setCards] = useState<CreditCardResponseDto[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [invoices, setInvoices] = useState<InvoiceResponseDto[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceResponseDto | null>(null);

  const [loading, setLoading] = useState(true);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isInstModalOpen, setIsInstModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);

  const loadCards = async () => {
    setLoading(true);
    try {
      const res = await api.getCreditCards();
      setCards(res);
      if (res.length > 0) {
        const targetId = selectedCardId && res.some((c) => c.id === selectedCardId) ? selectedCardId : res[0].id;
        setSelectedCardId(targetId);
        loadInvoices(targetId);
      }
    } catch (err) {
      console.error('Error loading credit cards:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadInvoices = async (cardId: string) => {
    try {
      const invs = await api.getCardInvoices(cardId);
      setInvoices(invs);
    } catch (err) {
      console.error('Error loading invoices:', err);
    }
  };

  useEffect(() => {
    loadCards();
  }, []);

  const handleCardChange = (cardId: string) => {
    setSelectedCardId(cardId);
    loadInvoices(cardId);
  };

  const activeCard = cards.find((c) => c.id === selectedCardId);

  return (
    <div>
      <Header
        title="Cartões de Crédito & Faturas"
        subtitle="Gerenciamento de limites, compras parceladas e liquidação de faturas"
        onOpenNewInstallment={() => setIsInstModalOpen(true)}
      />

      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* Action Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {cards.map((c) => (
              <button
                key={c.id}
                onClick={() => handleCardChange(c.id)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                  selectedCardId === c.id
                    ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50 shadow-md shadow-indigo-500/10'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {c.name} {c.lastFourDigits ? `(•• ${c.lastFourDigits})` : ''}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCardModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-800"
            >
              <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
              Novo Cartão
            </button>
          </div>
        </div>

        {/* Selected Card Overview */}
        {activeCard && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-950">
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs uppercase font-bold text-indigo-400 tracking-wider">
                  Fatura Atual em Aberto
                </span>
                <CreditCard className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-3xl font-extrabold text-slate-100">
                {formatCurrency(activeCard.currentInvoiceAmount)}
              </h3>
              <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 flex justify-between">
                <span>Fecha dia: <b className="text-slate-200">{activeCard.closingDay}</b></span>
                <span>Vence dia: <b className="text-slate-200">{activeCard.dueDay}</b></span>
              </div>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-slate-800">
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                Limite Disponível
              </span>
              <h3 className="text-3xl font-extrabold text-emerald-400 mt-2">
                {formatCurrency(activeCard.availableLimit)}
              </h3>
              <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 flex justify-between">
                <span>Limite Total:</span>
                <span className="font-semibold text-slate-200">
                  {formatCurrency(activeCard.creditLimit)}
                </span>
              </div>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-slate-800">
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                Taxa do Rotativo & Conta Padrão
              </span>
              <h3 className="text-2xl font-bold text-slate-100 mt-2">
                {activeCard.interestRate}% <span className="text-xs text-slate-400 font-normal">ao mês</span>
              </h3>
              <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400">
                Conta de débito: <span className="text-slate-200 font-semibold">{activeCard.defaultAccountName || 'Não vinculada'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Invoices List */}
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-100">Faturas do Cartão</h3>

          {invoices.length > 0 ? (
            <div className="space-y-4">
              {invoices.map((inv) => {
                const isPaid = inv.status === InvoiceStatus.PAID;
                const isClosed = inv.status === InvoiceStatus.CLOSED;
                const isOpen = inv.status === InvoiceStatus.OPEN;

                return (
                  <div
                    key={inv.id}
                    className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h4 className="font-bold text-base text-slate-100">
                            {formatMonthYear(`${inv.referenceYear}-${String(inv.referenceMonth).padStart(2, '0')}`)}
                          </h4>
                          <span
                            className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
                              isPaid
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : isClosed
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                            }`}
                          >
                            {isPaid ? 'PAGA' : isClosed ? 'FECHADA' : 'ABERTA'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Fechamento: {formatDate(inv.closingDate)} • Vencimento:{' '}
                          {formatDate(inv.dueDate)}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-[10px] text-slate-500 uppercase font-semibold">
                            Total da Fatura
                          </p>
                          <p className="text-xl font-extrabold text-slate-100">
                            {formatCurrency(inv.totalAmount)}
                          </p>
                        </div>

                        {!isPaid && (
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setIsPayModalOpen(true);
                            }}
                            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-95"
                          >
                            Pagar Fatura
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expenses under this invoice */}
                    {inv.expenses && inv.expenses.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-bold uppercase text-slate-300 tracking-wider">
                          Lançamentos nesta fatura:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {inv.expenses.map((exp) => (
                            <div
                              key={exp.id}
                              className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
                            >
                              <div>
                                <p className="font-semibold text-slate-100">{exp.description}</p>
                                <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                                  <span className="font-mono text-slate-400">{formatDate(exp.transactionDate)}</span>
                                  {exp.categoryName ? ` • ${exp.categoryName}` : ''}
                                </p>
                              </div>
                              <span className="font-bold text-slate-100 font-mono">
                                {formatCurrency(exp.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        Nenhum lançamento registrado nesta fatura ainda.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-card p-10 rounded-2xl text-center text-slate-500 text-sm">
              Nenhuma fatura gerada para este cartão ainda.
            </div>
          )}
        </div>
      </div>

      <NewCreditCardModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        onSuccess={loadCards}
      />
      <NewInstallmentModal
        isOpen={isInstModalOpen}
        onClose={() => setIsInstModalOpen(false)}
        onSuccess={loadCards}
      />
      <PayInvoiceModal
        invoice={selectedInvoice}
        isOpen={isPayModalOpen}
        onClose={() => {
          setIsPayModalOpen(false);
          setSelectedInvoice(null);
        }}
        onSuccess={loadCards}
      />
    </div>
  );
}
