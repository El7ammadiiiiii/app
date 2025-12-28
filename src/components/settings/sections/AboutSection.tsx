"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { 
  Info,
  ExternalLink,
  FileText,
  Shield,
  MessageCircle,
  Github,
  Twitter,
  Mail,
  Heart,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Globe,
  BookOpen,
} from "lucide-react";
import { SettingGroup } from "../components";

const links = [
  { icon: Globe, label: "الموقع الرسمي", url: "#" },
  { icon: BookOpen, label: "الوثائق", url: "#" },
  { icon: MessageCircle, label: "مجتمع Discord", url: "#" },
  { icon: Twitter, label: "تويتر", url: "#" },
  { icon: Github, label: "GitHub", url: "#" },
];

const legalLinks = [
  { label: "شروط الاستخدام", url: "#" },
  { label: "سياسة الخصوصية", url: "#" },
  { label: "سياسة ملفات تعريف الارتباط", url: "#" },
  { label: "التراخيص مفتوحة المصدر", url: "#" },
];

const changelog = [
  { version: "2.5.0", date: "2024-03-01", title: "ميزات جديدة للتحليل الفني" },
  { version: "2.4.0", date: "2024-02-15", title: "تحسينات الأداء وإصلاح الأخطاء" },
  { version: "2.3.0", date: "2024-02-01", title: "دعم اللغة العربية بالكامل" },
  { version: "2.2.0", date: "2024-01-15", title: "إضافة وضع المحادثة الصوتية" },
];

export function AboutSection() {
  const [copied, setCopied] = React.useState(false);
  const appVersion = "2.5.0";
  const buildNumber = "2024030115";

  const copyVersion = () => {
    navigator.clipboard.writeText(`v${appVersion} (${buildNumber})`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* App Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl theme-card border border-primary p-6 shadow-lg"
      >
        <div className="relative flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 
                        flex items-center justify-center shadow-lg shadow-primary/25">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground mb-1">NEXUS AI</h2>
            <p className="text-muted-foreground mb-3">مساعدك الذكي للتداول والتحليل</p>
            <div className="flex items-center gap-3">
              <button
                onClick={copyVersion}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg theme-card border border-border
                         text-sm font-mono text-foreground transition-colors hover:bg-muted"
              >
                v{appVersion}
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </button>
              <span className="text-xs text-muted-foreground">Build {buildNumber}</span>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white
                           transition-colors hover:brightness-90">
            <RefreshCw className="w-4 h-4" />
            <span>التحقق من التحديثات</span>
          </button>
        </div>
      </motion.div>

      {/* Links */}
      <SettingGroup title="روابط">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl theme-card border border-border
                         hover:border-primary hover:bg-primary transition-all group"
              >
                <Icon className="w-5 h-5 text-muted-foreground group-hover:text-white transition-colors" />
                <span className="text-foreground group-hover:text-white transition-colors">{link.label}</span>
                <ExternalLink className="w-4 h-4 text-muted-foreground mr-auto opacity-0 
                                       group-hover:opacity-100 transition-opacity" />
              </a>
            );
          })}
        </div>
      </SettingGroup>

      {/* Changelog */}
      <SettingGroup title="سجل التغييرات">
        <div className="space-y-3">
          {changelog.map((item, index) => (
            <motion.div
              key={item.version}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-4 p-4 rounded-xl theme-card border border-border"
            >
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-foreground">v{item.version}</span>
                  <span className="text-xs text-muted-foreground">{item.date}</span>
                </div>
                <p className="text-sm text-muted-foreground">{item.title}</p>
              </div>
              <button className="text-sm text-primary hover:underline">
                التفاصيل
              </button>
            </motion.div>
          ))}
        </div>
        <button className="w-full mt-3 py-2 text-center text-sm text-primary hover:underline">
          عرض جميع التحديثات
        </button>
      </SettingGroup>

      {/* Legal */}
      <SettingGroup title="قانوني">
        <div className="grid grid-cols-2 gap-2">
          {legalLinks.map((link) => (
            <a
              key={link.label}
              href={link.url}
              className="flex items-center gap-2 p-3 rounded-lg theme-card border border-border 
                       text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <FileText className="w-4 h-4" />
              <span>{link.label}</span>
            </a>
          ))}
        </div>
      </SettingGroup>

      {/* Support */}
      <SettingGroup title="الدعم">
        <div className="p-4 rounded-xl theme-card border border-border">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-foreground mb-1">تحتاج مساعدة؟</h4>
              <p className="text-sm text-muted-foreground mb-3">
                فريق الدعم متاح 24/7 للإجابة على استفساراتك
              </p>
              <div className="flex items-center gap-3">
                <button className="px-4 py-2 rounded-lg bg-primary text-white transition-colors hover:brightness-90">
                  تواصل معنا
                </button>
                <button className="px-4 py-2 rounded-lg border border-border text-foreground 
                                 hover:bg-muted transition-colors">
                  الأسئلة الشائعة
                </button>
              </div>
            </div>
          </div>
        </div>
      </SettingGroup>

      {/* Footer */}
      <div className="text-center pt-4 border-t border-border">
        <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
          صنع بـ <Heart className="w-4 h-4 text-red-500 fill-red-500" /> بواسطة فريق CCC Trading
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          © 2024 NEXUS AI. جميع الحقوق محفوظة.
        </p>
      </div>
    </div>
  );
}
