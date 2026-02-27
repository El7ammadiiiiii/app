"use client";

import * as React from "react";
import { SettingsRow } from "../components/SettingsRow";
import { SettingSelect } from "../components/SettingSelect";
import { useSettingsStore } from "../store/settingsStore";

const notifyOptions = [
  { value: "all", label: "الكل" },
  { value: "important", label: "المهم فقط" },
  { value: "off", label: "إيقاف" },
];

const rows: { key: "notifyResponses" | "notifyTasks" | "notifyRecommendations" | "notifyUsage"; title: string; desc: string }[] = [
  { key: "notifyResponses", title: "الاستجابات", desc: "إشعارات عند اكتمال الردود" },
  { key: "notifyTasks", title: "المهام", desc: "تحديثات حالة المهام المجدولة" },
  { key: "notifyRecommendations", title: "التوصيات", desc: "توصيات ونصائح مخصصة" },
  { key: "notifyUsage", title: "الاستخدام", desc: "تقارير الاستخدام والحدود" },
];

export function NotificationsSection() {
  const store = useSettingsStore();

  return (
    <div className="space-y-1">
      <h3 className="text-lg font-semibold text-white/90 mb-4">الإشعارات</h3>

      {rows.map((row) => (
        <SettingsRow
          key={row.key}
          title={row.title}
          description={row.desc}
          control={
            <SettingSelect
              id={`settings-notify-${row.key}`}
              value={store[row.key]}
              onValueChange={(v) => store.updateSetting(row.key, v as "all" | "important" | "off")}
              options={notifyOptions}
            />
          }
        />
      ))}
    </div>
  );
}
