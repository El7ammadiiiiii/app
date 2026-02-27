/**
 * Integration Store
 * إدارة حالة التكاملات مع Zustand
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ProviderType } from "@/lib/auth/providers/base";

export interface Integration {
  provider: ProviderType;
  name: string;
  nameAr: string;
  icon: string;
  color: string;
  isConnected: boolean;
  isLoading: boolean;
  error?: string;
  connectedAt?: Date;
  profile?: Record<string, unknown>;
}

export interface IntegrationCategory {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  integrations: ProviderType[];
}

interface IntegrationState {
  integrations: Record<ProviderType, Integration>;
  categories: IntegrationCategory[];
  selectedExchanges: ProviderType[]; // الـ 12 منصة المختارة
  isLoading: boolean;
  error?: string;
  lastFetched?: number;
  fetchIntegrations: () => Promise<void>;
  connectIntegration: (provider: ProviderType) => void;
  disconnectIntegration: (provider: ProviderType) => Promise<void>;
  setIntegrationLoading: (provider: ProviderType, isLoading: boolean) => void;
  toggleExchangeSelection: (provider: ProviderType) => void;
  reorderExchanges: (newOrder: ProviderType[]) => void;
}

// Define categories
const INTEGRATION_CATEGORIES: IntegrationCategory[] = [
  {
    id: "trading",
    name: "Trading & Exchanges",
    nameAr: "التداول والمنصات",
    icon: "📈",
    integrations: ["alpaca", "bybit", "mexc", "coinbase", "kucoin", "okx"],
  },
  {
    id: "social",
    name: "Social & Community",
    nameAr: "التواصل والمجتمع",
    icon: "👥",
    integrations: ["twitter", "discord", "telegram"],
  },
  {
    id: "design",
    name: "Design & Media",
    nameAr: "التصميم والوسائط",
    icon: "🎨",
    integrations: ["canva"],
  },
  {
    id: "payments",
    name: "Payments",
    nameAr: "المدفوعات",
    icon: "💳",
    integrations: ["stripe"],
  },
  {
    id: "productivity",
    name: "Productivity",
    nameAr: "الإنتاجية",
    icon: "📋",
    integrations: ["monday", "vercel"],
  },
  {
    id: "data",
    name: "Data & Analytics",
    nameAr: "البيانات والتحليلات",
    icon: "📊",
    integrations: ["coingecko", "tradingview"],
  },
];

// Default integration configs
const DEFAULT_INTEGRATIONS: Record<ProviderType, Omit<Integration, "isConnected" | "isLoading">> = {
  canva: {
    provider: "canva",
    name: "Canva",
    nameAr: "كانفا",
    icon: "🎨",
    color: "bg-cyan-500",
  },
  stripe: {
    provider: "stripe",
    name: "Stripe",
    nameAr: "سترايب",
    icon: "💳",
    color: "bg-purple-600",
  },
  monday: {
    provider: "monday",
    name: "Monday.com",
    nameAr: "مونداي",
    icon: "📋",
    color: "bg-red-500",
  },
  telegram: {
    provider: "telegram",
    name: "Telegram",
    nameAr: "تيليجرام",
    icon: "📱",
    color: "bg-blue-500",
  },
  alpaca: {
    provider: "alpaca",
    name: "Alpaca",
    nameAr: "ألباكا",
    icon: "🦙",
    color: "bg-yellow-500",
  },
  discord: {
    provider: "discord",
    name: "Discord",
    nameAr: "ديسكورد",
    icon: "🎮",
    color: "bg-indigo-600",
  },
  twitter: {
    provider: "twitter",
    name: "Twitter/X",
    nameAr: "تويتر",
    icon: "🐦",
    color: "bg-black",
  },
  vercel: {
    provider: "vercel",
    name: "Vercel",
    nameAr: "فيرسيل",
    icon: "▲",
    color: "bg-black",
  },
  bybit: {
    provider: "bybit",
    name: "Bybit",
    nameAr: "باي بت",
    icon: "🟠",
    color: "bg-orange-500",
  },
  mexc: {
    provider: "mexc",
    name: "MEXC",
    nameAr: "ميكسي",
    icon: "🔵",
    color: "bg-blue-500",
  },
  coinbase: {
    provider: "coinbase",
    name: "Coinbase",
    nameAr: "كوين بيس",
    icon: "🔷",
    color: "bg-blue-600",
  },
  kucoin: {
    provider: "kucoin",
    name: "KuCoin",
    nameAr: "كوكوين",
    icon: "🟢",
    color: "bg-green-500",
  },
  okx: {
    provider: "okx",
    name: "OKX",
    nameAr: "أو كي إكس",
    icon: "⚪",
    color: "bg-gray-800",
  },
  bitget: {
    provider: "bitget",
    name: "Bitget",
    nameAr: "بيتجت",
    icon: "🟢",
    color: "bg-green-500",
  },
  bingx: {
    provider: "bingx",
    name: "BingX",
    nameAr: "بينج إكس",
    icon: "🔶",
    color: "bg-orange-400",
  },
  phemex: {
    provider: "phemex",
    name: "Phemex",
    nameAr: "فيميكس",
    icon: "🟤",
    color: "bg-amber-700",
  },
  htx: {
    provider: "htx",
    name: "HTX (Huobi)",
    nameAr: "إتش تي إكس",
    icon: "🔴",
    color: "bg-red-500",
  },
  gate: {
    provider: "gate",
    name: "Gate.io",
    nameAr: "جيت",
    icon: "🔵",
    color: "bg-blue-600",
  },
  cryptocom: {
    provider: "cryptocom",
    name: "Crypto.com",
    nameAr: "كريبتو.كوم",
    icon: "🔷",
    color: "bg-blue-400",
  },
  kraken: {
    provider: "kraken",
    name: "Kraken",
    nameAr: "كراكن",
    icon: "🟦",
    color: "bg-indigo-600",
  },
  coingecko: {
    provider: "coingecko",
    name: "CoinGecko",
    nameAr: "كوين جيكو",
    icon: "🦎",
    color: "bg-green-500",
  },
  tradingview: {
    provider: "tradingview",
    name: "TradingView",
    nameAr: "تريدينج فيو",
    icon: "📊",
    color: "bg-blue-600",
  },
};

export const useIntegrationStore = create<IntegrationState>()(
  persist(
    (set, get) => ({
      integrations: Object.fromEntries(
        Object.entries(DEFAULT_INTEGRATIONS).map(([key, value]) => [
          key,
          { ...value, isConnected: false, isLoading: false },
        ])
      ) as Record<ProviderType, Integration>,
      categories: INTEGRATION_CATEGORIES,
      selectedExchanges: ['bybit'], // Bybit افتراضية دائماً
      isLoading: false,
      error: undefined,
      lastFetched: undefined,

      toggleExchangeSelection: (provider) => {
        const current = get().selectedExchanges;
        if (current.includes(provider)) {
          if (provider === 'bybit') return; // لا يمكن إلغاء Bybit
          set({ selectedExchanges: current.filter(p => p !== provider) });
        } else {
          if (current.length < 12) {
            set({ selectedExchanges: [...current, provider] });
          }
        }
        
        // تحديث المحرك المركزي فوراً
        import('@/lib/services/ExchangeOrchestrator').then(m => {
          m.exchangeOrchestrator.updatePriorityList(get().selectedExchanges as any);
        });
      },

      reorderExchanges: (newOrder) => {
        set({ selectedExchanges: newOrder });
        import('@/lib/services/ExchangeOrchestrator').then(m => {
          m.exchangeOrchestrator.updatePriorityList(newOrder as any);
        });
      },

      setIntegrationLoading: (provider, isLoading) => {
        set((state) => ({
          integrations: {
            ...state.integrations,
            [provider]: { ...state.integrations[provider], isLoading },
          },
        }));
      },

      fetchIntegrations: async () => {
        set({ isLoading: true, error: undefined });
        try {
          const res = await fetch("/api/integrations/status");
          const data = await res.json();
          
          const integrations: Record<ProviderType, Integration> = { ...get().integrations };
          for (const item of data.integrations || []) {
            integrations[item.provider as ProviderType] = {
              ...item,
              isLoading: false,
            };
          }
          set({ integrations, isLoading: false, lastFetched: Date.now() });
        } catch (error) {
          set({ error: "Failed to fetch integrations", isLoading: false });
        }
      },

      connectIntegration: (provider: ProviderType) => {
        // Set loading state
        get().setIntegrationLoading(provider, true);
        
        // Redirect to OAuth flow
        window.location.href = `/api/integrations/${provider}/start`;
      },

      disconnectIntegration: async (provider: ProviderType) => {
        const integrations = get().integrations;
        set({
          integrations: {
            ...integrations,
            [provider]: { ...integrations[provider], isLoading: true },
          },
        });

        try {
          await fetch(`/api/integrations/${provider}/disconnect`, { method: "POST" });
          set({
            integrations: {
              ...integrations,
              [provider]: { ...integrations[provider], isConnected: false, isLoading: false },
            },
          });
        } catch {
          set({
            integrations: {
              ...integrations,
              [provider]: { ...integrations[provider], isLoading: false, error: "Failed to disconnect" },
            },
          });
        }
      },
    }),
    {
      name: "nexus-integrations",
      partialize: (state) => ({
        // Only persist connection status, not tokens
        integrations: Object.fromEntries(
          Object.entries(state.integrations).map(([key, value]) => [
            key,
            {
              provider: value.provider,
              name: value.name,
              nameAr: value.nameAr,
              icon: value.icon,
              color: value.color,
              isConnected: value.isConnected,
            },
          ])
        ),
        lastFetched: state.lastFetched,
      }),
    }
  )
);
