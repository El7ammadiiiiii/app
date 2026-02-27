import type { Chat } from "@/store/chatStore";

export interface ChatGroup {
  label: string;
  chats: Chat[];
}

/**
 * Groups chats by date (Arabic labels) matching ChatGPT's pattern:
 *   اليوم → الأمس → الـ 7 أيام السابقة → الـ 30 يومًا السابقة → month names
 */
export function groupChatsByDate(chats: Chat[]): ChatGroup[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(todayStart);
  monthStart.setDate(monthStart.getDate() - 30);

  const groups: Record<string, Chat[]> = {};
  const orderedKeys: string[] = [];

  const addToGroup = (key: string, chat: Chat) => {
    if (!groups[key]) {
      groups[key] = [];
      orderedKeys.push(key);
    }
    groups[key].push(chat);
  };

  const arabicMonths = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
  ];

  // Sort by pinned first, then by updatedAt descending
  const sorted = [...chats].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  for (const chat of sorted) {
    const d = new Date(chat.updatedAt);

    if (chat.isPinned) {
      addToGroup("المثبتة", chat);
    } else if (d >= todayStart) {
      addToGroup("اليوم", chat);
    } else if (d >= yesterdayStart) {
      addToGroup("الأمس", chat);
    } else if (d >= weekStart) {
      addToGroup("الـ 7 أيام السابقة", chat);
    } else if (d >= monthStart) {
      addToGroup("الـ 30 يومًا السابقة", chat);
    } else {
      // Group by month + year
      const monthLabel = `${arabicMonths[d.getMonth()]} ${d.getFullYear()}`;
      addToGroup(monthLabel, chat);
    }
  }

  return orderedKeys.map((key) => ({ label: key, chats: groups[key] }));
}
