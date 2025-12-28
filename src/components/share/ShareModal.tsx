"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Link2,
  Twitter,
  Linkedin,
  Copy,
  Check,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Reddit icon component
const RedditIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
  </svg>
);

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  shareUrl?: string;
  shareText?: string;
  type?: "chat" | "project";
}

export function ShareModal({
  isOpen,
  onClose,
  title = "مشاركة المحادثة",
  shareUrl,
  shareText = "شاهد هذه المحادثة على CCCWAYS",
  type = "chat",
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const url = shareUrl || (typeof window !== "undefined" ? window.location.href : "https://cccways.com");
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(shareText);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const shareOptions = [
    {
      id: "copy",
      label: "نسخ الرابط",
      icon: linkCopied ? Check : Link2,
      onClick: handleCopyLink,
      className: linkCopied ? "text-green-500" : "",
    },
    {
      id: "x",
      label: "X",
      icon: Twitter,
      onClick: () => window.open(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`, "_blank"),
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      icon: Linkedin,
      onClick: () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, "_blank"),
    },
    {
      id: "reddit",
      label: "Reddit",
      icon: RedditIcon,
      onClick: () => window.open(`https://reddit.com/submit?url=${encodedUrl}&title=${encodedText}`, "_blank"),
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="theme-card border border-border rounded-2xl shadow-2xl overflow-hidden mx-4">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-foreground">
                    {type === "chat" ? "CCCWAYS" : "CCCWAYS"} {title}
                  </span>
                </div>
                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Content */}
              <div className="p-5 space-y-5">
                {/* Preview Card */}
                <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shrink-0">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground leading-relaxed text-right">
                        {shareText}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Logo */}
                <div className="flex justify-center">
                  <span className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent" dir="ltr">
                    CCCWAYS
                  </span>
                </div>

                {/* Share Options */}
                <div className="flex items-center justify-center gap-4">
                  {shareOptions.map((option) => (
                    <motion.button
                      key={option.id}
                      onClick={option.onClick}
                      whileHover={{ scale: 1.1, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted transition-colors min-w-[70px]",
                        option.className
                      )}
                    >
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <option.icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs text-muted-foreground">{option.label}</span>
                    </motion.button>
                  ))}
                </div>

                {/* Copy URL Input */}
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-xl border border-border/50">
                  <input
                    type="text"
                    value={url}
                    readOnly
                    className="flex-1 bg-transparent text-sm text-muted-foreground px-2 py-1.5 focus:outline-none truncate"
                    dir="ltr"
                  />
                  <motion.button
                    onClick={handleCopyLink}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      linkCopied
                        ? "bg-green-500/20 text-green-500"
                        : "bg-primary/10 text-primary hover:bg-primary/20"
                    )}
                  >
                    {linkCopied ? (
                      <span className="flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        تم النسخ
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Copy className="w-4 h-4" />
                        نسخ
                      </span>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
