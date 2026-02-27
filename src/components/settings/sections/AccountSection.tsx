"use client";

import * as React from "react";
import {
  CreditCard,
  Crown,
  Trash2,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { SettingsRow, SettingsNavigationChevron } from "../components/SettingsRow";
import { ConfirmModal } from "../components";
import { auth, db, isFirebaseConfigured, ensureAnonymousAuth } from "@/lib/firebase/client";
import { signOut } from "firebase/auth";
import { doc, deleteDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { getProfile } from "@/lib/services/userProfileService";

export function AccountSection() {
  const [plan, setPlan] = React.useState<string>("free");
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = React.useState(false);

  React.useEffect(() => {
    getProfile().then((p) => {
      if (p) setPlan(p.plan || "free");
    });
  }, []);

  const planLabels: Record<string, string> = {
    free: "مجاني",
    pro: "Pro",
    enterprise: "Enterprise",
  };

  const handleLogout = async () => {
    if (isFirebaseConfigured && auth) {
      try {
        await signOut(auth);
        window.location.href = "/";
      } catch (e) {
        console.error("[Account] Logout failed:", e);
      }
    }
    setLogoutModalOpen(false);
  };

  const handleDeleteAccount = async () => {
    if (!isFirebaseConfigured || !db) return;
    const user = await ensureAnonymousAuth();
    if (!user) return;

    try {
      // Delete all user conversations
      const convQ = query(collection(db, "conversations"), where("userId", "==", user.uid));
      const convSnap = await getDocs(convQ);
      if (!convSnap.empty) {
        const batch = writeBatch(db);
        convSnap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }

      // Delete user profile
      await deleteDoc(doc(db, "users", user.uid));

      // Delete user settings
      await deleteDoc(doc(db, "user_settings", user.uid));

      // Sign out
      await signOut(auth!);
      window.location.href = "/";
    } catch (e) {
      console.error("[Account] Delete failed:", e);
    }
    setDeleteModalOpen(false);
  };

  return (
    <div className="space-y-1">
      <h3 className="text-lg font-semibold text-white/90 mb-4">الحساب</h3>

      {/* الاشتراك */}
      <SettingsRow
        title="الاشتراك"
        description={`الخطة الحالية: ${planLabels[plan] || plan}`}
        icon={<Crown className="w-4 h-4" />}
        control={
          plan === "free" ? (
            <button className="px-3 py-1.5 bg-teal-600/80 hover:bg-teal-600 text-white text-xs font-medium rounded-lg transition-colors">
              ترقية
            </button>
          ) : (
            <span className="flex items-center gap-1 bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded-full text-[11px] font-medium">
              <Crown className="w-3 h-3" />
              {planLabels[plan]}
            </span>
          )
        }
      />

      {/* الدفع */}
      <SettingsRow
        title="إدارة الدفع"
        description="بيانات الدفع والفواتير"
        icon={<CreditCard className="w-4 h-4" />}
        onClick={() => {/* TODO: Stripe portal */}}
        trailing={<SettingsNavigationChevron />}
      />

      {/* تسجيل الخروج */}
      <div className="pt-3 pb-1">
        <p className="text-xs font-medium text-white/50 px-4">الجلسة</p>
      </div>

      <SettingsRow
        title="تسجيل الخروج"
        icon={<LogOut className="w-4 h-4" />}
        onClick={() => setLogoutModalOpen(true)}
        trailing={<SettingsNavigationChevron />}
      />

      {/* حذف الحساب */}
      <div className="pt-3 pb-1">
        <p className="text-xs font-medium text-white/50 px-4">منطقة الخطر</p>
      </div>

      <SettingsRow
        title="حذف الحساب نهائياً"
        description="سيتم حذف جميع بياناتك بشكل نهائي ولا يمكن التراجع"
        icon={<Trash2 className="w-4 h-4" />}
        onClick={() => setDeleteModalOpen(true)}
        trailing={<SettingsNavigationChevron />}
      />

      {/* ── Modals ── */}
      <ConfirmModal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={handleLogout}
        type="warning"
        title="تسجيل الخروج"
        description="هل تريد تسجيل الخروج من حسابك؟"
        confirmText="تسجيل الخروج"
      />

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteAccount}
        type="danger"
        title="حذف الحساب نهائياً"
        description="هذا الإجراء لا يمكن التراجع عنه. سيتم حذف جميع بياناتك ومحادثاتك وإعداداتك بشكل نهائي."
        confirmText="حذف الحساب"
        requireInput="DELETE"
      />
    </div>
  );
}
