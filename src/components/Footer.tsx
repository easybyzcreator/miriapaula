import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Settings } from '../types';
import { getCleanWhatsAppPhone } from '../utils/countryUtils';

interface FooterProps {
  settings?: Settings;
  onOpenAdmin?: () => void;
  hideActionButtons?: boolean;
}

export default function Footer({ settings, hideActionButtons = false }: FooterProps) {
  const [showEventosModal, setShowEventosModal] = useState(false);
  const [showMentoriaModal, setShowMentoriaModal] = useState(false);

  const primaryColor = settings?.primaryColor || '#865d39';
  const rawPhone = settings?.whatsappNumber || '';
  const countryCode = settings?.whatsappCountryCode || '+55';

  const cleanPhone = getCleanWhatsAppPhone(rawPhone, countryCode);

  const isIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  const eventosMsg = "Olá Miria! Gostaria de solicitar um orçamento para festa/evento/grandes quantidades. Podemos verificar a disponibilidade e alinhar os detalhes?";
  const mentoriaMsg = "Olá Miria! Comprei o pó de preparo para pão de mel e gostaria de saber mais detalhes sobre a mentoria particular ou em grupo.";

  const getWhatsAppUrl = (msg: string) => {
    if (!cleanPhone) return '#';
    return isIOS
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`
      : `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  };

  const handleOpenWhatsApp = (url: string) => {
    if (!cleanPhone) {
      toast.error('Número de WhatsApp não configurado no Painel Administrativo.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <footer className="w-full py-8 flex flex-col items-center justify-center gap-4 mt-auto px-4">
      {/* Tags de Ação: EVENTOS & MENTORIA com Question Mark speech bubble no topo */}
      {!hideActionButtons && (
        <div className="flex flex-col items-center justify-center gap-10 mb-12 w-full max-w-xs animate-in fade-in">
          {/* Botão 1: EVENTOS */}
          <div className="relative flex flex-col items-center justify-center w-full max-w-[260px]">
            {/* Speech Bubble com Question Mark acima do botão */}
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-10">
              <div 
                className="relative bg-white font-black text-[13px] w-[26px] h-[26px] rounded-[7px] flex items-center justify-center shadow-md border border-black/5"
                style={{ color: primaryColor }}
              >
                ?
                <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-white" />
              </div>
            </div>

            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowEventosModal(true)}
              className="w-full py-3.5 px-6 rounded-full font-bold text-xs uppercase tracking-widest text-white shadow-md hover:shadow-lg transition-all text-center cursor-pointer border border-white/20 flex items-center justify-center hover:brightness-110"
              style={{ backgroundColor: primaryColor }}
            >
              EVENTOS
            </motion.button>
          </div>

          {/* Botão 2: MENTORIA */}
          <div className="relative flex flex-col items-center justify-center w-full max-w-[260px]">
            {/* Speech Bubble com Question Mark acima do botão */}
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-10">
              <div 
                className="relative bg-white font-black text-[13px] w-[26px] h-[26px] rounded-[7px] flex items-center justify-center shadow-md border border-black/5"
                style={{ color: primaryColor }}
              >
                ?
                <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-white" />
              </div>
            </div>

            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowMentoriaModal(true)}
              className="w-full py-3.5 px-6 rounded-full font-bold text-xs uppercase tracking-widest text-white shadow-md hover:shadow-lg transition-all text-center cursor-pointer border border-white/20 flex items-center justify-center hover:brightness-110"
              style={{ backgroundColor: primaryColor }}
            >
              MENTORIA
            </motion.button>
          </div>
        </div>
      )}

      {/* Tag Miria Paula */}
      <a 
        href="https://www.instagram.com/miriapaula.eu/"
        target="_blank" 
        rel="noopener noreferrer"
        className="mb-2 flex items-center justify-center rounded-2xl bg-[#1c1412] border-2 border-[#424733]/80 hover:scale-105 active:scale-95 transition-all text-center w-[210px] h-[80px] cursor-pointer shadow-lg overflow-hidden p-0"
      >
        <img 
          src="https://i.ibb.co/q3gxGKY7/tag-miria.jpg" 
          alt="Miria Paula" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </a>

      <a 
        href="https://easybyzcreator.com" 
        target="_blank" 
        rel="noopener noreferrer"
        className="group mt-1 flex flex-col items-center cursor-pointer"
        title="Easy Byz Creator"
      >
        <p 
          className="text-[10px] tracking-[0.2em] font-sans font-bold text-[#482E1D] uppercase group-hover:opacity-80 transition-opacity"
          style={{ color: '#482E1D' }}
        >
          DESENVOLVIDO POR
        </p>
        <motion.img 
          src="https://i.ibb.co/Kj1CTDrD/patitour-2026-04-11-T125246-010.png" 
          alt="EasyByz Logo" 
          className="h-[158px] object-contain"
          initial={{ 
            filter: 'brightness(0) saturate(100%) invert(17%) sepia(17%) saturate(1519%) hue-rotate(341deg) brightness(97%) contrast(91%)',
            scale: 0.95
          }}
          whileHover={{ 
            filter: 'brightness(0) saturate(100%) invert(17%) sepia(17%) saturate(1519%) hue-rotate(341deg) brightness(97%) contrast(91%)',
            scale: 1.05
          }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          referrerPolicy="no-referrer"
        />
      </a>

      {/* Pop-up / Modal: EVENTOS */}
      <AnimatePresence>
        {showEventosModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEventosModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-[#ece6db] rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-7 border border-amber-900/10 z-10 space-y-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-900/70 block">
                    Festas & Encomendas Especiais
                  </span>
                  <h3 className="text-xl sm:text-2xl font-serif font-black text-[#2e1d13] leading-tight">
                    Eventos & Grandes Quantidades
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEventosModal(false)}
                  className="p-2 rounded-full bg-black/5 hover:bg-black/10 text-gray-700 transition-colors cursor-pointer shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 bg-white/70 rounded-2xl border border-amber-900/10 shadow-xs">
                <p className="text-sm text-[#3a2618] leading-relaxed font-serif">
                  Para festas, eventos, grandes quantidades ou pedidos especiais, entre em contato antes de finalizar a encomenda. Assim, podemos verificar a disponibilidade para a data desejada, alinhar as quantidades e organizar a produção e combinarmos a retirada.
                </p>
              </div>

              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleOpenWhatsApp(getWhatsAppUrl(eventosMsg))}
                  className="w-full py-4 px-6 rounded-2xl font-bold text-sm text-white shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2.5 hover:brightness-105 active:scale-98 uppercase tracking-wider"
                  style={{ backgroundColor: primaryColor }}
                >
                  <MessageCircle size={18} />
                  <span>Solicitar Orçamento no WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowEventosModal(false)}
                  className="w-full py-2.5 text-xs font-bold text-stone-600 hover:text-stone-900 transition-colors uppercase tracking-wider cursor-pointer text-center block"
                >
                  Voltar ao Cardápio
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pop-up / Modal: MENTORIA */}
      <AnimatePresence>
        {showMentoriaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMentoriaModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-[#ece6db] rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-7 border border-amber-900/10 z-10 space-y-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-900/70 block">
                    Capacitação & Mentoria
                  </span>
                  <h3 className="text-xl sm:text-2xl font-serif font-black text-[#2e1d13] leading-tight">
                    Mentoria do Pão de Mel
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMentoriaModal(false)}
                  className="p-2 rounded-full bg-black/5 hover:bg-black/10 text-gray-700 transition-colors cursor-pointer shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 bg-white/70 rounded-2xl border border-amber-900/10 shadow-xs">
                <p className="text-sm text-[#3a2618] leading-relaxed font-serif">
                  Comprei o pó de preparo para pão de mel e gostaria de saber mais detalhes sobre mentoria particular ou em grupo.
                </p>
              </div>

              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleOpenWhatsApp(getWhatsAppUrl(mentoriaMsg))}
                  className="w-full py-4 px-6 rounded-2xl font-bold text-sm text-white shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2.5 hover:brightness-105 active:scale-98 uppercase tracking-wider"
                  style={{ backgroundColor: primaryColor }}
                >
                  <MessageCircle size={18} />
                  <span>Saber Mais sobre a Mentoria</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowMentoriaModal(false)}
                  className="w-full py-2.5 text-xs font-bold text-stone-600 hover:text-stone-900 transition-colors uppercase tracking-wider cursor-pointer text-center block"
                >
                  Voltar ao Cardápio
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </footer>
  );
}
