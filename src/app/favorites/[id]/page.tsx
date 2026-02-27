"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFavoritesStore } from "@/store/favoritesStore";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Trash2, Copy, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FavoritePage() {
  const params = useParams();
  const router = useRouter();
  const { pages, removeItemFromPage, removePage } = useFavoritesStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const pageId = params?.id as string;
  const page = pageId ? pages.find((p) => p.id === pageId) : undefined;

  if (!page) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <p>الصفحة غير موجودة</p>
        <button 
          onClick={() => router.back()}
          className="mt-4 text-primary hover:underline"
        >
          العودة
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background/50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">{page.name}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {page.items.length} عناصر محفوظة
            </p>
          </div>
        </div>
        
        <button
          onClick={() => {
            if (confirm("هل أنت متأكد من حذف هذه الصفحة بالكامل؟")) {
              removePage(page.id);
              router.push("/");
            }
          }}
          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          title="حذف الصفحة"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {page.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground/50">
            <p>لا توجد عناصر محفوظة في هذه الصفحة</p>
          </div>
        ) : (
          page.items.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="group relative bg-card/50 border border-border/50 rounded-2xl p-6 hover:border-primary/20 transition-all duration-300 shadow-sm"
            >
              {/* Item Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/30">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(item.timestamp).toLocaleDateString('ar-EG', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                  {item.source && (
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px]">
                      {item.source}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => navigator.clipboard.writeText(item.content)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="نسخ النص"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => removeItemFromPage(page.id, item.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                    title="حذف العنصر"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Item Content */}
              <div className="prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                {item.content}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
