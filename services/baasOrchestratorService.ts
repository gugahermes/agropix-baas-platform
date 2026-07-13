
import { AgroFinanceLink, BaaSAccount, Currency, TransactionStatus, LedgerEntry, TransactionType, TransactionSource } from '../types';
import { MOCK_LINKS, MOCK_ACCOUNTS, MOCK_TENANTS } from './mockData';
import { ledgerService } from './ledgerService';
import { UnitConversionService } from './unitConversionService';
import { quotationService } from './quotationService';

let linksDb: AgroFinanceLink[] = [...MOCK_LINKS];

export const baasOrchestratorService = {
  
  getAllLinks: (): AgroFinanceLink[] => [...linksDb],

  getLinksByTenant: (tenantId: string): AgroFinanceLink[] => 
    linksDb.filter(l => l.tenantId === tenantId),

  getOrchestratorStats: () => {
    const totalCvus = MOCK_ACCOUNTS.filter(a => a.type === 'CVU_PRODUCER_SUB').length;
    const activeLinks = linksDb.filter(l => l.status === 'ACTIVE').length;
    const totalDailyExposure = linksDb.reduce((acc, l) => acc + l.dailyLimitBrl, 0);
    const usedToday = linksDb.reduce((acc, l) => acc + l.usedTodayBrl, 0);
    return { totalCvus, activeLinks, totalDailyExposure, usedToday };
  },

  validateTransaction: (linkId: string, amountBrl: number): { allowed: boolean; reason?: string } => {
    const link = linksDb.find(l => l.id === linkId);
    if (!link) return { allowed: false, reason: "Link not found" };
    if (link.status !== 'ACTIVE') return { allowed: false, reason: "Link Suspended" };

    const tenant = MOCK_TENANTS.find(t => t.id === link.tenantId);
    if (!tenant?.liquidityConfig.providesLiquidity) {
        return { allowed: false, reason: "Silo without external liquidity" };
    }

    // 1. Limite Diário
    if (link.usedTodayBrl + amountBrl > link.dailyLimitBrl) {
      return { allowed: false, reason: `Limite diário excedido. Disponível: R$ ${link.dailyLimitBrl - link.usedTodayBrl}` };
    }

    // 2. Validação de Colateral baseada na COTAÇÃO DINÂMICA
    const q = quotationService.getActiveQuotation(link.tenantId);
    const grainBalanceKg = ledgerService.getBalance(link.agroAccountId, Currency.GRAIN_KG);
    
    const collateralValue = grainBalanceKg * q.finalPriceKg;

    if (collateralValue < amountBrl) {
      return { allowed: false, reason: `Lastro insuficiente. Patrimônio digital estimado em ${UnitConversionService.formatBRL(collateralValue)} (Cotação Silo)` };
    }

    // 3. Liquidez do Silo Master
    const masterBalance = ledgerService.getBalance(link.siloMasterId, Currency.BRL);
    if (masterBalance < amountBrl) {
        return { allowed: false, reason: "Silo Master sem saldo" };
    }

    return { allowed: true };
  }
};
