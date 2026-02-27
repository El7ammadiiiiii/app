import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FirestoreCanvasService } from '@/lib/services/firestoreChatService';

/** Wave 5.3: Generate a short UUID for version tracking */
function genVersionId(): string {
  return `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ═══════════════════════════════════════════════════════════════
// Canvas Types — 12 Gemini Immersive types + full metadata map
// ═══════════════════════════════════════════════════════════════
export type CanvasType =
  | 'CODE'                    // كود
  | 'TEXT'                    // مستند
  | 'DEEP_RESEARCH'           // بحث معمق
  | 'DATA_VIZ'                // تصوّر بيانات
  | 'DOC'                     // مستند منسق
  | 'LEARNING'                // تعلم
  | 'STORYBOOK'               // قصصي
  | 'ANNOTATED_MULTIMEDIA'    // وسائط مشروحة
  | 'AGENTIC_BUNDLE'          // حزمة وكيل
  | 'SLIDES'                  // شرائح
  | 'EMAIL'                   // بريد
  | 'AUTOMATION_PLAN'         // خطة أتمتة
  | 'MAP';                    // خريطة

/** Metadata for each canvas type — icon name, Arabic label, accent color */
export const CANVAS_TYPE_META: Record<CanvasType, { icon: string; label: string; color: string; bgClass: string }> = {
  CODE:                  { icon: 'Code2',         label: 'كود',           color: '#22d3ee', bgClass: 'bg-cyan-500/15 border-cyan-500/20 text-cyan-400' },
  TEXT:                  { icon: 'FileText',      label: 'مستند',          color: '#a78bfa', bgClass: 'bg-violet-500/15 border-violet-500/20 text-violet-400' },
  DEEP_RESEARCH:         { icon: 'Search',        label: 'بحث معمق',       color: '#2dd4bf', bgClass: 'bg-teal-500/15 border-teal-500/20 text-teal-400' },
  DATA_VIZ:              { icon: 'BarChart3',     label: 'تصوّر بيانات',    color: '#fb923c', bgClass: 'bg-orange-500/15 border-orange-500/20 text-orange-400' },
  DOC:                   { icon: 'FileText',      label: 'مستند',          color: '#60a5fa', bgClass: 'bg-blue-500/15 border-blue-500/20 text-blue-400' },
  LEARNING:              { icon: 'GraduationCap', label: 'تعلم',           color: '#34d399', bgClass: 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400' },
  STORYBOOK:             { icon: 'BookOpen',      label: 'قصصي',          color: '#f472b6', bgClass: 'bg-pink-500/15 border-pink-500/20 text-pink-400' },
  ANNOTATED_MULTIMEDIA:  { icon: 'Image',         label: 'وسائط مشروحة',   color: '#c084fc', bgClass: 'bg-purple-500/15 border-purple-500/20 text-purple-400' },
  AGENTIC_BUNDLE:        { icon: 'Bot',           label: 'حزمة وكيل',     color: '#38bdf8', bgClass: 'bg-sky-500/15 border-sky-500/20 text-sky-400' },
  SLIDES:                { icon: 'Presentation',  label: 'شرائح',          color: '#fbbf24', bgClass: 'bg-amber-500/15 border-amber-500/20 text-amber-400' },
  EMAIL:                 { icon: 'Mail',          label: 'بريد',           color: '#f87171', bgClass: 'bg-red-500/15 border-red-500/20 text-red-400' },
  AUTOMATION_PLAN:       { icon: 'Workflow',      label: 'خطة أتمتة',      color: '#4ade80', bgClass: 'bg-green-500/15 border-green-500/20 text-green-400' },
  MAP:                   { icon: 'MapPin',        label: 'خريطة',          color: '#e879f9', bgClass: 'bg-fuchsia-500/15 border-fuchsia-500/20 text-fuchsia-400' },
};

// ═══════════════════════════════════════════════════════════════
// Typed Artifact Metadata — discriminated union per type
// ═══════════════════════════════════════════════════════════════
export type ArtifactMeta =
  | { kind: 'deep_research'; sources: string[]; queryId?: string }
  | { kind: 'data_viz'; chartType: string; dataSource?: string }
  | { kind: 'code'; files?: CanvasFile[] }
  | { kind: 'generic' };

// ═══════════════════════════════════════════════════════════════
// Canvas Artifact — persisted record of every canvas created
// ═══════════════════════════════════════════════════════════════
export interface CanvasArtifact
{
  id: string;
  title: string;
  type: CanvasType;
  language: string;
  content: string;
  chatId: string;
  messageId?: string;
  createdAt: number;
  updatedAt: number;
  /** Typed metadata per canvas type */
  meta?: ArtifactMeta;
  /** Saved version history — restored on reopen */
  savedVersions?: CanvasVersion[];
  /** Saved files for multi-file projects */
  savedFiles?: CanvasFile[];
}

/** Max artifacts stored in localStorage — FIFO eviction */
const MAX_ARTIFACTS = 100;

export interface CanvasVersion
{
  /** Unique UUID for this version (Wave 5.3) */
  id: string;
  version: number;
  content: string;
  timestamp: number;
  messageId?: string;
}

export interface CanvasFile
{
  id: string;
  name: string;
  language: string;
  content: string;
  type: CanvasType;
}

export interface TextSelection
{
  start: number;
  end: number;
  text: string;
}

export type EditMode = 'read' | 'edit' | 'ai-edit';

export interface ExportSettings
{
  fontSize: number;
  theme: 'light' | 'dark';
  includeLineNumbers: boolean;
}

interface CanvasState
{
  isOpen: boolean;
  isModeActive: boolean;
  activeModeType: CanvasType;
  activeCanvasId: string | null;
  type: CanvasType;
  title: string;
  language: string;
  versions: CanvasVersion[];
  currentVersionIndex: number;
  isStreaming: boolean;

  // Multi-file support
  files: CanvasFile[];
  activeFileId: string | null;

  // Selection & Editing
  selectedText: TextSelection | null;
  editMode: EditMode;

  // Export
  exportSettings: ExportSettings;

  // Model selection
  selectedModel: string | null;

  // ═══ Artifacts — persisted across sessions ═══
  artifacts: CanvasArtifact[];
  activeArtifactId: string | null;
}

interface CanvasActions
{
  openCanvas: ( data: { id: string; title: string; type: CanvasType; language?: string; initialContent?: string; messageId?: string; model?: string } ) => void;
  closeCanvas: ( skipSave?: boolean ) => void;
  enableMode: ( type: CanvasType ) => void;
  disableMode: () => void;
  updateContent: ( content: string, createNewVersion?: boolean, messageId?: string ) => void;
  setVersion: ( index: number ) => void;
  setIsStreaming: ( isStreaming: boolean ) => void;
  reset: () => void;

  // Multi-file actions
  addFile: ( file: CanvasFile ) => void;
  removeFile: ( fileId: string ) => void;
  switchFile: ( fileId: string ) => void;
  updateFile: ( fileId: string, content: string ) => void;

  // Selection actions
  setSelectedText: ( selection: TextSelection | null ) => void;

  // Edit mode actions
  setEditMode: ( mode: EditMode ) => void;

  // Export actions
  updateExportSettings: ( settings: Partial<ExportSettings> ) => void;

  // Model selection
  setSelectedModel: ( model: string ) => void;

  // ═══ Artifact actions ═══
  createArtifact: ( data: { title: string; type: CanvasType; language?: string; content?: string; chatId: string; messageId?: string; model?: string } ) => string;
  openArtifact: ( artifactId: string ) => void;
  updateArtifact: ( artifactId: string, content: string ) => void;
  deleteArtifact: ( artifactId: string ) => void;
  getArtifactsForChat: ( chatId: string ) => CanvasArtifact[];

  // ═══ Version actions (A.1 fix — was missing, caused crash) ═══
  addVersion: ( version: CanvasVersion ) => void;

  // ═══ Update existing artifact (B.1 — Update/Rewrite protocol) ═══
  updateExistingArtifact: ( artifactId: string, content: string, title?: string ) => void;

  // ═══ Firestore hydration (Wave 3.2) ═══
  hydrateArtifactsFromFirestore: () => Promise<void>;
  _syncArtifactToFirestore: ( artifact: CanvasArtifact ) => void;
}

export const useCanvasStore = create<CanvasState & CanvasActions>()(
  persist(
    ( set, get ) => ( {
      isOpen: false,
      isModeActive: false,
      activeModeType: 'CODE',
      activeCanvasId: null,
      type: 'CODE',
      title: 'Untitled',
      language: 'typescript',
      versions: [],
      currentVersionIndex: -1,
      isStreaming: false,

      // Multi-file
      files: [],
      activeFileId: null,

      // Selection & Editing
      selectedText: null,
      editMode: 'edit',

      // Export
      exportSettings: {
        fontSize: 14,
        theme: 'dark',
        includeLineNumbers: true,
      },

      // Model
      selectedModel: null,

      // Artifacts
      artifacts: [],
      activeArtifactId: null,

      openCanvas: ( { id, title, type, language = 'typescript', initialContent = '', messageId, model } ) =>
      {
        const initialVersion: CanvasVersion = {
          id: genVersionId(),
          version: 1,
          content: initialContent,
          timestamp: Date.now(),
          messageId
        };

        const initialFile: CanvasFile = {
          id: `file_${ Date.now() }`,
          name: title,
          language,
          content: initialContent,
          type
        };

        set( {
          isOpen: true,
          isModeActive: false,
          activeCanvasId: id,
          title,
          type,
          language,
          versions: [ initialVersion ],
          currentVersionIndex: 0,
          isStreaming: false,
          files: [ initialFile ],
          activeFileId: initialFile.id,
          selectedModel: model || null,
        } );
      },

      closeCanvas: ( skipSave?: boolean ) =>
      {
        const { activeArtifactId, versions, currentVersionIndex, files } = get();
        if ( !skipSave && activeArtifactId && versions[ currentVersionIndex ] )
        {
          const currentContent = versions[ currentVersionIndex ].content;
          const { artifacts } = get();
          const updatedArtifacts = artifacts.map( a =>
            a.id === activeArtifactId
              ? {
                  ...a,
                  content: currentContent,
                  updatedAt: Date.now(),
                  // Save full version history for restore
                  savedVersions: versions,
                  // Save multi-file state
                  savedFiles: files.length > 1 ? files : undefined,
                }
              : a
          );
          set( { isOpen: false, artifacts: updatedArtifacts } );

          // ── Wave 3.2: sync updated artifact to Firestore ──
          const saved = updatedArtifacts.find( a => a.id === activeArtifactId );
          if ( saved ) get()._syncArtifactToFirestore( saved );
        } else
        {
          set( { isOpen: false } );
        }
      },

      enableMode: ( type ) => set( { isModeActive: true, activeModeType: type } ),
      disableMode: () => set( { isModeActive: false } ),

      updateContent: ( content, createNewVersion = false, messageId ) =>
      {
        const { versions, currentVersionIndex, files, activeFileId } = get();

        if ( createNewVersion )
        {
          const newVersion: CanvasVersion = {
            id: genVersionId(),
            version: versions.length + 1,
            content,
            timestamp: Date.now(),
            messageId
          };

          set( {
            versions: [ ...versions, newVersion ],
            currentVersionIndex: versions.length
          } );
        } else
        {
          const updatedVersions = [ ...versions ];
          if ( updatedVersions[ currentVersionIndex ] )
          {
            updatedVersions[ currentVersionIndex ] = {
              ...updatedVersions[ currentVersionIndex ],
              content
            };
            set( { versions: updatedVersions } );
          }
        }

        // Update active file
        if ( activeFileId )
        {
          const updatedFiles = files.map( f =>
            f.id === activeFileId ? { ...f, content } : f
          );
          set( { files: updatedFiles } );
        }
      },

      setVersion: ( index ) =>
      {
        const { versions } = get();
        if ( index >= 0 && index < versions.length )
        {
          set( { currentVersionIndex: index } );
        }
      },

      setIsStreaming: ( isStreaming ) => set( { isStreaming } ),

      // Multi-file actions
      addFile: ( file ) =>
      {
        const { files } = get();
        set( {
          files: [ ...files, file ],
          activeFileId: file.id
        } );
      },

      removeFile: ( fileId ) =>
      {
        const { files, activeFileId } = get();
        const updatedFiles = files.filter( f => f.id !== fileId );
        const newActiveId = activeFileId === fileId
          ? ( updatedFiles[ 0 ]?.id || null )
          : activeFileId;
        set( { files: updatedFiles, activeFileId: newActiveId } );
      },

      switchFile: ( fileId ) =>
      {
        set( { activeFileId: fileId } );
      },

      updateFile: ( fileId, content ) =>
      {
        const { files } = get();
        const updatedFiles = files.map( f =>
          f.id === fileId ? { ...f, content } : f
        );
        set( { files: updatedFiles } );
      },

      // Selection actions
      setSelectedText: ( selection ) => set( { selectedText: selection } ),

      // Edit mode actions
      setEditMode: ( mode ) => set( { editMode: mode } ),

      // Export actions
      updateExportSettings: ( settings ) =>
      {
        const { exportSettings } = get();
        set( { exportSettings: { ...exportSettings, ...settings } } );
      },

      // Model selection
      setSelectedModel: ( model ) => set( { selectedModel: model } ),

      // ═══ Artifact actions ═══
      createArtifact: ( { title, type, language = 'typescript', content = '', chatId, messageId, model } ) =>
      {
        const id = `artifact_${ Date.now() }_${ Math.random().toString( 36 ).slice( 2, 8 ) }`;
        const now = Date.now();

        const artifact: CanvasArtifact = {
          id,
          title,
          type,
          language,
          content,
          chatId,
          messageId,
          createdAt: now,
          updatedAt: now,
        };

        let { artifacts } = get();

        // FIFO eviction: remove oldest if at capacity
        if ( artifacts.length >= MAX_ARTIFACTS )
        {
          artifacts = artifacts.slice( artifacts.length - MAX_ARTIFACTS + 1 );
        }

        // Open the canvas panel with this artifact's data
        const initialVersion: CanvasVersion = {
          id: genVersionId(),
          version: 1,
          content,
          timestamp: now,
          messageId,
        };

        const initialFile: CanvasFile = {
          id: `file_${ now }`,
          name: title,
          language,
          content,
          type,
        };

        set( {
          artifacts: [ ...artifacts, artifact ],
          activeArtifactId: id,
          isOpen: true,
          isModeActive: false,
          activeCanvasId: id,
          title,
          type,
          language,
          versions: [ initialVersion ],
          currentVersionIndex: 0,
          isStreaming: false,
          files: [ initialFile ],
          activeFileId: initialFile.id,
          selectedModel: model || null,
        } );

        // ── Wave 3.2: sync new artifact to Firestore ──
        get()._syncArtifactToFirestore( artifact );

        return id;
      },

      openArtifact: ( artifactId ) =>
      {
        const { artifacts } = get();
        const artifact = artifacts.find( a => a.id === artifactId );
        if ( !artifact ) return;

        // Restore saved version history if available, otherwise create single version
        const restoredVersions: CanvasVersion[] = artifact.savedVersions && artifact.savedVersions.length > 0
          ? artifact.savedVersions
          : [ {
              id: genVersionId(),
              version: 1,
              content: artifact.content,
              timestamp: artifact.updatedAt,
              messageId: artifact.messageId,
            } ];

        // Restore saved multi-file state if available
        const restoredFiles: CanvasFile[] = artifact.savedFiles && artifact.savedFiles.length > 0
          ? artifact.savedFiles
          : [ {
              id: `file_${ Date.now() }`,
              name: artifact.title,
              language: artifact.language,
              content: artifact.content,
              type: artifact.type,
            } ];

        set( {
          isOpen: true,
          activeArtifactId: artifactId,
          activeCanvasId: artifactId,
          title: artifact.title,
          type: artifact.type,
          language: artifact.language,
          versions: restoredVersions,
          currentVersionIndex: restoredVersions.length - 1,
          isStreaming: false,
          files: restoredFiles,
          activeFileId: restoredFiles[ 0 ]?.id || null,
        } );
      },

      updateArtifact: ( artifactId, content ) =>
      {
        const { artifacts } = get();
        const updated = artifacts.map( a =>
          a.id === artifactId
            ? { ...a, content, updatedAt: Date.now() }
            : a
        );
        set( { artifacts: updated } );

        // ── Wave 3.2: sync to Firestore ──
        const art = updated.find( a => a.id === artifactId );
        if ( art ) get()._syncArtifactToFirestore( art );
      },

      deleteArtifact: ( artifactId ) =>
      {
        const { artifacts, activeArtifactId } = get();
        set( {
          artifacts: artifacts.filter( a => a.id !== artifactId ),
          ...( activeArtifactId === artifactId ? { isOpen: false, activeArtifactId: null } : {} ),
        } );

        // ── Wave 3.2: delete from Firestore ──
        queueMicrotask( () => FirestoreCanvasService.deleteArtifact( artifactId ).catch( () => {} ) );
      },

      getArtifactsForChat: ( chatId ) =>
      {
        return get().artifacts.filter( a => a.chatId === chatId );
      },

      // ═══ A.1 FIX: addVersion — was missing, caused TypeError crash ═══
      addVersion: ( version ) =>
      {
        const { versions, activeArtifactId, artifacts } = get();
        const newVersions = [ ...versions, version ];
        const newIndex = newVersions.length - 1;

        set( {
          versions: newVersions,
          currentVersionIndex: newIndex,
        } );

        // Also update the artifact's savedVersions + content
        if ( activeArtifactId )
        {
          const updatedArtifacts = artifacts.map( a =>
            a.id === activeArtifactId
              ? { ...a, content: version.content, updatedAt: Date.now(), savedVersions: newVersions }
              : a
          );
          set( { artifacts: updatedArtifacts } );

          // ── Wave 3.2: sync to Firestore ──
          const art = updatedArtifacts.find( a => a.id === activeArtifactId );
          if ( art ) get()._syncArtifactToFirestore( art );
        }
      },

      // ═══ B.1: updateExistingArtifact — opens artifact + adds new version ═══
      updateExistingArtifact: ( artifactId, content, title ) =>
      {
        const { artifacts } = get();
        const artifact = artifacts.find( a => a.id === artifactId );
        if ( !artifact ) return;

        // Restore existing versions or create baseline
        const existingVersions: CanvasVersion[] = artifact.savedVersions && artifact.savedVersions.length > 0
          ? artifact.savedVersions
          : [ { id: genVersionId(), version: 1, content: artifact.content, timestamp: artifact.updatedAt } ];

        // Add new version
        const newVersion: CanvasVersion = {
          id: genVersionId(),
          version: existingVersions.length + 1,
          content,
          timestamp: Date.now(),
        };
        const allVersions = [ ...existingVersions, newVersion ];

        // Restore files
        const restoredFiles: CanvasFile[] = artifact.savedFiles && artifact.savedFiles.length > 0
          ? artifact.savedFiles.map( f => ( { ...f, content } ) )
          : [ {
              id: `file_${ Date.now() }`,
              name: title || artifact.title,
              language: artifact.language,
              content,
              type: artifact.type,
            } ];

        // Update artifact in store + open canvas
        set( {
          artifacts: artifacts.map( a =>
            a.id === artifactId
              ? { ...a, content, updatedAt: Date.now(), savedVersions: allVersions, ...(title ? { title } : {}) }
              : a
          ),
          isOpen: true,
          activeArtifactId: artifactId,
          activeCanvasId: artifactId,
          title: title || artifact.title,
          type: artifact.type,
          language: artifact.language,
          versions: allVersions,
          currentVersionIndex: allVersions.length - 1,
          isStreaming: false,
          files: restoredFiles,
          activeFileId: restoredFiles[ 0 ]?.id || null,
        } );

        // ── Wave 3.2: sync to Firestore ──
        const updated = get().artifacts.find( a => a.id === artifactId );
        if ( updated ) get()._syncArtifactToFirestore( updated );
      },

      // ═══ Wave 3.2: Firestore hydration for canvas artifacts ═══
      hydrateArtifactsFromFirestore: async () =>
      {
        try
        {
          const cloudArtifacts = await FirestoreCanvasService.loadAll();
          if ( !cloudArtifacts.length ) return;

          const local = get().artifacts;
          const localMap = new Map( local.map( a => [ a.id, a ] ) );
          const merged = [ ...local ];

          for ( const remote of cloudArtifacts )
          {
            const existing = localMap.get( remote.id );
            if ( !existing )
            {
              // Cloud-only artifact — add it
              merged.push( remote as CanvasArtifact );
            } else if ( ( remote.updatedAt || 0 ) > ( existing.updatedAt || 0 ) )
            {
              // Cloud is newer — replace local
              const idx = merged.findIndex( a => a.id === remote.id );
              if ( idx >= 0 ) merged[ idx ] = remote as CanvasArtifact;
            }
          }

          set( { artifacts: merged } );
          console.log( `[CanvasStore] Hydrated ${ cloudArtifacts.length } artifacts from Firestore` );
        } catch ( e )
        {
          console.warn( "[CanvasStore] Firestore hydration failed:", e );
        }
      },

      _syncArtifactToFirestore: ( artifact: CanvasArtifact ) =>
      {
        queueMicrotask( () =>
        {
          FirestoreCanvasService.saveArtifact( {
            id: artifact.id,
            title: artifact.title,
            type: artifact.type,
            language: artifact.language,
            content: artifact.content,
            chatId: artifact.chatId,
            messageId: artifact.messageId,
            createdAt: artifact.createdAt,
            updatedAt: artifact.updatedAt,
          } ).catch( () => {} );
        } );
      },

      reset: () => set( {
        isOpen: false,
        isModeActive: false,
        activeModeType: 'CODE',
        activeCanvasId: null,
        type: 'CODE',
        title: 'Untitled',
        language: 'typescript',
        versions: [],
        currentVersionIndex: -1,
        isStreaming: false,
        files: [],
        activeFileId: null,
        selectedText: null,
        editMode: 'edit',
        selectedModel: null,
        // Keep artifacts across resets
      } )
    } ),
    {
      name: 'canvas-storage',
      partialize: ( state ) => ( {
        exportSettings: state.exportSettings,
        artifacts: state.artifacts,
      } ),
    }
  )
);
