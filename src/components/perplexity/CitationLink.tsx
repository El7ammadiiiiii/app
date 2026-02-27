/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CITATION LINK
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * رابط مرجع [1] [2] داخل النص
 * 
 * @version 1.0.0
 */

'use client';

import { memo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PerplexitySource } from '@/types/perplexity';
import SourcePreview from './SourcePreview';

interface CitationLinkProps {
  index: number;
  source?: PerplexitySource;
  className?: string;
}

const CitationLink = memo(function CitationLink({
  index,
  source,
  className,
}: CitationLinkProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
  const linkRef = useRef<HTMLAnchorElement>(null);
  
  const handleMouseEnter = () => {
    if (source && linkRef.current) {
      const rect = linkRef.current.getBoundingClientRect();
      setPreviewPosition({
        x: rect.left + rect.width / 2 - 160,
        y: rect.bottom + 8,
      });
      setShowPreview(true);
    }
  };
  
  const handleClick = (e: React.MouseEvent) => {
    if (source) {
      e.preventDefault();
      window.open(source.url, '_blank', 'noopener,noreferrer');
    }
  };
  
  return (
    <>
      <a
        ref={linkRef}
        href={source?.url || '#'}
        className={`perplexity-citation ${className || ''}`}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShowPreview(false)}
      >
        {index}
      </a>
      
      {/* Preview Tooltip */}
      <AnimatePresence>
        {showPreview && source && (
          <div 
            className="fixed z-50"
            style={{ left: previewPosition.x, top: previewPosition.y }}
          >
            <SourcePreview source={source} />
          </div>
        )}
      </AnimatePresence>
    </>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY: Parse text and replace [N] with CitationLink components
// ═══════════════════════════════════════════════════════════════════════════════

interface ParsedContent {
  type: 'text' | 'citation';
  content: string;
  index?: number;
}

export function parseContentWithCitations(text: string): ParsedContent[] {
  const parts: ParsedContent[] = [];
  const regex = /\[(\d+)\]/g;
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    // Add text before citation
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }
    
    // Add citation
    parts.push({
      type: 'citation',
      content: match[0],
      index: parseInt(match[1], 10),
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }
  
  return parts;
}

interface ContentWithCitationsProps {
  content: string;
  sources: PerplexitySource[];
  className?: string;
}

export const ContentWithCitations = memo(function ContentWithCitations({
  content,
  sources,
  className,
}: ContentWithCitationsProps) {
  const parts = parseContentWithCitations(content);
  
  return (
    <div className={`perplexity-content ${className || ''}`}>
      {parts.map((part, i) => {
        if (part.type === 'citation' && part.index !== undefined) {
          const source = sources.find(s => s.index === part.index);
          return (
            <CitationLink
              key={`citation-${i}`}
              index={part.index}
              source={source}
            />
          );
        }
        
        // Render text (handle markdown-like formatting)
        return (
          <span 
            key={`text-${i}`}
            dangerouslySetInnerHTML={{ 
              __html: formatTextContent(part.content) 
            }}
          />
        );
      })}
    </div>
  );
});

// Simple markdown-like formatting
function formatTextContent(text: string): string {
  return text
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    // Line breaks
    .replace(/\n/g, '<br />');
}

export default CitationLink;
