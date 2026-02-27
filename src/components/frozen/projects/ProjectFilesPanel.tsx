"use client";

import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, 
  Image, 
  File, 
  Trash2, 
  Upload, 
  X,
  Download,
  Eye
} from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import type { ProjectFile } from "@/types/project";
import { useSound } from "@/lib/sounds";

interface ProjectFilesPanelProps {
  projectId: string;
}

export function ProjectFilesPanel({ projectId }: ProjectFilesPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { getProjectFiles, addFile, deleteFile } = useProjectStore();
  const { playSound } = useSound();
  
  const files = getProjectFiles(projectId);

  // معالجة إضافة ملف
  const handleFileAdd = useCallback((fileList: FileList | null) => {
    if (!fileList) return;

    Array.from(fileList).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        // تحويل نوع الملف إلى FileType المناسب
        let fileType: import("@/types/project").FileType = "other";
        if (file.type.startsWith("image/")) fileType = "image";
        else if (file.type.includes("pdf")) fileType = "pdf";
        else if (file.type.includes("csv")) fileType = "csv";
        else if (file.type.includes("json")) fileType = "json";
        else if (file.type.includes("txt")) fileType = "txt";
        else if (file.type.includes("doc")) fileType = "doc";
        addFile(projectId, {
          name: file.name,
          type: fileType,
          mimeType: file.type,
          size: file.size,
          url: reader.result as string,
        });
        playSound("success");
      };
      reader.readAsDataURL(file);
    });
  }, [projectId, addFile, playSound]);

  // معالجة السحب والإفلات
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileAdd(e.dataTransfer.files);
  };

  // حذف ملف
  const handleDelete = (fileId: string, fileName: string) => {
    if (confirm(`هل تريد حذف "${fileName}"؟`)) {
      deleteFile(fileId);
      playSound("projectDelete");
    }
  };

  // الحصول على أيقونة الملف
  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return Image;
    if (type.includes("pdf") || type.includes("document")) return FileText;
    return File;
  };

  // تنسيق حجم الملف
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* منطقة السحب والإفلات */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative p-6 rounded-xl border-2 border-dashed cursor-pointer
          transition-all duration-200 text-center
          ${isDragging 
            ? "border-primary bg-primary/10 scale-[1.02]" 
            : "border-border hover:border-primary/50 hover:bg-accent/30"
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => handleFileAdd(e.target.files)}
          className="hidden"
        />
        
        <motion.div
          animate={{ scale: isDragging ? 1.1 : 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className={`
            w-12 h-12 rounded-xl flex items-center justify-center
            ${isDragging ? "bg-primary text-primary-foreground" : "bg-muted"}
          `}>
            <Upload size={24} />
          </div>
          <div>
            <p className="font-medium">
              {isDragging ? "أفلت الملفات هنا" : "اسحب الملفات أو انقر للرفع"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              يدعم الصور والمستندات وملفات PDF
            </p>
          </div>
        </motion.div>
      </div>

      {/* قائمة الملفات */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            الملفات المرفقة ({files.length})
          </h4>
          
          <div className="space-y-2">
            <AnimatePresence>
              {files.map((file) => {
                const FileIcon = getFileIcon(file.type);
                const isImage = file.type.startsWith("image/");
                
                return (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="group flex items-center gap-3 p-3 rounded-xl border border-border
                             hover:bg-accent/50 transition-colors"
                  >
                    {/* معاينة مصغرة أو أيقونة */}
                    {isImage ? (
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <FileIcon size={20} className="text-muted-foreground" />
                      </div>
                    )}

                    {/* معلومات الملف */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>

                    {/* الأزرار */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isImage && (
                        <button
                          onClick={() => setPreviewFile(file)}
                          className="p-2 rounded-lg hover:bg-accent transition-colors"
                          title="معاينة"
                        >
                          <Eye size={16} />
                        </button>
                      )}
                      <a
                        href={file.url}
                        download={file.name}
                        className="p-2 rounded-lg hover:bg-accent transition-colors"
                        title="تحميل"
                      >
                        <Download size={16} />
                      </a>
                      <button
                        onClick={() => handleDelete(file.id, file.name)}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                        title="حذف"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* حالة فارغة */}
      {files.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <File className="mx-auto h-10 w-10 opacity-50 mb-3" />
          <p className="text-sm">لا توجد ملفات مرفقة</p>
        </div>
      )}

      {/* نافذة المعاينة */}
      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 overlay-backdrop z-50 flex items-center justify-center p-4"
            onClick={() => setPreviewFile(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-4xl max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setPreviewFile(null)}
                className="absolute -top-12 right-0 p-2 rounded-lg glass-lite glass-lite--interactive
                         text-foreground transition-colors"
              >
                <X size={24} />
              </button>
              <img
                src={previewFile.url}
                alt={previewFile.name}
                className="max-w-full max-h-[80vh] rounded-xl object-contain"
              />
              <p className="text-center text-foreground mt-3">{previewFile.name}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
