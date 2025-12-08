// =============================================================================
// 🛠️ CCCWAYS Canvas - شريط الأدوات الرئيسي (Main Toolbar)
// شريط أدوات متكامل مع جميع أدوات الرسم والتحرير
// =============================================================================

"use client";

import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MousePointer2,
  Hand,
  Square,
  Circle,
  Triangle,
  Star,
  Hexagon,
  Minus,
  ArrowRight,
  Pencil,
  Type,
  Image,
  StickyNote,
  Frame,
  Link2,
  Sparkles,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid3X3,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  Clipboard,
  Scissors,
  Layers,
  ChevronDown,
  ChevronUp,
  Settings,
  Download,
  Upload,
  Share2,
  Users,
  MessageSquare,
  Mic,
  MicOff,
  Palette,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CanvasTool, ShapeType } from "@/types/canvas";

// =============================================================================
// 🎨 TYPES
// =============================================================================

interface ToolbarProps {
  currentTool: CanvasTool;
  onToolChange: (tool: CanvasTool) => void;
  onShapeSelect?: (shape: ShapeType) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  zoom?: number;
  showGrid?: boolean;
  onToggleGrid?: () => void;
  snapToGrid?: boolean;
  onToggleSnap?: () => void;
  isLocked?: boolean;
  onToggleLock?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onCut?: () => void;
  hasSelection?: boolean;
  onExport?: () => void;
  onImport?: () => void;
  onShare?: () => void;
  collaboratorsCount?: number;
  onToggleComments?: () => void;
  showComments?: boolean;
  onToggleVoice?: () => void;
  isVoiceActive?: boolean;
  onToggleAI?: () => void;
  showAI?: boolean;
  orientation?: "horizontal" | "vertical";
  position?: "top" | "bottom" | "left" | "right";
  compact?: boolean;
  className?: string;
  dir?: "rtl" | "ltr";
}

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  badge?: number | string;
  variant?: "default" | "primary" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  tooltip?: string;
  shortcut?: string;
  hasDropdown?: boolean;
  onDropdownClick?: () => void;
  className?: string;
}

interface ToolGroupProps {
  children: React.ReactNode;
  label?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
}

// =============================================================================
// 🔧 TOOL DEFINITIONS
// =============================================================================

const TOOLS: Partial<Record<CanvasTool, { icon: React.ComponentType<any>; label: string; labelAr: string; shortcut: string }>> = {
  select: { icon: MousePointer2, label: "Select", labelAr: "تحديد", shortcut: "V" },
  pan: { icon: Hand, label: "Pan", labelAr: "تحريك", shortcut: "H" },
  hand: { icon: Hand, label: "Hand", labelAr: "يد", shortcut: "H" },
  draw: { icon: Pencil, label: "Draw", labelAr: "رسم", shortcut: "D" },
  shape: { icon: Square, label: "Shape", labelAr: "شكل", shortcut: "R" },
  rectangle: { icon: Square, label: "Rectangle", labelAr: "مستطيل", shortcut: "R" },
  ellipse: { icon: Circle, label: "Ellipse", labelAr: "دائرة", shortcut: "O" },
  triangle: { icon: Triangle, label: "Triangle", labelAr: "مثلث", shortcut: "T" },
  star: { icon: Star, label: "Star", labelAr: "نجمة", shortcut: "S" },
  polygon: { icon: Hexagon, label: "Polygon", labelAr: "مضلع", shortcut: "P" },
  line: { icon: Minus, label: "Line", labelAr: "خط", shortcut: "L" },
  arrow: { icon: ArrowRight, label: "Arrow", labelAr: "سهم", shortcut: "A" },
  freehand: { icon: Pencil, label: "Draw", labelAr: "رسم حر", shortcut: "D" },
  text: { icon: Type, label: "Text", labelAr: "نص", shortcut: "X" },
  image: { icon: Image, label: "Image", labelAr: "صورة", shortcut: "I" },
  sticky: { icon: StickyNote, label: "Sticky Note", labelAr: "ملاحظة", shortcut: "N" },
  connector: { icon: Link2, label: "Connector", labelAr: "موصل", shortcut: "C" },
  frame: { icon: Frame, label: "Frame", labelAr: "إطار", shortcut: "F" },
  embed: { icon: Link2, label: "Embed", labelAr: "تضمين", shortcut: "E" },
  eraser: { icon: Trash2, label: "Eraser", labelAr: "ممحاة", shortcut: "Z" },
  comment: { icon: MessageSquare, label: "Comment", labelAr: "تعليق", shortcut: "M" },
  laser: { icon: Sparkles, label: "Laser", labelAr: "مؤشر ليزر", shortcut: "K" },
  ai: { icon: Sparkles, label: "AI Assistant", labelAr: "مساعد ذكي", shortcut: "G" },
};

