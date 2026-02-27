/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * THINKING STORE - Zustand State Management
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * إدارة حالة نظام التفكير مع localStorage persistence
 * 
 * @version 1.0.0
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ThinkingSession,
  ThinkingSummary,
  ThinkingStep,
  ThinkingLevel,
  ChatbotModel,
  ThinkingPhase,
} from '@/types/thinking';
import { generateStepId, calculateTotalDuration } from '@/types/thinking';

// ═══════════════════════════════════════════════════════════════════════════════
// STORE INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

interface ThinkingState
{
  // State
  sessions: Map<string, ThinkingSession>; // messageId -> session
  activeMessageId: string | null;

  // Actions
  startSession: ( messageId: string, model: ChatbotModel, level: ThinkingLevel, query: string ) => void;
  addStep: ( messageId: string, phase: ThinkingPhase, content: string, duration?: number ) => void;
  completeSession: ( messageId: string ) => void;
  setError: ( messageId: string, error: string ) => void;
  toggleExpanded: ( messageId: string ) => void;
  clearSession: ( messageId: string ) => void;
  clearAllSessions: () => void;

  // Selectors
  getSession: ( messageId: string ) => ThinkingSession | undefined;
  isThinking: ( messageId: string ) => boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

export const useThinkingStore = create<ThinkingState>()(
  persist(
    ( set, get ) => ( {
      // ═══════════════════════════════════════════════════════════════════════
      // STATE
      // ═══════════════════════════════════════════════════════════════════════

      sessions: new Map(),
      activeMessageId: null,

      // ═══════════════════════════════════════════════════════════════════════
      // ACTIONS
      // ═══════════════════════════════════════════════════════════════════════

      startSession: ( messageId, model, level, query ) =>
      {
        const newSession: ThinkingSession = {
          messageId,
          model,
          level,
          query,
          startTime: Date.now(),
          summary: {
            messageId,
            level,
            steps: [],
            totalDuration: 0,
            isComplete: false,
            isExpanded: true, // مفتوح بشكل افتراضي
          },
        };

        set( ( state ) => ( {
          sessions: new Map( state.sessions ).set( messageId, newSession ),
          activeMessageId: messageId,
        } ) );
      },

      addStep: ( messageId, phase, content, duration ) =>
      {
        const session = get().sessions.get( messageId );
        if ( !session ) return;

        const newStep: ThinkingStep = {
          id: generateStepId(),
          phase,
          content,
          timestamp: Date.now(),
          duration,
        };

        const updatedSteps = [ ...session.summary.steps, newStep ];
        const updatedSession: ThinkingSession = {
          ...session,
          summary: {
            ...session.summary,
            steps: updatedSteps,
            totalDuration: calculateTotalDuration( updatedSteps ),
          },
        };

        set( ( state ) => ( {
          sessions: new Map( state.sessions ).set( messageId, updatedSession ),
        } ) );
      },

      completeSession: ( messageId ) =>
      {
        const session = get().sessions.get( messageId );
        if ( !session ) return;

        const updatedSession: ThinkingSession = {
          ...session,
          endTime: Date.now(),
          summary: {
            ...session.summary,
            isComplete: true,
            isExpanded: false,
          },
        };

        set( ( state ) => ( {
          sessions: new Map( state.sessions ).set( messageId, updatedSession ),
          activeMessageId: state.activeMessageId === messageId ? null : state.activeMessageId,
        } ) );
      },

      setError: ( messageId, error ) =>
      {
        const session = get().sessions.get( messageId );
        if ( !session ) return;

        const updatedSession: ThinkingSession = {
          ...session,
          endTime: Date.now(),
          summary: {
            ...session.summary,
            isComplete: true,
            isExpanded: false,
            error,
          },
        };

        set( ( state ) => ( {
          sessions: new Map( state.sessions ).set( messageId, updatedSession ),
          activeMessageId: state.activeMessageId === messageId ? null : state.activeMessageId,
        } ) );
      },

      toggleExpanded: ( messageId ) =>
      {
        const session = get().sessions.get( messageId );
        if ( !session ) return;

        const updatedSession: ThinkingSession = {
          ...session,
          summary: {
            ...session.summary,
            isExpanded: !session.summary.isExpanded,
          },
        };

        set( ( state ) => ( {
          sessions: new Map( state.sessions ).set( messageId, updatedSession ),
        } ) );
      },

      clearSession: ( messageId ) =>
      {
        set( ( state ) =>
        {
          const newSessions = new Map( state.sessions );
          newSessions.delete( messageId );
          return {
            sessions: newSessions,
            activeMessageId: state.activeMessageId === messageId ? null : state.activeMessageId,
          };
        } );
      },

      clearAllSessions: () =>
      {
        set( {
          sessions: new Map(),
          activeMessageId: null,
        } );
      },

      // ═══════════════════════════════════════════════════════════════════════
      // SELECTORS
      // ═══════════════════════════════════════════════════════════════════════

      getSession: ( messageId ) =>
      {
        return get().sessions.get( messageId );
      },

      isThinking: ( messageId ) =>
      {
        const session = get().sessions.get( messageId );
        return session ? !session.summary.isComplete : false;
      },
    } ),
    {
      name: 'thinking-storage',
      // Custom serialization for Map
      storage: {
        getItem: ( name ) =>
        {
          const str = localStorage.getItem( name );
          if ( !str ) return null;
          const { state } = JSON.parse( str );
          return {
            state: {
              ...state,
              sessions: new Map( Object.entries( state.sessions || {} ) ),
            },
          };
        },
        setItem: ( name, newValue ) =>
        {
          const str = JSON.stringify( {
            state: {
              ...newValue.state,
              sessions: Object.fromEntries( newValue.state.sessions ),
            },
          } );
          localStorage.setItem( name, str );
        },
        removeItem: ( name ) => localStorage.removeItem( name ),
      },
      // Only persist sessions, not activeMessageId
      partialize: ( state ) => ( {
        sessions: state.sessions,
      } ) as unknown as ThinkingState,
    }
  )
);

// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook للحصول على جلسة تفكير محددة
 */
export function useThinkingSession ( messageId: string | null )
{
  return useThinkingStore( ( state ) =>
    messageId ? state.getSession( messageId ) : undefined
  );
}

/**
 * Hook للتحقق من حالة التفكير
 */
export function useIsThinking ( messageId: string | null )
{
  return useThinkingStore( ( state ) =>
    messageId ? state.isThinking( messageId ) : false
  );
}
