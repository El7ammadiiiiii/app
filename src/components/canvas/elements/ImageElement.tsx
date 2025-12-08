// =============================================================================
// 🖼️ CCCWAYS Canvas - مكون الصورة (Image Element Component)
// مكون لعرض وتحرير الصور في الكانفاس
// =============================================================================

"use client";

import React, { 
  useCallback, 
  useMemo, 
  useRef, 
  useState, 
  useEffect 
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, 
  Image as ImageIcon, 
  X, 
  Crop, 
  RotateCw, 
  FlipHorizontal,
  FlipVertical,
  ZoomIn,
  ZoomOut,
  Filter,
  Loader2,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { 
  ImageElement as ImageElementType, 
  Point, 
  Bounds 
} from "@/types/canvas";

// =============================================================================
// 🎨 TYPES
// =============================================================================

interface ImageElementProps {
  element: ImageElementType;
  isSelected?: boolean;
  isHovered?: boolean;
  isLocked?: boolean;
  zoom?: number;
  onSelect?: (id: string, addToSelection?: boolean) => void;
  onDoubleClick?: (id: string) => void;
  onDragStart?: (id: string, point: Point) => void;
  onDrag?: (id: string, delta: Point) => void;
  onDragEnd?: (id: string) => void;
  onResize?: (id: string, bounds: Bounds) => void;
  onRotate?: (id: string, angle: number) => void;
  onImageChange?: (id: string, src: string) => void;
  onContextMenu?: (id: string, point: Point) => void;
  onCrop?: (id: string, cropBounds: Bounds) => void;
  onFilter?: (id: string, filter: ImageFilter) => void;
  showPlaceholder?: boolean;
  allowUpload?: boolean;
  className?: string;
}

interface ImageFilter {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  blur?: number;
  grayscale?: number;
  sepia?: number;
  hueRotate?: number;
  opacity?: number;
}

interface ImageStyle {
  objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  objectPosition?: string;
  borderRadius?: number;
  border?: string;
  shadow?: string;
  filter?: ImageFilter;
  flipX?: boolean;
  flipY?: boolean;
}

// =============================================================================
// 🔧 IMAGE UTILITIES
// =============================================================================

/**
 * تحويل الفلتر إلى CSS
 */
const filterToCSS = (filter?: ImageFilter): string => {
  if (!filter) return "none";

  const filters: string[] = [];

  if (filter.brightness !== undefined && filter.brightness !== 100) {
    filters.push(`brightness(${filter.brightness}%)`);
  }
  if (filter.contrast !== undefined && filter.contrast !== 100) {
    filters.push(`contrast(${filter.contrast}%)`);
  }
  if (filter.saturation !== undefined && filter.saturation !== 100) {
    filters.push(`saturate(${filter.saturation}%)`);
  }
  if (filter.blur !== undefined && filter.blur > 0) {
    filters.push(`blur(${filter.blur}px)`);
  }
  if (filter.grayscale !== undefined && filter.grayscale > 0) {
    filters.push(`grayscale(${filter.grayscale}%)`);
  }
  if (filter.sepia !== undefined && filter.sepia > 0) {
    filters.push(`sepia(${filter.sepia}%)`);
  }
  if (filter.hueRotate !== undefined && filter.hueRotate !== 0) {
    filters.push(`hue-rotate(${filter.hueRotate}deg)`);
  }

  return filters.length > 0 ? filters.join(" ") : "none";
};

/**
 * تحميل صورة وإرجاع أبعادها
 */
const loadImage = (src: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * تحويل ملف إلى Base64
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// =============================================================================
// 🖼️ IMAGE PLACEHOLDER
// =============================================================================

interface ImagePlaceholderProps {
  onUpload: (file: File) => void;
  onUrlSubmit: (url: string) => void;
  isLoading?: boolean;
  error?: string;
  className?: string;
  dir?: "rtl" | "ltr";
}

const ImagePlaceholder: React.FC<ImagePlaceholderProps> = ({
  onUpload,
  onUrlSubmit,
  isLoading = false,
  error,
  className,
  dir = "ltr",
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [url, setUrl] = useState("");

  const isArabic = dir === "rtl";

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        onUpload(file);
      }
    },
    [onUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onUpload(file);
      }
    },
    [onUpload]
  );

  const handleUrlSubmit = useCallback(() => {
    if (url.trim()) {
      onUrlSubmit(url.trim());
      setUrl("");
      setShowUrlInput(false);
    }
  }, [url, onUrlSubmit]);

  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center",
        "bg-gray-100 border-2 border-dashed rounded-lg transition-colors",
        isDragOver ? "border-blue-500 bg-blue-50" : "border-gray-300",
        className
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      dir={dir}
    >
      {isLoading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-sm text-gray-500">
            {isArabic ? "جاري التحميل..." : "Loading..."}
          </span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 text-red-500">
          <AlertCircle className="w-8 h-8" />
          <span className="text-sm">{error}</span>
        </div>
      ) : showUrlInput ? (
        <div className="flex flex-col items-center gap-2 p-4 w-full max-w-xs">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={isArabic ? "أدخل رابط الصورة..." : "Enter image URL..."}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
          />
          <div className="flex gap-2">
            <button
              onClick={handleUrlSubmit}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              {isArabic ? "إضافة" : "Add"}
            </button>
            <button
              onClick={() => setShowUrlInput(false)}
              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              {isArabic ? "إلغاء" : "Cancel"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <ImageIcon className="w-10 h-10 text-gray-400 mb-2" />
          <span className="text-sm text-gray-500 text-center px-4">
            {isArabic
              ? "اسحب صورة هنا أو انقر للتحميل"
              : "Drop an image here or click to upload"}
          </span>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Upload className="w-4 h-4" />
              {isArabic ? "تحميل" : "Upload"}
            </button>
            <button
              onClick={() => setShowUrlInput(true)}
              className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              {isArabic ? "من رابط" : "From URL"}
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </>
      )}
    </div>
  );
};

