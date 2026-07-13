
export enum UserRole {
  PRODUCER = 'PRODUCER',
  SILO_ADMIN = 'SILO_ADMIN',
  BAAS_ADMIN = 'BAAS_ADMIN',
  MERCHANT = 'MERCHANT'
}

export enum GrainUnit {
  TON = 'TON',
  BAGS = 'BAGS', 
  KG = 'KG'
}

export enum SiloOperationMode {
  INTEGRATION = 'INTEGRATION',
  HYBRID = 'HYBRID',
  NATIVE = 'NATIVE'
}

// --- COMMODITY ENGINE ---

export interface CommodityConfig {
  id: CommodityType | string;
  name: string;
  unitVisual: string; // Ex: "Saca (sc)"
  kgPerUnit: number;  // Ex: 60
  activeSafra: string;
  isCustom?: boolean;
}

// --- INTEGRATION & MIGRATION ---

export enum IntegrationProtocol {
  REST_API = 'REST_API',
  WEBHOOK = 'WEBHOOK',
  CSV_UPLOAD = 'CSV_UPLOAD'
}

export interface SiloIntegrationSettings {
  protocol: IntegrationProtocol;
  endpoint?: string;
  apiKey?: string;
  syncIntervalMinutes: number;
  lastSyncAt?: string;
  status: 'HEALTHY' | 'DIVERGENT' | 'ERROR' | 'PENDING';
  mapping: Record<string, string>; // Mapeamento de campos legados -> AgroPix
}

// --- QUOTATION ENGINE TYPES ---

export enum PriceSourceType {
  COOPERATIVE = 'COOPERATIVE',
  PORT = 'PORT',
  EXCHANGE = 'EXCHANGE',
  CONTRACT = 'CONTRACT'
}

export interface PriceSource {
  id: string;
  name: string;
  type: PriceSourceType;
  basePriceSaca: number;
  lastUpdate: string;
  location?: string;
  region?: string; // Ex: Celeiro RS
  isRegionalDefault?: boolean;
}

export interface SiloPriceConfig {
  siloId: string;
  activeSourceId: string;
  marginType: 'FIXED' | 'PERCENTAGE';
  marginValue: number; // R$ ou %
  distanceToSourceKm: number;
  logisticsUnitCost: number; // R$ por saca/unidade de distância
  fixedOperationalCostSaca: number; 
  adjustmentsSaca: number; // Ajustes contratuais adicionais
}

export interface DailyQuotation {
  id: string;
  siloId: string;
  sourceId: string;
  commodity: CommodityType;
  basePriceSaca: number;
  finalPriceSaca: number;
  finalPriceKg: number;
  timestamp: string;
  status: 'ACTIVE' | 'HISTORIC';
  calculationMetadata: {
    marginApplied: number;
    logisticsCost: number;
    sourceUsed: string;
  };
}

// --- CORE ADMIN (GOVERNANCE) ---

export interface LiquidityConfig {
  providesLiquidity: boolean;
  siloFeeSharePct: number; 
  masterAccountId?: string; 
  revenueAccountId?: string; 
}

export interface Tenant {
  id: string;
  name: string;
  document: string; 
  city: string;
  state: string;
  status: 'ACTIVE' | 'INACTIVE';
  operationMode: SiloOperationMode;
  settings: {
    allowOverdraft: boolean;
    maxQueueSize: number;
  };
  liquidityConfig: LiquidityConfig;
  priceConfig: SiloPriceConfig;
  commodities: CommodityConfig[];
  integrationSettings: SiloIntegrationSettings;
}

export interface Merchant {
  id: string;
  name: string;
  document: string; 
  category: string;
  baasAccountId: string;
  status: 'ACTIVE' | 'PENDING' | 'BLOCKED';
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  document: string; 
  accountId: string; 
  tenantId?: string; 
}

// --- BAAS ENGINE (FINANCIAL ORCHESTRATOR) ---

export enum AccountType {
  AGRO_WALLET = 'AGRO_WALLET',       
  CVU_SILO_MASTER = 'CVU_SILO_MASTER', 
  CVU_PRODUCER_SUB = 'CVU_PRODUCER_SUB', 
  CVU_CLEARING = 'CVU_CLEARING',     
  CVU_SILO_REVENUE = 'CVU_SILO_REVENUE', 
  MERCHANT = 'MERCHANT'              
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
  CLOSED = 'CLOSED'
}

export interface BaaSAccount {
  id: string;
  ownerId: string; 
  type: AccountType;
  parentAccountId?: string; 
  status: AccountStatus;
  alias?: string;
  provider?: string; 
  accountNumber?: string;
  createdAt: string;
  limits?: {
    dailyLimit: number;
    transactionLimit: number;
  };
}

export interface AgroFinanceLink {
  id: string;
  agroAccountId: string; 
  cvuAccountId: string;  
  siloMasterId: string;  
  tenantId: string;      
  dailyLimitBrl: number; 
  usedTodayBrl: number;  
  extendedLimitBrl: number; 
  extendedLimitStatus: 'AVAILABLE' | 'PENDING' | 'NONE'; 
  status: 'ACTIVE' | 'SUSPENDED';
  lastUpdated: string;
}

export enum TransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
  AUDIT = 'AUDIT'
}

export enum TransactionStatus {
  CREATED = 'CREATED', 
  PENDING_EXTERNAL = 'PENDING_EXTERNAL',
  SETTLED = 'SETTLED', 
  FAILED = 'FAILED',
  REVERSED = 'REVERSED'
}

