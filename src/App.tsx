import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import Menu from './components/Menu';
import Admin from './components/Admin';
import Footer from './components/Footer';
import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Settings } from './types';
import { Toaster } from 'sonner';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-[#ece6db] text-gray-900 notranslate" translate="no">
          <div className="bg-white/95 backdrop-blur-md p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-4 border border-black/10">
            <h2 className="text-2xl font-serif font-bold text-amber-900">Ops! Ocorreu um erro</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              {this.state.error?.message?.includes('insertBefore') || this.state.error?.message?.includes('removeChild')
                ? 'Uma extensão do seu navegador (como tradução automática) interferiu na exibição da página.'
                : (this.state.error?.message || 'Houve uma falha momentânea ao carregar esta tela.')}
            </p>
            <div className="pt-2 space-y-2">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="w-full py-3.5 px-6 bg-[#865d39] text-white font-bold rounded-xl shadow-md hover:opacity-90 transition-all cursor-pointer uppercase text-xs tracking-wider"
              >
                Recarregar Cardápio
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = '/';
                }}
                className="w-full py-2.5 text-xs font-bold text-stone-600 hover:text-stone-900 transition-colors uppercase tracking-wider cursor-pointer"
              >
                Voltar ao Início
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeScreen, setActiveScreen] = useState<'intro' | 'selector' | 'menu'>('intro');
  const [settings, setSettings] = useState<Settings>({
    logo: 'https://i.ibb.co/s91dDBK2/mirianpaula.jpg',
    primaryColor: '#865d39',
    whatsappNumber: '',
    whatsappCountryCode: '+55',
    slug: 'miria-paula',
    brandName: 'MIRIA PAULA',
    slogan: 'Cardápio exclusivo e produtos especiais.',
    whatsappClosingMessage: 'Obrigada pelo interesse em nossos produtos, aguarde que entraremos em contato para confirmação!',
    backgroundImage: 'https://i.ibb.co/X0vYy7L/cakes.png',
    glassColor: 'rgba(255, 255, 255, 0.4)',
    textColor: '#000000',
    language: 'pt',
    currency: 'BRL',
    introEnabled: true,
    introTitle: 'MIRIA PAULA',
    introSubtitle: 'Cardápio Especial',
    introDescription: 'Acesse nossos produtos artesanais, novidades e faça seu pedido com praticidade.',
    introButtonText: 'ACESSAR NOSSO CARDÁPIO',
    introBottomText: 'MIRIA PAULA',
    selectorEnabled: false,
    selectorTitle: 'MIRIA PAULA',
    selectorSubtitle: 'Escolha seu cardápio',
    catalog1Title: 'Cardápio Principal',
    catalog1Image: 'https://i.ibb.co/s91dDBK2/mirianpaula.jpg',
    catalog1Desc: 'Nossos produtos e opções exclusivas.',
    catalog1Slogan: 'Qualidade e sabor incomparáveis',
    catalog1Active: true,
    catalog2Title: 'Bebidas & Doces Fit',
    catalog2Image: 'https://i.ibb.co/X0vYy7L/cakes.png',
    catalog2Desc: 'Sucos naturais, smoothies e sobremesas sem açúcar.',
    catalog2Slogan: 'Refrescância e dulçor saudável para o seu dia',
    catalog2Active: false,
    catalog3Title: 'Dietas Low Carb',
    catalog3Image: 'https://i.ibb.co/X0vYy7L/cakes.png',
    catalog3Desc: 'Pratos com baixo teor de carboidratos e ricos em proteínas.',
    catalog3Slogan: 'Mais foco na sua saúde e energia',
    catalog3Active: false,
    catalog4Title: 'Dietas Hipertróficas',
    catalog4Image: 'https://i.ibb.co/X0vYy7L/cakes.png',
    catalog4Desc: 'Refeições com alto teor calórico saudável e ricas em proteínas para ganho de massa.',
    catalog4Slogan: 'Combustível de alta qualidade para o seu treino',
    catalog4Active: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check URL for admin path
    const checkAdmin = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const search = window.location.search;
      if (
        path === '/admin' || 
        path.endsWith('/admin') || 
        hash === '#/admin' || 
        hash === '#admin' || 
        hash.includes('admin') ||
        search.includes('admin=true')
      ) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    };

    checkAdmin();
    window.addEventListener('popstate', checkAdmin);
    window.addEventListener('hashchange', checkAdmin);

    // Load settings for global styles
    const unsub = onSnapshot(doc(db, 'configuracoes', 'geral'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Settings;
        // Set default country code if missing
        if (!data.whatsappCountryCode) {
          data.whatsappCountryCode = '+55';
        }
        if (!data.currency) {
          data.currency = 'BRL';
        }
        setSettings(prev => ({ ...prev, ...data }));
        setLoading(false);

        // Update Page Title
        if (data.brandName) {
          document.title = data.brandName;
        }

        // Update Theme Color
        const themeColorMeta = document.getElementById('theme-color');
        if (themeColorMeta) {
          themeColorMeta.setAttribute('content', data.primaryColor || '#865d39');
        }

        // Set Glass Color CSS Variable
        const glassColor = data.glassColor || 'rgba(255, 255, 255, 0.4)';
        const finalGlassColor = (glassColor.startsWith('#') && glassColor.length === 7) 
          ? `${glassColor}66` 
          : glassColor;
        document.documentElement.style.setProperty('--glass-color', finalGlassColor);

        // Set Text Color CSS Variable
        if (data.textColor) {
          document.documentElement.style.setProperty('--text-color', data.textColor);
        }
      } else {
        setLoading(false);
      }
    }, (error) => {
      console.error('App: Erro ao carregar configurações:', error);
      setLoading(false);
    });

    return () => {
      window.removeEventListener('popstate', checkAdmin);
      window.removeEventListener('hashchange', checkAdmin);
      unsub();
    };
  }, []);

  // Sync theme variables whenever settings change
  useEffect(() => {
    if (settings) {
      if (settings.brandName) {
        document.title = settings.brandName;
      }
      const glassColor = settings.glassColor || 'rgba(255, 255, 255, 0.4)';
      const finalGlassColor = (glassColor.startsWith('#') && glassColor.length === 7) 
        ? `${glassColor}66` 
        : glassColor;
      document.documentElement.style.setProperty('--glass-color', finalGlassColor);

      if (settings.textColor) {
        document.documentElement.style.setProperty('--text-color', settings.textColor);
      }
      if (settings.primaryColor) {
        document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
        const themeColorMeta = document.getElementById('theme-color');
        if (themeColorMeta) {
          themeColorMeta.setAttribute('content', settings.primaryColor);
        }
      }
      if (settings.priceColor) {
        document.documentElement.style.setProperty('--price-color', settings.priceColor);
      }
    }
  }, [settings?.brandName, settings?.glassColor, settings?.textColor, settings?.primaryColor, settings?.priceColor]);

  const glassColor = settings?.glassColor || 'rgba(255, 255, 255, 0.4)';
  const finalGlassColor = (glassColor.startsWith('#') && glassColor.length === 7) 
    ? `${glassColor}66` 
    : glassColor;

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#ece6db]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#865d39] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#865d39] font-medium animate-pulse">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="relative min-h-screen w-full overflow-x-hidden">
        <Toaster position="top-center" richColors />
        {/* Background Image */}
        <div 
          className="fixed inset-0 z-[-2] bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url("${settings?.backgroundImage || 'https://i.ibb.co/X0vYy7L/cakes.png'}")` }}
        />
        
        {/* Glass Overlay */}
        <div 
          className="fixed inset-0 z-[-1] pointer-events-none" 
          style={{ 
            backgroundColor: finalGlassColor,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)'
          }}
        />

        {/* Content */}
        <div className="relative z-0 flex flex-col min-h-screen">
          {isAdmin ? (
            <Admin settings={settings} setSettings={setSettings} setIsAdmin={setIsAdmin} />
          ) : (
            <>
              <Menu 
                settings={{ ...settings, language: 'pt', currency: settings.currency || 'BRL' }} 
                onScreenChange={setActiveScreen}
              />
              <Footer 
                settings={settings} 
                hideActionButtons={activeScreen !== 'menu'}
              />
            </>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
