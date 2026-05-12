import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Monitor, Smartphone, Layout } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => void;
}

export function PWAInstallModal({ isOpen, onClose, onInstall }: PWAInstallModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* Header / Glow */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-cyan-500/10 blur-[100px] pointer-events-none" />
            
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="p-8 sm:p-10 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-800 mb-6 relative overflow-hidden group">
                <div className="absolute inset-0 bg-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <img src="/app-icon.svg" alt="Mupa" className="w-12 h-12 relative z-10" />
              </div>

              <h2 className="text-3xl font-bold text-white mb-3">
                Instalar Mupa Pro
              </h2>
              <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                Transforme este dispositivo em um terminal profissional. Funciona offline, em tela cheia e com máxima performance.
              </p>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="flex flex-col items-center gap-2 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                  <Monitor className="w-6 h-6 text-cyan-400" />
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Fullscreen</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                  <Layout className="w-6 h-6 text-blue-400" />
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Kiosk Mode</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                  <Smartphone className="w-6 h-6 text-purple-400" />
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Native feel</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button 
                  onClick={onInstall}
                  className="w-full py-8 text-xl font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-2xl shadow-lg shadow-cyan-500/20 transition-all active:scale-[0.98]"
                >
                  <Download className="w-6 h-6 mr-2" />
                  INSTALAR APLICATIVO
                </Button>
                <button 
                  onClick={onClose}
                  className="text-slate-500 hover:text-slate-300 text-sm font-medium py-2 transition-colors"
                >
                  Talvez mais tarde
                </button>
              </div>
            </div>
            
            <div className="bg-slate-800/50 p-4 text-center border-t border-slate-800">
              <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-medium">
                Experiência Profissional Enterprise
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
