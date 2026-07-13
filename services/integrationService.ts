import { IntegrationProvider, IntegrationStatus, IntegrationType, TransactionType, TransactionSource, Currency, IntegrationEnvironment, IntegrationMapping, WebhookEndpoint } from '../types';
import { MOCK_PROVIDERS } from './mockData';
import { ledgerService } from './ledgerService';

let providersDb = [...MOCK_PROVIDERS];

export const integrationService = {
  // --- CRUD ---
  
  getAll: () => [...providersDb],

  getById: (id: string) => providersDb.find(p => p.id === id),

  createProvider: (providerData: Partial<IntegrationProvider>) => {
    const newProvider: IntegrationProvider = {
        id: `prov_${Date.now()}`,
        name: providerData.name || 'New Provider',
        type: providerData.type || IntegrationType.OTHER,
        environment: providerData.environment || IntegrationEnvironment.SANDBOX,
        baseUrl: providerData.baseUrl || '',
        authMode: providerData.authMode || 'API_KEY', 
        status: IntegrationStatus.ACTIVE, 
        timeoutMs: 5000,
        retries: 3,
        circuitBreakerEnabled: true,
        tenantScope: 'GLOBAL',
        credentials: providerData.credentials || {},
        mappings: [],
        webhooks: [],
        updatedAt: new Date().toISOString(),
        ...providerData
    } as IntegrationProvider;

    providersDb.push(newProvider);

    ledgerService._writeEntry({
        eventId: `audit_create_prov_${Date.now()}`,
        accountId: 'acc_baas_master',
        amount: 0,
        currency: Currency.SYSTEM,
        direction: TransactionType.AUDIT,
        source: TransactionSource.INTEGRATION_AUDIT,
        description: `Created New Integrator: ${newProvider.name}`,
        metadata: { providerId: newProvider.id, type: newProvider.type }
    });

    return newProvider;
  },

  save: (provider: IntegrationProvider, actorId: string = 'sys_admin') => {
    const idx = providersDb.findIndex(p => p.id === provider.id);
    const isNew = idx === -1;

    if (isNew) {
      provider.id = `prov_${Date.now()}`;
      provider.updatedAt = new Date().toISOString();
      providersDb.push(provider);
    } else {
      provider.updatedAt = new Date().toISOString();
      providersDb[idx] = provider;
    }

    // Audit Log in Ledger
    ledgerService._writeEntry({
      eventId: `audit_cfg_${Date.now()}`,
      accountId: 'acc_baas_master', 
      amount: 0,
      currency: Currency.SYSTEM,
      direction: TransactionType.AUDIT,
      source: TransactionSource.INTEGRATION_AUDIT,
      description: `${isNew ? 'Created' : 'Updated'} Provider: ${provider.name} (${provider.environment})`,
      metadata: { 
        providerId: provider.id, 
        actor: actorId, 
        changes: isNew ? 'Created' : 'Updated Config' 
      }
    });

    return provider;
  },

  deleteProvider: (id: string) => {
    const provider = providersDb.find(p => p.id === id);
    if (!provider) return;

    // Hard delete for demo, Soft delete in prod
    providersDb = providersDb.filter(p => p.id !== id);

    ledgerService._writeEntry({
        eventId: `audit_del_prov_${Date.now()}`,
        accountId: 'acc_baas_master',
        amount: 0,
        currency: Currency.SYSTEM,
        direction: TransactionType.AUDIT,
        source: TransactionSource.INTEGRATION_AUDIT,
        description: `Deleted Integrator: ${provider.name}`,
    });
  },

  // --- MAPPINGS & WEBHOOKS ---

  updateMapping: (id: string, mapping: IntegrationMapping) => {
    const provider = providersDb.find(p => p.id === id);
    if (!provider) return;

    if (!provider.mappings) provider.mappings = [];
    provider.mappings.push(mapping);
    provider.updatedAt = new Date().toISOString();

    ledgerService._writeEntry({
        eventId: `audit_map_${Date.now()}`,
        accountId: 'acc_baas_master',
        amount: 0,
        currency: Currency.SYSTEM,
        direction: TransactionType.AUDIT,
        source: TransactionSource.INTEGRATION_AUDIT,
        description: `Mapping Added to ${provider.name}`,
    });
  },

  removeMapping: (id: string, index: number) => {
    const provider = providersDb.find(p => p.id === id);
    if (!provider || !provider.mappings) return;
    
    provider.mappings.splice(index, 1);
    provider.updatedAt = new Date().toISOString();
  },

  addWebhook: (id: string, webhook: Omit<WebhookEndpoint, 'id'>) => {
      const provider = providersDb.find(p => p.id === id);
      if (!provider) return;

      if (!provider.webhooks) provider.webhooks = [];
      provider.webhooks.push({ ...webhook, id: `wh_${Date.now()}` });
      provider.updatedAt = new Date().toISOString();

      ledgerService._writeEntry({
          eventId: `audit_wh_${Date.now()}`,
          accountId: 'acc_baas_master',
          amount: 0,
          currency: Currency.SYSTEM,
          direction: TransactionType.AUDIT,
          source: TransactionSource.INTEGRATION_AUDIT,
          description: `Webhook Added to ${provider.name}: ${webhook.url}`,
      });
  },

  removeWebhook: (id: string, webhookId: string) => {
      const provider = providersDb.find(p => p.id === id);
      if (!provider || !provider.webhooks) return;

      provider.webhooks = provider.webhooks.filter(w => w.id !== webhookId);
      provider.updatedAt = new Date().toISOString();
  },

  toggleStatus: (id: string, active: boolean) => {
    const provider = providersDb.find(p => p.id === id);
    if (provider) {
      provider.status = active ? IntegrationStatus.UP : IntegrationStatus.DISABLED;
      provider.updatedAt = new Date().toISOString();
    }
  },

  // --- HEALTH CHECK ---

  runHealthCheck: async (id: string): Promise<{ success: boolean; latency: number; status: IntegrationStatus }> => {
    const provider = providersDb.find(p => p.id === id);
    if (!provider) throw new Error('Provider not found');

    const latency = Math.floor(Math.random() * 500) + 50; 
    const isSuccess = Math.random() > 0.1; 

    return new Promise(resolve => {
      setTimeout(() => {
        const status = isSuccess 
          ? (latency > 400 ? IntegrationStatus.SLOW : IntegrationStatus.UP)
          : IntegrationStatus.DOWN;
        
        provider.status = status;
        provider.lastHealthCheckAt = new Date().toISOString();

        ledgerService._writeEntry({
          eventId: `hc_${Date.now()}`,
          accountId: 'acc_baas_master',
          amount: 0,
          currency: Currency.SYSTEM,
          direction: TransactionType.AUDIT,
          source: TransactionSource.INTEGRATION_AUDIT,
          description: `Health Check ${provider.name}: ${status} (${latency}ms)`
        });

        resolve({ success: isSuccess, latency, status });
      }, latency);
    });
  },

  // --- DICT OPERATIONS CONNECTOR ---

  dictCreateEntry: async (key: string, keyType: string, taxId: string) => {
    await new Promise(r => setTimeout(r, 1200));

    ledgerService._writeEntry({
      eventId: `dict_create_${Date.now()}`,
      accountId: 'acc_baas_master',
      amount: 0,
      currency: Currency.SYSTEM,
      direction: TransactionType.AUDIT,
      source: TransactionSource.DICT_OPERATION,
      description: `DICT Entry Created: ${key} (${keyType})`,
      metadata: { key, keyType, taxId, operation: 'CREATE_ENTRY' }
    });

    return {
      cid: `dict_claim_${Math.floor(Math.random() * 10000)}`,
      status: 'CONFIRMED',
      key,
      keyType,
      participant: '12345678',
      createdAt: new Date().toISOString()
    };
  },

  dictCheckKeys: async (taxId: string) => {
    await new Promise(r => setTimeout(r, 800));

    ledgerService._writeEntry({
      eventId: `dict_check_${Date.now()}`,
      accountId: 'acc_baas_master',
      amount: 0,
      currency: Currency.SYSTEM,
      direction: TransactionType.AUDIT,
      source: TransactionSource.DICT_OPERATION,
      description: `DICT Check Keys for ${taxId}`,
      metadata: { taxId, operation: 'CHECK_KEYS' }
    });

    // Mock response based on input
    if (taxId.endsWith('00')) {
        return {
            taxId,
            entries: [
                { key: '+5511999999999', type: 'PHONE', participant: '12345678', createdAt: '2023-01-01' },
                { key: 'user@agropix.com', type: 'EMAIL', participant: '12345678', createdAt: '2023-01-02' }
            ]
        };
    } else {
        return { taxId, entries: [] };
    }
  },

  // --- OPENAPI PARSER SIMULATION ---
  parseOpenApi: async (content: string) => {
      await new Promise(r => setTimeout(r, 500));
      try {
          const spec = JSON.parse(content);
          return {
              info: spec.info,
              paths: Object.keys(spec.paths || {}).map(p => ({
                  path: p,
                  method: Object.keys(spec.paths[p])[0].toUpperCase(),
                  summary: spec.paths[p][Object.keys(spec.paths[p])[0]].summary
              }))
          }
      } catch (e) {
          throw new Error("Invalid OpenAPI JSON");
      }
  }
};