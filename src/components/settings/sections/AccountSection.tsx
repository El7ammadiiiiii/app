"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Key, 
  Smartphone,
  LogOut,
  Trash2,
  Download,
  PauseCircle,
  Crown,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { 
  SettingCard, 
  SettingToggle, 
  SettingGroup,
  SettingsTabs,
  ProfileAvatar,
  ProfileCompletionCard,
  ConfirmModal,
} from "../components";

// Mock user data
const mockUser = {
  id: "1",
  fullName: "أحمد علي",
  username: "ahmed_ali",
  email: "ahmed@cccways.com",
  phone: "+966 50 123 4567",
  photoUrl: "",
  plan: "pro" as const,
  twoFactorEnabled: true,
  emailVerified: true,
  createdAt: new Date("2024-01-15"),
};

const mockSessions = [
  { id: "1", device: "Windows PC", browser: "Chrome", location: "الرياض", lastActive: new Date(), isCurrent: true },
  { id: "2", device: "iPhone 15", browser: "Safari", location: "جدة", lastActive: new Date(Date.now() - 86400000), isCurrent: false },
  { id: "3", device: "MacBook Pro", browser: "Firefox", location: "الدمام", lastActive: new Date(Date.now() - 172800000), isCurrent: false },
];

export function AccountSection() {
  const [activeTab, setActiveTab] = React.useState("personal");
  const [twoFAEnabled, setTwoFAEnabled] = React.useState(mockUser.twoFactorEnabled);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [disableModalOpen, setDisableModalOpen] = React.useState(false);

  // Profile completion items for the card
  const completionItems = React.useMemo(() => [
    { id: "name", label: "أضف اسمك الكامل", completed: !!mockUser.fullName, priority: "high" as const },
    { id: "email", label: "وثّق بريدك الإلكتروني", completed: mockUser.emailVerified, priority: "high" as const },
    { id: "phone", label: "أضف رقم هاتفك", completed: !!mockUser.phone, priority: "medium" as const },
    { id: "photo", label: "ارفع صورة شخصية", completed: !!mockUser.photoUrl, priority: "low" as const },
  ], []);

  const tabs = [
    { id: "personal", label: "معلومات شخصية" },
    { id: "security", label: "الأمان" },
    { id: "management", label: "إدارة الحساب" },
  ];

  return (
    <div className="space-y-4">
      {/* Profile Completion Card - LinkedIn Style */}
      <ProfileCompletionCard items={completionItems} />

      {/* Profile Card - Compact */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-xl p-4"
      >
        <div className="flex items-center gap-4">
          <ProfileAvatar
            photoUrl={mockUser.photoUrl}
            name={mockUser.fullName}
            size="lg"
            editable
            onEdit={() => {}}
          />
          
          <div className="flex-1 text-right min-w-0">
            <div className="flex items-center gap-2 justify-end">
              <h2 className="text-lg font-bold text-foreground truncate">{mockUser.fullName}</h2>
              {mockUser.plan === "pro" && (
                <span className="flex items-center gap-1 bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0">
                  <Crown className="w-2.5 h-2.5" />
                  Pro
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">{mockUser.email}</p>
            <p className="text-xs text-muted-foreground">@{mockUser.username}</p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <SettingsTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
        {/* Personal Info Tab */}
        {activeTab === "personal" && (
          <div className="space-y-6">
            <SettingGroup title="المعلومات الأساسية">
              <SettingCard
                icon={<User className="w-5 h-5" />}
                title="الاسم الكامل"
                description={mockUser.fullName}
              >
                <button className="text-sm text-primary hover:underline">تعديل</button>
              </SettingCard>

              <SettingCard
                icon={<User className="w-5 h-5" />}
                title="اسم المستخدم"
                description={`@${mockUser.username}`}
              >
                <button className="text-sm text-primary hover:underline">تعديل</button>
              </SettingCard>

              <SettingCard
                icon={<Mail className="w-5 h-5" />}
                title="البريد الإلكتروني"
                description={mockUser.email}
              >
                <div className="flex items-center gap-2">
                  {mockUser.emailVerified ? (
                    <span className="flex items-center gap-1 text-xs text-primary">
                      <CheckCircle className="w-3 h-3" />
                      موثق
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-secondary">
                      <AlertCircle className="w-3 h-3" />
                      غير موثق
                    </span>
                  )}
                  <button className="text-sm text-primary hover:underline">تغيير</button>
                </div>
              </SettingCard>

              <SettingCard
                icon={<Phone className="w-5 h-5" />}
                title="رقم الهاتف"
                description={mockUser.phone || "لم يتم إضافة رقم"}
              >
                <button className="text-sm text-primary hover:underline">
                  {mockUser.phone ? "تعديل" : "إضافة"}
                </button>
              </SettingCard>
            </SettingGroup>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
          <div className="space-y-6">
            <SettingGroup title="كلمة المرور">
              <SettingCard
                icon={<Key className="w-5 h-5" />}
                title="تغيير كلمة المرور"
                description="آخر تغيير منذ 30 يوم"
              >
                <button className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:brightness-90 transition-colors">
                  تغيير
                </button>
              </SettingCard>
            </SettingGroup>

            <SettingGroup title="المصادقة الثنائية">
              <SettingCard
                icon={<Shield className="w-5 h-5" />}
                title="المصادقة الثنائية (2FA)"
                description="حماية إضافية لحسابك"
              >
                <SettingToggle
                  checked={twoFAEnabled}
                  onCheckedChange={setTwoFAEnabled}
                />
              </SettingCard>
            </SettingGroup>

            <SettingGroup title="الجلسات النشطة">
              {mockSessions.map((session) => (
                <SettingCard
                  key={session.id}
                  icon={<Smartphone className="w-5 h-5" />}
                  title={`${session.device} - ${session.browser}`}
                  description={`${session.location} • ${session.isCurrent ? "الجلسة الحالية" : "آخر نشاط: " + session.lastActive.toLocaleDateString("ar")}`}
                >
                  {!session.isCurrent && (
                    <button className="text-sm text-destructive hover:underline flex items-center gap-1">
                      <LogOut className="w-4 h-4" />
                      إنهاء
                    </button>
                  )}
                  {session.isCurrent && (
                    <span className="text-xs text-primary-foreground bg-primary px-2 py-1 rounded-full">
                      الحالية
                    </span>
                  )}
                </SettingCard>
              ))}
              
              <button className="w-full text-center text-sm text-destructive hover:underline py-2">
                تسجيل الخروج من جميع الأجهزة
              </button>
            </SettingGroup>
          </div>
        )}

        {/* Account Management Tab */}
        {activeTab === "management" && (
          <div className="space-y-6">
            <SettingGroup title="تصدير البيانات">
              <SettingCard
                icon={<Download className="w-5 h-5" />}
                title="تصدير بياناتك"
                description="تحميل نسخة من جميع بياناتك"
              >
                <button className="px-4 py-1.5 bg-muted text-foreground rounded-lg text-sm font-medium hover:brightness-90 transition-colors">
                  تصدير
                </button>
              </SettingCard>
            </SettingGroup>

            <SettingGroup title="إجراءات الحساب">
              <SettingCard
                icon={<PauseCircle className="w-5 h-5" />}
                title="تعطيل الحساب مؤقتاً"
                description="يمكنك إعادة تفعيله في أي وقت"
              >
                <button 
                  onClick={() => setDisableModalOpen(true)}
                  className="px-4 py-1.5 bg-[var(--glass-bg)] backdrop-blur-xl border border-secondary text-secondary rounded-lg text-sm font-medium hover:bg-secondary hover:text-white transition-colors"
                >
                  تعطيل
                </button>
              </SettingCard>

              <SettingCard
                icon={<Trash2 className="w-5 h-5" />}
                title="حذف الحساب نهائياً"
                description="سيتم حذف جميع بياناتك بشكل نهائي"
              >
                <button 
                  onClick={() => setDeleteModalOpen(true)}
                  className="px-4 py-1.5 bg-[var(--glass-bg)] backdrop-blur-xl border border-destructive text-destructive rounded-lg text-sm font-medium hover:bg-destructive hover:text-white transition-colors"
                >
                  حذف
                </button>
              </SettingCard>
            </SettingGroup>
          </div>
        )}
      </SettingsTabs>

      {/* Modals */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={() => {
          
          setDeleteModalOpen(false);
        }}
        type="danger"
        title="حذف الحساب نهائياً"
        description="هذا الإجراء لا يمكن التراجع عنه. سيتم حذف جميع بياناتك ومحادثاتك وإعداداتك بشكل نهائي."
        confirmText="حذف الحساب"
        requireInput="DELETE"
      />

      <ConfirmModal
        isOpen={disableModalOpen}
        onClose={() => setDisableModalOpen(false)}
        onConfirm={() => {
          
          setDisableModalOpen(false);
        }}
        type="warning"
        title="تعطيل الحساب مؤقتاً"
        description="سيتم تعطيل حسابك ولن تتمكن من الوصول إليه حتى تعيد تفعيله. يمكنك إعادة التفعيل في أي وقت من خلال تسجيل الدخول."
        confirmText="تعطيل"
      />
    </div>
  );
}
