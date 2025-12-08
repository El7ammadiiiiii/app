"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { 
  FileText,
  Upload,
  Trash2,
  Download,
  Image,
  FileCode,
  FileSpreadsheet,
  File,
  HardDrive,
  Clock,
  Search,
  MoreVertical,
} from "lucide-react";
import { 
  SettingCard, 
  SettingToggle, 
  SettingSelect,
  SettingGroup,
  ConfirmModal,
} from "../components";
import { useSettingsStore } from "../store/settingsStore";

const retentionOptions = [
  { value: "7", label: "أسبوع" },
  { value: "30", label: "شهر" },
  { value: "90", label: "3 أشهر" },
  { value: "365", label: "سنة" },
];

const files = [
  { 
    id: "1", 
    name: "تحليل_السوق.pdf", 
    type: "pdf", 
    size: "2.4 MB", 
    date: "منذ يومين",
    icon: FileText,
    color: "text-red-500",
  },
  { 
    id: "2", 
    name: "بيانات_الأسهم.xlsx", 
    type: "excel", 
    size: "1.8 MB", 
    date: "منذ 5 أيام",
    icon: FileSpreadsheet,
    color: "text-green-500",
  },
  { 
    id: "3", 
    name: "chart_screenshot.png", 
    type: "image", 
    size: "845 KB", 
    date: "منذ أسبوع",
    icon: Image,
    color: "text-blue-500",
  },
  { 
    id: "4", 
    name: "trading_script.py", 
    type: "code", 
    size: "12 KB", 
    date: "منذ أسبوعين",
    icon: FileCode,
    color: "text-purple-500",
  },
];

export function FilesSection() {
  const {
    autoDeleteFiles,
    fileRetentionDays,
    compressUploads,
    updateSetting,
  } = useSettingsStore();

  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");

  // حساب نسبة الاستخدام
  const usedStorage = 245; // MB
  const totalStorage = 1024; // MB (1 GB)
  const usagePercent = Math.round((usedStorage / totalStorage) * 100);

  const handleDeleteFile = (fileId: string) => {
    setSelectedFile(fileId);
    setShowDeleteModal(true);
  };

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Storage Overview */}
      <SettingGroup title="نظرة عامة على التخزين">
        <div className="p-6 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-6">
            <div className="relative w-24 h-24">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-muted"
                />
                <motion.circle
                  cx="48"
                  cy="48"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={251.2}
                  initial={{ strokeDashoffset: 251.2 }}
                  animate={{ strokeDashoffset: 251.2 - (251.2 * usagePercent) / 100 }}
                  transition={{ duration: 0.5 }}
                  className="text-primary"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-foreground">{usagePercent}%</span>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-foreground">المستندات</span>
                  <span className="text-sm text-muted-foreground">120 MB</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full bg-red-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: "48%" }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-foreground">الصور</span>
                  <span className="text-sm text-muted-foreground">85 MB</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full bg-blue-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: "35%" }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-foreground">أخرى</span>
                  <span className="text-sm text-muted-foreground">40 MB</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full bg-purple-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: "16%" }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  />
                </div>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4 text-center">
            {usedStorage} MB مستخدم من {totalStorage} MB
          </p>
        </div>
      </SettingGroup>

      {/* Upload Settings */}
      <SettingGroup title="إعدادات الرفع">
        <SettingCard
          icon={<HardDrive className="w-5 h-5" />}
          title="ضغط الملفات عند الرفع"
          description="ضغط الملفات تلقائياً لتوفير المساحة"
        >
          <SettingToggle
            checked={compressUploads}
            onCheckedChange={(v) => updateSetting("compressUploads", v)}
          />
        </SettingCard>

        <SettingCard
          icon={<Clock className="w-5 h-5" />}
          title="حذف الملفات تلقائياً"
          description="حذف الملفات القديمة تلقائياً"
        >
          <SettingToggle
            checked={autoDeleteFiles}
            onCheckedChange={(v) => updateSetting("autoDeleteFiles", v)}
          />
        </SettingCard>

        {autoDeleteFiles && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <SettingSelect
              label="مدة الاحتفاظ بالملفات"
              description="الملفات الأقدم ستُحذف تلقائياً"
              value={fileRetentionDays.toString()}
              onValueChange={(v) => updateSetting("fileRetentionDays", parseInt(v))}
              options={retentionOptions}
            />
          </motion.div>
        )}
      </SettingGroup>

      {/* File Management */}
      <SettingGroup title="إدارة الملفات">
        <div className="space-y-4">
          {/* Search & Actions */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث في الملفات..."
                className="w-full pr-10 pl-4 py-2 rounded-lg bg-muted border border-border
                         text-foreground placeholder:text-muted-foreground
                         focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white transition-colors hover:brightness-90">
              <Upload className="w-4 h-4" />
              <span>رفع</span>
            </button>
          </div>

          {/* Files List */}
          <div className="space-y-2">
            {filteredFiles.map((file) => {
              const Icon = file.icon;
              return (
                <motion.div
                  key={file.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border
                           hover:border-primary transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Icon className={`w-5 h-5 ${file.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground truncate">{file.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {file.size} • {file.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                      <Download className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      className="p-2 rounded-lg transition-colors hover:bg-destructive hover:text-white"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {filteredFiles.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <File className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>لا توجد ملفات مطابقة</p>
            </div>
          )}
        </div>
      </SettingGroup>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          setShowDeleteModal(false);
          setSelectedFile(null);
        }}
        title="حذف الملف"
        description="هل أنت متأكد من حذف هذا الملف؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText="حذف"
        type="danger"
      />
    </div>
  );
}
