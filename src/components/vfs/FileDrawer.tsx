'use client';

/**
 * ═══════════════════════════════════════════════════════════════
 * Wave 7.5 — FileDrawer
 * ═══════════════════════════════════════════════════════════════
 * Sliding file explorer drawer that displays the virtual file system.
 * Shows directory tree, file preview, and download capabilities.
 */

import React, { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, FileCode2, FolderOpen, Folder, ChevronRight, ChevronDown,
  Download, Trash2, Copy, Check, FileText, Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVFSStore, type VFSTreeNode } from '@/store/vfsStore';

// ═══ Tree Node Component ═══

const TreeNode = memo(function TreeNode({
  node,
  depth,
  activeFilePath,
  onSelect,
}: {
  node: VFSTreeNode;
  depth: number;
  activeFilePath: string | null;
  onSelect: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);

  if (node.type === 'directory') {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            'flex items-center gap-1.5 w-full px-2 py-1 text-xs rounded-md',
            'hover:bg-white/[0.06] transition-colors text-white/70'
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {expanded ? (
            <ChevronDown className="w-3 h-3 shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 shrink-0" />
          )}
          {expanded ? (
            <FolderOpen className="w-3.5 h-3.5 shrink-0 text-yellow-400/70" />
          ) : (
            <Folder className="w-3.5 h-3.5 shrink-0 text-yellow-400/70" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {expanded && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                activeFilePath={activeFilePath}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isActive = activeFilePath === node.path;

  return (
    <button
      onClick={() => onSelect(node.path)}
      className={cn(
        'flex items-center gap-1.5 w-full px-2 py-1 text-xs rounded-md transition-colors',
        isActive
          ? 'bg-primary/20 text-primary-foreground'
          : 'hover:bg-white/[0.06] text-white/60'
      )}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      <FileCode2 className="w-3.5 h-3.5 shrink-0 text-blue-400/70" />
      <span className="truncate">{node.name}</span>
    </button>
  );
});

// ═══ File Preview Pane ═══

function FilePreview() {
  const activeFilePath = useVFSStore((s) => s.activeFilePath);
  const readFile = useVFSStore((s) => s.readFile);
  const deleteFile = useVFSStore((s) => s.deleteFile);
  const [copied, setCopied] = useState(false);

  const file = activeFilePath ? readFile(activeFilePath) : null;

  const handleCopy = useCallback(() => {
    if (!file) return;
    navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [file]);

  const handleDownload = useCallback(() => {
    if (!file) return;
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.path.split('/').pop() || 'file.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, [file]);

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/20 text-xs">
        <FileText className="w-8 h-8 mr-2 opacity-30" />
        Select a file to preview
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* File header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <FileCode2 className="w-3.5 h-3.5 text-blue-400/70" />
          <span className="text-xs font-medium text-white/80 truncate">{file.path}</span>
          <span className="text-[10px] text-white/30 px-1.5 py-0.5 rounded bg-white/[0.05]">
            {file.language}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1 rounded hover:bg-white/[0.08] text-white/40 hover:text-white/70 transition-colors"
            title="Copy"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleDownload}
            className="p-1 rounded hover:bg-white/[0.08] text-white/40 hover:text-white/70 transition-colors"
            title="Download"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => deleteFile(file.path)}
            className="p-1 rounded hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Code */}
      <div className="flex-1 overflow-auto p-3">
        <pre className="text-[12px] leading-5 font-mono text-white/80 whitespace-pre-wrap break-words">
          {file.content}
        </pre>
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-white/[0.06] text-[10px] text-white/25 flex items-center gap-3">
        <span>{(file.size / 1024).toFixed(1)} KB</span>
        <span>Updated {new Date(file.updatedAt).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

// ═══ Download All as ZIP (using JSZip if available, else concatenated) ═══

async function downloadAllFiles(files: ReturnType<typeof useVFSStore.getState>['listFiles']) {
  const fileList = typeof files === 'function' ? files() : files;
  if (fileList.length === 0) return;

  // Simple approach: download as individual files via anchor clicks
  // For a proper ZIP, JSZip would be needed (deferred dependency)
  for (const file of fileList) {
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.path.replace(/\//g, '_');
    a.click();
    URL.revokeObjectURL(url);
    // Small delay between downloads
    await new Promise((r) => setTimeout(r, 100));
  }
}

// ═══ Main FileDrawer ═══

export function FileDrawer() {
  const isOpen = useVFSStore((s) => s.isDrawerOpen);
  const closeDrawer = useVFSStore((s) => s.closeDrawer);
  const activeFilePath = useVFSStore((s) => s.activeFilePath);
  const setActiveFile = useVFSStore((s) => s.setActiveFile);
  const getDirectoryTree = useVFSStore((s) => s.getDirectoryTree);
  const getFileCount = useVFSStore((s) => s.getFileCount);
  const getTotalSize = useVFSStore((s) => s.getTotalSize);
  const listFiles = useVFSStore((s) => s.listFiles);
  const projectName = useVFSStore((s) => s.projectName);
  const clearAll = useVFSStore((s) => s.clearAll);

  const tree = getDirectoryTree();
  const fileCount = getFileCount();
  const totalSize = getTotalSize();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={cn(
            'fixed top-0 right-0 h-full w-[420px] z-50',
            'bg-black/90 backdrop-blur-2xl',
            'border-l border-white/[0.08]',
            'shadow-[-8px_0_32px_rgba(0,0,0,0.5)]',
            'flex flex-col'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-white/60" />
              <span className="text-sm font-semibold text-white">{projectName}</span>
              <span className="text-[10px] text-white/30 px-1.5 py-0.5 rounded bg-white/[0.05]">
                {fileCount} files · {(totalSize / 1024).toFixed(1)} KB
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => downloadAllFiles(listFiles)}
                className="p-1.5 rounded-lg hover:bg-white/[0.08] text-white/40 hover:text-white/70 transition-colors"
                title="Download all"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={clearAll}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors"
                title="Clear all files"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={closeDrawer}
                className="p-1.5 rounded-lg hover:bg-white/[0.08] text-white/40 hover:text-white/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body: Tree + Preview */}
          <div className="flex flex-1 min-h-0">
            {/* File Tree */}
            <div className="w-[180px] border-r border-white/[0.06] overflow-y-auto py-2 custom-scrollbar">
              {tree.length === 0 ? (
                <div className="px-3 py-4 text-center text-white/20 text-xs">
                  No files yet
                </div>
              ) : (
                tree.map((node) => (
                  <TreeNode
                    key={node.path}
                    node={node}
                    depth={0}
                    activeFilePath={activeFilePath}
                    onSelect={setActiveFile}
                  />
                ))
              )}
            </div>

            {/* File Preview */}
            <FilePreview />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
