
import React, { useState } from 'react';
import { 
  Building2, Users, ShoppingBag, Settings, 
  Landmark, Activity, Database, Lock, 
  LayoutDashboard, CreditCard, Link2, ShieldAlert, FileText, CheckCircle, XCircle, ArrowLeft,
  Save, AlertTriangle, TrendingUp, DollarSign, Scale, Zap, Wheat, Globe, ChevronRight
} from 'lucide-react';

// Views
import { IntegrationsView } from './IntegrationsView';
import { BaaSOrchestratorConsole } from './BaaSEngineConfigView';
import { baasEngine, ledgerService } from '../../services/ledgerService';
import { coreService } from '../../services/coreService';
import { baasOrchestratorService } from '../../services/baasOrchestratorService';
import { fiscalEngineService } from '../../services/nfeService';
import { integrationService } from '../../services/integrationService';
import { UnitConversionService } from '../../services/unitConversionService';
import { Currency, Tenant, SiloOperationMode, IntegrationStatus, IntegrationType } from '../../types';

const SILO_SYNC_LABELS: Record<string, string> = {
  HEALTHY: 'Saudável',
  DIVERGENT: 'Divergente',
  ERROR: 'Erro',
  PENDING: 'Pendente',
};

const RAIL_STATUS_LABELS: Record<string, string> = {
  UP: 'Ativo',
  DOWN: 'Fora do Ar',
  SLOW: 'Degradado',
  MAINTENANCE: 'Manutenção',
  DISABLED: 'Desativado',
  ACTIVE: 'Ativo',
};

const INTEGRATION_TYPE_LABELS: Record<string, string> = {
  BANK: 'Banco',
  PIX: 'Pix',
  DICT: 'DICT',
  NFE: 'NF-e',
  OTHER: 'Outro',
};

const NFE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'RASCUNHO',
  ISSUED: 'EMITIDA',
  WEIGHING: 'EM PESAGEM',
  CONFIRMED: 'CONFIRMADA',
  REJECTED: 'REJEITADA',
  CANCELED: 'CANCELADA',
};

// --- CLEAN MENU STRUCTURE ---

const MENU = [
  {
    category: '1. OPERAÇÃO GLOBAL',
    items: [
      { id: 'OP_SILOS', label: 'Gestão de Silos', icon: Building2 },
      { id: 'OP_INTEGRATIONS', label: 'Cross-Integrations', icon: Zap },
      { id: 'OP_ACCOUNTS', label: 'Contas & Wallets', icon: Users },
      { id: 'OP_LEDGER', label: 'Ledger Universal', icon: Database },
    ]
  },
  {
    category: '2. ECOSSISTEMA',
    items: [
      { id: 'ECO_MERCHANTS', label: 'Rede Credenciada', icon: ShoppingBag },
      { id: 'ECO_INTEGRATION', label: 'Integradores BaaS', icon: Activity },
    ]
  },
  {
    category: '3. BAAS ENGINE',
    items: [
      { id: 'BAAS_OVERVIEW', label: 'Painel de Orquestração', icon: LayoutDashboard },
      { id: 'BAAS_LIMITS', label: 'Limites & Políticas', icon: ShieldAlert },
      { id: 'BAAS_FISCAL', label: 'Auditoria Fiscal', icon: Scale },
    ]
  }
];

