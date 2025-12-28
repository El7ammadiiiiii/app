"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Send,
  Mic,
  Phone,
  Paperclip,
  Bot,
  GraduationCap,
  Copy,
  Star,
  RefreshCw,
  Share2,
  Smile,
  Image as ImageIcon,
  LineChart,
  ShieldCheck,
  Activity,
  Clock4,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  time: string;
  title?: string;
}

const demoMessages: Message[] = [
  {
    id: "1",
    role: "agent",
    title: "لوحة الترحيب",
    content: "مرحباً! كيف يمكنني مساعدتك في تحليل العملات الرقمية اليوم؟",
    time: "10:30",
  },
  {
    id: "2",
    role: "user",
    content: "حلل لي Bitcoin تحليل فني",
    time: "10:31",
  },
  {
    id: "3",
    role: "agent",
    title: "تحليل Bitcoin",
    content: `📊 تحليل Bitcoin

السعر: $97,500
الاتجاه: صاعد ✅

المقاومة: $100,000
الدعم: $95,000

RSI: 62 (محايد)
MACD: إيجابي

التوصية: الاتجاه صاعد مع احتمالية اختراق $100K`,
    time: "10:31",
  },
];

interface ChatAreaProps {
  activeAgent: "general" | "institute";
  onAgentChange: (agent: "general" | "institute") => void;
}

export function ChatArea({ activeAgent, onAgentChange }: ChatAreaProps) {
  const [message, setMessage] = useState("");
  const [messages] = useState<Message[]>(demoMessages);

  const quickPanels = [
    {
      title: "حالة السوق",
      value: "+1.8%",
      subtitle: "24h Global Crypto",
      icon: <Activity className="w-4 h-4 text-primary" />,
      tone: "bg-primary/10 border border-primary/20",
    },
    {
      title: "المخاطر",
      value: "منخفض",
      subtitle: "التقلب اللحظي",
      icon: <ShieldCheck className="w-4 h-4 text-cyan-500" />,
      tone: "bg-cyan-500/10 border border-cyan-500/20",
    },
    {
      title: "الزمن حتى الإغلاق",
      value: "3h 42m",
      subtitle: "شمعة 4 ساعات",
      icon: <Clock4 className="w-4 h-4 text-amber-500" />,
      tone: "bg-amber-500/10 border border-amber-500/20",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Agent Switcher */}
      <div className="flex justify-center py-4 border-b border-border">
        <div className="inline-flex p-1 rounded-xl bg-muted/80">
          <button
            onClick={() => onAgentChange("general")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeAgent === "general"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Bot className="w-4 h-4" />
            الوكيل العام
          </button>
          <button
            onClick={() => onAgentChange("institute")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeAgent === "institute"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <GraduationCap className="w-4 h-4" />
            المعهد
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
        {/* Quick Panels */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickPanels.map((panel) => (
            <div
              key={panel.title}
              className={cn(
                "rounded-2xl px-4 py-3 flex items-center justify-between shadow-lg",
                "backdrop-blur",
                panel.tone
              )}
            >
              <div>
                <p className="text-xs text-muted-foreground">{panel.title}</p>
                <div className="text-lg font-semibold text-foreground">{panel.value}</div>
                <p className="text-[11px] text-muted-foreground">{panel.subtitle}</p>
              </div>
              <div className="p-2 rounded-xl theme-surface/40 border border-border/5">
                {panel.icon}
              </div>
            </div>
          ))}
        </div>

        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex gap-3",
              msg.role === "user" ? "flex-row-reverse" : ""
            )}
          >
            {/* Avatar */}
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                msg.role === "user"
                  ? "bg-muted"
                  : "bg-gradient-to-br from-primary to-primary/80"
              )}
            >
              {msg.role === "user" ? (
                <span className="text-xs font-bold text-foreground">أ</span>
              ) : (
                <Bot className="w-4 h-4 text-primary-foreground" />
              )}
            </div>

            {/* Bubble */}
            <div className="group relative max-w-[78%] space-y-2">
              <div className="flex items-center justify-start gap-2 text-[11px] text-muted-foreground">
                <button className="p-1.5 rounded-lg theme-surface/50 border border-border text-muted-foreground hover:text-foreground hover:border-border transition-colors">
                  <Share2 className="w-3.5 h-3.5" />
                </button>
                {msg.role === "agent" && (
                  <button className="p-1.5 rounded-lg theme-surface/50 border border-border text-muted-foreground hover:text-foreground hover:border-border transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
                <button className="p-1.5 rounded-lg theme-surface/50 border border-border text-muted-foreground hover:text-foreground hover:border-border transition-colors">
                  <Star className="w-3.5 h-3.5" />
                </button>
                <button className="p-1.5 rounded-lg theme-surface/50 border border-border text-muted-foreground hover:text-foreground hover:border-border transition-colors">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>

              <div
                className={cn(
                  "px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-md border backdrop-blur",
                  msg.role === "user"
                    ? "bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-primary/30 rounded-br-md"
                    : "border-border rounded-bl-md theme-surface"
                )}
              >
                {msg.title && (
                  <div className="flex items-center justify-between gap-3 mb-2 text-[13px] font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <LineChart className="w-4 h-4 text-primary" />
                      <span>{msg.title}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{msg.role === "agent" ? "تحليل" : "طلب"}</span>
                  </div>
                )}
                <div className="text-[13px] text-foreground leading-6">{msg.content}</div>
              </div>

              {/* Time */}
              <div
                className={cn(
                  "text-[10px] text-muted-foreground",
                  msg.role === "user" ? "text-right" : "text-left"
                )}
              >
                {msg.time}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 md:p-6 border-t border-border theme-surface/90 backdrop-blur">
        <div className="max-w-4xl mx-auto flex items-end gap-3 md:gap-4">
          <div className="flex flex-col gap-2">
            <button className="h-11 w-11 rounded-xl bg-muted/80 border border-border text-muted-foreground hover:text-foreground hover:border-border transition-colors">
              <Mic className="w-5 h-5" />
            </button>
            <button
              disabled={!message.trim()}
              className={cn(
                "h-11 w-11 rounded-xl flex items-center justify-center transition-all",
                message.trim()
                  ? "bg-primary text-primary-foreground shadow-[0_10px_30px_hsl(var(--primary)/0.25)] hover:bg-primary/90"
                  : "bg-muted/80 border border-border text-muted-foreground cursor-not-allowed"
              )}
            >
              <Send className="w-5 h-5" />
            </button>
            <button className="h-11 w-11 rounded-xl bg-muted/80 border border-border text-muted-foreground hover:text-foreground hover:border-border transition-colors">
              <Phone className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 bg-muted/80 border border-border rounded-3xl px-3 py-2 focus-within:border-primary/50 transition-colors">
              <button className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors">
                <Smile className="w-5 h-5" />
              </button>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="اكتب رسالتك هنا..."
                rows={1}
                className="flex-1 bg-transparent border-0 outline-none resize-none text-sm leading-6 placeholder:text-muted-foreground py-2 text-foreground"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button className="h-11 w-11 rounded-xl bg-muted/80 border border-border text-muted-foreground hover:text-foreground hover:border-border transition-colors">
              <Paperclip className="w-5 h-5" />
            </button>
            <button className="h-11 w-11 rounded-xl bg-muted/80 border border-border text-muted-foreground hover:text-foreground hover:border-border transition-colors">
              <ImageIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
