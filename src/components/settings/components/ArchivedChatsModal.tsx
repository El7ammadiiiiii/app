"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Archive, RotateCcw, Trash2, MessageSquare, Search, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase/client";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  deleteDoc, 
  doc,
  updateDoc 
} from "firebase/firestore";

interface ArchivedChat {
  id: string;
  title: string;
  messagesCount: number;
  archivedAt: Date;
  previewText?: string;
}

interface ArchivedChatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onRestore?: (chatId: string) => void;
}

export function ArchivedChatsModal({ isOpen, onClose, userId, onRestore }: ArchivedChatsModalProps) {
  const [chats, setChats] = React.useState<ArchivedChat[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [restoringId, setRestoringId] = React.useState<string | null>(null);

  // Fetch archived chats from Firebase
  React.useEffect(() => {
    if (!isOpen) return;

    const fetchChats = async () => {
      setLoading(true);
      try {
        if (db && userId) {
          const chatsRef = collection(db, "users", userId, "archivedChats");
          const q = query(chatsRef, orderBy("archivedAt", "desc"));
          const snapshot = await getDocs(q);
          
          const fetchedChats: ArchivedChat[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            archivedAt: doc.data().archivedAt?.toDate() || new Date(),
          })) as ArchivedChat[];
          
          setChats(fetchedChats);
        } else {
          // Mock data for development - empty to match ChatGPT screenshot
          setChats([]);
        }
      } catch (error) {
        console.error("Error fetching archived chats:", error);
        setChats([]);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, [isOpen, userId]);

  // Delete an archived chat
  const handleDelete = async (chatId: string) => {
    setDeletingId(chatId);
    try {
      if (db && userId) {
        await deleteDoc(doc(db, "users", userId, "archivedChats", chatId));
      }
      setChats((prev) => prev.filter((chat) => chat.id !== chatId));
    } catch (error) {
      console.error("Error deleting chat:", error);
    } finally {
      setDeletingId(null);
    }
  };

  // Restore an archived chat
  const handleRestore = async (chatId: string) => {
    setRestoringId(chatId);
    try {
      if (db && userId) {
        // Move from archivedChats back to chats
        // This would involve copying the data and deleting from archived
        await deleteDoc(doc(db, "users", userId, "archivedChats", chatId));
      }
      setChats((prev) => prev.filter((chat) => chat.id !== chatId));
      onRestore?.(chatId);
    } catch (error) {
      console.error("Error restoring chat:", error);
    } finally {
      setRestoringId(null);
    }
  };

  // Filter chats based on search
  const filteredChats = chats.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center theme-bg p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg theme-card rounded-2xl border border-border shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">الدردشات المؤرشفة</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search - only show if there are chats */}
            {chats.length > 0 && (
              <div className="p-4 border-b border-border">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="البحث في المحادثات المؤرشفة..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pr-10 pl-4 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            )}

            {/* Content */}
            <div className="max-h-[400px] overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "لا توجد نتائج للبحث" : ".لا توجد لديك محادثات مؤرشفة"}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredChats.map((chat) => (
                    <div
                      key={chat.id}
                      className="flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 rounded-xl border border-border/50 transition-colors group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Archive className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {chat.title}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              {chat.messagesCount} رسالة
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(chat.archivedAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleRestore(chat.id)}
                          disabled={restoringId === chat.id}
                          className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                          title="استعادة المحادثة"
                        >
                          {restoringId === chat.id ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <RotateCcw className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(chat.id)}
                          disabled={deletingId === chat.id}
                          className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                          title="حذف نهائياً"
                        >
                          {deletingId === chat.id ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
