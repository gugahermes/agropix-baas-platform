import React, { useState } from 'react';
import { 
  CreditCard, LayoutDashboard, Link2, ShieldAlert, FileText, 
  ArrowRight, CheckCircle, AlertTriangle, RefreshCw, Lock,
  Building, User as UserIcon, Briefcase
} from 'lucide-react';
import { baasOrchestratorService } from '../../services/baasOrchestratorService';
import { ledgerService } from '../../services/ledgerService';
import { UnitConversionService } from '../../services/unitConversionService';
import { Currency, AccountType } from '../../types';

interface ConsoleProps {
    initialTab: 'OVERVIEW' | 'CVU' | 'ORCHESTRATOR' | 'LIMITS' | 'LOGS';
}

const TAB_LABELS: Record<ConsoleProps['initialTab'], string> = {
    OVERVIEW: 'VISÃO GERAL',
    CVU: 'CVU',
    ORCHESTRATOR: 'ORQUESTRADOR',
    LIMITS: 'LIMITES',
    LOGS: 'LOGS',
};

export const BaaSOrchestratorConsole: React.FC<ConsoleProps> = ({ initialTab }) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync tab if prop changes (for sidebar navigation)
  React.useEffect(() => {
      setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Link2 className="text-slate-900" />
                BaaS Orchestrator
            </h2>
            <p className="text-slate-500">Núcleo de integração entre Contas Agro (Grãos) e Sistema Bancário (CVU).</p>
          </div>
          <div className="bg-sicredi-50 text-sicredi-700 px-3 py-1 rounded-lg text-xs font-bold border border-sicredi-100 flex items-center gap-2">
              <RefreshCw size={12} className="animate-spin-slow"/> Motor Ativo
          </div>
      </div>

      {/* Internal Tabs */}
      <div className="flex border-b border-slate-200">
          {(['OVERVIEW', 'CVU', 'ORCHESTRATOR', 'LIMITS', 'LOGS'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-6 py-3 text-sm font-bold tracking-wide border-b-2 transition-colors ${
                    activeTab === tab
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                  {TAB_LABELS[tab]}
              </button>
          ))}
      </div>

      <div className="flex-1 overflow-y-auto">
          {activeTab === 'OVERVIEW' && <OverviewTab />}
          {activeTab === 'CVU' && <CvuTab />}
          {activeTab === 'ORCHESTRATOR' && <OrchestratorCoreTab />}
          {activeTab === 'LIMITS' && <LimitsTab />}
          {activeTab === 'LOGS' && <LogsTab />}
      </div>
    </div>
  );
};

// --- TABS ---

const OverviewTab = () => {
    const stats = baasOrchestratorService.getOrchestratorStats();
    const clearingBal = ledgerService.getBalance('acc_agropix_clearing', Currency.BRL);
    const masterBal = ledgerService.getBalance('acc_silo_master_01', Currency.BRL);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-4 gap-6">
                <StatCard label="Sub-CVUs (Produtores)" value={stats.totalCvus} icon={<UserIcon size={20}/>} />
                <StatCard label="Links Ativos" value={stats.activeLinks} icon={<Link2 size={20}/>} color="bg-sicredi-50 text-sicredi-700"/>
                <StatCard label="Silo Master Liquidez" value={UnitConversionService.formatBRL(masterBal)} icon={<Building size={20}/>} color="bg-sicredigold-50 text-sicredigold-700"/>
                <StatCard label="AgroPix Fees" value={UnitConversionService.formatBRL(clearingBal)} icon={<Briefcase size={20}/>} color="bg-sicredigold-50 text-sicredigold-700"/>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4">Exposição x Liquidez</h3>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-slate-500">Liquidez Real (Silo Master)</span>
                                <span className="font-bold text-slate-900">{UnitConversionService.formatBRL(masterBal)}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2">
                                <div className="bg-sicredigold-500 h-2 rounded-full" style={{width: '100%'}}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-slate-500">Limites Concedidos (Total)</span>
                                <span className="font-bold text-slate-900">{UnitConversionService.formatBRL(stats.totalDailyExposure)}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2">
                                <div className="bg-sicredi-500 h-2 rounded-full" style={{width: `${(stats.totalDailyExposure/masterBal)*100}%`}}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-slate-500">Utilizado Hoje (Produtores)</span>
                                <span className="font-bold text-slate-900">{UnitConversionService.formatBRL(stats.usedToday)}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2">
                                <div className="bg-sicredi-500 h-2 rounded-full" style={{width: `${(stats.usedToday/masterBal)*100}%`}}></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4">Clearing & Conciliação</h3>
                    <div className="flex items-center gap-4 text-sm mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-sicredi-500"></div>
                            <span className="text-slate-600">Integridade Ledger</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-sicredi-500"></div>
                            <span className="text-slate-600">Conciliação DICT</span>
                        </div>
                    </div>
                    <div className="p-4 bg-sicredigold-50 rounded-lg border border-sicredigold-100">
                        <span className="text-xs font-bold text-sicredigold-800 uppercase tracking-wide">Comissões Acumuladas</span>
                        <p className="text-2xl font-bold text-sicredigold-900 mt-1">{UnitConversionService.formatBRL(clearingBal)}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

const StatCard = ({ label, value, icon, color = 'bg-white' }: any) => (
    <div className={`${color} p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32`}>
        <div className="flex justify-between items-start text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
            {icon}
        </div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
    </div>
)

const CvuTab = () => {
    const accounts = ledgerService.getAccounts().filter(a => a.type.startsWith('CVU'));
    const masters = accounts.filter(a => a.type === AccountType.CVU_SILO_MASTER);
    const clearing = accounts.find(a => a.type === AccountType.CVU_CLEARING);

    const getSubs = (masterId: string) => accounts.filter(a => a.parentAccountId === masterId);

    return (
        <div className="space-y-6">
            <div className="bg-sicredigold-50 p-4 rounded-xl border border-sicredigold-100 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-sicredigold-900">{clearing?.alias}</h3>
                    <p className="text-xs text-sicredigold-700">Conta de Receita AgroPix</p>
                </div>
                <div className="text-right">
                    <span className="text-xs text-sicredigold-600 font-bold uppercase">Saldo Atual</span>
                    <p className="text-xl font-bold text-sicredigold-900">{UnitConversionService.formatBRL(ledgerService.getBalance(clearing?.id || '', Currency.BRL))}</p>
                </div>
            </div>

            {masters.map(master => {
                const subs = getSubs(master.id);
                return (
                    <div key={master.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-4 bg-sicredigold-50 border-b border-sicredigold-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Building className="text-sicredigold-600"/>
                                <div>
                                    <h3 className="font-bold text-sicredigold-900">{master.alias} (Master)</h3>
                                    <p className="text-xs text-sicredigold-700 font-mono">{master.id}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xs text-sicredigold-600 font-bold uppercase">Liquidez Pool</span>
                                <p className="text-xl font-bold text-sicredigold-900">{UnitConversionService.formatBRL(ledgerService.getBalance(master.id, Currency.BRL))}</p>
                            </div>
                        </div>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                                <tr>
                                    <th className="p-3 pl-8">Sub-Conta (Produtor)</th>
                                    <th className="p-3">Número</th>
                                    <th className="p-3 text-right">Saldo Contábil</th>
                                    <th className="p-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subs.map(sub => (
                                    <tr key={sub.id} className="border-b border-slate-50 hover:bg-slate-50">
                                        <td className="p-3 pl-8 flex items-center gap-2">
                                            <div className="w-1 h-8 bg-slate-200 rounded-full"></div>
                                            <span className="font-medium text-slate-700">{sub.alias}</span>
                                        </td>
                                        <td className="p-3 font-mono text-xs">{sub.accountNumber}</td>
                                        <td className="p-3 text-right font-mono text-slate-600">
                                            {UnitConversionService.formatBRL(ledgerService.getBalance(sub.id, Currency.BRL))}
                                        </td>
                                        <td className="p-3"><span className="bg-sicredi-100 text-sicredi-700 text-xs px-2 py-1 rounded font-bold">ATIVA</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            })}
        </div>
    )
}

const OrchestratorCoreTab = () => {
    const links = baasOrchestratorService.getAllLinks();
    
    return (
        <div className="space-y-6">
            <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                    <Lock size={20} className="text-sicredi-400"/> Fluxo de Autorização
                </h3>
                <p className="text-slate-300 max-w-2xl text-sm">
                    Visualização do fluxo de autorização de pagamentos. A transação só ocorre se passar por todos os Gates (Colateral, Limite, Liquidez Master).
                </p>
            </div>

            <div className="grid gap-6">
                {links.map(link => {
                    // Use Currency.GRAIN_KG as Currency.GRAIN_TON is not defined
                    const agroBal = ledgerService.getBalance(link.agroAccountId, Currency.GRAIN_KG);
                    const masterBal = ledgerService.getBalance(link.siloMasterId, Currency.BRL);
                    const limitOk = link.usedTodayBrl < link.dailyLimitBrl;
                    const liquidityOk = masterBal > 1000; // Mock threshold

                    return (
                        <div key={link.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                            <div className="flex justify-between mb-6">
                                <h4 className="font-bold text-slate-800">Link: {link.id}</h4>
                                <span className="bg-sicredi-100 text-sicredi-800 px-2 py-1 rounded text-xs font-bold">ATIVO</span>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                                {/* Step 1: Grain */}
                                <div className="text-center w-1/4">
                                    <div className="w-10 h-10 mx-auto bg-sicredigold-100 text-sicredigold-600 rounded-full flex items-center justify-center mb-2">
                                        1
                                    </div>
                                    <p className="font-bold text-slate-700">Carteira Agro</p>
                                    <p className="text-slate-500">{UnitConversionService.formatTon(agroBal)}</p>
                                    <CheckCircle size={16} className="mx-auto mt-1 text-sicredi-500" />
                                </div>

                                <ArrowRight className="text-slate-300"/>

                                {/* Step 2: Limit */}
                                <div className="text-center w-1/4">
                                    <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2 ${limitOk ? 'bg-sicredi-100 text-sicredi-600' : 'bg-red-100 text-red-600'}`}>
                                        2
                                    </div>
                                    <p className="font-bold text-slate-700">Limite Diário</p>
                                    <p className="text-slate-500">{Math.round((link.usedTodayBrl/link.dailyLimitBrl)*100)}% Utilizado</p>
                                    {limitOk ? <CheckCircle size={16} className="mx-auto mt-1 text-sicredi-500" /> : <AlertTriangle size={16} className="mx-auto mt-1 text-red-500" />}
                                </div>

                                <ArrowRight className="text-slate-300"/>

                                {/* Step 3: Master Liquidity */}
                                <div className="text-center w-1/4">
                                    <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2 ${liquidityOk ? 'bg-sicredi-100 text-sicredi-600' : 'bg-red-100 text-red-600'}`}>
                                        3
                                    </div>
                                    <p className="font-bold text-slate-700">Liquidez do Silo</p>
                                    <p className="text-slate-500">{liquidityOk ? 'Liquidez OK' : 'Sem Liquidez'}</p>
                                    {liquidityOk ? <CheckCircle size={16} className="mx-auto mt-1 text-sicredi-500" /> : <AlertTriangle size={16} className="mx-auto mt-1 text-red-500" />}
                                </div>

                                <ArrowRight className="text-slate-300"/>

                                {/* Step 4: Pay */}
                                <div className="text-center w-1/4 opacity-50">
                                    <div className="w-10 h-10 mx-auto bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-2">
                                        4
                                    </div>
                                    <p className="font-bold text-slate-700">Pagamento</p>
                                    <p className="text-slate-500">Split Executado</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const LimitsTab = () => {
    const links = baasOrchestratorService.getAllLinks();
    
    return (
        <div className="space-y-6">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm flex items-center gap-3">
                <AlertTriangle size={20}/>
                <span>Atenção: Alterações de limite impactam a liquidez imediata do produtor. Todas as mudanças são auditadas.</span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 text-slate-600">
                        <tr>
                            <th className="p-3">ID do Link</th>
                            <th className="p-3">Conta Agro</th>
                            <th className="p-3">Limite Atual</th>
                            <th className="p-3">Utilizado Hoje</th>
                            <th className="p-3">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {links.map(link => (
                            <tr key={link.id} className="border-b border-slate-50">
                                <td className="p-3 font-mono text-xs">{link.id}</td>
                                <td className="p-3">{link.agroAccountId}</td>
                                <td className="p-3 font-bold">{UnitConversionService.formatBRL(link.dailyLimitBrl)}</td>
                                <td className="p-3 text-slate-500">{UnitConversionService.formatBRL(link.usedTodayBrl)}</td>
                                <td className="p-3">
                                    <button 
                                        onClick={() => alert('Demo: Modal de Edição de Limite')}
                                        className="text-sicredi-600 font-medium hover:underline"
                                    >
                                        Editar Limite
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

const SOURCE_LABELS: Record<string, string> = {
    PIX_IN: 'Pix Recebido',
    PIX_OUT: 'Pix Enviado',
    PIX_SPLIT_FEE: 'Split de Taxa Pix',
    FEE_PLATFORM_SHARE: 'Receita AgroPix',
    FEE_SILO_SHARE: 'Receita do Silo',
    GRAIN_DIGITIZATION: 'Digitalização de Grão',
    GRAIN_PAYMENT: 'Pagamento com Grão',
    INTERNAL_TRANSFER: 'Transferência Interna',
    FEE: 'Taxa',
    ADJUSTMENT: 'Ajuste',
};

const LogsTab = () => {
    const entries = [...ledgerService.getAllEntries()].reverse().slice(0, 30);
    return (
        <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-500">
                Logs de auditoria bancária derivados do ledger universal — cada aprovação de orquestração gera um evento aqui.
            </div>
            {entries.length === 0 ? (
                <div className="p-8 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                    <FileText size={48} className="mx-auto mb-4 opacity-20"/>
                    <h3 className="text-lg font-bold">Nenhum evento registrado ainda</h3>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-black tracking-widest border-b">
                            <tr>
                                <th className="p-4">Quando</th>
                                <th className="p-4">Tipo</th>
                                <th className="p-4">Descrição</th>
                                <th className="p-4 text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {entries.map(e => (
                                <tr key={e.id} className="hover:bg-slate-50">
                                    <td className="p-4 text-slate-400 font-mono text-xs">{new Date(e.timestamp).toLocaleString('pt-BR')}</td>
                                    <td className="p-4 font-bold text-slate-700">{SOURCE_LABELS[e.source] || e.source}</td>
                                    <td className="p-4 text-slate-500">{e.description}</td>
                                    <td className={`p-4 text-right font-black ${e.direction === 'CREDIT' ? 'text-sicredi-600' : 'text-slate-700'}`}>
                                        {e.currency === Currency.BRL ? UnitConversionService.formatBRL(e.amount) : `${e.amount.toLocaleString('pt-BR')} kg`}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}