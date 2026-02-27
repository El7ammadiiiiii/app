"use client";

import * as React from "react";
import { ExternalLink, Grid2X2 } from "lucide-react";
import { SettingsRow } from "../components/SettingsRow";
import { SettingToggle } from "../components/SettingToggle";

/* Try importing the real integration store — if it exists */
let useIntegrationStore: (() => { integrations: any[]; toggleIntegration: (id: string) => void }) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("@/store/integrationStore");
  useIntegrationStore = mod.useIntegrationStore;
} catch {
  // Integration store not available — will show empty state
}

export function AppsSection() {
  const store = useIntegrationStore?.();
  const raw = store?.integrations;
  const integrations = Array.isArray(raw) ? raw : [];
  const connectedApps = integrations.filter((i: any) => i.connected);

  return (
    <div className="space-y-1">
      <h3 className="text-lg font-semibold text-white/90 mb-4">التطبيقات</h3>

      {connectedApps.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/8 flex items-center justify-center mb-4">
            <Grid2X2 className="w-6 h-6 text-white/40" />
          </div>
          <p className="text-sm text-white/60 mb-1">لا توجد تطبيقات متصلة</p>
          <p className="text-xs text-white/40 mb-6 max-w-[240px]">
            قم بتوصيل تطبيقاتك المفضلة لتحسين تجربتك مع المساعد
          </p>
          <button className="px-4 py-2 bg-teal-600/80 hover:bg-teal-600 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2">
            <ExternalLink className="w-4 h-4" />
            استكشاف التطبيقات
          </button>
        </div>
      ) : (
        <>
          {/* Connected apps */}
          {connectedApps.map((app: any) => (
            <SettingsRow
              key={app.id}
              title={app.name}
              description={app.description || `متصل${app.connectedAt ? ` منذ ${new Date(app.connectedAt).toLocaleDateString("ar")}` : ""}`}
              icon={
                app.icon ? (
                  <img src={app.icon} alt={app.name} className="w-5 h-5 rounded" />
                ) : (
                  <div className="w-5 h-5 rounded bg-white/10 flex items-center justify-center text-[10px] text-white/50">
                    {app.name?.[0]}
                  </div>
                )
              }
              control={
                <SettingToggle
                  checked={app.connected}
                  onCheckedChange={() => store?.toggleIntegration(app.id)}
                  size="sm"
                />
              }
            />
          ))}

          {/* CTA */}
          <div className="pt-4 px-4">
            <button className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-teal-400 text-sm font-medium rounded-xl transition-colors border border-white/10 flex items-center justify-center gap-2">
              <ExternalLink className="w-4 h-4" />
              استكشاف المزيد من التطبيقات
            </button>
          </div>
        </>
      )}
    </div>
  );
}
