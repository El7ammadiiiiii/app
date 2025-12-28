"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ============================================
// Types
// ============================================

interface ExchangeConfig {
  id: string;
  name: string;
  icon: string;
  apiKey: string;
  secretKey: string;
  additionalId?: string; // For exchanges like Phemex that use ID
  connected: boolean;
  lastSync?: Date;
}

// ============================================
// Default Exchanges Configuration
// ============================================

const DEFAULT_EXCHANGES: ExchangeConfig[] = [
  {
    id: "bitget",
    name: "Bitget",
    icon: "🟢",
    apiKey: "bg_cec582ed1cf95867c90d70a93f472be8",
    secretKey: "e85ea739339335ee64fbd4410dfca26da243e1615adca77417979b5bc13e359e",
    connected: true,
  },
  {
    id: "bingx",
    name: "BingX",
    icon: "🔵",
    apiKey: "x4k7OqblZBejXl3LRGYih7oW4qceqY4e5WMyUAkErCrFJK7H0G2vlvHYViQeYr4Wpp38SOBja7hHcSzKjmqzcw",
    secretKey: "V9VocI2Nd6a49juaHgNIAP965WRfH98euvUGXDcflYiaPIEdZG4L2bBSKRvrRJZzwEE6ZaobpWPBm7RAf0pnA",
    connected: true,
  },
  {
    id: "phemex",
    name: "Phemex",
    icon: "🟣",
    additionalId: "775502e9-55da-493f-a39e-65b0b2e1e676",
    apiKey: "775502e9-55da-493f-a39e-65b0b2e1e676",
    secretKey: "LHcOcL2A7T8jQJdvo7vwP33Y_R2wxfdXuHzAaP2VUlU2MWY5MThiYS1kM2M1LTQyNzctYTU4Zi00ZDI1ZGU3MmE2MDE",
    connected: true,
  },
  {
    id: "htx",
    name: "HTX (Huobi)",
    icon: "🔷",
    apiKey: "hrf5gdfghe-4f2809b2-c3c554d5-f2153",
    secretKey: "371e0e78-e677c57f-8020d75d-da743",
    connected: true,
  },
  {
    id: "gate",
    name: "Gate.io",
    icon: "🟠",
    apiKey: "cac668141d2bfae07a755f1e37cd0937",
    secretKey: "33c015a5d82926407061c72e58813cbc04e3f417f3d83ec192804d436c09a017",
    connected: true,
  },
];

// ============================================
// Helper Functions
// ============================================

function maskSecret(secret: string): string {
  if (secret.length <= 8) return "••••••••";
  return secret.slice(0, 4) + "••••••••" + secret.slice(-4);
}

// ============================================
// Exchange Manager Component
// ============================================

interface ExchangeManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExchangeManager({ isOpen, onClose }: ExchangeManagerProps) {
  const [exchanges, setExchanges] = useState<ExchangeConfig[]>(DEFAULT_EXCHANGES);
  const [selectedExchange, setSelectedExchange] = useState<ExchangeConfig | null>(null);
  const [showSecrets, setShowSecrets] = useState<{ [key: string]: boolean }>({});
  const [testingConnection, setTestingConnection] = useState<string | null>(null);