// =============================================================================
// 🎯 MAIN IMAGE ELEMENT COMPONENT
// =============================================================================

export const ImageElement: React.FC<ImageElementProps> = ({
  element,
  isSelected = false,
  isHovered = false,
  isLocked = false,
  zoom = 1,
  onSelect,
  onDoubleClick,
  onDragStart,
  onDrag,
  onDragEnd,
  onResize,
  onRotate,
  onImageChange,
  onContextMenu,
  onCrop,
  onFilter,
  showPlaceholder = true,
  allowUpload = true,
  className,
}) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Derive bounds safely
  const bounds: Bounds = element.bounds ?? {
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  };
  
  const { src, style = {} } = element;
  const imageStyle = style as ImageStyle;

  // Load image when src changes
  useEffect(() => {
    if (src) {
      setIsLoading(true);
      setError(null);
      
      const img = new Image();
      img.onload = () => {
        setIsLoading(false);
        setIsLoaded(true);
      };
      img.onerror = () => {
        setIsLoading(false);
        setError("Failed to load image");
      };
      img.src = src;
    }
  }, [src]);

  // Handle file upload
  const handleUpload = useCallback(
    async (file: File) => {
      try {
        setIsLoading(true);
        setError(null);
        const base64 = await fileToBase64(file);
        onImageChange?.(element.id, base64);
      } catch (err) {
        setError("Failed to upload image");
      } finally {
        setIsLoading(false);
      }
    },
    [element.id, onImageChange]
  );

  // Handle URL submit
  const handleUrlSubmit = useCallback(
    (url: string) => {
      onImageChange?.(element.id, url);
    },
    [element.id, onImageChange]
  );

  // Handle mouse down
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isLocked) return;
      e.stopPropagation();

      const point = { x: e.clientX, y: e.clientY };
      setDragStart(point);
      setIsDragging(true);

      onSelect?.(element.id, e.shiftKey || e.ctrlKey);
      onDragStart?.(element.id, point);
    },
    [element.id, isLocked, onSelect, onDragStart]
  );

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !dragStart) return;

      const delta = {
        x: (e.clientX - dragStart.x) / zoom,
        y: (e.clientY - dragStart.y) / zoom,
      };

      onDrag?.(element.id, delta);
      setDragStart({ x: e.clientX, y: e.clientY });
    },
    [isDragging, dragStart, zoom, element.id, onDrag]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      onDragEnd?.(element.id);
    }
  }, [isDragging, element.id, onDragEnd]);

  // Set up global mouse events when dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle double click
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDoubleClick?.(element.id);
    },
    [element.id, onDoubleClick]
  );

  // Handle context menu
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu?.(element.id, { x: e.clientX, y: e.clientY });
    },
    [element.id, onContextMenu]
  );

  // CSS filter
  const cssFilter = useMemo(
    () => filterToCSS(imageStyle.filter),
    [imageStyle.filter]
  );

  // Transform for flip
  const imageTransform = useMemo(() => {
    const transforms: string[] = [];
    if (imageStyle.flipX) transforms.push("scaleX(-1)");
    if (imageStyle.flipY) transforms.push("scaleY(-1)");
    return transforms.join(" ") || undefined;
  }, [imageStyle.flipX, imageStyle.flipY]);

  // Container styles
  const containerStyle: React.CSSProperties = {
    position: "absolute",
    left: bounds.x,
    top: bounds.y,
    width: bounds.width,
    height: bounds.height,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    borderRadius: imageStyle.borderRadius,
    overflow: "hidden",
    cursor: isLocked ? "not-allowed" : isDragging ? "grabbing" : "grab",
    boxShadow: imageStyle.shadow,
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={containerStyle}
      className={cn(
        "select-none",
        isSelected && "ring-2 ring-blue-500 ring-offset-2",
        isHovered && !isSelected && "ring-1 ring-blue-300",
        isLocked && "opacity-70",
        className
      )}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      {src && !error ? (
        <motion.img
          ref={imageRef}
          src={src}
          alt={element.alt || ""}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          className="w-full h-full"
          style={{
            objectFit: imageStyle.objectFit ?? "cover",
            objectPosition: imageStyle.objectPosition ?? "center",
            filter: cssFilter,
            transform: imageTransform,
            opacity: imageStyle.filter?.opacity ?? 1,
          }}
          draggable={false}
        />
      ) : showPlaceholder && allowUpload ? (
        <ImagePlaceholder
          onUpload={handleUpload}
          onUrlSubmit={handleUrlSubmit}
          isLoading={isLoading}
          error={error || undefined}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <ImageIcon className="w-12 h-12 text-gray-300" />
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      )}

      {/* Lock indicator */}
      {isLocked && (
        <div className="absolute top-1 right-1 w-4 h-4 bg-gray-800 text-white rounded-full flex items-center justify-center text-[8px]">
          🔒
        </div>
      )}

      {/* Selection handles */}
      {isSelected && !isLocked && (
        <>
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-white border-2 border-blue-500 rounded-sm cursor-nwse-resize" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-white border-2 border-blue-500 rounded-sm cursor-nesw-resize" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white border-2 border-blue-500 rounded-sm cursor-nesw-resize" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white border-2 border-blue-500 rounded-sm cursor-nwse-resize" />
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-2 border-blue-500 rounded-sm cursor-ns-resize" />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-2 border-blue-500 rounded-sm cursor-ns-resize" />
          <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-white border-2 border-blue-500 rounded-sm cursor-ew-resize" />
          <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-white border-2 border-blue-500 rounded-sm cursor-ew-resize" />
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full cursor-grab" />
        </>
      )}
    </motion.div>
  );
};

export default ImageElement;
export { ImagePlaceholder, filterToCSS, loadImage, fileToBase64 };
export type { ImageElementProps, ImageFilter, ImageStyle };
