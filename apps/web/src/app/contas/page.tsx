'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '../../components/layout/header';
import { NewAccountModal } from '../../components/modals/new-account-modal';
import { AccountResponseDto, AccountType } from '@repo/shared';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import {
  Wallet,
  PlusCircle,
  PiggyBank,
  TrendingUp,
  Banknote,
  CheckCircle,
  XCircle,
  RefreshCw,
  UtensilsCrossed,
} from 'lucide-react';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await api.getAccounts();
      setAccounts(res);
    } catch (err) {
      console.error('Error loading accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const totalBalance = accounts
    .filter((a) => a.isActive)
    .reduce((sum, a) => sum + a.currentBalance, 0);

  const getTypeIcon = (type: AccountType) => {
    switch (type) {
      case AccountType.SAVINGS:
        return PiggyBank;
      case AccountType.INVESTMENT:
        return TrendingUp;
      case AccountType.CASH:
        return Banknote;
      case AccountType.BENEFIT_CARD:
        return UtensilsCrossed;
      default:
        return Wallet;
    }
  };

  const getTypeName = (type: AccountType) => {
    switch (type) {
      case AccountType.CHECKING:
        return 'Conta Corrente';
      case AccountType.SAVINGS:
        return 'Poupança / Reserva';
      case AccountType.INVESTMENT:
        return 'Investimentos';
      case AccountType.CASH:
        return 'Dinheiro / Carteira';
      case AccountType.BENEFIT_CARD:
        return 'Cartão de Benefício (VA/VR/Flex)';
      default:
        return type;
    }
  };

  return (
    <div>
      <Header
        title="Contas Bancárias & Carteiras"
        subtitle="Gerenciamento de saldos iniciais, reservas e liquidez"
      />

      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* Top Summary Banner */}
        <div className="glass-card p-6 rounded-2xl flex flex-wrap items-center justify-between gap-4 border border-slate-800">
          <div>
            <p className="text-xs uppercase font-bold text-slate-400 tracking-wider">
              Patrimônio Total Líquido
            </p>
            <h2 className="text-3xl font-extrabold text-slate-100 mt-1">
              {formatCurrency(totalBalance)}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Soma de todas as contas ativas
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-md shadow-emerald-500/20 active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            Nova Conta
          </button>
        </div>

        {/* Account Cards Grid */}
        {loading ? (
          <div className="p-16 flex items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
            <span>Carregando contas...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((acc) => {
              const Icon = getTypeIcon(acc.type);
              return (
                <div
                  key={acc.id}
                  className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-emerald-500/30 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 border ${
                          acc.isActive
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {acc.isActive ? (
                          <>
                            <CheckCircle className="w-3 h-3" /> Ativa
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" /> Inativa
                          </>
                        )}
                      </span>
                    </div>

                    <h3 className="font-bold text-lg text-slate-100">{acc.name}</h3>
                    <p className="text-xs text-slate-400">{getTypeName(acc.type)}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-end justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                        Saldo Atual
                      </p>
                      <p
                        className={`text-xl font-extrabold ${
                          acc.currentBalance < 0
                            ? 'text-rose-400'
                            : 'text-slate-100'
                        }`}
                      >
                        {formatCurrency(acc.currentBalance)}
                      </p>
                      {acc.currentBalance < 0 && (
                        <span className="text-[10px] text-rose-400 font-semibold">
                          ⚠️ Saldo Devedor
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 font-semibold">Saldo Inicial</p>
                      <p className="text-xs font-mono text-slate-300 font-medium">
                        {formatCurrency(acc.initialBalance)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <NewAccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadAccounts}
      />
    </div>
  );
}
