
import { Tenant, Merchant, User, UserRole, SystemConfig, AccountType, TransactionType, TransactionSource, Currency, LiquidityConfig, GrainUnit, SiloPriceConfig, SiloOperationMode, CommodityConfig, SiloIntegrationSettings } from '../types';
import { MOCK_TENANTS, MOCK_MERCHANTS, SYSTEM_CONFIG, MOCK_USERS, MOCK_ACCOUNTS } from './mockData';
import { baasEngine, ledgerService } from './ledgerService';

// Simulating Core DB with mutable local state
let tenantDb = [...MOCK_TENANTS];
let merchantDb = [...MOCK_MERCHANTS];
let userDb = [...MOCK_USERS];
let configDb = { ...SYSTEM_CONFIG };

export const coreService = {
  // --- TENANT GOVERNANCE ---
  getTenants: () => [...tenantDb],

  getTenantById: (id: string) => tenantDb.find(t => t.id === id || t.liquidityConfig.masterAccountId === id),

  updateSiloSettings: (tenantId: string, updates: Partial<Tenant>) => {
    const idx = tenantDb.findIndex(t => t.id === tenantId);
    if (idx === -1) throw new Error("Silo não encontrado");
    
    tenantDb[idx] = { 
      ...tenantDb[idx], 
      ...updates,
      settings: updates.settings ? { ...tenantDb[idx].settings, ...updates.settings } : tenantDb[idx].settings,
      liquidityConfig: updates.liquidityConfig ? { ...tenantDb[idx].liquidityConfig, ...updates.liquidityConfig } : tenantDb[idx].liquidityConfig,
      priceConfig: updates.priceConfig ? { ...tenantDb[idx].priceConfig, ...updates.priceConfig } : tenantDb[idx].priceConfig,
      integrationSettings: updates.integrationSettings ? { ...tenantDb[idx].integrationSettings, ...updates.integrationSettings } : tenantDb[idx].integrationSettings
    };

    ledgerService._writeEntry({
      eventId: `audit_silo_cfg_${Date.now()}`,
      accountId: tenantDb[idx].liquidityConfig.masterAccountId || 'acc_baas_master',
      amount: 0,
      currency: Currency.SYSTEM,
      direction: TransactionType.AUDIT,
      source: TransactionSource.CONFIG_UPDATE,
      description: `SILO_POLICIES_UPDATED: Operação, Preços ou Commodities de ${tenantDb[idx].name} alterados.`,
      metadata: { updates }
    });

    return tenantDb[idx];
  },

  // --- CLIENT/PRODUCER GOVERNANCE ---
  getUsers: () => [...userDb],
  
  getProducersBySilo: (tenantId: string) => {
    return userDb.filter(u => u.role === UserRole.PRODUCER && u.tenantId === tenantId);
  },

  getAvailableProducersToLink: () => {
    return userDb.filter(u => u.role === UserRole.PRODUCER && !u.tenantId);
  },

  createProducerForSilo: (data: { name: string, document: string, tenantId: string, culture?: string }) => {
    const wallet = baasEngine.createAccount(`u_${Date.now()}`, AccountType.AGRO_WALLET, `Wallet Grãos - ${data.name}`);
    const silo = tenantDb.find(t => t.id === data.tenantId);
    const cvu = baasEngine.createAccount(`u_${Date.now()}`, AccountType.CVU_PRODUCER_SUB, `Conta Digital - ${data.name}`);
    cvu.parentAccountId = silo?.liquidityConfig.masterAccountId;

    const newUser: User = {
      id: `u_prod_${Date.now()}`,
      name: data.name,
      document: data.document,
      role: UserRole.PRODUCER,
      accountId: wallet.id,
      tenantId: data.tenantId
    };
    userDb.push(newUser);

    ledgerService._writeEntry({
      eventId: `evt_prod_created_${Date.now()}`,
      accountId: cvu.id,
      amount: 0,
      currency: Currency.SYSTEM,
      direction: TransactionType.AUDIT,
      source: TransactionSource.INTEGRATION_AUDIT,
      description: `PRODUCER_CREATED: ${data.name} via Silo ${data.tenantId}`,
      metadata: { culture: data.culture }
    });

    return newUser;
  },

  linkExistingProducer: (producerId: string, tenantId: string) => {
    const idx = userDb.findIndex(u => u.id === producerId);
    if (idx === -1) throw new Error("Produtor não encontrado");
    userDb[idx].tenantId = tenantId;
    return userDb[idx];
  },

  getMerchants: () => [...merchantDb],
  getConfig: () => configDb,
};
