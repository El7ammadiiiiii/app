"use client";

import * as React from "react";
import { 
  Shield,
  Brain,
  MessageSquare,
  Download,
  Trash2,
  Eye,
  Database,
  Search,
  Link2,
  Archive,
  Clock,
  Sparkles,
} from "lucide-react";
import { 
  SettingCard, 
  SettingToggle, 
  SettingSelect,
  SettingGroup,
  SettingsTabs,
  ConfirmModal,
  SharedLinksModal,
  ArchivedChatsModal,
  ExportDataModal,
  ImproveModelModal,
} from "../components";
import { useSettingsStore } from "../store/settingsStore";

export function PrivacySection() {
  const [activeTab, setActiveTab] = React.useState("data");
  const [deleteChatsModal, setDeleteChatsModal] = React.useState(false);
  const [clearMemoryModal, setClearMemoryModal] = React.useState(false);
  const [sharedLinksModal, setSharedLinksModal] = React.useState(false);
  const [archivedChatsModal, setArchivedChatsModal] = React.useState(false);
  const [exportDataModal, setExportDataModal] = React.useState(false);
  const [improveModelModal, setImproveModelModal] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  
  const {
    dataSharing,
    anonymousAnalytics,
    smartPersonalization,
    memoryEnabled,
    historyEnabled,
    historyRetention,
    temporaryChatMode,
    improveModelForAll,
    updateSetting,
  } = useSettingsStore();

  const tabs = [
    { id: "data", label: "البيانات" },
    { id: "memory", label: "الذاكرة" },
    { id: "conversations", label: "المحادثات" },
    { id: "security", label: "الأمان" },
  ];

  const retentionOptions = [
    { value: "7d", label: "7 أيام" },
    { value: "30d", label: "30 يوم" },
    { value: "90d", label: "90 يوم" },
    { value: "forever", label: "للأبد" },
  ];

  // Mock memory items
  const memoryItems = [
    { id: "1", content: "المستخدم مهتم بتحليل البيتكوين", category: "تفضيلات" },
    { id: "2", content: "يفضل الردود المفصلة", category: "أسلوب" },
    { id: "3", content: "متداول متوسط الخبرة", category: "مستوى" },
  ];

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="البحث في المحادثات..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pr-10 pl-4 py-2.5 bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
        />
      </div>

      <SettingsTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
        {/* Data Tab */}
        {activeTab === "data" && (
          <div className="space-y-6">
            <SettingGroup title="استخدام البيانات">
              <SettingCard
                icon={<Database className="w-5 h-5" />}
                title="تحسين الخدمة"
                description="السماح باستخدام محادثاتك لتحسين جودة الخدمة"
              >
                <SettingToggle
                  checked={dataSharing}
                  onCheckedChange={(v) => updateSetting("dataSharing", v)}
                />
              </SettingCard>

              <SettingCard
                icon={<Shield className="w-5 h-5" />}
                title="إحصائيات مجهولة"
                description="مشاركة بيانات استخدام مجهولة للتحليلات"
              >
                <SettingToggle
                  checked={anonymousAnalytics}
                  onCheckedChange={(v) => updateSetting("anonymousAnalytics", v)}
                />
              </SettingCard>

              <SettingCard
                icon={<Brain className="w-5 h-5" />}
                title="التخصيص الذكي"
                description="تخصيص الردود بناءً على سلوكك وتفضيلاتك"
              >
                <SettingToggle
                  checked={smartPersonalization}
                  onCheckedChange={(v) => updateSetting("smartPersonalization", v)}
                />
              </SettingCard>
            </SettingGroup>

            <SettingGroup title="تصدير البيانات">
              <SettingCard
                icon={<Download className="w-5 h-5" />}
                title="تصدير المحادثات"
                description="تحميل جميع محادثاتك بصيغة JSON أو TXT"
              >
                <button className="px-4 py-1.5 bg-muted text-foreground rounded-lg text-sm font-medium hover:brightness-90 transition-colors">
                  تصدير
                </button>
              </SettingCard>

              <SettingCard
                icon={<Download className="w-5 h-5" />}
                title="تصدير الإعدادات"
                description="تحميل إعداداتك الحالية"
              >
                <button className="px-4 py-1.5 bg-muted text-foreground rounded-lg text-sm font-medium hover:brightness-90 transition-colors">
                  تصدير
                </button>
              </SettingCard>

              <SettingCard
                icon={<Download className="w-5 h-5" />}
                title="تصدير كل البيانات"
                description="تحميل جميع بياناتك في ملف ZIP"
              >
                <button 
                  onClick={() => setExportDataModal(true)}
                  className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:brightness-90 transition-colors"
                >
                  تصدير الكل
                </button>
              </SettingCard>
            </SettingGroup>

            <SettingGroup title="تحسين النموذج">
              <SettingCard
                icon={<Sparkles className="w-5 h-5" />}
                title="تحسين النموذج للجميع"
                description="السماح باستخدام محادثاتك لتحسين نماذج الذكاء الاصطناعي"
              >
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setImproveModelModal(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    معرفة المزيد
                  </button>
                  <SettingToggle
                    checked={improveModelForAll}
                    onCheckedChange={(v) => updateSetting("improveModelForAll", v)}
                  />
                </div>
              </SettingCard>
            </SettingGroup>
          </div>
        )}

        {/* Memory Tab */}
        {activeTab === "memory" && (
          <div className="space-y-6">
            <SettingGroup title="ذاكرة المساعد">
              <SettingCard
                icon={<Brain className="w-5 h-5" />}
                title="تفعيل الذاكرة"
                description="السماح للمساعد بتذكر معلومات عنك"
              >
                <SettingToggle
                  checked={memoryEnabled}
                  onCheckedChange={(v) => updateSetting("memoryEnabled", v)}
                />
              </SettingCard>
            </SettingGroup>

            {memoryEnabled && (
              <SettingGroup title="ما يتذكره المساعد">
                <div className="space-y-2">
                  {memoryItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-lg p-3"
                    >
                      <div className="text-right flex-1">
                        <p className="text-sm text-foreground">{item.content}</p>
                        <span className="text-xs text-muted-foreground">{item.category}</span>
                      </div>
                      <button className="text-destructive hover:underline text-sm">
                        حذف
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setClearMemoryModal(true)}
                  className="w-full py-2 text-destructive border border-destructive rounded-lg transition-colors text-sm hover:bg-destructive hover:text-white"
                >
                  مسح كل الذاكرة
                </button>
              </SettingGroup>
            )}
          </div>
        )}

        {/* Conversations Tab */}
        {activeTab === "conversations" && (
          <div className="space-y-6">
            <SettingGroup title="سجل المحادثات">
              <SettingCard
                icon={<MessageSquare className="w-5 h-5" />}
                title="حفظ سجل المحادثات"
                description="الاحتفاظ بتاريخ محادثاتك"
              >
                <SettingToggle
                  checked={historyEnabled}
                  onCheckedChange={(v) => updateSetting("historyEnabled", v)}
                />
              </SettingCard>

              {historyEnabled && (
                <SettingSelect
                  variant="cmdk"
                  id="settings-privacy-history-retention"
                  modalTitle="مدة الاحتفاظ بالمحادثات"
                  label="مدة الاحتفاظ"
                  description="المدة التي يتم فيها الاحتفاظ بالمحادثات"
                  value={historyRetention}
                  onValueChange={(v) => updateSetting("historyRetention", v as any)}
                  options={retentionOptions}
                />
              )}
            </SettingGroup>

            <SettingGroup title="حذف المحادثات">
              <SettingCard
                icon={<Trash2 className="w-5 h-5" />}
                title="حذف جميع المحادثات"
                description="حذف كل سجل محادثاتك بشكل نهائي"
              >
                <button
                  onClick={() => setDeleteChatsModal(true)}
                  className="px-4 py-1.5 bg-[var(--glass-bg)] backdrop-blur-xl border border-destructive text-destructive rounded-lg text-sm font-medium hover:bg-destructive hover:text-white transition-colors"
                >
                  حذف الكل
                </button>
              </SettingCard>
            </SettingGroup>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
          <div className="space-y-6">
            <SettingGroup title="وضع المحادثة">
              <SettingCard
                icon={<Clock className="w-5 h-5" />}
                title="وضع المحادثة المؤقتة"
                description="المحادثات المؤقتة لا يتم حفظها في السجل ولا تُستخدم لتحسين النموذج"
              >
                <SettingToggle
                  checked={temporaryChatMode}
                  onCheckedChange={(v) => updateSetting("temporaryChatMode", v)}
                />
              </SettingCard>
            </SettingGroup>

            <SettingGroup title="إدارة الروابط والمحادثات">
              <SettingCard
                icon={<Link2 className="w-5 h-5" />}
                title="الروابط المشتركة"
                description="إدارة الروابط التي شاركتها مع الآخرين"
              >
                <button
                  onClick={() => setSharedLinksModal(true)}
                  className="px-4 py-1.5 bg-muted text-foreground rounded-lg text-sm font-medium hover:brightness-90 transition-colors"
                >
                  إدارة
                </button>
              </SettingCard>

              <SettingCard
                icon={<Archive className="w-5 h-5" />}
                title="المحادثات المؤرشفة"
                description="عرض وإدارة المحادثات المؤرشفة"
              >
                <button
                  onClick={() => setArchivedChatsModal(true)}
                  className="px-4 py-1.5 bg-muted text-foreground rounded-lg text-sm font-medium hover:brightness-90 transition-colors"
                >
                  عرض
                </button>
              </SettingCard>
            </SettingGroup>
          </div>
        )}
      </SettingsTabs>

      {/* Modals */}
      <ConfirmModal
        isOpen={deleteChatsModal}
        onClose={() => setDeleteChatsModal(false)}
        onConfirm={() => {
          
          setDeleteChatsModal(false);
        }}
        type="danger"
        title="حذف جميع المحادثات"
        description="سيتم حذف جميع محادثاتك بشكل نهائي. هذا الإجراء لا يمكن التراجع عنه."
        confirmText="حذف الكل"
        requireInput="حذف الكل"
      />

      <ConfirmModal
        isOpen={clearMemoryModal}
        onClose={() => setClearMemoryModal(false)}
        onConfirm={() => {
          
          setClearMemoryModal(false);
        }}
        type="danger"
        title="مسح كل الذاكرة"
        description="سيتم مسح جميع المعلومات التي يتذكرها المساعد عنك."
        confirmText="مسح الذاكرة"
      />

      {/* New Feature Modals */}
      <SharedLinksModal
        isOpen={sharedLinksModal}
        onClose={() => setSharedLinksModal(false)}
      />

      <ArchivedChatsModal
        isOpen={archivedChatsModal}
        onClose={() => setArchivedChatsModal(false)}
      />

      <ExportDataModal
        isOpen={exportDataModal}
        onClose={() => setExportDataModal(false)}
      />

      <ImproveModelModal
        isOpen={improveModelModal}
        onClose={() => setImproveModelModal(false)}
      />
    </div>
  );
}
