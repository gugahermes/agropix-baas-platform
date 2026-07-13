import { BaaSConfig, TransactionSource, TransactionType, Currency, TransferRequest, LedgerEntry, TransactionStatus, AccountType, ReconciliationItem } from '../types';
import { DEFAULT_BAAS_CONFIG, MOCK_ACCOUNTS } from './mockData';
import { ledgerService } from './ledgerService';

let currentConfig: BaaSConfig = { ...DEFAULT_BAAS_CONFIG };
let idempotencyStore = new Set<string>();

export const baasEngineService = {
  
  // --- CORE CONFIGURATION & GOVERNANCE ---
  
  getConfig: (): BaaSConfig => {
    return { ...currentConfig };
  },

  checkCapability: (capability: keyof BaaSConfig['capabilities']) => {
    if (!currentConfig.capabilities[capability]) {
      throw new Error(`Capability '${String(capability)}' is DISABLED by BaaS Governance.`);
    }
  },

  updateCapabilities: (capabilities: Partial<BaaSConfig['capabilities']>) => {
    const oldCaps = { ...currentConfig.capabilities };
    currentConfig.capabilities = { ...currentConfig.capabilities, ...capabilities };

    const changes = Object.keys(capabilities).filter(k => 
      capabilities[k as keyof typeof capabilities] !== oldCaps[k as keyof typeof oldCaps]
    );

    if (changes.length > 0) {
      ledgerService._writeEntry({
        eventId: `cfg_cap_${Date.now()}`,
        accountId: 'acc_baas_master',
        amount: 0,
        currency: Currency.SYSTEM,
        direction: TransactionType.AUDIT,
        source: TransactionSource.CONFIG_UPDATE,
        description: `BaaS Capabilities Updated: ${changes.join(', ')}`,
        metadata: { changes, newState: capabilities }
      });
    }

    return currentConfig;
  },

  updateGateway: (gateway: Partial<BaaSConfig['gateway']>) => {
    currentConfig.gateway = { ...currentConfig.gateway, ...gateway };

    ledgerService._writeEntry({
      eventId: `cfg_gw_${Date.now()}`,
      accountId: 'acc_baas_master',
      amount: 0,
      currency: Currency.SYSTEM,
      direction: TransactionType.AUDIT,
      source: TransactionSource.CONFIG_UPDATE,
      description: `Gateway/Security Config Updated`,
      metadata: { gateway }
    });

    return currentConfig;
  },

  // --- ORCHESTRATION ENGINE (TRANSFERS) ---

  executeTransfer: async (request: TransferRequest): Promise<{ eventId: string, status: TransactionStatus, logs: string[] }> => {
    const logs: string[] = [];
    const pushLog = (msg: string) => logs.push(`[${new Date().toISOString().split('T')[1]}] ${msg}`);

    pushLog(`Received Transfer Request: ${request.fromAccountId} -> ${request.toAccountId} | ${request.amount} ${request.currency}`);

    try {
      // 1. Governance Check
      baasEngineService.checkCapability('transfers');
      pushLog('CHECK: Capability "transfers" is ENABLED.');

      // 2. Idempotency Check
      if (request.idempotencyKey) {
        if (idempotencyStore.has(request.idempotencyKey)) {
          pushLog(`IDEMPOTENCY: Key ${request.idempotencyKey} already processed. Returning cached result.`);
          throw new Error(`Idempotency Key Collision: ${request.idempotencyKey}`);
        }
        idempotencyStore.add(request.idempotencyKey);
        pushLog(`IDEMPOTENCY: Key registered.`);
      } else {
        // Enforce Idempotency if configured strict
        if (currentConfig.gateway.idempotencyKeyField) {
            pushLog(`WARNING: Missing Idempotency Key (Preferred). Proceeding...`);
        }
      }

      // 3. Balance & Limit Check (Internal Ledger)
      const balance = ledgerService.getBalance(request.fromAccountId, request.currency);
      if (balance < request.amount) {
        throw new Error(`Insufficient Funds. Available: ${balance}, Required: ${request.amount}`);
      }
      pushLog(`CHECK: Balance verified. Available: ${balance}`);

      // 4. Create PENDING State
      const eventId = `evt_trf_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      pushLog(`STATE: Transaction ${eventId} created with status PENDING_EXTERNAL.`);

      // Log the intent (Audit)
      ledgerService._writeEntry({
        eventId,
        accountId: request.fromAccountId,
        amount: request.amount,
        currency: request.currency,
        direction: TransactionType.DEBIT,
        source: TransactionSource.INTERNAL_TRANSFER,
        description: `Pending Transfer: ${request.description}`,
        status: TransactionStatus.PENDING_EXTERNAL
      });

      // 5. Simulate External Rail Call (Orchestration)
      // In a real scenario, this calls IntegrationService.send()
      pushLog(`ORCHESTRATION: Calling External Rail (Simulated Latency)...`);
      await new Promise(r => setTimeout(r, 1500)); // Simulate bank latency

      const externalSuccess = Math.random() > 0.1; // 90% success rate

      if (externalSuccess) {
        // 6. Settle
        pushLog(`EXTERNAL: Response 200 OK. Transaction Confirmed.`);
        
        // Finalize Debit Sender (Settled)
        // Finalize Credit Receiver
        ledgerService._writeEntry({
            eventId,
            accountId: request.toAccountId,
            amount: request.amount,
            currency: request.currency,
            direction: TransactionType.CREDIT,
            source: TransactionSource.INTERNAL_TRANSFER,
            description: `Received: ${request.description}`,
            status: TransactionStatus.SETTLED
        });

        pushLog(`STATE: Transaction ${eventId} moved to SETTLED.`);
        return { eventId, status: TransactionStatus.SETTLED, logs };

      } else {
        // 7. Fail & Reverse
        pushLog(`EXTERNAL: Response 500/400. Transaction Failed.`);
        
        ledgerService._writeEntry({
            eventId: `rev_${eventId}`,
            accountId: request.fromAccountId,
            amount: request.amount,
            currency: request.currency,
            direction: TransactionType.CREDIT,
            source: TransactionSource.ADJUSTMENT,
            description: `Reversal: Transaction Failed`,
            status: TransactionStatus.REVERSED,
            metadata: { originalEventId: eventId }
        });
        
        pushLog(`STATE: Transaction ${eventId} moved to FAILED/REVERSED.`);
        return { eventId, status: TransactionStatus.FAILED, logs };
      }

    } catch (e: any) {
      pushLog(`ERROR: ${e.message}`);
      return { eventId: 'error', status: TransactionStatus.FAILED, logs };
    }
  },

  // --- RECONCILIATION ENGINE ---

  runReconciliation: async (): Promise<{ items: ReconciliationItem[], summary: string }> => {
    // 1. Fetch Internal State
    const accounts = ledgerService.getAccounts().filter(a => a.type === AccountType.CVU_SILO_MASTER);
    const results: ReconciliationItem[] = [];

    // 2. Simulate External Bank Statement
    // In real life, fetch via IntegrationService
    for (const acc of accounts) {
        const internalBalance = ledgerService.getBalance(acc.id, Currency.BRL);
        
        // Simulating a divergence
        const externalBalance = internalBalance + (Math.random() > 0.8 ? 100.50 : 0); 
        
        if (internalBalance !== externalBalance) {
            results.push({
                id: `rec_item_${Date.now()}`,
                date: new Date().toISOString(),
                description: `Divergência de Saldo - ${acc.alias}`,
                amount: Math.abs(internalBalance - externalBalance),
                status: 'DIVERGENT_AMOUNT',
                externalRef: 'EXT_STATEMENT_001',
                ledgerRef: acc.id
            });
        }
    }

    // Add some random missing transactions
    if (Math.random() > 0.5) {
        results.push({
            id: `rec_item_miss_${Date.now()}`,
            date: new Date().toISOString(),
            description: 'PIX Recebido não processado (Webhook Loss)',
            amount: 500.00,
            status: 'MISSING_IN_LEDGER',
            externalRef: 'E2E123456789'
        });
    }

    // Log the job
    ledgerService._writeEntry({
      eventId: `rec_job_${Date.now()}`,
      accountId: 'acc_baas_master',
      amount: 0,
      currency: Currency.SYSTEM,
      direction: TransactionType.AUDIT,
      source: TransactionSource.RECONCILIATION_OP,
      description: `Reconciliation Job Completed. Found ${results.length} issues.`,
      metadata: { resultsCount: results.length }
    });

    return {
        items: results,
        summary: results.length === 0 ? 'Conciliação OK - Saldos Batendo' : `Encontradas ${results.length} divergências.`
    };
  },

  // --- QR ENGINE ---
  
  parseQr: (raw: string) => {
    baasEngineService.checkCapability('qr');
    
    // Basic mock logic
    try {
        const data = JSON.parse(raw);
        return { type: 'JSON', valid: true, data };
    } catch {
        if (raw.startsWith('000201')) {
            return { type: 'EMV_BR_CODE', valid: true, data: { txId: 'TX123', amount: 50.00, merchant: 'LOJA TESTE' } };
        }
        return { type: 'UNKNOWN', valid: false, data: { raw } };
    }
  }
};

// Backwards compatibility export
export const baasConfigService = baasEngineService;