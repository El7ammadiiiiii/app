"use client";

import * as React from "react";
import {
  Sparkles,
  Link2,
  Archive,
  ArchiveRestore,
  Trash2,
  Download,
} from "lucide-react";
import { SettingsRow, SettingsNavigationChevron } from "../components/SettingsRow";
import {
  SharedLinksModal,
  ArchivedChatsModal,
  ExportDataModal,
  ImproveModelModal,
  ConfirmModal,
} from "../components";
import { useSettingsStore } from "../store/settingsStore";

/* ── Firestore bulk operations ── */
import { db, ensureAnonymousAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

async function archiveAllChats() {
  if (!isFirebaseConfigured || !db) return false;
  const user = await ensureAnonymousAuth();
  if (!user) return false;

  const q = query(
    collection(db, "conversations"),
    where("userId", "==", user.uid),
    where("isArchived", "==", false)
  );
  const snap = await getDocs(q);
  if (snap.empty) return true;

  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    batch.update(d.ref, { isArchived: true, archivedAt: serverTimestamp() });
  });
  await batch.commit();
  return true;
}

async function deleteAllChats() {
  if (!isFirebaseConfigured || !db) return false;
  const user = await ensureAnonymousAuth();
  if (!user) return false;

  const q = query(
    collection(db, "conversations"),
    where("userId", "==", user.uid)
  );
  const snap = await getDocs(q);
  if (snap.empty) return true;

  // Firestore batch max 500 — handle in chunks
  const chunks: typeof snap.docs[] = [];
  for (let i = 0; i < snap.docs.length; i += 450) {
    chunks.push(snap.docs.slice(i, i + 450));
  }

  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  return true;
}

export function DataControlsSection() {
  const [showImproveModel, setShowImproveModel] = React.useState(false);
  const [showSharedLinks, setShowSharedLinks] = React.useState(false);
  const [showArchived, setShowArchived] = React.useState(false);
  const [showExport, setShowExport] = React.useState(false);
  const [showArchiveAll, setShowArchiveAll] = React.useState(false);
  const [showDeleteAll, setShowDeleteAll] = React.useState(false);

  return (
    <div className="space-y-1">
      <h3 className="text-lg font-semibold text-white/90 mb-4">عناصر التحكم في البيانات</h3>

      {/* تحسين النموذج */}
      <SettingsRow
        title="تحسين النموذج للجميع"
        description="السماح باستخدام محادثاتك لتحسين نماذجنا"
        icon={<Sparkles className="w-4 h-4" />}
        onClick={() => setShowImproveModel(true)}
        trailing={<SettingsNavigationChevron />}
      />

      {/* الروابط المشاركة */}
      <SettingsRow
        title="الروابط المشاركة"
        description="إدارة الروابط التي شاركتها"
        icon={<Link2 className="w-4 h-4" />}
        onClick={() => setShowSharedLinks(true)}
        trailing={<SettingsNavigationChevron />}
      />

      {/* المحادثات المؤرشفة */}
      <SettingsRow
        title="المحادثات المؤرشفة"
        description="عرض واستعادة المحادثات المؤرشفة"
        icon={<Archive className="w-4 h-4" />}
        onClick={() => setShowArchived(true)}
        trailing={<SettingsNavigationChevron />}
      />

      {/* أرشفة الكل */}
      <SettingsRow
        title="أرشفة جميع المحادثات"
        description="نقل جميع المحادثات إلى الأرشيف"
        icon={<ArchiveRestore className="w-4 h-4" />}
        onClick={() => setShowArchiveAll(true)}
        trailing={<SettingsNavigationChevron />}
      />

      {/* حذف الكل */}
      <SettingsRow
        title="حذف جميع المحادثات"
        description="حذف جميع المحادثات نهائياً"
        icon={<Trash2 className="w-4 h-4" />}
        onClick={() => setShowDeleteAll(true)}
        trailing={<SettingsNavigationChevron />}
      />

      {/* تصدير البيانات */}
      <SettingsRow
        title="تصدير البيانات"
        description="تحميل نسخة من جميع بياناتك"
        icon={<Download className="w-4 h-4" />}
        onClick={() => setShowExport(true)}
        trailing={<SettingsNavigationChevron />}
      />

      {/* ── Modals ── */}
      <ImproveModelModal
        isOpen={showImproveModel}
        onClose={() => setShowImproveModel(false)}
      />
      <SharedLinksModal
        isOpen={showSharedLinks}
        onClose={() => setShowSharedLinks(false)}
      />
      <ArchivedChatsModal
        isOpen={showArchived}
        onClose={() => setShowArchived(false)}
      />
      <ExportDataModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
      />
      <ConfirmModal
        isOpen={showArchiveAll}
        onClose={() => setShowArchiveAll(false)}
        onConfirm={async () => {
          await archiveAllChats();
          setShowArchiveAll(false);
        }}
        type="warning"
        title="أرشفة جميع المحادثات"
        description="سيتم نقل جميع محادثاتك إلى الأرشيف. يمكنك استعادتها لاحقاً."
        confirmText="أرشفة الكل"
      />
      <ConfirmModal
        isOpen={showDeleteAll}
        onClose={() => setShowDeleteAll(false)}
        onConfirm={async () => {
          await deleteAllChats();
          setShowDeleteAll(false);
        }}
        type="danger"
        title="حذف جميع المحادثات"
        description="هذا الإجراء لا يمكن التراجع عنه. سيتم حذف جميع محادثاتك بشكل نهائي."
        confirmText="حذف الكل"
        requireInput="DELETE"
      />
    </div>
  );
}
