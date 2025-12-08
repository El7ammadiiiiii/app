// =============================================================================
// 📦 CCCWAYS Canvas - Elements Components Index
// ملف التصدير الرئيسي لمكونات العناصر
// =============================================================================

// Shape Component
export { 
  Shape, 
  ShapeSVG, 
  generateShapePath,
  default as ShapeComponent,
  type ShapeProps, 
  type ShapeSVGProps,
  type ShapePathProps 
} from "./Shape";

// Freehand Path Component
export { 
  FreehandPath, 
  pointsToSmoothPath, 
  pointsToLinearPath, 
  calculatePathBounds, 
  simplifyPath,
  calculateStrokeWidth,
  default as FreehandPathComponent,
  type FreehandPathProps, 
  type PathPoint,
  type StrokeStyle 
} from "./FreehandPath";

// Text Block Component
export { 
  TextBlock, 
  measureText, 
  textToHtml, 
  FONT_FAMILIES,
  default as TextBlockComponent,
  type TextBlockProps, 
  type TextBlockRef 
} from "./TextBlock";

// Image Element Component
export { 
  ImageElement, 
  ImagePlaceholder, 
  filterToCSS, 
  loadImage, 
  fileToBase64,
  default as ImageElementComponent,
  type ImageElementProps, 
  type ImageFilter,
  type ImageStyle 
} from "./ImageElement";

// Sticky Note Component
export { 
  StickyNote, 
  ColorPicker, 
  StickyToolbar, 
  STICKY_COLORS,
  adjustBrightness,
  default as StickyNoteComponent,
  type StickyNoteProps, 
  type StickyNoteRef 
} from "./StickyNote";

// Connector Component
export { 
  Connector, 
  ArrowHead, 
  ConnectionPoint,
  createStraightPath,
  createCurvedPath,
  createOrthogonalPath,
  createElbowPath,
  createWavyPath,
  calculateAngle,
  default as ConnectorComponent,
  type ConnectorProps, 
  type ArrowStyle,
  type LineStyle 
} from "./Connector";

// Frame Component
export { 
  Frame, 
  FrameHeader, 
  FRAME_PRESETS,
  default as FrameComponent,
  type FrameProps, 
  type FrameRef,
  type FrameStyle 
} from "./Frame";
