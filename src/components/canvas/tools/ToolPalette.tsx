// =============================================================================
// 🎨 CCCWAYS Canvas - لوحة الأدوات الجانبية (Tool Palette)
// لوحة أدوات قابلة للتخصيص مع فئات وتصنيفات
// =============================================================================

"use client";

import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  MousePointer2,
  Hand,
  Square,
  Circle,
  Triangle,
  Star,
  Hexagon,
  Pentagon,
  Diamond,
  Minus,
  ArrowRight,
  ArrowRightLeft,
  Pencil,
  Highlighter,
  Type,
  Image,
  StickyNote,
  Frame,
  Link2,
  Sparkles,
  Trash2,
  Eraser,
  MessageSquare,
  Move3D,
  Magnet,
  Palette,
  Brush,
  PenTool,
  Spline,
  Component,
  Layout,
  Table,
  FileCode,
  Play,
  Presentation,
  ChevronRight,
  ChevronDown,
  GripVertical,
  Plus,
  Settings,
  Search,
  X,
  Pin,
  PinOff,
  Heart,
  Cloud,
  Zap,
  Database,
  Server,
  Globe,
  Smartphone,
  Monitor,
  Laptop,
  Cpu,
  HardDrive,
  Network,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CanvasTool, ShapeType } from "@/types/canvas";

// =============================================================================
// 🎨 TYPES
// =============================================================================

interface ToolPaletteProps {
  currentTool: CanvasTool;
  onToolChange: (tool: CanvasTool) => void;
  onShapeSelect?: (shape: ShapeType) => void;
  favoriteTools?: CanvasTool[];
  onFavoriteToggle?: (tool: CanvasTool) => void;
  recentTools?: CanvasTool[];
  isPinned?: boolean;
  onPinToggle?: () => void;
  isExpanded?: boolean;
  onExpandToggle?: () => void;
  position?: "left" | "right";
  showSearch?: boolean;
  showCategories?: boolean;
  className?: string;
  dir?: "rtl" | "ltr";
}

interface ToolCategory {
  id: string;
  label: string;
  labelAr: string;
  icon: React.ComponentType<any>;
  tools: ToolDefinition[];
  defaultExpanded?: boolean;
}

interface ToolDefinition {
  id: CanvasTool;
  icon: React.ComponentType<any>;
  label: string;
  labelAr: string;
  shortcut?: string;
  description?: string;
  descriptionAr?: string;
  isPro?: boolean;
  isNew?: boolean;
  isBeta?: boolean;
}

// =============================================================================
// 🔧 TOOL CATEGORIES
// =============================================================================

const TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: "navigation",
    label: "Navigation",
    labelAr: "التنقل",
    icon: Move3D,
    defaultExpanded: true,
    tools: [
      {
        id: "select",
        icon: MousePointer2,
        label: "Select",
        labelAr: "تحديد",
        shortcut: "V",
        description: "Select and move elements",
        descriptionAr: "تحديد ونقل العناصر",
      },
      {
        id: "pan",
        icon: Hand,
        label: "Pan",
        labelAr: "تحريك",
        shortcut: "H",
        description: "Pan around the canvas",
        descriptionAr: "التحريك في اللوحة",
      },
    ],
  },
  {
    id: "shapes",
    label: "Shapes",
    labelAr: "الأشكال",
    icon: Square,
    defaultExpanded: true,
    tools: [
      {
        id: "rectangle",
        icon: Square,
        label: "Rectangle",
        labelAr: "مستطيل",
        shortcut: "R",
      },
      {
        id: "ellipse",
        icon: Circle,
        label: "Ellipse",
        labelAr: "دائرة",
        shortcut: "O",
      },
      {
        id: "triangle",
        icon: Triangle,
        label: "Triangle",
        labelAr: "مثلث",
        shortcut: "T",
      },
      {
        id: "star",
        icon: Star,
        label: "Star",
        labelAr: "نجمة",
        shortcut: "S",
      },
      {
        id: "polygon",
        icon: Hexagon,
        label: "Polygon",
        labelAr: "مضلع",
        shortcut: "P",
      },
    ],
  },
  {
    id: "drawing",
    label: "Drawing",
    labelAr: "الرسم",
    icon: Pencil,
    defaultExpanded: true,
    tools: [
      {
        id: "freehand",
        icon: Pencil,
        label: "Pencil",
        labelAr: "قلم رصاص",
        shortcut: "D",
      },
      {
        id: "line",
        icon: Minus,
        label: "Line",
        labelAr: "خط",
        shortcut: "L",
      },
      {
        id: "arrow",
        icon: ArrowRight,
        label: "Arrow",
        labelAr: "سهم",
        shortcut: "A",
      },
      {
        id: "connector",
        icon: Link2,
        label: "Connector",
        labelAr: "موصل",
        shortcut: "C",
      },
      {
        id: "eraser",
        icon: Eraser,
        label: "Eraser",
        labelAr: "ممحاة",
        shortcut: "Z",
      },
    ],
  },
  {
    id: "content",
    label: "Content",
    labelAr: "المحتوى",
    icon: Type,
    defaultExpanded: true,
    tools: [
      {
        id: "text",
        icon: Type,
        label: "Text",
        labelAr: "نص",
        shortcut: "X",
      },
      {
        id: "sticky",
        icon: StickyNote,
        label: "Sticky Note",
        labelAr: "ملاحظة لاصقة",
        shortcut: "N",
      },
      {
        id: "image",
        icon: Image,
        label: "Image",
        labelAr: "صورة",
        shortcut: "I",
      },
      {
        id: "frame",
        icon: Frame,
        label: "Frame",
        labelAr: "إطار",
        shortcut: "F",
      },
      {
        id: "embed",
        icon: FileCode,
        label: "Embed",
        labelAr: "تضمين",
        shortcut: "E",
        isNew: true,
      },
    ],
  },
  {
    id: "collaboration",
    label: "Collaboration",
    labelAr: "التعاون",
    icon: MessageSquare,
    tools: [
      {
        id: "comment",
        icon: MessageSquare,
        label: "Comment",
        labelAr: "تعليق",
        shortcut: "M",
      },
      {
        id: "laser",
        icon: Sparkles,
        label: "Laser Pointer",
        labelAr: "مؤشر ليزر",
        shortcut: "K",
      },
    ],
  },
  {
    id: "ai",
    label: "AI Tools",
    labelAr: "أدوات الذكاء الاصطناعي",
    icon: Sparkles,
    tools: [
      {
        id: "ai",
        icon: Sparkles,
        label: "AI Assistant",
        labelAr: "المساعد الذكي",
        shortcut: "G",
        isPro: true,
        description: "Generate diagrams with AI",
        descriptionAr: "إنشاء مخططات بالذكاء الاصطناعي",
      },
    ],
  },
];

// =============================================================================
// 🧩 DIAGRAM TEMPLATES
// =============================================================================

interface DiagramTemplate {
  id: string;
  name: string;
  nameAr: string;
  icon: React.ComponentType<any>;
  category: string;
}

const DIAGRAM_TEMPLATES: DiagramTemplate[] = [
  { id: "flowchart", name: "Flowchart", nameAr: "مخطط انسيابي", icon: Network, category: "diagrams" },
  { id: "mindmap", name: "Mind Map", nameAr: "خريطة ذهنية", icon: Network, category: "diagrams" },
  { id: "orgchart", name: "Org Chart", nameAr: "هيكل تنظيمي", icon: Layout, category: "diagrams" },
  { id: "wireframe", name: "Wireframe", nameAr: "إطار سلكي", icon: Smartphone, category: "design" },
  { id: "architecture", name: "Architecture", nameAr: "بنية تحتية", icon: Server, category: "tech" },
  { id: "database", name: "Database", nameAr: "قاعدة بيانات", icon: Database, category: "tech" },
  { id: "network", name: "Network", nameAr: "شبكة", icon: Globe, category: "tech" },
  { id: "timeline", name: "Timeline", nameAr: "خط زمني", icon: ArrowRightLeft, category: "diagrams" },
];

