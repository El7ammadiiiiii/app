"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { 
  Mic,
  Volume2,
  Play,
  Pause,
  Settings2,
  AudioWaveform,
  Languages,
} from "lucide-react";
import { 
  SettingCard, 
  SettingToggle, 
  SettingSelect,
  SettingGroup,
  SettingSlider,
} from "../components";
import { useSettingsStore } from "../store/settingsStore";
import type { VoiceOption } from "../types/settings";

const voiceOptions = [
  { id: "breeze" as VoiceOption, name: "نوفا", type: "أنثى", lang: "عربي" },
  { id: "ember" as VoiceOption, name: "إيكو", type: "ذكر", lang: "عربي" },
  { id: "sol" as VoiceOption, name: "ألوي", type: "محايد", lang: "إنجليزي" },
  { id: "cove" as VoiceOption, name: "شيمر", type: "أنثى", lang: "إنجليزي" },
  { id: "aurora" as VoiceOption, name: "فيبل", type: "ذكر", lang: "إنجليزي" },
  { id: "sage" as VoiceOption, name: "أونكس", type: "ذكر", lang: "عربي" },
];

const inputModeOptions = [
  { value: "true", label: "اضغط للتحدث" },
  { value: "false", label: "اكتشاف الصوت التلقائي" },
];

export function VoiceModeSection() {
  const {
    selectedVoice,
    voiceSpeed,
    voicePitch,
    voiceEnabled,
    pushToTalk,
    autoPlayResponse,
    noiseCancellation,
    updateSetting,
  } = useSettingsStore();

  const [playingVoice, setPlayingVoice] = React.useState<string | null>(null);

  const handlePlayVoice = (voiceId: string) => {
    if (playingVoice === voiceId) {
      setPlayingVoice(null);
    } else {
      setPlayingVoice(voiceId);
      // محاكاة انتهاء التشغيل
      setTimeout(() => setPlayingVoice(null), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Voice Selection */}
      <SettingGroup title="اختيار الصوت">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {voiceOptions.map((voice) => (
              <motion.button
                key={voice.id}
                onClick={() => updateSetting("selectedVoice", voice.id)}
                className={`
                  relative p-4 rounded-xl border-2 transition-all text-right
                  ${selectedVoice === voice.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl hover:border-primary"
                  }
                `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayVoice(voice.id);
                  }}
                  className="p-1.5 rounded-full bg-muted transition-colors hover:brightness-90"
                >
                  {playingVoice === voice.id ? (
                    <Pause className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                </button>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <Volume2 className="w-4 h-4 text-white" />
                </div>
              </div>
              <h4 className="font-medium text-foreground">{voice.name}</h4>
              <p className="text-xs text-muted-foreground">
                {voice.type} • {voice.lang}
              </p>
              {selectedVoice === voice.id && (
                <motion.div
                  layoutId="voice-selected"
                  className="absolute inset-0 border-2 border-primary rounded-xl"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          ))}
        </div>
      </SettingGroup>

      {/* Voice Settings */}
      <SettingGroup title="إعدادات الصوت">
        <SettingSlider
          label="سرعة الكلام"
          description="تحكم في سرعة نطق الردود"
          value={voiceSpeed}
          min={0.5}
          max={2}
          step={0.1}
          onValueChange={(v) => updateSetting("voiceSpeed", v)}
        />

        <SettingSlider
          label="درجة الصوت"
          description="تحكم في حدة الصوت"
          value={voicePitch}
          min={0.5}
          max={1.5}
          step={0.1}
          onValueChange={(v) => updateSetting("voicePitch", v)}
        />
      </SettingGroup>

      {/* Microphone Settings */}
      <SettingGroup title="إعدادات الميكروفون">
        <SettingCard
          icon={<Mic className="w-5 h-5" />}
          title="اضغط للتحدث"
          description="تفعيل الميكروفون بالضغط فقط"
        >
          <SettingToggle
            checked={pushToTalk}
            onCheckedChange={(v) => updateSetting("pushToTalk", v)}
          />
        </SettingCard>

        <SettingCard
          icon={<AudioWaveform className="w-5 h-5" />}
          title="تقليل الضوضاء"
          description="تحسين جودة الصوت بإزالة الضوضاء الخلفية"
        >
          <SettingToggle
            checked={noiseCancellation}
            onCheckedChange={(v) => updateSetting("noiseCancellation", v)}
          />
        </SettingCard>
      </SettingGroup>

      {/* Conversation */}
      <SettingGroup title="المحادثة">
        <SettingCard
          icon={<Volume2 className="w-5 h-5" />}
          title="تشغيل الردود تلقائياً"
          description="نطق ردود المساعد تلقائياً"
        >
          <SettingToggle
            checked={autoPlayResponse}
            onCheckedChange={(v) => updateSetting("autoPlayResponse", v)}
          />
        </SettingCard>

        <SettingCard
          icon={<Languages className="w-5 h-5" />}
          title="الصوت مفعّل"
          description="تفعيل الوضع الصوتي"
        >
          <SettingToggle
            checked={voiceEnabled}
            onCheckedChange={(v) => updateSetting("voiceEnabled", v)}
          />
        </SettingCard>
      </SettingGroup>
    </div>
  );
}
