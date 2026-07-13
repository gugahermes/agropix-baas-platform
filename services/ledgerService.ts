
import { LedgerEntry, TransactionType, TransactionSource, BaaSAccount, Currency, TransferRequest, AccountStatus, AccountType, TransactionStatus } from '../types';
import { INITIAL_LEDGER, MOCK_ACCOUNTS, MOCK_TENANTS } from './mockData';
import { UnitConversionService } from './unitConversionService';

// Simulated Persistent Storage
let ledgerDatabase: LedgerEntry[] = [...INITIAL_LEDGER];
let accountDatabase: BaaSAccount[] = [...MOCK_ACCOUNTS];

export const baasEngine = {
  
  getAccounts: (): BaaSAccount[] => [...accountDatabase],

  getAccountById: (accountId: string): BaaSAccount | undefined => accountDatabase.find(a => a.id === accountId),

  createAccount: (ownerId: string, type: AccountType, alias?: string): BaaSAccount => {
    const newAccount: BaaSAccount = {
      id: `acc_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      ownerId,
      type,
      status: AccountStatus.ACTIVE,
      alias: alias || `Conta ${type}`,
      createdAt: new Date().toISOString(),
      limits: { dailyLimit: 10000, transactionLimit: 5000 }
    };
    accountDatabase.push(newAccount);
    return newAccount;
  },

  getEntries: (accountId: string): LedgerEntry[] => {
    return ledgerDatabase
      .filter(entry => entry.accountId === accountId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  getAllEntries: (): LedgerEntry[] => {
    return [...ledgerDatabase].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  getBalance: (accountId: string, currency: Currency | string): number => {
    const curr = currency as Currency; 
    const entries = ledgerDatabase.filter(e => 
      e.accountId === accountId && 
      e.currency === curr &&
      (e.status === TransactionStatus.SETTLED || e.status === TransactionStatus.CREATED || !e.status)
    );
    
    return entries.reduce((acc, entry) => {
      if (entry.direction === TransactionType.CREDIT) {
        return acc + entry.amount;
      } else {
        return acc - entry.amount;
      }
    }, 0);
  },

  _writeEntry: (entry: Omit<LedgerEntry, 'id' | 'timestamp'>): LedgerEntry => {
    // Audit kg_before/after for Grain events
    let metadata = { ...entry.metadata };
    if (entry.currency === Currency.GRAIN_KG) {
      const currentBal = baasEngine.getBalance(entry.accountId, Currency.GRAIN_KG);
      metadata.kg_before = currentBal;
      metadata.kg_after = entry.direction === TransactionType.CREDIT ? currentBal + entry.amount : currentBal - entry.amount;
      metadata.visual_conversion = UnitConversionService.formatSacas(entry.amount);
    }

    const newEntry: LedgerEntry = {
      ...entry,
      metadata,
      id: `led_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      status: entry.status || TransactionStatus.SETTLED 
    };
    ledgerDatabase.push(newEntry);
    return newEntry;
  },

  acceptDigitization: (eventId: string) => {
    const entry = ledgerDatabase.find(e => e.eventId === eventId);
    if (!entry) throw new Error("Evento não encontrado.");
    entry.status = TransactionStatus.SETTLED;
    return true;
  },

  payWithGrain: (fromAccountId: string, amountKg: number, description: string) => {
    const balance = baasEngine.getBalance(fromAccountId, Currency.GRAIN_KG);
    if (balance < amountKg) throw new Error(`Saldo insuficiente. Disponível: ${balance}kg`);

    const eventId = `evt_pay_grain_${Date.now()}`;
    baasEngine._writeEntry({
      eventId,
      accountId: fromAccountId,
      amount: amountKg,
      currency: Currency.GRAIN_KG,
      direction: TransactionType.DEBIT,
      source: TransactionSource.GRAIN_PAYMENT,
      description: description,
      metadata: { justification: 'Pagamento via Débito de Custódia' }
    });

    return true;
  },

  processSplitTransaction: (siloMasterId: string, producerSubId: string, merchantId: string, amountTotal: number, feeAmount: number, description: string, siloTenantId: string) => {
    const netAmount = amountTotal - feeAmount;
    const eventId = `evt_split_${Date.now()}`;
    const clearingId = 'acc_agropix_clearing'; 
    const tenant = MOCK_TENANTS.find(t => t.id === siloTenantId);
    
    let platformFee = feeAmount;
    let siloFee = 0;
    if (tenant?.liquidityConfig.providesLiquidity && tenant.liquidityConfig.siloFeeSharePct > 0) {
        siloFee = feeAmount * (tenant.liquidityConfig.siloFeeSharePct / 100);
        platformFee = feeAmount - siloFee;
    }

    baasEngine._writeEntry({ eventId, accountId: siloMasterId, amount: amountTotal, currency: Currency.BRL, direction: TransactionType.DEBIT, source: TransactionSource.PIX_OUT, description: `Funding PIX: ${description}` });
    baasEngine._writeEntry({ eventId, accountId: producerSubId, amount: amountTotal, currency: Currency.BRL, direction: TransactionType.DEBIT, source: TransactionSource.PIX_OUT, description: description });
    baasEngine._writeEntry({ eventId, accountId: merchantId, amount: netAmount, currency: Currency.BRL, direction: TransactionType.CREDIT, source: TransactionSource.PIX_IN, description: `Recebimento PIX` });
    if (platformFee > 0) baasEngine._writeEntry({ eventId, accountId: clearingId, amount: platformFee, currency: Currency.BRL, direction: TransactionType.CREDIT, source: TransactionSource.FEE_PLATFORM_SHARE, description: `Comissão AgroPix` });
    if (siloFee > 0 && tenant?.liquidityConfig.revenueAccountId) baasEngine._writeEntry({ eventId, accountId: tenant.liquidityConfig.revenueAccountId, amount: siloFee, currency: Currency.BRL, direction: TransactionType.CREDIT, source: TransactionSource.FEE_SILO_SHARE, description: `Comissão Silo` });

    return { eventId, status: 'SETTLED' };
  }
};

export const ledgerService = baasEngine;