export enum TransactionSource {
  PIX_IN = 'PIX_IN',
  PIX_OUT = 'PIX_OUT',
  PIX_SPLIT_FEE = 'PIX_SPLIT_FEE', 
  FEE_PLATFORM_SHARE = 'FEE_PLATFORM_SHARE', 
  FEE_SILO_SHARE = 'FEE_SILO_SHARE',         
  GRAIN_DIGITIZATION = 'GRAIN_DIGITIZATION', 
  GRAIN_PAYMENT = 'GRAIN_PAYMENT',
  INTERNAL_TRANSFER = 'INTERNAL_TRANSFER',
  FEE = 'FEE',
  ADJUSTMENT = 'ADJUSTMENT',
  INTEGRATION_AUDIT = 'INTEGRATION_AUDIT',
  DICT_OPERATION = 'DICT_OPERATION',
  CONFIG_UPDATE = 'CONFIG_UPDATE',
  RECONCILIATION_OP = 'RECONCILIATION_OP',
  QR_OPERATION = 'QR_OPERATION'
}

export enum Currency {
  BRL = 'BRL',
  GRAIN_KG = 'GRAIN_KG', 
  SYSTEM = 'SYSTEM'
}

export interface LedgerEntry {
  id: string;
  eventId: string;
  accountId: string;
  direction: TransactionType;
  amount: number; 
  currency: Currency;
  source: TransactionSource;
  description: string;
  balanceAfter?: number;
  metadata?: Record<string, any>;
  timestamp: string;
  status?: TransactionStatus;
}

export interface TransferRequest {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency: Currency;
  description: string;
  idempotencyKey?: string;
}

export enum CommodityType {
  SOYBEAN = 'SOYBEAN',
  CORN = 'CORN',
  WHEAT = 'WHEAT'
}

export enum NFeStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED', 
  WEIGHING = 'WEIGHING', 
  CONFIRMED = 'CONFIRMED', 
  REJECTED = 'REJECTED',
  CANCELED = 'CANCELED'
}

export interface NFeDocument {
  id: string; 
  accessKey?: string; 
  protocol?: string;
  xmlMock?: string; 
  producerId: string;
  siloId: string;
  commodity: CommodityType;
  estimatedWeightKg: number; 
  finalWeightKg?: number; 
  unit: GrainUnit; 
  plate: string;
  driverName?: string;
  gpsCoordinates: {
    lat: number;
    lng: number;
  };
  status: NFeStatus;
  issuedAt: string;
  validatedAt?: string;
  contractId?: string; 
  digitizationEventId?: string; 
}

// --- INTEGRATION ENGINE TYPES ---

export enum IntegrationType {
  BANK = 'BANK',
  PIX = 'PIX',
  DICT = 'DICT',
  NFE = 'NFE',
  OTHER = 'OTHER'
}

export enum IntegrationStatus {
  UP = 'UP',
  DOWN = 'DOWN',
  SLOW = 'SLOW',
  MAINTENANCE = 'MAINTENANCE',
  DISABLED = 'DISABLED',
  ACTIVE = 'ACTIVE'
}

export enum IntegrationEnvironment {
  SANDBOX = 'SANDBOX',
  PRODUCTION = 'PRODUCTION'
}

export enum AuthMode {
  OAUTH2 = 'OAUTH2',
  OAUTH2_MTLS = 'OAUTH2_MTLS',
  MTLS = 'MTLS',
  API_KEY = 'API_KEY'
}

export interface IntegrationMapping {
  externalEvent: string;
  internalEvent: string;
  transformJson: string;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  secretMasked: string;
}

export interface IntegrationProvider {
  id: string;
  name: string;
  type: IntegrationType;
  environment: IntegrationEnvironment;
  baseUrl: string;
  authMode: AuthMode;
  status: IntegrationStatus;
  timeoutMs: number;
  retries: number;
  circuitBreakerEnabled: boolean;
  tenantScope: 'GLOBAL' | 'TENANT';
  credentials: Record<string, any>;
  mappings: IntegrationMapping[];
  webhooks: WebhookEndpoint[];
  updatedAt: string;
  lastHealthCheckAt?: string;
}

// --- SYSTEM & BAAS GOVERNANCE TYPES ---

export interface SystemConfig {
  version: string;
  maintenanceMode: boolean;
  features: Record<string, boolean>;
}

export interface BaaSConfig {
  capabilities: {
    transfers: boolean;
    qr: boolean;
    loans: boolean;
  };
  gateway: {
    idempotencyKeyField: string;
  };
}

export interface ReconciliationItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: 'DIVERGENT_AMOUNT' | 'MISSING_IN_LEDGER' | 'OK';
  externalRef?: string;
  ledgerRef?: string;
}

// --- PIX / DICT TYPES ---

export enum DictKeyType {
  CPF = 'CPF',
  CNPJ = 'CNPJ',
  PHONE = 'PHONE',
  EMAIL = 'EMAIL',
  EVP = 'EVP'
}

export enum DictAccountType {
  CACC = 'CACC',
  SLARY = 'SLARY',
  SVNG = 'SVNG',
  TRAN = 'TRAN'
}

export enum DictPersonType {
  NATURAL_PERSON = 'NATURAL_PERSON',
  LEGAL_PERSON = 'LEGAL_PERSON'
}

export interface DictResponseWrapper<T> {
  Signature?: string; 
  ResponseTime: string;
  CorrelationId: string;
  Data: T; 
}

export interface DictEntry {
  Key: string;
  KeyType: DictKeyType;
  Account: {
    Participant: string;
    Branch: string;
    AccountNumber: string;
    AccountType: DictAccountType;
    OpeningDate: string;
  };
  Owner: {
    Type: DictPersonType;
    TaxIdNumber: string;
    Name: string;
    TradeName?: string;
  };
  CreationDate: string;
  KeyOwnershipDate: string;
}
