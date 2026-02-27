"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import
{
  X,
  Link2,
  Twitter,
  Linkedin,
  Copy,
  Check,
  MessageSquare,
} from "lucide-react";
import useTimeout from '@/hooks/useTimeout';
import { cn } from "@/lib/utils";

// WhatsApp icon component
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

interface ShareModalProps
{
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  shareUrl?: string;
  shareText?: string;
  type?: "chat" | "project";
}

export function ShareModal ( {
  isOpen,
  onClose,
  title = "مشاركة المحادثة",
  shareUrl,
  shareText = "شاهد هذه المحادثة على CCWAYS",
  type = "chat",
}: ShareModalProps )
{
  const [ copied, setCopied ] = useState( false );
  const [ linkCopied, setLinkCopied ] = useState( false );

  // Auto-clear linkCopied flag
  useTimeout( () => setLinkCopied( false ), linkCopied ? 2000 : undefined, [ linkCopied ] );

  const url = shareUrl || ( typeof window !== "undefined" ? window.location.href : "https://ccways.com" );
  const encodedUrl = encodeURIComponent( url );
  const encodedText = encodeURIComponent( shareText );

  const handleCopyLink = async () =>
  {
    try
    {
      await navigator.clipboard.writeText( url );
      setLinkCopied( true );
    } catch ( err )
    {
      console.error( "Failed to copy:", err );
    }
  };

  const shareOptions = [
    {
      id: "whatsapp",
      label: "WhatsApp",
      icon: WhatsAppIcon,
      onClick: () => window.open( `https://wa.me/?text=${ encodedText }%20${ encodedUrl }`, "_blank" ),
      className: "hover:text-[#25D366]",
    },
    {
      id: "copy",
      label: "نسخ الرابط",
      icon: linkCopied ? Check : Link2,
      onClick: handleCopyLink,
      className: linkCopied ? "text-green-500" : "",
    },
    {
      id: "x",
      label: "Twitter",
      icon: Twitter,
      onClick: () => window.open( `https://twitter.com/intent/tweet?url=${ encodedUrl }&text=${ encodedText }`, "_blank" ),
    },
  ];

  const [ mounted, setMounted ] = useState( false );

  useEffect( () =>
  {
    setMounted( true );
  }, [] );

  if ( !mounted ) return null;

  return createPortal(
    <AnimatePresence>
      { isOpen && (
        <>
          {/* Backdrop */ }
          <motion.div
            initial={ { opacity: 0 } }
            animate={ { opacity: 1 } }
            exit={ { opacity: 0 } }
            onClick={ onClose }
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100]"
          />

          {/* Modal */ }
          <motion.div
            initial={ { opacity: 0, scale: 0.95, y: 20 } }
            animate={ { opacity: 1, scale: 1, y: 0 } }
            exit={ { opacity: 0, scale: 0.95, y: 20 } }
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-[320px]"
          >
            <div className="rounded-2xl overflow-hidden mx-4 
                          bg-[#264a46]/90 backdrop-blur-2xl
                          border border-white/10
                          shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
              {/* Header */ }
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
                <button
                  onClick={ onClose }
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white/90 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-white/90">
                    { type === "chat" ? "CCWAYS" : "CCWAYS" } { title }
                  </span>
                </div>
              </div>

              {/* Content */ }
              <div className="p-4 space-y-4">
                {/* Preview Card */ }
                <div className="bg-white/8 rounded-xl p-3 border border-white/10">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-500/30 flex items-center justify-center text-teal-300 shrink-0">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/70 leading-relaxed text-right">
                        { shareText }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Logo */ }
                <div className="flex justify-center">
                  <span className="text-xl font-bold text-teal-400" dir="ltr">
                    CCWAYS
                  </span>
                </div>

                {/* Share Options */ }
                <div className="flex items-center justify-center gap-3">
                  { shareOptions.map( ( option ) => (
                    <motion.button
                      key={ option.id }
                      onClick={ option.onClick }
                      whileHover={ { scale: 1.1, y: -2 } }
                      whileTap={ { scale: 0.95 } }
                      className={ cn(
                        "flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/10 transition-colors min-w-[60px]",
                        option.className
                      ) }
                    >
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-teal-400">
                        <option.icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] text-white/60">{ option.label }</span>
                    </motion.button>
                  ) ) }
                </div>

                {/* Copy URL Input */ }
                <div className="flex items-center gap-2 p-1.5 bg-white/8 rounded-xl border border-white/10">
                  <input
                    type="text"
                    value={ url }
                    readOnly
                    className="flex-1 bg-transparent text-xs text-white/70 px-2 py-1 focus:outline-none truncate"
                    dir="ltr"
                  />
                  <motion.button
                    onClick={ handleCopyLink }
                    whileHover={ { scale: 1.05 } }
                    whileTap={ { scale: 0.95 } }
                    className={ cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      linkCopied
                        ? "bg-teal-500/30 text-teal-300"
                        : "bg-white/10 text-white/80 hover:bg-white/15"
                    ) }
                  >
                    { linkCopied ? (
                      <span className="flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        تم النسخ
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Copy className="w-3 h-3" />
                        نسخ
                      </span>
                    ) }
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      ) }
    </AnimatePresence>,
    document.body
  );
}
