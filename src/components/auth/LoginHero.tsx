"use client";

import { useEffect, useRef, useState } from "react";
import { LoginBackground } from "@/components/auth/LoginBackground";
import { useGoogleLogin } from "@/hooks/useGoogleLogin";
import { useAuthStore } from "@/store/authStore";

const featurePills = [
  "تحليلات On-Chain فورية",
  "تحكم متعدد الأطر الزمنية",
  "حماية قرارات التداول",
  "تتبع السيولة الذكية",
  "وصول إلى شبكة CCCWAYS",
];

const assuranceBullets = [
  {
    title: "تشفير شامل للرموز",
    detail: "يتم حفظ رموز Google داخل Firestore بعد تشفير AES-256-GCM داخلي.",
  },
  {
    title: "جلسات صامتة",
    detail: "نستعيد جلساتك تلقائياً عبر refresh tokens المخزنة داخل ملفات الكوكي المشفرة.",
  },
  {
    title: "امتثال Alt Season Black",
    detail: "واجهة متوافقة مع سياسات Google Identity وTailwind 4 الجديدة.",
  },
];

const statBlocks = [
  { label: "مصادر بيانات", value: "+48" },
  { label: "تنبيه لحظي", value: "12ms" },
  { label: "تحليلات مفعلة", value: "24/7" },
];

type SilentState = "idle" | "checking" | "restored" | "failed";