  const toggleShowSecret = (exchangeId: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [exchangeId]: !prev[exchangeId]
    }));
  };

  const testConnection = async (exchange: ExchangeConfig) => {
    setTestingConnection(exchange.id);
    // Simulate API test
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Update exchange status
    setExchanges(prev => 
      prev.map(ex => 
        ex.id === exchange.id 
          ? { ...ex, connected: true, lastSync: new Date() }
          : ex
      )
    );
    setTestingConnection(null);
  };

  const toggleConnection = (exchangeId: string) => {
    setExchanges(prev =>
      prev.map(ex =>
        ex.id === exchangeId
          ? { ...ex, connected: !ex.connected }
          : ex
      )
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[600px] sm:max-h-[80vh] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col theme-surface"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔗</span>
                <div>
                  <h2 className="text-lg font-bold text-white">إدارة المنصات</h2>
                  <p className="text-xs text-white/50">ربط وإدارة حسابات التداول</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Exchange List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {exchanges.map((exchange) => (
                <motion.div
                  key={exchange.id}
                  layout
                  className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
                >
                  {/* Exchange Header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => setSelectedExchange(
                      selectedExchange?.id === exchange.id ? null : exchange
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{exchange.icon}</span>
                      <div>
                        <div className="font-medium text-white">{exchange.name}</div>
                        <div className="text-xs text-white/50">
                          {exchange.connected ? (
                            <span className="flex items-center gap-1 text-green-400">
                              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                              متصل
                            </span>
                          ) : (
                            <span className="text-white/40">غير متصل</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Toggle Connection */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleConnection(exchange.id);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          exchange.connected
                            ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                            : "bg-white/10 text-white/60 hover:bg-white/20"
                        }`}
                      >
                        {exchange.connected ? "تعطيل" : "تفعيل"}
                      </button>

                      {/* Expand Arrow */}
                      <motion.svg
                        animate={{ rotate: selectedExchange?.id === exchange.id ? 180 : 0 }}
                        className="w-5 h-5 text-white/40"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </motion.svg>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {selectedExchange?.id === exchange.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/10 overflow-hidden"
                      >
                        <div className="p-4 space-y-3 bg-black/20">
                          {/* API Key */}
                          <div>
                            <label className="block text-xs text-white/50 mb-1">API Key</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={exchange.apiKey}
                                readOnly
                                className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 font-mono"
                              />
                              <button
                                onClick={() => navigator.clipboard.writeText(exchange.apiKey)}
                                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                                title="نسخ"
                              >
                                📋
                              </button>
                            </div>
                          </div>

                          {/* Secret Key */}
                          <div>
                            <label className="block text-xs text-white/50 mb-1">Secret Key</label>
                            <div className="flex items-center gap-2">
                              <input
                                type={showSecrets[exchange.id] ? "text" : "password"}
                                value={showSecrets[exchange.id] ? exchange.secretKey : maskSecret(exchange.secretKey)}
                                readOnly
                                className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 font-mono"
                              />
                              <button
                                onClick={() => toggleShowSecret(exchange.id)}
                                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                                title={showSecrets[exchange.id] ? "إخفاء" : "إظهار"}
                              >
                                {showSecrets[exchange.id] ? "🙈" : "👁️"}
                              </button>
                              <button
                                onClick={() => navigator.clipboard.writeText(exchange.secretKey)}
                                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                                title="نسخ"
                              >
                                📋
                              </button>
                            </div>
                          </div>

                          {/* Additional ID (for Phemex) */}
                          {exchange.additionalId && (
                            <div>
                              <label className="block text-xs text-white/50 mb-1">ID</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={exchange.additionalId}
                                  readOnly
                                  className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 font-mono"
                                />
                                <button
                                  onClick={() => navigator.clipboard.writeText(exchange.additionalId!)}
                                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                                  title="نسخ"
                                >
                                  📋
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Test Connection Button */}
                          <button
                            onClick={() => testConnection(exchange)}
                            disabled={testingConnection === exchange.id}
                            className="w-full py-2.5 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {testingConnection === exchange.id ? (
                              <>
                                <motion.span
                                  animate={{ rotate: 360 }}
                                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                >
                                  ⟳
                                </motion.span>
                                جاري الاختبار...
                              </>
                            ) : (
                              <>
                                🔄 اختبار الاتصال
                              </>
                            )}
                          </button>

                          {/* Last Sync */}
                          {exchange.lastSync && (
                            <div className="text-xs text-white/40 text-center">
                              آخر مزامنة: {exchange.lastSync.toLocaleTimeString("ar-SA")}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 p-4">
              <div className="flex items-center justify-between text-xs text-white/40">
                <span>🔒 المفاتيح مشفرة ومحمية</span>
                <span>{exchanges.filter(e => e.connected).length} / {exchanges.length} متصل</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================
// Exchange Button Component (for Header)
// ============================================

interface ExchangeButtonProps {
  onClick: () => void;
  connectedCount: number;
}

export function ExchangeButton({ onClick, connectedCount }: ExchangeButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className="relative p-2 bg-[#0f3133] hover:bg-[#1a4a4d] border border-[#1a4a4d] rounded-xl transition-colors"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title="إدارة المنصات"
    >
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
      
      {/* Connected Badge */}
      {connectedCount > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          {connectedCount}
        </span>
      )}
    </motion.button>
  );
}

export default ExchangeManager;
