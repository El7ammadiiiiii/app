"use client";

import * as React from "react";
import {
  Key,
  Shield,
  Fingerprint,
  Smartphone,
  MessageSquare,
  LogOut,
} from "lucide-react";
import { SettingsRow, SettingsNavigationChevron } from "../components/SettingsRow";
import { SettingToggle } from "../components/SettingToggle";
import { ConfirmModal } from "../components";
import { auth, isFirebaseConfigured } from "@/lib/firebase/client";
import { signOut } from "firebase/auth";

export function SecuritySection() {
  const [mfaApp, setMfaApp] = React.useState(false);
  const [mfaSms, setMfaSms] = React.useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const [showLogoutAllConfirm, setShowLogoutAllConfirm] = React.useState(false);

  const handleLogout = async () => {
    if (isFirebaseConfigured && auth) {
      try {
        await signOut(auth);
        // Redirect to home
        window.location.href = "/";
      } catch (e) {
        console.error("[Security] Logout failed:", e);
      }
    }
    setShowLogoutConfirm(false);
  };

  const handleLogoutAll = async () => {
    // For now, same as single logout since Firebase Anonymous
    // doesn't support multi-session revocation.
    // When Google Auth is linked, this will call revokeRefreshTokens on server.
    await handleLogout();
    setShowLogoutAllConfirm(false);
  };

  return (
    <div className="space-y-1">
      <h3 className="text-lg font-semibold text-white/90 mb-4">الأمان</h3>

      {/* كلمة المرور */}
      <SettingsRow
        title="كلمة المرور"
        description="تغيير كلمة مرور حسابك"
        icon={<Key className="w-4 h-4" />}
        onClick={() => {/* TODO: password change flow */}}
        trailing={<SettingsNavigationChevron />}
      />

      {/* مفاتيح المرور */}
      <SettingsRow
        title="مفاتيح المرور (Passkeys)"
        description="تسجيل الدخول بسرعة باستخدام بصمة الإصبع أو الوجه"
        icon={<Fingerprint className="w-4 h-4" />}
        onClick={() => {/* TODO: WebAuthn registration */}}
        trailing={<SettingsNavigationChevron />}
      />

      {/* المصادقة متعددة العوامل */}
      <div className="pt-2 pb-1">
        <p className="text-xs font-medium text-white/50 px-4">المصادقة متعددة العوامل</p>
      </div>

      <SettingsRow
        title="تطبيق المصادقة"
        description="استخدم تطبيق مصادقة مثل Google Authenticator"
        icon={<Shield className="w-4 h-4" />}
        control={
          <SettingToggle
            checked={mfaApp}
            onCheckedChange={setMfaApp}
            size="sm"
          />
        }
      />

      <SettingsRow
        title="الرسائل النصية"
        description="تلقي رمز التحقق عبر SMS"
        icon={<MessageSquare className="w-4 h-4" />}
        control={
          <SettingToggle
            checked={mfaSms}
            onCheckedChange={setMfaSms}
            size="sm"
          />
        }
      />

      {/* تسجيل الخروج */}
      <div className="pt-4 pb-1">
        <p className="text-xs font-medium text-white/50 px-4">الجلسات</p>
      </div>

      <SettingsRow
        title="تسجيل الخروج من هذا الجهاز"
        icon={<LogOut className="w-4 h-4" />}
        onClick={() => setShowLogoutConfirm(true)}
        trailing={<SettingsNavigationChevron />}
      />

      <SettingsRow
        title="تسجيل الخروج من جميع الأجهزة"
        description="إنهاء جميع الجلسات النشطة"
        icon={<LogOut className="w-4 h-4" />}
        onClick={() => setShowLogoutAllConfirm(true)}
        trailing={<SettingsNavigationChevron />}
      />

      {/* ── Modals ── */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        type="warning"
        title="تسجيل الخروج"
        description="هل تريد تسجيل الخروج من هذا الجهاز؟"
        confirmText="تسجيل الخروج"
      />

      <ConfirmModal
        isOpen={showLogoutAllConfirm}
        onClose={() => setShowLogoutAllConfirm(false)}
        onConfirm={handleLogoutAll}
        type="danger"
        title="تسجيل الخروج من جميع الأجهزة"
        description="سيتم إنهاء جميع الجلسات النشطة. ستحتاج لتسجيل الدخول مرة أخرى على كل جهاز."
        confirmText="تسجيل الخروج من الكل"
      />
    </div>
  );
}