const SHAPE_TOOLS: CanvasTool[] = ["rectangle", "ellipse", "triangle", "star", "polygon"];
const DRAW_TOOLS: CanvasTool[] = ["freehand", "line", "arrow", "connector"];
const CONTENT_TOOLS: CanvasTool[] = ["text", "image", "sticky", "frame", "embed"];

// =============================================================================
// 🔘 TOOL BUTTON COMPONENT
// =============================================================================

const ToolButton: React.FC<ToolButtonProps> = ({
  icon,
  label,
  isActive = false,
  onClick,
  disabled = false,
  badge,
  variant = "default",
  size = "md",
  tooltip,
  shortcut,
  hasDropdown = false,
  onDropdownClick,
  className,
}) => {
  const sizeClasses = {
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-11 h-11 text-base",
  };

  const variantClasses = {
    default: isActive
      ? "bg-blue-500 text-white shadow-lg"
      : "bg-white/80 hover:bg-gray-100 text-gray-700",
    primary: "bg-blue-500 text-white hover:bg-blue-600",
    danger: "bg-red-500 text-white hover:bg-red-600",
    success: "bg-green-500 text-white hover:bg-green-600",
  };

  return (
    <div className="relative group">
      <motion.button
        whileHover={{ scale: disabled ? 1 : 1.05 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "relative flex items-center justify-center rounded-lg transition-all duration-200",
          "border border-gray-200/50 backdrop-blur-sm",
          "focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1",
          sizeClasses[size],
          variantClasses[variant],
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        title={tooltip || label}
      >
        {icon}
        
        {badge !== undefined && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {badge}
          </span>
        )}

        {hasDropdown && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDropdownClick?.();
            }}
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-gray-600 text-white rounded-full flex items-center justify-center"
          >
            <ChevronDown className="w-2 h-2" />
          </button>
        )}
      </motion.button>

      {/* Tooltip */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          className={cn(
            "absolute z-50 hidden group-hover:block",
            "px-2 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap",
            "bottom-full left-1/2 -translate-x-1/2 mb-2"
          )}
        >
          {label}
          {shortcut && (
            <span className="ml-2 px-1 bg-gray-700 rounded text-gray-300">
              {shortcut}
            </span>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// =============================================================================
// 📦 TOOL GROUP COMPONENT
// =============================================================================

const ToolGroup: React.FC<ToolGroupProps> = ({
  children,
  label,
  collapsible = false,
  defaultCollapsed = false,
  className,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <div
          className={cn(
            "flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-gray-500 uppercase tracking-wide",
            collapsible && "cursor-pointer hover:text-gray-700"
          )}
          onClick={() => collapsible && setIsCollapsed(!isCollapsed)}
        >
          {label}
          {collapsible && (
            <motion.span
              animate={{ rotate: isCollapsed ? 0 : 180 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronUp className="w-3 h-3" />
            </motion.span>
          )}
        </div>
      )}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-1"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// =============================================================================
// 🔲 DIVIDER COMPONENT
// =============================================================================

const ToolDivider: React.FC<{ orientation?: "horizontal" | "vertical" }> = ({
  orientation = "vertical",
}) => (
  <div
    className={cn(
      "bg-gray-300",
      orientation === "vertical" ? "w-px h-6 mx-1" : "w-6 h-px my-1"
    )}
  />
);

// =============================================================================
// 🎯 MAIN TOOLBAR COMPONENT
// =============================================================================

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  onToolChange,
  onShapeSelect,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  zoom = 100,
  showGrid = true,
  onToggleGrid,
  snapToGrid = true,
  onToggleSnap,
  isLocked = false,
  onToggleLock,
  onDelete,
  onCopy,
  onPaste,
  onCut,
  hasSelection = false,
  onExport,
  onImport,
  onShare,
  collaboratorsCount = 0,
  onToggleComments,
  showComments = false,
  onToggleVoice,
  isVoiceActive = false,
  onToggleAI,
  showAI = false,
  orientation = "horizontal",
  position = "top",
  compact = false,
  className,
  dir = "ltr",
}) => {
  const [showShapes, setShowShapes] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [selectedShape, setSelectedShape] = useState<ShapeType>("rectangle");

  const isArabic = dir === "rtl";

  const handleToolClick = useCallback(
    (tool: CanvasTool) => {
      onToolChange(tool);
    },
    [onToolChange]
  );

  const handleShapeClick = useCallback(
    (shape: ShapeType) => {
      setSelectedShape(shape);
      onShapeSelect?.(shape);
      onToolChange(shape as CanvasTool);
      setShowShapes(false);
    },
    [onShapeSelect, onToolChange]
  );

  const renderToolButton = useCallback(
    (tool: CanvasTool) => {
      const toolDef = TOOLS[tool];
      if (!toolDef) return null;
      const Icon = toolDef.icon;
      return (
        <ToolButton
          key={tool}
          icon={<Icon className="w-4 h-4" />}
          label={isArabic ? toolDef.labelAr : toolDef.label}
          isActive={currentTool === tool}
          onClick={() => handleToolClick(tool)}
          shortcut={toolDef.shortcut}
        />
      );
    },
    [currentTool, handleToolClick, isArabic]
  );

  const isVertical = orientation === "vertical";

  return (
    <motion.div
      initial={{ opacity: 0, y: position === "top" ? -20 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-2 p-2 rounded-xl shadow-xl backdrop-blur-md",
        "bg-white/90 border border-gray-200/50",
        isVertical ? "flex-col" : "flex-row items-center",
        position === "top" && "absolute top-4 left-1/2 -translate-x-1/2",
        position === "bottom" && "absolute bottom-4 left-1/2 -translate-x-1/2",
        position === "left" && "absolute left-4 top-1/2 -translate-y-1/2",
        position === "right" && "absolute right-4 top-1/2 -translate-y-1/2",
        className
      )}
      dir={dir}
    >
      {/* Navigation Tools */}
      <ToolGroup>
        {renderToolButton("select")}
        {renderToolButton("pan")}
      </ToolGroup>

      <ToolDivider orientation={isVertical ? "horizontal" : "vertical"} />

      {/* Shape Tools with Dropdown */}
      <div className="relative">
        <ToolButton
          icon={<Square className="w-4 h-4" />}
          label={isArabic ? "أشكال" : "Shapes"}
          isActive={SHAPE_TOOLS.includes(currentTool)}
          onClick={() => handleToolClick("rectangle")}
          hasDropdown
          onDropdownClick={() => setShowShapes(!showShapes)}
          shortcut="R"
        />
        <AnimatePresence>
          {showShapes && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className={cn(
                "absolute z-50 p-2 bg-white rounded-lg shadow-xl border border-gray-200",
                isVertical ? "left-full ml-2 top-0" : "top-full mt-2 left-0"
              )}
            >
              <div className="grid grid-cols-3 gap-1">
                {SHAPE_TOOLS.map((tool) => renderToolButton(tool))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Drawing Tools */}
      <ToolGroup>
        {renderToolButton("freehand")}
        {renderToolButton("line")}
        {renderToolButton("arrow")}
      </ToolGroup>

      <ToolDivider orientation={isVertical ? "horizontal" : "vertical"} />

      {/* Content Tools */}
      <ToolGroup>
        {renderToolButton("text")}
        {renderToolButton("sticky")}
        {renderToolButton("image")}
        {renderToolButton("frame")}
      </ToolGroup>

      <ToolDivider orientation={isVertical ? "horizontal" : "vertical"} />

      {/* Connector & Special */}
      <ToolGroup>
        {renderToolButton("connector")}
        {renderToolButton("comment")}
        <ToolButton
          icon={<Sparkles className="w-4 h-4" />}
          label={isArabic ? "الذكاء الاصطناعي" : "AI"}
          isActive={showAI}
          onClick={onToggleAI}
          variant={showAI ? "primary" : "default"}
          shortcut="G"
        />
      </ToolGroup>

      <ToolDivider orientation={isVertical ? "horizontal" : "vertical"} />

      {/* History */}
      <ToolGroup>
        <ToolButton
          icon={<Undo2 className="w-4 h-4" />}
          label={isArabic ? "تراجع" : "Undo"}
          onClick={onUndo}
          disabled={!canUndo}
          shortcut="Ctrl+Z"
        />
        <ToolButton
          icon={<Redo2 className="w-4 h-4" />}
          label={isArabic ? "إعادة" : "Redo"}
          onClick={onRedo}
          disabled={!canRedo}
          shortcut="Ctrl+Y"
        />
      </ToolGroup>

      <ToolDivider orientation={isVertical ? "horizontal" : "vertical"} />

      {/* Zoom Controls */}
      <ToolGroup>
        <ToolButton
          icon={<ZoomOut className="w-4 h-4" />}
          label={isArabic ? "تصغير" : "Zoom Out"}
          onClick={onZoomOut}
          shortcut="-"
        />
        <button
          onClick={onZoomReset}
          className="px-2 h-9 bg-white/80 hover:bg-gray-100 rounded-lg text-sm font-medium text-gray-700 border border-gray-200/50 min-w-[50px]"
        >
          {Math.round(zoom)}%
        </button>
        <ToolButton
          icon={<ZoomIn className="w-4 h-4" />}
          label={isArabic ? "تكبير" : "Zoom In"}
          onClick={onZoomIn}
          shortcut="+"
        />
        <ToolButton
          icon={<Maximize2 className="w-4 h-4" />}
          label={isArabic ? "ملء الشاشة" : "Fit to Screen"}
          onClick={onZoomReset}
          shortcut="Ctrl+0"
        />
      </ToolGroup>

      <ToolDivider orientation={isVertical ? "horizontal" : "vertical"} />

      {/* Grid & Snap */}
      <ToolGroup>
        <ToolButton
          icon={<Grid3X3 className="w-4 h-4" />}
          label={isArabic ? "الشبكة" : "Grid"}
          isActive={showGrid}
          onClick={onToggleGrid}
          shortcut="Ctrl+'"
        />
        <ToolButton
          icon={snapToGrid ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          label={isArabic ? "محاذاة للشبكة" : "Snap to Grid"}
          isActive={snapToGrid}
          onClick={onToggleSnap}
        />
      </ToolGroup>

      {!compact && (
        <>
          <ToolDivider orientation={isVertical ? "horizontal" : "vertical"} />

          {/* Clipboard */}
          <ToolGroup>
            <ToolButton
              icon={<Copy className="w-4 h-4" />}
              label={isArabic ? "نسخ" : "Copy"}
              onClick={onCopy}
              disabled={!hasSelection}
              shortcut="Ctrl+C"
            />
            <ToolButton
              icon={<Clipboard className="w-4 h-4" />}
              label={isArabic ? "لصق" : "Paste"}
              onClick={onPaste}
              shortcut="Ctrl+V"
            />
            <ToolButton
              icon={<Scissors className="w-4 h-4" />}
              label={isArabic ? "قص" : "Cut"}
              onClick={onCut}
              disabled={!hasSelection}
              shortcut="Ctrl+X"
            />
            <ToolButton
              icon={<Trash2 className="w-4 h-4" />}
              label={isArabic ? "حذف" : "Delete"}
              onClick={onDelete}
              disabled={!hasSelection}
              variant={hasSelection ? "danger" : "default"}
              shortcut="Del"
            />
          </ToolGroup>

          <ToolDivider orientation={isVertical ? "horizontal" : "vertical"} />

          {/* Collaboration */}
          <ToolGroup>
            <ToolButton
              icon={<Users className="w-4 h-4" />}
              label={isArabic ? "المتعاونون" : "Collaborators"}
              badge={collaboratorsCount > 0 ? collaboratorsCount : undefined}
              onClick={onShare}
            />
            <ToolButton
              icon={<MessageSquare className="w-4 h-4" />}
              label={isArabic ? "التعليقات" : "Comments"}
              isActive={showComments}
              onClick={onToggleComments}
            />
            <ToolButton
              icon={isVoiceActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              label={isArabic ? "الصوت" : "Voice"}
              isActive={isVoiceActive}
              onClick={onToggleVoice}
              variant={isVoiceActive ? "success" : "default"}
            />
          </ToolGroup>

          <ToolDivider orientation={isVertical ? "horizontal" : "vertical"} />

          {/* Export/Import */}
          <ToolGroup>
            <ToolButton
              icon={<Download className="w-4 h-4" />}
              label={isArabic ? "تصدير" : "Export"}
              onClick={onExport}
            />
            <ToolButton
              icon={<Upload className="w-4 h-4" />}
              label={isArabic ? "استيراد" : "Import"}
              onClick={onImport}
            />
            <ToolButton
              icon={<Share2 className="w-4 h-4" />}
              label={isArabic ? "مشاركة" : "Share"}
              onClick={onShare}
            />
          </ToolGroup>
        </>
      )}

      {/* More Options (for compact mode) */}
      {compact && (
        <div className="relative">
          <ToolButton
            icon={<MoreHorizontal className="w-4 h-4" />}
            label={isArabic ? "المزيد" : "More"}
            onClick={() => setShowMore(!showMore)}
          />
          <AnimatePresence>
            {showMore && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute z-50 right-0 top-full mt-2 p-2 bg-white rounded-lg shadow-xl border border-gray-200 min-w-[200px]"
              >
                <div className="flex flex-col gap-2">
                  <button
                    onClick={onExport}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    <Download className="w-4 h-4" />
                    {isArabic ? "تصدير" : "Export"}
                  </button>
                  <button
                    onClick={onImport}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    <Upload className="w-4 h-4" />
                    {isArabic ? "استيراد" : "Import"}
                  </button>
                  <button
                    onClick={onShare}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    <Share2 className="w-4 h-4" />
                    {isArabic ? "مشاركة" : "Share"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

export default Toolbar;
export { ToolButton, ToolGroup, ToolDivider };
export type { ToolbarProps, ToolButtonProps, ToolGroupProps };
