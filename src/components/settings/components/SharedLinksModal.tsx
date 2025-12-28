"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Trash2, MessageSquare, FileText, Search, Clock } from "lucide-react";
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
  Timestamp 
} from "firebase/firestore";

interface SharedLink {
  id: string;
  name: string;
  type: 'chat' | 'post' | 'document';
  url: string;
  sharedAt: Date;
}

interface SharedLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

export function SharedLinksModal({ isOpen, onClose, userId }: SharedLinksModalProps) {
  const [links, setLinks] = React.useState<SharedLink[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Fetch shared links from Firebase
  React.useEffect(() => {
    if (!isOpen) return;

    const fetchLinks = async () => {
      setLoading(true);
      try {
        if (db && userId) {
          const linksRef = collection(db, "users", userId, "sharedLinks");
          const q = query(linksRef, orderBy("sharedAt", "desc"));
          const snapshot = await getDocs(q);
          
          const fetchedLinks: SharedLink[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            sharedAt: doc.data().sharedAt?.toDate() || new Date(),
          })) as SharedLink[];
          
          setLinks(fetchedLinks);
        } else {
          // Mock data for development
          setLinks([
            { id: "1", name: "إعدادات المستخدم ChatGPT", type: "chat", url: "/chat/1", sharedAt: new Date("2025-12-07") },
            { id: "2", name: "Canvas مقابل Popup فتح", type: "chat", url: "/chat/2", sharedAt: new Date("2025-11-19") },
            { id: "3", name: "Ethereum برمجة عقد ذكي", type: "chat", url: "/chat/3", sharedAt: new Date("2023-12-01") },
            { id: "4", name: "Dyor.net Features", type: "chat", url: "/chat/4", sharedAt: new Date("2023-11-30") },
            { id: "5", name: "operation محتويات عمود", type: "post", url: "/post/5", sharedAt: new Date("2025-10-26") },
            { id: "6", name: "n8n تعرف على", type: "post", url: "/post/6", sharedAt: new Date("2025-10-18") },
          ]);
        }
      } catch (error) {
        console.error("Error fetching shared links:", error);
        // Use mock data on error
        setLinks([
          { id: "1", name: "إعدادات المستخدم ChatGPT", type: "chat", url: "/chat/1", sharedAt: new Date("2025-12-07") },
          { id: "2", name: "Canvas مقابل Popup فتح", type: "chat", url: "/chat/2", sharedAt: new Date("2025-11-19") },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchLinks();
  }, [isOpen, userId]);

  // Delete a shared link
  const handleDelete = async (linkId: string) => {
    setDeletingId(linkId);
    try {
      if (db && userId) {
        await deleteDoc(doc(db, "users", userId, "sharedLinks", linkId));
      }
      setLinks((prev) => prev.filter((link) => link.id !== linkId));
    } catch (error) {
      console.error("Error deleting link:", error);
    } finally {
      setDeletingId(null);
    }
  };

  // Filter links based on search
  const filteredLinks = links.filter((link) =>
    link.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  // Get icon based on type
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "chat":
        return <MessageSquare className="w-4 h-4" />;
      case "post":
        return <FileText className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  // Get type label
  const getTypeLabel = (type: string) => {
    switch (type) {
      case "chat":
        return "دردشة";
      case "post":
        return "منشور";
      case "document":
        return "مستند";
      default:
        return type;
    }
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
            className="w-full max-w-2xl theme-card rounded-2xl border border-border shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">الروابط التي تمت مشاركتها</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="البحث في الروابط..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            {/* Content */}
            <div className="max-h-[400px] overflow-y-auto p-4 space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredLinks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "لا توجد نتائج للبحث" : "لا توجد روابط مشتركة"}
                </div>
              ) : (
                filteredLinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 rounded-xl border border-border/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        {getTypeIcon(link.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-foreground hover:text-primary truncate block"
                        >
                          {link.name}
                        </a>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="px-2 py-0.5 bg-muted rounded-full">
                            {getTypeLabel(link.type)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(link.sharedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        title="فتح الرابط"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleDelete(link.id)}
                        disabled={deletingId === link.id}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                        title="حذف الرابط"
                      >
                        {deletingId === link.id ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-muted/30">
              <p className="text-xs text-muted-foreground text-center">
                {filteredLinks.length} رابط مشترك
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
