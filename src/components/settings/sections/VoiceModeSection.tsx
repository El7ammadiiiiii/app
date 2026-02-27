"use client";

import * as React from "react";
import useTimeout from '@/hooks/useTimeout';
import { motion } from "framer-motion";
import { 
  Mic,
  Volume2,
  Play,
  Pause,
} from "lucide-react";
import { 
  SettingCard, 
  SettingToggle, 
  SettingGroup,
} from "../components";
import { useSettingsStore } from "../store/settingsStore";
import type { VoiceOption } from "../types/settings";
import { cn } from "@/lib/utils";

const voiceOptions = [
  { id: "breeze" as VoiceOption, name: "نوفا", type: "أنثى", lang: "عربي" },
  { id: "ember" as VoiceOption, name: "إيكو", type: "ذكر", lang: "عربي" },
  { id: "sol" as VoiceOption, name: "ألوي", type: "محايد", lang: "إنجليزي" },
  { id: "cove" as VoiceOption, name: "شيمر", type: "أنثى", lang: "إنجليزي" },
  { id: "aurora" as VoiceOption, name: "فيبل", type: "ذكر", lang: "إنجليزي" },
  { id: "sage" as VoiceOption, name: "أونكس", type: "ذكر", lang: "عربي" },
];

export function VoiceModeSection() {
  const {
    selectedVoice,
    voiceEnabled,
    pushToTalk,
    autoPlayResponse,
    updateSetting,
  } = useSettingsStore();

  const [playingVoice, setPlayingVoice] = React.useState<string | null>(null);

  const handlePlayVoice = (voiceId: string) => {
    if (playingVoice === voiceId) {
      setPlayingVoice(null);
    } else {
      setPlayingVoice(voiceId);
    }
  };

  useTimeout(() => setPlayingVoice(null), playingVoice ? 2000 : undefined, [playingVoice]);

  return (
    <div className="space-y-6">
      <SettingGroup title="إعدادات الصوت">
        <SettingCard
          icon={<Mic />}
          title="تفعيل الصوت"
          description="تمكين التفاعل الصوتي مع المساعد"
        >
          <SettingToggle
            checked={voiceEnabled}
            onCheckedChange={(v) => updateSetting("voiceEnabled", v)}
          />
        </SettingCard>

        <SettingCard
          icon={<Mic />}
          title="اضغط للتحدث"
          description="الضغط باستمرار للتحدث بدلاً من الاكتشاف التلقائي"
        >
          <SettingToggle
            checked={pushToTalk}
            onCheckedChange={(v) => updateSetting("pushToTalk", v)}
          />
        </SettingCard>

        <SettingCard
          icon={<Volume2 />}
          title="تشغيل تلقائي"
          description="قراءة الردود صوتياً تلقائياً"
        >
          <SettingToggle
            checked={autoPlayResponse}
            onCheckedChange={(v) => updateSetting("autoPlayResponse", v)}
          />
        </SettingCard>
      </SettingGroup>

      <SettingGroup title="اختيار الصوت">
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
          {voiceOptions.map((voice) => (
            <motion.div
              key={voice.id}
              role="button"
              tabIndex={0}
              onClick={() => updateSetting("selectedVoice", voice.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  updateSetting("selectedVoice", voice.id);
                }
              }}
              className={cn(
                "relative p-2.5 sm:p-3 rounded-lg border transition-all text-right group",
                selectedVoice === voice.id
                  ? "border-primary bg-primary/10"
                  : "border-border/40 glass-lite hover:border-primary/50"
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayVoice(voice.id);
                  }}
                  className={cn(
                    "p-1.5 rounded-full transition-colors",
                    playingVoice === voice.id 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-white/10 hover:bg-primary/20"
                  )}
                >
                  {playingVoice === voice.id ? (
                    <Pause className="w-3 h-3" />
                  ) : (
                    <Play className="w-3 h-3" />
                  )}
                </button>
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center",
                  selectedVoice === voice.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  <Volume2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <h4 className={cn(
                "text-[11px] sm:text-xs font-medium",
                selectedVoice === voice.id ? "text-primary" : "text-foreground"
              )}>{voice.name}</h4>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                {voice.type} • {voice.lang}
              </p>
            </motion.div>
          ))}
        </div>
      </SettingGroup>
    </div>
  );
}