// =============================================================================
// 🔧 PALETTE TOOL ITEM
// =============================================================================

interface PaletteToolItemProps {
  tool: ToolDefinition;
  isActive: boolean;
  isFavorite?: boolean;
  onClick: () => void;
  onFavoriteToggle?: () => void;
  isExpanded?: boolean;
  isArabic?: boolean;
}

const PaletteToolItem: React.FC<PaletteToolItemProps> = ({
  tool,
  isActive,
  isFavorite,
  onClick,
  onFavoriteToggle,
  isExpanded = true,
  isArabic = false,
}) => {
  const Icon = tool.icon;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group relative flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all",
        isActive
          ? "bg-blue-500 text-white shadow-md"
          : "hover:bg-gray-100 text-gray-700",
        !isExpanded && "justify-center"
      )}
      onClick={onClick}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      
      {isExpanded && (
        <>
          <span className="flex-1 text-sm font-medium truncate">
            {isArabic ? tool.labelAr : tool.label}
          </span>
          
          {tool.shortcut && (
            <span
              className={cn(
                "text-xs px-1 rounded",
                isActive ? "bg-blue-400 text-white" : "bg-gray-200 text-gray-500"
              )}
            >
              {tool.shortcut}
            </span>
          )}

          {tool.isPro && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-400 text-amber-900 rounded">
              PRO
            </span>
          )}

          {tool.isNew && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-green-400 text-green-900 rounded">
              NEW
            </span>
          )}

          {tool.isBeta && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-purple-400 text-purple-900 rounded">
              BETA
            </span>
          )}
        </>
      )}

      {/* Favorite Toggle */}
      {onFavoriteToggle && isExpanded && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavoriteToggle();
          }}
          className={cn(
            "opacity-0 group-hover:opacity-100 transition-opacity",
            isFavorite && "opacity-100"
          )}
        >
          <Heart
            className={cn(
              "w-3 h-3",
              isFavorite ? "fill-red-500 text-red-500" : "text-gray-400"
            )}
          />
        </button>
      )}

      {/* Tooltip for collapsed mode */}
      {!isExpanded && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
          {isArabic ? tool.labelAr : tool.label}
          {tool.shortcut && (
            <span className="ml-2 text-gray-400">{tool.shortcut}</span>
          )}
        </div>
      )}
    </motion.div>
  );
};

// =============================================================================
// 📁 CATEGORY SECTION
// =============================================================================

