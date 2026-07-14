import React, { useState, useEffect } from 'react';
import { 
  Server, Shield, Activity, RefreshCw, Key, Globe, 
  CheckCircle, AlertTriangle, XCircle, Search, Save, 
  RotateCw, Terminal, Plus, Play, FileJson,
  Settings, ArrowRight, Trash2, Link as LinkIcon, Lock
} from 'lucide-react';
import { integrationService } from '../../services/integrationService';
import { pixService } from '../../services/pixService';
import { IntegrationProvider, IntegrationStatus, IntegrationType, AuthMode, IntegrationEnvironment, WebhookEndpoint, DictEntry } from '../../types';

export const IntegrationsView: React.FC = () => {
  const [providers, setProviders] = useState<IntegrationProvider[]>(integrationService.getAll());
  const [selectedId, setSelectedId] = useState<string | null>(providers[0]?.id || null);
  const [isWizardOpen, setWizardOpen] = useState(false);

  const selectedProvider = providers.find(p => p.id === selectedId);

  const refreshList = () => {
    setProviders([...integrationService.getAll()]);
  };

  const handleCreateSuccess = (newId: string) => {
    refreshList();
    setSelectedId(newId);
    setWizardOpen(false);
  };

  const handleDelete = (id: string) => {
      if(window.confirm('Tem certeza? Isso irá interromper serviços vinculados.')) {
          integrationService.deleteProvider(id);
          refreshList();
          setSelectedId(null);
      }
  }

  if (isWizardOpen) {
      return <CreateIntegratorWizard onCancel={() => setWizardOpen(false)} onSuccess={handleCreateSuccess} />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Server className="text-sicredi-600" />
            Integradores & Rails
          </h2>
          <p className="text-slate-500">Gestão de conexões bancárias, PIX/DICT e documentos fiscais</p>
        </div>
        <button 
            onClick={() => setWizardOpen(true)}
            className="bg-sicredi-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-sicredi-700 flex items-center gap-2"
        >
          <Plus size={18} /> Novo Integrador
        </button>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Left Column: List */}
        <div className="w-1/3 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar integrador..." 
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-sicredi-500" 
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {providers.map(p => (
              <button 
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`w-full text-left p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors ${selectedId === p.id ? 'bg-sicredi-50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-slate-800">{p.name}</span>
                  <StatusBadge status={p.status} />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                  <span className="bg-slate-200 px-1.5 py-0.5 rounded">{p.type}</span>
                  <span className="bg-slate-200 px-1.5 py-0.5 rounded">{p.environment}</span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1">
                  <Activity size={12} /> Check: {p.lastHealthCheckAt ? new Date(p.lastHealthCheckAt).toLocaleTimeString() : 'N/A'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Details */}
        <div className="w-2/3 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden shadow-sm">
          {selectedProvider ? (
            <ProviderDetail 
                key={selectedProvider.id} 
                provider={selectedProvider} 
                onUpdate={refreshList} 
                onDelete={() => handleDelete(selectedProvider.id)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <Server size={48} className="mb-4 opacity-20"/>
              <p>Selecione um integrador para configurar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const StatusBadge = ({ status }: { status: IntegrationStatus }) => {
  const styles = {
    [IntegrationStatus.UP]: 'bg-sicredi-100 text-sicredi-700',
    [IntegrationStatus.DOWN]: 'bg-red-100 text-red-700',
    [IntegrationStatus.SLOW]: 'bg-sicredigold-100 text-sicredigold-700',
    [IntegrationStatus.MAINTENANCE]: 'bg-slate-100 text-slate-500',
    [IntegrationStatus.DISABLED]: 'bg-gray-100 text-gray-500',
    [IntegrationStatus.ACTIVE]: 'bg-sicredi-100 text-sicredi-600'
  };
  const Icons = {
    [IntegrationStatus.UP]: CheckCircle,
    [IntegrationStatus.DOWN]: XCircle,
    [IntegrationStatus.SLOW]: Activity,
    [IntegrationStatus.MAINTENANCE]: AlertTriangle,
    [IntegrationStatus.DISABLED]: XCircle,
    [IntegrationStatus.ACTIVE]: CheckCircle
  };
  const Icon = Icons[status] || Activity;

  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${styles[status]}`}>
      <Icon size={12} /> {status}
    </span>
  );
};

const ProviderDetail: React.FC<{ provider: IntegrationProvider, onUpdate: () => void, onDelete: () => void }> = ({ provider, onUpdate, onDelete }) => {
  const [tab, setTab] = useState<'CONFIG' | 'WEBHOOKS' | 'MAPPING' | 'LOGS' | 'DICT'>('CONFIG');
  const [testing, setTesting] = useState(false);

  const runTest = async () => {
    setTesting(true);
    await integrationService.runHealthCheck(provider.id);
    setTesting(false);
    onUpdate();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
        <div>
           <div className="flex items-center gap-3 mb-1">
             <h3 className="text-xl font-bold text-slate-900">{provider.name}</h3>
             <StatusBadge status={provider.status} />
           </div>
           <p className="text-sm text-slate-500 font-mono flex items-center gap-1"><Globe size={12}/> {provider.baseUrl || 'Sem URL Base'}</p>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={runTest} 
             disabled={testing}
             className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50"
           >
             <RefreshCw size={16} className={testing ? 'animate-spin' : ''} />
             {testing ? 'Testando...' : 'Check Status'}
           </button>
           <button 
             onClick={onDelete}
             className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-red-50 text-red-600 hover:text-red-700"
           >
             <Trash2 size={16}/>
           </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 border-b border-slate-100 flex gap-6">
        {['CONFIG', 'WEBHOOKS', 'MAPPING', 'LOGS'].map(t => (
          <button 
            key={t}
            onClick={() => setTab(t as any)}
            className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${tab === t ? 'border-sicredi-600 text-sicredi-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {t}
          </button>
        ))}
        {provider.type === IntegrationType.DICT && (
          <button 
            onClick={() => setTab('DICT')}
            className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-1 ${tab === 'DICT' ? 'border-sicredigold-500 text-sicredigold-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <Key size={14} /> DICT / PIX Engine
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
        {tab === 'CONFIG' && <ConfigTab provider={provider} onSave={onUpdate} />}
        {tab === 'WEBHOOKS' && <WebhooksTab provider={provider} onUpdate={onUpdate} />}
        {tab === 'MAPPING' && <MappingTab provider={provider} onUpdate={onUpdate} />}
        {tab === 'LOGS' && <LogsTab />}
        {tab === 'DICT' && <DictTab />}
      </div>
    </div>
  );
};

const ConfigTab = ({ provider, onSave }: { provider: IntegrationProvider, onSave: () => void }) => {
    const [form, setForm] = useState(provider);
    const [isDirty, setIsDirty] = useState(false);

    const handleChange = (field: string, value: any) => {
        setForm(prev => ({...prev, [field]: value}));
        setIsDirty(true);
    };

    const handleSave = () => {
        integrationService.save(form);
        setIsDirty(false);
        onSave();
        alert('Configurações salvas!');
    };

    return (
        <div className="max-w-2xl space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Settings size={18} className="text-slate-500"/> Parâmetros Gerais
                </h4>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ambiente</label>
                        <select 
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-sm" 
                            value={form.environment}
                            onChange={(e) => handleChange('environment', e.target.value)}
                        >
                            <option value={IntegrationEnvironment.SANDBOX}>Sandbox</option>
                            <option value={IntegrationEnvironment.PRODUCTION}>Produção</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Auth Mode</label>
                        <select 
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-sm" 
                            value={form.authMode}
                            onChange={(e) => handleChange('authMode', e.target.value)}
                        >
                            <option value={AuthMode.OAUTH2_MTLS}>OAuth2 + mTLS</option>
                            <option value={AuthMode.MTLS}>mTLS Puro</option>
                            <option value={AuthMode.API_KEY}>API Key</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Base URL</label>
                    <input 
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-sm font-mono"
                        value={form.baseUrl}
                        onChange={(e) => handleChange('baseUrl', e.target.value)}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Timeout (ms)</label>
                        <input 
                            type="number"
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-sm"
                            value={form.timeoutMs}
                            onChange={(e) => handleChange('timeoutMs', parseInt(e.target.value))}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Retries</label>
                        <input 
                            type="number"
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-sm"
                            value={form.retries}
                            onChange={(e) => handleChange('retries', parseInt(e.target.value))}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Shield size={18} className="text-slate-500"/> Credenciais (Vault Mock)
                </h4>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Client ID</label>
                        <input className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-sm" defaultValue={form.credentials.clientId} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Client Secret</label>
                        <input type="password" className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-sm" defaultValue="***********" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">mTLS Certificate Fingerprint</label>
                        <input className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-sm font-mono text-xs text-slate-400" defaultValue={form.credentials.mtlsCertFingerprint} disabled/>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button 
                    onClick={handleSave}
                    disabled={!isDirty}
                    className="bg-sicredi-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-sicredi-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    <Save size={18}/> Salvar Alterações
                </button>
            </div>
        </div>
    );
};

const WebhooksTab = ({ provider, onUpdate }: { provider: IntegrationProvider, onUpdate: () => void }) => {
    const [url, setUrl] = useState('');
    const [event, setEvent] = useState('');

    const handleAdd = () => {
        if (!url || !event) return;
        integrationService.addWebhook(provider.id, {
            url,
            events: [event],
            enabled: true,
            secretMasked: 'whsec_****'
        });
        setUrl('');
        setEvent('');
        onUpdate();
    }

    const handleRemove = (id: string) => {
        integrationService.removeWebhook(provider.id, id);
        onUpdate();
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="font-bold text-slate-800 mb-4">Adicionar Endpoint de Retorno</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Webhook URL</label>
                        <input 
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-sm" 
                            placeholder="https://api.agropix.com/webhooks/..."
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Event Trigger</label>
                        <input 
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-sm" 
                            placeholder="Ex: PAYMENT_CONFIRMED"
                            value={event}
                            onChange={e => setEvent(e.target.value)}
                        />
                    </div>
                </div>
                <button 
                    onClick={handleAdd}
                    className="mt-4 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800"
                >
                    Registrar Webhook
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                        <tr>
                            <th className="p-4">URL</th>
                            <th className="p-4">Events</th>
                            <th className="p-4">Secret</th>
                            <th className="p-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {(provider.webhooks || []).map((wh) => (
                            <tr key={wh.id}>
                                <td className="p-4 font-mono text-xs">{wh.url}</td>
                                <td className="p-4"><span className="bg-sicredi-100 text-sicredi-700 px-2 py-1 rounded text-xs font-bold">{wh.events[0]}</span></td>
                                <td className="p-4 text-slate-400 text-xs">{wh.secretMasked}</td>
                                <td className="p-4 text-right">
                                    <button onClick={() => handleRemove(wh.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                        {(!provider.webhooks || provider.webhooks.length === 0) && (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-slate-400">Nenhum webhook configurado.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

const MappingTab = ({ provider, onUpdate }: { provider: IntegrationProvider, onUpdate: () => void }) => {
    const [extEvent, setExtEvent] = useState('');
    const [intEvent, setIntEvent] = useState('');
    const [transform, setTransform] = useState('{"amount": "$.amount", "id": "$.txId"}');

    const handleAdd = () => {
        if(!extEvent || !intEvent) return;
        integrationService.updateMapping(provider.id, {
            externalEvent: extEvent,
            internalEvent: intEvent,
            transformJson: transform
        });
        setExtEvent('');
        setIntEvent('');
        onUpdate();
    }

    const handleRemove = (idx: number) => {
        integrationService.removeMapping(provider.id, idx);
        onUpdate();
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                 <h4 className="font-bold text-slate-800 mb-4">Mapeamento de Eventos (Event Sourcing)</h4>
                 <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-xs font-bold mb-1">Evento Externo (Banco)</label>
                        <input className="w-full p-2 border rounded bg-slate-50" placeholder="Ex: PIX_RECEIVED" value={extEvent} onChange={e => setExtEvent(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1">Evento Interno (Ledger)</label>
                        <input className="w-full p-2 border rounded bg-slate-50" placeholder="Ex: PIX_IN" value={intEvent} onChange={e => setIntEvent(e.target.value)} />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1">Transform JSON (JMESPath/JsonPath)</label>
                    <textarea className="w-full p-2 border rounded font-mono text-xs bg-slate-50" rows={2} value={transform} onChange={e => setTransform(e.target.value)} />
                </div>
                <button onClick={handleAdd} className="mt-4 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold">Adicionar Mapa</button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 uppercase text-xs text-slate-500 border-b">
                        <tr>
                            <th className="p-4">External</th>
                            <th className="p-4">-{'>'}</th>
                            <th className="p-4">Internal</th>
                            <th className="p-4">Transform</th>
                            <th className="p-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {(provider.mappings || []).map((m, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                                <td className="p-4 font-mono font-bold text-slate-700">{m.externalEvent}</td>
                                <td className="p-4 text-slate-400"><ArrowRight size={16}/></td>
                                <td className="p-4 font-mono text-sicredi-600 font-bold">{m.internalEvent}</td>
                                <td className="p-4 font-mono text-xs text-slate-500 truncate max-w-xs" title={m.transformJson}>{m.transformJson}</td>
                                <td className="p-4 text-right">
                                    <button onClick={() => handleRemove(i)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                         {(!provider.mappings || provider.mappings.length === 0) && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-400">Nenhum mapeamento configurado.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

const DictTab = () => {
    const [searchKey, setSearchKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [entry, setEntry] = useState<DictEntry | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!searchKey) return;
        setLoading(true);
        setError(null);
        setEntry(null);

        try {
            // First: Identify Key Type (Engine Logic)
            const type = pixService.detectKeyType(searchKey);
            if (!type) {
                throw new Error("Formato de chave inválido (Validação Regex Falhou).");
            }

            // Second: Call DICT
            const res = await pixService.getEntry(searchKey, '12345678');
            setEntry(res.Data.Entry);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                 <div>
                     <h3 className="font-bold text-slate-800">DICT Operations Console</h3>
                     <p className="text-xs text-slate-500">Diretório de Identificadores de Contas Transacionais (BACEN Compliant)</p>
                 </div>
                 <div className="flex items-center gap-2 bg-sicredi-50 text-sicredi-700 px-3 py-2 rounded-lg text-xs font-bold border border-sicredi-100">
                     <Lock size={12}/> API v2.8.0
                 </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Search size={18}/> Consulta de Chave (GetEntry)</h4>
                <div className="flex gap-2 mb-4">
                    <input 
                        className="flex-1 p-3 border rounded-lg bg-slate-50 text-sm font-mono" 
                        placeholder="CPF, CNPJ, Email, Telefone (+55...) ou EVP"
                        value={searchKey}
                        onChange={e => setSearchKey(e.target.value)}
                    />
                    <button 
                        onClick={handleSearch}
                        disabled={loading}
                        className="bg-sicredi-600 text-white px-6 py-2 rounded-lg font-bold text-sm disabled:opacity-50"
                    >
                        {loading ? 'Consultando...' : 'Resolver Chave'}
                    </button>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 text-red-700 border border-red-100 rounded-lg text-sm flex items-center gap-2">
                        <XCircle size={16}/> {error}
                    </div>
                )}

                {entry && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden mt-6">
                        <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500 uppercase">Resultado da Consulta (pacs.008 ready)</span>
                            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded font-mono">{entry.KeyType}</span>
                        </div>
                        <div className="p-6 grid grid-cols-2 gap-8">
                            <div>
                                <h5 className="text-sm font-bold text-slate-800 mb-3 border-b pb-1">Owner (Titular)</h5>
                                <div className="space-y-2 text-sm">
                                    <p><span className="text-slate-500">Nome:</span> <span className="font-medium">{entry.Owner.Name}</span></p>
                                    <p><span className="text-slate-500">Doc:</span> <span className="font-mono">{entry.Owner.TaxIdNumber}</span></p>
                                    <p><span className="text-slate-500">Tipo:</span> {entry.Owner.Type}</p>
                                </div>
                            </div>
                            <div>
                                <h5 className="text-sm font-bold text-slate-800 mb-3 border-b pb-1">Account (Domicílio)</h5>
                                <div className="space-y-2 text-sm">
                                    <p><span className="text-slate-500">ISPB:</span> <span className="font-mono bg-yellow-100 px-1 rounded">{entry.Account.Participant}</span></p>
                                    <p><span className="text-slate-500">Agência:</span> {entry.Account.Branch}</p>
                                    <p><span className="text-slate-500">Conta:</span> {entry.Account.AccountNumber}</p>
                                    <p><span className="text-slate-500">Tipo:</span> {entry.Account.AccountType}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

const LogsTab = () => (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center text-slate-400">
        <Terminal size={48} className="mx-auto mb-4 opacity-20"/>
        <h3 className="font-bold">Logs de Transmissão</h3>
        <p>Histórico de chamadas HTTP e respostas dos integradores.</p>
    </div>
)

// --- WIZARD COMPONENT ---

const CreateIntegratorWizard = ({ onCancel, onSuccess }: { onCancel: () => void, onSuccess: (id: string) => void }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<Partial<IntegrationProvider>>({
        environment: IntegrationEnvironment.SANDBOX,
        type: IntegrationType.BANK,
        authMode: AuthMode.OAUTH2
    });

    const handleNext = async () => {
        if (step === 3) {
            const created = integrationService.createProvider(formData);
            onSuccess(created.id);
        } else {
            setStep(s => s + 1);
        }
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-3xl mx-auto my-10 overflow-hidden flex flex-col">
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">Novo Integrador - Passo {step}/3</h2>
                <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">Cancelar</button>
            </div>
            
            <div className="p-8 flex-1 overflow-y-auto">
                {step === 1 && (
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg mb-4">Identificação</h3>
                        <div>
                            <label className="block text-sm font-bold mb-1">Nome do Integrador</label>
                            <input className="w-full p-2 border rounded" placeholder="Ex: Banco do Brasil" 
                                value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">Tipo</label>
                                <select className="w-full p-2 border rounded" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                                    <option value="BANK">Banco</option>
                                    <option value="PIX">PIX PSP</option>
                                    <option value="DICT">DICT</option>
                                    <option value="NFE">NFe</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Ambiente</label>
                                <select className="w-full p-2 border rounded" value={formData.environment} onChange={e => setFormData({...formData, environment: e.target.value as any})}>
                                    <option value="SANDBOX">Sandbox</option>
                                    <option value="PRODUCTION">Produção</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">Base URL</label>
                            <input className="w-full p-2 border rounded" placeholder="https://api.banco.com.br" 
                                value={formData.baseUrl || ''} onChange={e => setFormData({...formData, baseUrl: e.target.value})} />
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg mb-4">Autenticação & Cofre</h3>
                        <div>
                             <label className="block text-sm font-bold mb-1">Modo de Autenticação</label>
                             <select className="w-full p-2 border rounded" value={formData.authMode} onChange={e => setFormData({...formData, authMode: e.target.value as any})}>
                                 <option value="OAUTH2">OAuth2</option>
                                 <option value="MTLS">mTLS</option>
                                 <option value="API_KEY">API Key</option>
                             </select>
                        </div>
                        <div className="p-4 bg-slate-50 border rounded text-sm text-slate-500">
                            Campos de credencial seriam exibidos aqui baseados na seleção. (Simulado)
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg mb-4">Revisão</h3>
                        <p className="text-sm text-slate-500">Confirme os dados para criar o integrador.</p>
                        <div className="p-4 border rounded bg-slate-50 space-y-2 text-sm">
                            <p><strong>Nome:</strong> {formData.name}</p>
                            <p><strong>Tipo:</strong> {formData.type}</p>
                            <p><strong>URL:</strong> {formData.baseUrl}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between">
                {step > 1 ? (
                    <button onClick={() => setStep(s => s - 1)} className="px-4 py-2 text-slate-600 font-bold">Voltar</button>
                ) : <div></div>}
                
                <button onClick={handleNext} className="bg-sicredi-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-sicredi-700 flex items-center gap-2">
                    {step === 3 ? 'Criar Integrador' : 'Próximo'} <ArrowRight size={16}/>
                </button>
            </div>
        </div>
    );
};