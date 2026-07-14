
import { 
  CommodityType, NFeStatus, User, UserRole, LedgerEntry, TransactionType, 
  TransactionSource, NFeDocument, Tenant, Merchant, BaaSAccount, AccountType, 
  AccountStatus, Currency, AgroFinanceLink, GrainUnit, PriceSource, PriceSourceType, 
  SiloPriceConfig, IntegrationProvider, IntegrationType, IntegrationEnvironment, 
  AuthMode, IntegrationStatus, SystemConfig, BaaSConfig, SiloOperationMode, IntegrationProtocol 
} from '../types';

// --- QUOTATION SOURCES (COTRICAMPO DEFAULT) ---

export const MOCK_PRICE_SOURCES: PriceSource[] = [
  { 
    id: 'src_cotricampo', 
    name: 'Cotricampo ( Celeiro RS )', 
    type: PriceSourceType.COOPERATIVE, 
    basePriceSaca: 124.00, 
    lastUpdate: new Date().toISOString(), 
    location: 'Campo Novo, RS',
    region: 'Celeiro / Noroeste RS',
    isRegionalDefault: true
  },
  { 
    id: 'src_rio_grande', 
    name: 'Porto de Rio Grande', 
    type: PriceSourceType.PORT, 
    basePriceSaca: 142.00, 
    lastUpdate: new Date().toISOString(), 
    location: 'Rio Grande, RS' 
  },
  { 
    id: 'src_manual', 
    name: 'Cotação Manual Silo', 
    type: PriceSourceType.CONTRACT, 
    basePriceSaca: 130.00, 
    lastUpdate: new Date().toISOString() 
  }
];

const DEFAULT_PRICE_CONFIG: SiloPriceConfig = {
  siloId: 't1',
  activeSourceId: 'src_cotricampo',
  marginType: 'FIXED',
  marginValue: 4.00, 
  distanceToSourceKm: 50,
  logisticsUnitCost: 0.07, 
  fixedOperationalCostSaca: 0,
  adjustmentsSaca: 0
};

// --- CORE ADMIN DATA ---

export const MOCK_TENANTS: Tenant[] = [
  { 
    id: 't1', name: 'Silo Central MT', document: '98.765.432/0001-99', 
    city: 'Sorriso', state: 'MT', status: 'ACTIVE',
    operationMode: SiloOperationMode.NATIVE,
    settings: { allowOverdraft: false, maxQueueSize: 50 },
    liquidityConfig: {
      providesLiquidity: true,
      siloFeeSharePct: 20, 
      masterAccountId: 'acc_silo_master_01',
      revenueAccountId: 'acc_silo_revenue_01'
    },
    priceConfig: { ...DEFAULT_PRICE_CONFIG, siloId: 't1' },
    commodities: [
      { id: CommodityType.SOYBEAN, name: 'Soja', unitVisual: 'Sacas (sc)', kgPerUnit: 60, activeSafra: '23/24' },
      { id: CommodityType.CORN, name: 'Milho', unitVisual: 'Sacas (sc)', kgPerUnit: 60, activeSafra: '23/24' }
    ],
    integrationSettings: {
      protocol: IntegrationProtocol.CSV_UPLOAD,
      syncIntervalMinutes: 60,
      status: 'HEALTHY',
      mapping: { 'ext_id': 'producer_id', 'balance': 'saldo_kg' }
    }
  },
  { 
    id: 't2', name: 'Celeiro Grain Bank', document: '11.222.333/0001-00', 
    city: 'Três Passos', state: 'RS', status: 'ACTIVE',
    operationMode: SiloOperationMode.HYBRID,
    settings: { allowOverdraft: false, maxQueueSize: 20 },
    liquidityConfig: {
      providesLiquidity: false, 
      siloFeeSharePct: 0
    },
    priceConfig: { 
        ...DEFAULT_PRICE_CONFIG, 
        siloId: 't2', 
        activeSourceId: 'src_cotricampo',
        marginValue: 5.00,
        distanceToSourceKm: 25,
        logisticsUnitCost: 0.05
    },
    commodities: [
      { id: CommodityType.SOYBEAN, name: 'Soja', unitVisual: 'Sacas (sc)', kgPerUnit: 60, activeSafra: 'Safra Sul 24' }
    ],
    integrationSettings: {
      protocol: IntegrationProtocol.REST_API,
      endpoint: 'https://api.legacy-erp.com.br/v1',
      syncIntervalMinutes: 15,
      status: 'PENDING',
      mapping: {}
    }
  }
];

export const MOCK_MERCHANTS: Merchant[] = [
  { 
    id: 'm1', 
    name: 'AgroPeças Sorriso', 
    document: '12.345.678/0001-00', 
    category: 'Peças e Implementos', 
    baasAccountId: 'acc_merch_01', 
    status: 'ACTIVE' 
  },
  { 
    id: 'm2', 
    name: 'Fertilizantes S/A', 
    document: '99.888.777/0001-11', 
    category: 'Insumos', 
    baasAccountId: 'acc_merch_02', 
    status: 'ACTIVE' 
  }
];

export const SYSTEM_CONFIG: SystemConfig = {
  version: '2.8.0',
  maintenanceMode: false,
  features: {
    pix_out: true,
    grain_digitization: true,
    multi_silo: true
  }
};

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'João Agricultor', role: UserRole.PRODUCER, document: '123.456.789-00', accountId: 'acc_prod_01_agro', tenantId: 't1' },
  { id: 'u2', name: 'Admin Silo MT', role: UserRole.SILO_ADMIN, document: '98.765.432/0001-99', accountId: 'acc_silo_master_01', tenantId: 't1' },
  { id: 'u3', name: 'SysAdmin AgroPix', role: UserRole.BAAS_ADMIN, document: '00.000.000/0001-00', accountId: 'acc_agropix_clearing' },
];