interface CategorySectionProps {
  category: ToolCategory;
  currentTool: CanvasTool;
  onToolChange: (tool: CanvasTool) => void;
  favoriteTools?: CanvasTool[];
  onFavoriteToggle?: (tool: CanvasTool) => void;
  isExpanded?: boolean;
  isArabic?: boolean;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  currentTool,
  onToolChange,
  favoriteTools = [],
  onFavoriteToggle,
  isExpanded = true,
  isArabic = false,
}) => {
  const [isCategoryExpanded, setIsCategoryExpanded] = useState(
    category.defaultExpanded ?? false
  );

  const Icon = category.icon;

  return (
    <div className="border-b border-gray-200/50 last:border-b-0">
      <button
        onClick={() => setIsCategoryExpanded(!isCategoryExpanded)}
        className={cn(
          "w-full flex items-center gap-2 p-2 text-gray-600 hover:bg-gray-50 transition-colors",
          !isExpanded && "justify-center"
        )}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        {isExpanded && (
          <>
            <span className="flex-1 text-xs font-semibold uppercase tracking-wide text-left">
              {isArabic ? category.labelAr : category.label}
            </span>
            <motion.span
              animate={{ rotate: isCategoryExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="w-3 h-3" />
            </motion.span>
          </>
        )}
      </button>

      <AnimatePresence>
        {isCategoryExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-1 space-y-0.5">
              {category.tools.map((tool) => (
                <PaletteToolItem
                  key={tool.id}
                  tool={tool}
                  isActive={currentTool === tool.id}
                  isFavorite={favoriteTools.includes(tool.id)}
                  onClick={() => onToolChange(tool.id)}
                  onFavoriteToggle={
                    onFavoriteToggle
                      ? () => onFavoriteToggle(tool.id)
                      : undefined
                  }
                  isExpanded={isExpanded}
                  isArabic={isArabic}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// =============================================================================
// 🎯 MAIN TOOL PALETTE COMPONENT
// =============================================================================

export const ToolPalette: React.FC<ToolPaletteProps> = ({
  currentTool,
  onToolChange,
  onShapeSelect,
  favoriteTools = [],
  onFavoriteToggle,
  recentTools = [],
  isPinned = false,
  onPinToggle,
  isExpanded = true,
  onExpandToggle,
  position = "left",
  showSearch = true,
  showCategories = true,
  className,
  dir = "ltr",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"tools" | "templates" | "recent">("tools");

  const isArabic = dir === "rtl";

  // Filter tools based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return TOOL_CATEGORIES;

    return TOOL_CATEGORIES.map((category) => ({
      ...category,
      tools: category.tools.filter(
        (tool) =>
          tool.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tool.labelAr.includes(searchQuery) ||
          tool.shortcut?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    })).filter((category) => category.tools.length > 0);
  }, [searchQuery]);

  // Get favorite tools data
  const favoriteToolsData = useMemo(() => {
    return TOOL_CATEGORIES.flatMap((category) => category.tools).filter((tool) =>
      favoriteTools.includes(tool.id)
    );
  }, [favoriteTools]);

  // Get recent tools data
  const recentToolsData = useMemo(() => {
    return TOOL_CATEGORIES.flatMap((category) => category.tools).filter((tool) =>
      recentTools.includes(tool.id)
    );
  }, [recentTools]);

  return (
    <motion.div
      initial={{ x: position === "left" ? -300 : 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: position === "left" ? -300 : 300, opacity: 0 }}
      className={cn(
        "flex flex-col bg-white/95 backdrop-blur-md border border-gray-200/50 shadow-xl rounded-xl overflow-hidden",
        isExpanded ? "w-64" : "w-14",
        "transition-all duration-300",
        className
      )}
      dir={dir}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200/50 bg-gray-50/50">
        {isExpanded && (
          <h3 className="text-sm font-semibold text-gray-700">
            {isArabic ? "الأدوات" : "Tools"}
          </h3>
        )}
        <div className="flex items-center gap-1">
          {onPinToggle && (
            <button
              onClick={onPinToggle}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                isPinned ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100 text-gray-500"
              )}
              title={isArabic ? (isPinned ? "إلغاء التثبيت" : "تثبيت") : (isPinned ? "Unpin" : "Pin")}
            >
              {isPinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
            </button>
          )}
          {onExpandToggle && (
            <button
              onClick={onExpandToggle}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              title={isArabic ? (isExpanded ? "تصغير" : "توسيع") : (isExpanded ? "Collapse" : "Expand")}
            >
              <ChevronRight
                className={cn(
                  "w-3.5 h-3.5 transition-transform",
                  isExpanded && "rotate-180"
                )}
              />
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      {showSearch && isExpanded && (
        <div className="p-2 border-b border-gray-200/50">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isArabic ? "بحث عن أداة..." : "Search tools..."}
              className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      {isExpanded && (
        <div className="flex border-b border-gray-200/50">
          {[
            { id: "tools", label: "Tools", labelAr: "الأدوات" },
            { id: "templates", label: "Templates", labelAr: "القوالب" },
            { id: "recent", label: "Recent", labelAr: "الأخيرة" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                "flex-1 px-2 py-1.5 text-xs font-medium transition-colors",
                activeTab === tab.id
                  ? "text-blue-600 border-b-2 border-blue-500"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {isArabic ? tab.labelAr : tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "tools" && (
          <div>
            {/* Favorites Section */}
            {favoriteToolsData.length > 0 && isExpanded && (
              <div className="p-2 border-b border-gray-200/50 bg-amber-50/30">
                <div className="text-xs font-semibold text-amber-600 mb-1 flex items-center gap-1">
                  <Heart className="w-3 h-3 fill-amber-500" />
                  {isArabic ? "المفضلة" : "Favorites"}
                </div>
                <div className="space-y-0.5">
                  {favoriteToolsData.map((tool) => (
                    <PaletteToolItem
                      key={`fav-${tool.id}`}
                      tool={tool}
                      isActive={currentTool === tool.id}
                      isFavorite={true}
                      onClick={() => onToolChange(tool.id)}
                      onFavoriteToggle={
                        onFavoriteToggle
                          ? () => onFavoriteToggle(tool.id)
                          : undefined
                      }
                      isExpanded={isExpanded}
                      isArabic={isArabic}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Categories */}
            {showCategories ? (
              filteredCategories.map((category) => (
                <CategorySection
                  key={category.id}
                  category={category}
                  currentTool={currentTool}
                  onToolChange={onToolChange}
                  favoriteTools={favoriteTools}
                  onFavoriteToggle={onFavoriteToggle}
                  isExpanded={isExpanded}
                  isArabic={isArabic}
                />
              ))
            ) : (
              <div className="p-1 space-y-0.5">
                {filteredCategories.flatMap((category) =>
                  category.tools.map((tool) => (
                    <PaletteToolItem
                      key={tool.id}
                      tool={tool}
                      isActive={currentTool === tool.id}
                      isFavorite={favoriteTools.includes(tool.id)}
                      onClick={() => onToolChange(tool.id)}
                      onFavoriteToggle={
                        onFavoriteToggle
                          ? () => onFavoriteToggle(tool.id)
                          : undefined
                      }
                      isExpanded={isExpanded}
                      isArabic={isArabic}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "templates" && isExpanded && (
          <div className="p-2 grid grid-cols-2 gap-2">
            {DIAGRAM_TEMPLATES.map((template) => {
              const Icon = template.icon;
              return (
                <motion.button
                  key={template.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex flex-col items-center gap-1 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Icon className="w-6 h-6 text-gray-600" />
                  <span className="text-xs text-gray-700 text-center">
                    {isArabic ? template.nameAr : template.name}
                  </span>
                </motion.button>
              );
            })}
          </div>
        )}

        {activeTab === "recent" && isExpanded && (
          <div className="p-2">
            {recentToolsData.length > 0 ? (
              <div className="space-y-0.5">
                {recentToolsData.map((tool) => (
                  <PaletteToolItem
                    key={`recent-${tool.id}`}
                    tool={tool}
                    isActive={currentTool === tool.id}
                    isFavorite={favoriteTools.includes(tool.id)}
                    onClick={() => onToolChange(tool.id)}
                    onFavoriteToggle={
                      onFavoriteToggle
                        ? () => onFavoriteToggle(tool.id)
                        : undefined
                    }
                    isExpanded={isExpanded}
                    isArabic={isArabic}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">
                {isArabic ? "لا توجد أدوات مستخدمة حديثاً" : "No recent tools"}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {isExpanded && (
        <div className="p-2 border-t border-gray-200/50 bg-gray-50/50">
          <button className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Settings className="w-3.5 h-3.5" />
            {isArabic ? "تخصيص الأدوات" : "Customize Tools"}
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default ToolPalette;
export type { ToolPaletteProps, ToolCategory, ToolDefinition, DiagramTemplate };
