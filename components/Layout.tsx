
import React from 'react';
import { User, UserRole } from '../types';
import { LogOut, Bell, Home, Wheat, CreditCard, FileText, Menu as MenuIcon, User as UserIcon, ArrowLeft, QrCode, Scan } from 'lucide-react';

interface LayoutProps {
  user: User;
  onLogout: () => void;
  children: React.ReactNode;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ user, onLogout, children, activeTab, setActiveTab }) => {
  const isProducer = user.role === UserRole.PRODUCER;

  const goHome = () => {
    if (setActiveTab) setActiveTab('HOME');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* App Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 h-16 shrink-0">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={goHome} className="flex items-center gap-3 active:scale-95 transition-transform">
              <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg p-1.5">
                <img src={`${import.meta.env.BASE_URL}logo-icon.png`} alt="AgroPix" className="w-full h-full object-contain" />
              </div>
              <div className="hidden sm:flex flex-col leading-none text-left">
                <span className="font-black text-slate-900 tracking-tight">AgroPix</span>
                <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">Fintech</span>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2.5 bg-slate-50 text-slate-400 rounded-full hover:text-slate-600 transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-green-500 rounded-full border-2 border-white"></span>
            </button>
            
            <div className="h-6 w-px bg-slate-200 mx-1"></div>
            
            <button 
              onClick={onLogout}
              className="p-2.5 text-slate-400 hover:text-red-600 rounded-full transition-colors"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={`flex-1 w-full max-w-7xl mx-auto px-4 py-4 md:py-8 overflow-x-hidden ${isProducer && setActiveTab ? 'pb-32 md:pb-8' : ''}`}>
        {children}
      </main>

      {/* Bottom Navigation - Producer Only (Mobile) */}
      {isProducer && setActiveTab && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
           {/* Shadow Overlay */}
           <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-900/5 to-transparent pointer-events-none"></div>

           <nav className="relative bg-white/95 backdrop-blur-md border-t border-slate-100 px-4 pt-2 pb-3 flex justify-around items-center shadow-[0_-8px_24px_rgba(0,0,0,0.05)]">
              <BottomNavItem
                active={activeTab === 'HOME'}
                icon={<Home size={22}/>}
                label="Início"
                onClick={() => setActiveTab('HOME')}
              />
              <BottomNavItem
                active={activeTab === 'GRAINS'}
                icon={<Wheat size={22}/>}
                label="Grãos"
                onClick={() => setActiveTab('GRAINS')}
              />

              {/* Central Action Button (PAGAR) */}
              <div className="relative -mt-10 w-16 shrink-0">
                  <button
                    onClick={() => setActiveTab('PAY_PIX')}
                    aria-label="Pagar"
                    className="w-16 h-16 bg-slate-900 text-white rounded-full flex flex-col items-center justify-center shadow-xl shadow-slate-400 active:scale-90 transition-transform border-4 border-white cursor-pointer"
                  >
                    <Scan size={28} strokeWidth={2.5}/>
                  </button>
                  <span className="block mt-1.5 text-center text-[10px] font-black text-slate-900 uppercase tracking-tighter">PAGAR</span>
              </div>

              <BottomNavItem
                active={activeTab === 'NFE'}
                icon={<FileText size={22}/>}
                label="NF-e"
                onClick={() => setActiveTab('NFE')}
              />
              <BottomNavItem
                active={activeTab === 'MENU'}
                icon={<UserIcon size={22}/>}
                label="Perfil"
                onClick={() => setActiveTab('MENU')}
              />
           </nav>
        </div>
      )}
    </div>
  );
};

const BottomNavItem = ({ active, icon, label, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-12 gap-1 transition-all ${
      active ? 'text-slate-900 scale-110' : 'text-slate-400'
    }`}
  >
    <div className="relative">
        {icon}
        {active && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-slate-900 rounded-full"></div>}
    </div>
    <span className={`text-[8px] font-black uppercase tracking-tighter ${active ? 'opacity-100' : 'opacity-60'}`}>
      {label}
    </span>
  </button>
);