export const MOCK_ACCOUNTS: BaaSAccount[] = [
  { 
    id: 'acc_silo_master_01', 
    ownerId: 't1', 
    type: AccountType.CVU_SILO_MASTER, 
    status: AccountStatus.ACTIVE, 
    createdAt: '2023-01-01T10:00:00Z', 
    alias: 'Silo Central Master',
    provider: 'Sicredi',
    accountNumber: '99001-X'
  },
  {
    id: 'acc_silo_revenue_01',
    ownerId: 't1',
    type: AccountType.CVU_SILO_REVENUE,
    status: AccountStatus.ACTIVE,
    createdAt: '2023-01-01T10:00:00Z',
    alias: 'Receita Silo MT'
  },
  { 
    id: 'acc_prod_01_cvu', 
    ownerId: 'u1', 
    type: AccountType.CVU_PRODUCER_SUB, 
    parentAccountId: 'acc_silo_master_01', 
    status: AccountStatus.ACTIVE, 
    createdAt: '2023-01-15T14:00:00Z', 
    alias: 'Conta Digital',
    provider: 'Sicredi (Sub)',
    accountNumber: '100234-5'
  },
  { 
    id: 'acc_prod_01_agro', 
    ownerId: 'u1', 
    type: AccountType.AGRO_WALLET, 
    status: AccountStatus.ACTIVE, 
    createdAt: '2023-01-01T10:00:00Z', 
    alias: 'Wallet de Grãos Digitalizados' 
  },
  { 
    id: 'acc_agropix_clearing', 
    ownerId: 'sys_agropix', 
    type: AccountType.CVU_CLEARING, 
    status: AccountStatus.ACTIVE, 
    createdAt: '2023-01-01T10:00:00Z', 
    alias: 'AgroPix Clearing & Fees' 
  },
  { 
    id: 'acc_merch_01', 
    ownerId: 'm1', 
    type: AccountType.MERCHANT, 
    status: AccountStatus.ACTIVE, 
    createdAt: '2023-05-20T14:30:00Z', 
    alias: 'Recebimentos AgroPeças' 
  }
];

export const MOCK_PROVIDERS: IntegrationProvider[] = [
  {
    id: 'prov_bacen_dict',
    name: 'BACEN DICT (Diretório)',
    type: IntegrationType.DICT,
    environment: IntegrationEnvironment.SANDBOX,
    baseUrl: 'https://api.bcb.gov.br/dict',
    authMode: AuthMode.OAUTH2_MTLS,
    status: IntegrationStatus.UP,
    timeoutMs: 2000,
    retries: 2,
    circuitBreakerEnabled: true,
    tenantScope: 'GLOBAL',
    credentials: { clientId: 'agropix-client-01', mtlsCertFingerprint: 'SHA256:...' },
    mappings: [],
    webhooks: [],
    updatedAt: new Date().toISOString()
  }
];

export const DEFAULT_BAAS_CONFIG: BaaSConfig = {
  capabilities: {
    transfers: true,
    qr: true,
    loans: false
  },
  gateway: {
    idempotencyKeyField: 'X-Idempotency-Key'
  }
};

export const INITIAL_LEDGER: LedgerEntry[] = [
  {
    id: 'l_master_01',
    eventId: 'evt_init_master',
    accountId: 'acc_silo_master_01',
    amount: 1000000.00, 
    currency: Currency.BRL,
    direction: TransactionType.CREDIT,
    source: TransactionSource.PIX_IN,
    description: 'Aporte Inicial de Liquidez (Silo)',
    timestamp: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'l2',
    eventId: 'evt_grain_01',
    accountId: 'acc_prod_01_agro', 
    amount: 100000, 
    currency: Currency.GRAIN_KG,
    direction: TransactionType.CREDIT,
    source: TransactionSource.GRAIN_DIGITIZATION,
    description: 'Digitalização de Grãos - Soja - Safra 23/24',
    timestamp: new Date(Date.now() - 86400000).toISOString()
  }
];

export const INITIAL_NFES: NFeDocument[] = [
  {
    id: 'nfe_001',
    accessKey: '51230112345678000199550010000000011000000015',
    protocol: '151230000001234',
    producerId: 'u1',
    siloId: 't1',
    commodity: CommodityType.SOYBEAN,
    estimatedWeightKg: 30000,
    finalWeightKg: 30000,
    unit: GrainUnit.KG,
    plate: 'ABC-1234',
    gpsCoordinates: { lat: -12.9, lng: -55.4 },
    status: NFeStatus.CONFIRMED,
    issuedAt: new Date(Date.now() - 3600000).toISOString(),
    validatedAt: new Date(Date.now() - 1800000).toISOString(),
    digitizationEventId: 'evt_grain_01'
  }
];

export const MOCK_LINKS: AgroFinanceLink[] = [
  {
    id: 'lnk_u1_01',
    agroAccountId: 'acc_prod_01_agro',
    cvuAccountId: 'acc_prod_01_cvu',
    siloMasterId: 'acc_silo_master_01',
    tenantId: 't1', 
    dailyLimitBrl: 15000.00, 
    usedTodayBrl: 2450.00,   
    extendedLimitBrl: 50000.00,
    extendedLimitStatus: 'AVAILABLE',
    status: 'ACTIVE',
    lastUpdated: new Date().toISOString()
  }
];