export const BaaSDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('OP_SILOS'); 
  const [selectedSiloId, setSelectedSiloId] = useState<string | null>(null);

  const renderContent = () => {
    if (activeTab === 'OP_SILOS') {
      if (selectedSiloId) {
        return <MasterSiloDetailView siloId={selectedSiloId} onBack={() => setSelectedSiloId(null)} />;
      }
      return <MasterSilosGridView onSelectSilo={setSelectedSiloId} />;
    }

    switch (activeTab) {
      case 'OP_INTEGRATIONS': return <MasterIntegrationGovernance />;
      case 'OP_ACCOUNTS': return <AccountsView />;
      case 'OP_LEDGER': return <LedgerView />;
      case 'ECO_MERCHANTS': return <MerchantsView />;
      case 'ECO_INTEGRATION': return <IntegrationsView />;
      case 'BAAS_OVERVIEW': return <BaaSOrchestratorConsole initialTab="OVERVIEW" />;
      case 'BAAS_LIMITS': return <BaaSOrchestratorConsole initialTab="LIMITS" />;
      case 'BAAS_FISCAL': return <FiscalAuditView />;
      default: return <div className="p-10 text-slate-400">Selecione uma opção</div>;
    }
  };

  return (
    <div className="flex h-[calc(100vh-100px)] bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-xl">
      {/* Sidebar */}
      <div className="w-64 bg-sicredi-900 text-sicredi-100 flex flex-col">
        <div className="p-6 border-b border-sicredi-800">
          <h2 className="text-white font-bold tracking-wider text-[10px] uppercase opacity-50">AgroPix Master Admin</h2>
          <p className="text-lg font-bold text-white tracking-tighter">Fintech Control</p>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {MENU.map((cat, idx) => (
            <div key={idx}>
              <h3 className="px-6 mb-2 text-[10px] font-black text-sicredi-300 uppercase tracking-widest">{cat.category}</h3>
              <ul>
                {cat.items.map(item => (
                  <li key={item.id}>
                    <button
                      onClick={() => { setActiveTab(item.id); setSelectedSiloId(null); }}
                      className={`w-full flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-colors border-l-4 ${
                        activeTab === item.id 
                          ? 'bg-sicredi-800 text-white border-sicredigold-500'
                          : 'border-transparent hover:bg-sicredi-800 hover:text-white'
                      }`}
                    >
                      <item.icon size={16} />
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50">
        <div className="p-8 max-w-6xl mx-auto h-full">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

// --- MÓDULO MASTER: GESTÃO GLOBAL DE SILOS ---

const MasterSilosGridView = ({ onSelectSilo }: { onSelectSilo: (id: string) => void }) => {
  const tenants = coreService.getTenants();
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Rede de Silos AgroPix</h2>
            <p className="text-slate-500 font-medium">Controle de Custódia e Liquidez Cross-Silo</p>
        </div>
        <div className="flex gap-4">
            <StatCardMini label="Silos Ativos" value={tenants.length} />
            <StatCardMini label="Custódia Total" value="1.2M kg" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {tenants.map(t => {
            const producers = coreService.getProducersBySilo(t.id);
            const totalKg = producers.reduce((acc, p) => acc + ledgerService.getBalance(p.accountId, Currency.GRAIN_KG), 0);
            
            return (
                <div key={t.id} className="bg-white p-6 rounded-[32px] border shadow-sm flex items-center justify-between hover:border-sicredi-300 transition-all cursor-pointer group" onClick={() => onSelectSilo(t.id)}>
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${t.operationMode === SiloOperationMode.NATIVE ? 'bg-sicredi-50 text-sicredi-600' : 'bg-sicredi-50 text-sicredi-600'}`}>
                            <Building2 size={28}/>
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-lg leading-tight">{t.name}</h3>
                            <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">{t.city}, {t.state} • Modo {t.operationMode}</p>
                            
                            <div className="flex items-center gap-4 mt-2">
                                <span className="flex items-center gap-1 text-[10px] font-black text-slate-500 uppercase">
                                    <Users size={12}/> {producers.length} Produtores
                                </span>
                                <span className="flex items-center gap-1 text-[10px] font-black text-slate-500 uppercase">
                                    <Wheat size={12}/> {UnitConversionService.formatSacas(totalKg)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-10">
                        <div className="text-right">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saúde Sync</p>
                             <div className="flex items-center gap-1.5 justify-end">
                                <div className={`w-1.5 h-1.5 rounded-full ${t.integrationSettings.status === 'HEALTHY' ? 'bg-sicredi-500' : 'bg-sicredigold-500'}`}></div>
                                <span className="text-xs font-bold text-slate-700">{t.integrationSettings.status}</span>
                             </div>
                        </div>
                        <div className="text-right">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Liquidez Pool</p>
                             <p className="text-sm font-black text-slate-900">{UnitConversionService.formatBRL(ledgerService.getBalance(t.liquidityConfig.masterAccountId || '', Currency.BRL))}</p>
                        </div>
                        {/* Fix: Added ChevronRight to imports to resolve undefined error */}
                        <ChevronRight className="text-slate-200 group-hover:text-sicredi-500 transition-all" size={24}/>
                    </div>
                </div>
            )
        })}
      </div>
    </div>
  );
};

const MasterSiloDetailView = ({ siloId, onBack }: { siloId: string, onBack: () => void }) => {
    const tenant = coreService.getTenantById(siloId);
    if (!tenant) return null;

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
             <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase hover:text-slate-800 transition-colors mb-4">
                <ArrowLeft size={16}/> Gestão Global
            </button>

            <div className="bg-white p-10 rounded-[40px] border shadow-sm flex justify-between items-center">
                 <div>
                    <span className="bg-sicredi-50 text-sicredi-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{tenant.operationMode}</span>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter mt-4">{tenant.name}</h2>
                    <p className="text-slate-400 font-medium">{tenant.document} • {tenant.city}/{tenant.state}</p>
                 </div>
                 <div className="text-right space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Exposição Agregada</p>
                    <p className="text-3xl font-black text-slate-900">R$ 1,5M</p>
                    <div className="flex items-center gap-2 justify-end">
                        <div className="w-2 h-2 rounded-full bg-sicredi-500 animate-pulse"></div>
                        <span className="text-[10px] font-black text-sicredi-600 uppercase">Integração Ativa</span>
                    </div>
                 </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-[40px] border">
                    <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2"><Globe size={16}/> Configuração de Commodities</h4>
                    <div className="space-y-4">
                        {tenant.commodities.map(c => (
                            <div key={c.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <span className="font-bold text-slate-800">{c.name}</span>
                                <span className="text-xs font-medium text-slate-500">{c.unitVisual} ({c.kgPerUnit}kg)</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[40px] border">
                    <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2"><Zap size={16}/> Status da Sincronização</h4>
                    <div className="p-6 border-2 border-dashed border-slate-100 rounded-[32px] text-center space-y-2">
                         <p className="text-xs font-bold text-slate-600">Protocolo: {tenant.integrationSettings.protocol}</p>
                         <p className="text-xs text-slate-400">Última sync: {tenant.integrationSettings.lastSyncAt || 'Há 15m'}</p>
                         <button className="mt-4 bg-slate-900 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest">Forçar Reconciliação</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

const MasterIntegrationGovernance = () => {
    const tenants = coreService.getTenants();
    const providers = integrationService.getAll();
    const nfeDocs = fiscalEngineService.getAll();

    const siloAlerts = tenants.filter(t => t.integrationSettings.status !== 'HEALTHY');
    const railAlerts = providers.filter(p => p.status !== IntegrationStatus.UP && p.status !== IntegrationStatus.ACTIVE);
    const nfeRejected = nfeDocs.filter(d => d.status === 'REJECTED');
    const totalAlerts = siloAlerts.length + railAlerts.length + nfeRejected.length;

    const StatusDot = ({ ok }: { ok: boolean }) => (
        <div className={`w-2 h-2 rounded-full ${ok ? 'bg-sicredi-500' : 'bg-red-500 animate-pulse'}`} />
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Governança de Integrações</h2>
                    <p className="text-slate-500 font-medium">Visão agregada de alertas, divergências e health-check de todos os conectores.</p>
                </div>
                <div className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest ${totalAlerts === 0 ? 'bg-sicredi-100 text-sicredi-700' : 'bg-red-100 text-red-700'}`}>
                    {totalAlerts === 0 ? 'Tudo Operando' : `${totalAlerts} Alerta(s) Ativo(s)`}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
                <StatCardMini label="Silos com Divergência" value={`${siloAlerts.length} / ${tenants.length}`} />
                <StatCardMini label="Rails Financeiros com Falha" value={`${railAlerts.length} / ${providers.length}`} />
                <StatCardMini label="NF-e Rejeitadas" value={`${nfeRejected.length} / ${nfeDocs.length}`} />
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                        <h3 className="font-black text-sm text-slate-700 uppercase tracking-wide">Conectores de Silo (ERP)</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {tenants.map(t => (
                            <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">{t.name}</p>
                                    <p className="text-[10px] text-slate-400 font-mono uppercase">{t.integrationSettings.protocol} • {t.integrationSettings.lastSyncAt ? new Date(t.integrationSettings.lastSyncAt).toLocaleString('pt-BR') : 'sem sync'}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <StatusDot ok={t.integrationSettings.status === 'HEALTHY'} />
                                    <span className="text-[10px] font-black uppercase text-slate-600">{SILO_SYNC_LABELS[t.integrationSettings.status] || t.integrationSettings.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                        <h3 className="font-black text-sm text-slate-700 uppercase tracking-wide">Rails Bancários & Fiscais</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {providers.map(p => {
                            const ok = p.status === IntegrationStatus.UP || p.status === IntegrationStatus.ACTIVE;
                            return (
                                <div key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">{p.name}</p>
                                        <p className="text-[10px] text-slate-400 font-mono uppercase">{INTEGRATION_TYPE_LABELS[p.type] || p.type} • {p.environment}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <StatusDot ok={ok} />
                                        <span className="text-[10px] font-black uppercase text-slate-600">{RAIL_STATUS_LABELS[p.status] || p.status}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {totalAlerts > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 space-y-2">
                    <h3 className="font-black text-sm text-red-700 uppercase tracking-wide flex items-center gap-2">
                        <AlertTriangle size={16} /> Divergências Detectadas
                    </h3>
                    <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                        {siloAlerts.map(t => <li key={t.id}>Silo <strong>{t.name}</strong>: sync {SILO_SYNC_LABELS[t.integrationSettings.status]?.toLowerCase()}</li>)}
                        {railAlerts.map(p => <li key={p.id}>Rail <strong>{p.name}</strong>: {RAIL_STATUS_LABELS[p.status]?.toLowerCase()}</li>)}
                        {nfeRejected.map(d => <li key={d.id}>NF-e <strong>{d.accessKey.slice(0, 20)}…</strong> rejeitada pela SEFAZ</li>)}
                    </ul>
                </div>
            )}
        </div>
    );
}

const StatCardMini = ({ label, value }: any) => (
    <div className="bg-white px-4 py-2 rounded-xl border shadow-sm">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">{label}</p>
        <p className="text-sm font-black text-slate-900">{value}</p>
    </div>
)

// --- REPRODUÇÃO DOS COMPONENTES ORIGINAIS (ADAPTADOS) ---

const FiscalAuditView = () => {
  const documents = fiscalEngineService.getAll();
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-800">Auditoria Fiscal Global</h2>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">pacs.008 Compliance Ready</div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 uppercase text-[10px] font-black tracking-widest">
            <tr>
              <th className="p-4">Chave / NF</th>
              <th className="p-4">Silo / Origem</th>
              <th className="p-4">Peso</th>
              <th className="p-4">Ledger Ref</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {documents.map(doc => (
              <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-mono text-xs text-slate-500 truncate max-w-[150px]">{doc.accessKey}</td>
                <td className="p-4 font-bold text-slate-700">{coreService.getTenantById(doc.siloId)?.name || doc.siloId}</td>
                <td className="p-4 font-black">{UnitConversionService.formatKg(doc.finalWeightKg || doc.estimatedWeightKg)}</td>
                <td className="p-4 font-mono text-[10px] text-sicredi-600">{doc.digitizationEventId}</td>
                <td className="p-4">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${doc.status === 'CONFIRMED' ? 'bg-sicredi-100 text-sicredi-700' : 'bg-sicredi-100 text-sicredi-700'}`}>
                        {NFE_STATUS_LABELS[doc.status] || doc.status}
                    </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const AccountsView = () => {
  const accounts = baasEngine.getAccounts();
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-slate-800">Contas Agro & CVU</h2>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-black tracking-widest border-b">
            <tr>
              <th className="p-4">Alias</th>
              <th className="p-4">Tipo</th>
              <th className="p-4 text-right">Saldo Contábil</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {accounts.map(acc => {
                const bal = ledgerService.getBalance(acc.id, acc.type === 'AGRO_WALLET' ? Currency.GRAIN_KG : Currency.BRL);
                return (
                    <tr key={acc.id} className="hover:bg-slate-50">
                        <td className="p-4 font-bold text-slate-800">{acc.alias}</td>
                        <td className="p-4 font-mono text-[10px] uppercase text-slate-400">{acc.type}</td>
                        <td className="p-4 text-right font-black">
                            {acc.type === 'AGRO_WALLET' ? UnitConversionService.formatKg(bal) : UnitConversionService.formatBRL(bal)}
                        </td>
                    </tr>
                )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const LedgerView = () => (
    <div className="space-y-6">
        <h2 className="text-2xl font-black text-slate-800">Ledger Universal (Log de Eventos)</h2>
        <div className="bg-slate-900 rounded-3xl p-6 overflow-hidden border-4 border-slate-800 shadow-2xl">
            <table className="w-full text-left font-mono text-[11px] text-slate-400">
                <thead>
                    <tr className="text-slate-600 uppercase">
                        <th className="pb-4">Horário</th>
                        <th className="pb-4">Evento</th>
                        <th className="pb-4">Conta</th>
                        <th className="pb-4 text-right">Valor</th>
                    </tr>
                </thead>
                <tbody>
                    {ledgerService.getAllEntries().slice(0, 15).map(e => (
                        <tr key={e.id} className="border-t border-white/5">
                            <td className="py-2 opacity-60">{new Date(e.timestamp).toLocaleTimeString('pt-BR')}</td>
                            <td className="py-2 text-sicredi-400 font-bold">{e.eventId}</td>
                            <td className="py-2 truncate max-w-[120px]">{e.accountId}</td>
                            <td className={`py-2 text-right font-bold ${e.direction === 'CREDIT' ? 'text-sicredi-400' : 'text-slate-100'}`}>{e.amount.toLocaleString('pt-BR')} {e.currency}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
)

const MerchantsView = () => {
    const merchants = coreService.getMerchants();
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-800">Rede Credenciada</h2>
            <div className="grid grid-cols-2 gap-4">
                {merchants.map(m => (
                    <div key={m.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400"><ShoppingBag size={24}/></div>
                            <div>
                                <h4 className="font-black text-slate-800 tracking-tight">{m.name}</h4>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{m.category}</p>
                            </div>
                        </div>
                        <span className="bg-sicredi-100 text-sicredi-700 text-[10px] px-2 py-0.5 rounded font-black uppercase">Liquidando</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