export const LoginHero = () => {
  const profile = useAuthStore((state) => state.profile);
  const loading = useAuthStore((state) => state.loading);
  const setProfile = useAuthStore((state) => state.setProfile);
  const setLoading = useAuthStore((state) => state.setLoading);

  const triggerGoogleLogin = useGoogleLogin();

  const triedSilent = useRef(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [silentState, setSilentState] = useState<SilentState>("idle");

  useEffect(() => {
    if (profile || triedSilent.current) return;
    triedSilent.current = true;
    let cancelled = false;

    const attemptSilentSignIn = async () => {
      setSilentState("checking");
      setStatusMessage("نجري فحص جلسة سريع...");
      setLoading(true);
      try {
        const res = await fetch("/api/auth/google/refresh", { method: "POST", cache: "no-store" });
        if (!res.ok || cancelled) {
          setSilentState("failed");
          setStatusMessage(null);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setProfile(data.profile);
        setSilentState("restored");
        setStatusMessage("تمت استعادة جلستك تلقائياً ⚡");
      } catch (error) {
        if (!cancelled) {
          
          setSilentState("failed");
          setStatusMessage(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    attemptSilentSignIn();

    return () => {
      cancelled = true;
    };
  }, [profile, setLoading, setProfile]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <LoginBackground />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-black/70 to-black" />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10 lg:px-12">
        <header className="flex flex-col gap-3 text-right sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-amber-300">CCCWAYS NEXUS</p>
            <h1 className="font-serif text-3xl text-white md:text-4xl">Alt Season Black Intelligence Grid</h1>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-neutral-200">
            {featurePills.map((pill) => (
              <span
                key={pill}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono uppercase tracking-wide"
              >
                {pill}
              </span>
            ))}
          </div>
        </header>

        <main className="grid flex-1 items-center gap-8 border border-white/10 bg-black/40 p-6 backdrop-blur-3xl lg:grid-cols-[1.2fr_0.8fr] lg:rounded-[32px]">
          <section className="space-y-8">
            <div className="space-y-4 text-right">
              <p className="text-amber-200">جيل جديد من ثقة التداول فوق طبقة ذكاء اصطناعي متعددة.</p>
              <h2 className="font-serif text-4xl leading-snug text-white lg:text-5xl">
                اتصال Google آمن، معزَّز بتشفير داخلي وخوارزميات كشف الانعكاس.
              </h2>
              <p className="text-lg text-neutral-200">
                ندير حسابك عبر بروتوكول OAuth 2.0 الرسمي، ثم نربط بياناتك بخدمة Firestore لإصدار التنبيهات، إدارة الجلسة،
                وتسليم توصيات CCCWAYS في وقت قياسي.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {statBlocks.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                  <p className="font-mono text-3xl text-white">{stat.value}</p>
                  <p className="text-sm text-neutral-300">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-4 rounded-3xl border border-white/10 bg-black/40 p-5">
              {assuranceBullets.map((item) => (
                <div key={item.title} className="flex gap-3 text-sm text-neutral-200">
                  <span className="mt-1 h-2 w-2 rounded-full bg-amber-300" aria-hidden />
                  <div>
                    <p className="font-semibold text-white">{item.title}</p>
                    <p>{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-6 rounded-[32px] border border-white/10 bg-black/70 p-8 shadow-[0_0_60px_rgba(0,0,0,0.5)]">
            <div className="space-y-2 text-right">
              <p className="text-sm uppercase tracking-[0.3em] text-amber-200">وحدة الدخول الذكية</p>
              <h3 className="text-2xl font-semibold">متصل بحساب Google الخاص بك</h3>
              <p className="text-sm text-neutral-300">يدعم الاستعادة الصامتة وإدارة ملفات الكوكي.</p>
            </div>

            {statusMessage && (
              <div
                role="status"
                aria-live="polite"
                className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 p-3 text-sm text-emerald-100"
              >
                {statusMessage}
              </div>
            )}

            {profile && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-neutral-100">
                <p className="text-base font-semibold">مرحباً {profile.fullName}</p>
                <p className="text-xs text-neutral-300">جاهز لنقلك مباشرةً إلى لوحة القيادة فور ربط باقي الخدمات.</p>
              </div>
            )}

            <button
              onClick={triggerGoogleLogin}
              disabled={loading}
              className="group flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-amber-400/80 to-pink-500/70 px-6 py-4 text-base font-semibold text-black transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                <path
                  fill="#EA4335"
                  d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.2-2 2.9l3.2 2.5c1.9-1.7 3-4.1 3-7 0-.7-.1-1.3-.2-2H12z"
                />
                <path fill="#34A853" d="M5.3 14.3l-.8.6-2.6 2c1.9 3.8 5.8 6.5 10.1 6.5 3 0 5.6-1 7.5-2.7l-3.2-2.5c-.9.6-2 1-3.3 1-2.6 0-4.9-1.7-5.7-4z" />
                <path fill="#4A90E2" d="M21.5 6.5l3.2-2.5C22.8 2.1 19.7.8 16.5.8c-4.4 0-8.2 2.5-10.1 6.2l3 2.3c.8-2.4 3.1-4.1 5.7-4.1 1.4 0 2.8.5 3.8 1.3l2.6-1.6z" />
                <path fill="#FBBC05" d="M2.6 7l-3-2.3C-.1 6.3-.8 8.1-.8 10c0 1.9.7 3.7 1.9 5l4.2-3.2C4.7 10.5 4.5 9.8 4.5 9c0-.7.2-1.4.5-2z" />
              </svg>
              {loading ? "... نتحقق من بيانات Google" : "تسجيل الدخول بحساب Google"}
            </button>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-xs text-neutral-400">
                <span className="h-px flex-1 bg-white/10" />
                <span>الدخول التقليدي (قريباً)</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>
              <form className="space-y-4" autoComplete="off">
                <label className="block text-right text-sm text-neutral-300">
                  البريد المؤسسي
                  <input
                    disabled
                    type="email"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-neutral-500"
                    placeholder="soon@cccways.ai"
                  />
                </label>
                <label className="block text-right text-sm text-neutral-300">
                  كلمة المرور المخصصة
                  <input
                    disabled
                    type="password"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-neutral-500"
                    placeholder="********"
                  />
                </label>
              </form>
            </div>

            <p className="text-xs leading-6 text-neutral-400">
              بالاستمرار، أنت تمنح CCCWAYS الإذن للوصول إلى عنوان بريدك الإلكتروني واسمك وصورتك الشخصية. لا نقوم بمشاركة بياناتك
              مع أطراف ثالثة، ويمكنك إلغاء التفويض من لوحة Google Security في أي وقت.
            </p>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-200">
              <p className="font-semibold text-white">حالة الاستعادة الصامتة: {silentStateLabel[silentState]}</p>
              <p>نحتفظ بالجلسات لمدة 30 يوماً، ويتم تجديدها تلقائياً عند كل عملية تسجيل دخول.</p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

const silentStateLabel: Record<SilentState, string> = {
  idle: "بانتظار التحقق",
  checking: "جاري التحقق...",
  restored: "تمت الاستعادة",
  failed: "لا توجد جلسة محفوظة",
};
