/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * THINKING DISPLAY - VS Code Style (Text Only)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * نمط VS Code نصي فقط - بدون أيقونات وألوان
 * عناوين بيضاء كبيرة، تفاصيل بيضاء صغيرة
 * 
 * @version 2.0.0
 */

'use client';

import { useState } from 'react';
import { useThinkingSession, useIsThinking, useThinkingStore } from '@/store/thinkingStore';
import { PHASE_TEXTS, getModePhaseText, type ThinkingMode } from '@/types/thinking';
import InfinityLogo from '@/components/ui/InfinityLogo';

interface ThinkingDisplayProps
{
  messageId: string;
  className?: string;
  showThinking?: boolean;
  showReferences?: boolean;
  showWorking?: boolean;
  references?: string[];
  mode?: ThinkingMode;
}

export function ThinkingDisplay ( {
  messageId,
  className = '',
  showThinking = true,
  showReferences = false,
  showWorking = false,
  references = [],
  mode,
}: ThinkingDisplayProps )
{
  const session = useThinkingSession( messageId );
  const isThinking = useIsThinking( messageId );
  const toggleExpanded = useThinkingStore( ( state ) => state.toggleExpanded );
  const [ isReferencesExpanded, setIsReferencesExpanded ] = useState( true );

  if ( !session && !showWorking ) return null;

  const steps = session?.summary.steps ?? [];
  const isExpanded = session?.summary.isExpanded ?? false;
  const isComplete = session?.summary.isComplete ?? false;
  const isActiveThinking = showThinking && isThinking && !isComplete;

  const thinkingTitle = isActiveThinking ? 'Thinking...' : 'Thinking';
  const workingTitle = 'Working...';
  const triangleOpen = '▽';
  const triangleClosed = '▷';

  const fastSpeed = 0.035;
  const slowSpeed = 0.008;
  const thinkingSpeed = isActiveThinking ? fastSpeed : slowSpeed;
  const workingSpeed = fastSpeed;

  const resolvedReferences = references.filter( Boolean );

  return (
    <div className={ `mb-3 space-y-1 ${ className }` }>
      {/* Thinking Section */ }
      { showThinking && session && (
        <div>
          <button
            onClick={ () => toggleExpanded( messageId ) }
            className="w-full text-right text-white text-[15px] font-medium flex items-center gap-2"
          >
            <InfinityLogo size={ 108 } speed={ thinkingSpeed } />
            <span>{ isExpanded ? triangleOpen : triangleClosed } ○ { thinkingTitle }</span>
          </button>

          { isExpanded && (
            <div className="mt-1 mr-4 border-r border-white/10 pr-4 space-y-1">
              { steps.map( ( step, index ) =>
              {
                const isLast = index === steps.length - 1;
                const isRunning = isActiveThinking && isLast;

                return (
                  <div key={ step.id } className="text-white/70 text-[12px] leading-relaxed">
                    │ • { mode ? getModePhaseText( mode, step.phase ) : ( PHASE_TEXTS[ step.phase ] || step.phase ) }
                    { isRunning ? ' (spinning)' : '' }
                  </div>
                );
              } ) }
            </div>
          ) }
        </div>
      ) }

      {/* References Section */ }
      { showReferences && resolvedReferences.length > 0 && (
        <div>
          <button
            onClick={ () => setIsReferencesExpanded( !isReferencesExpanded ) }
            className="w-full text-right text-white text-[15px] font-medium"
          >
            { isReferencesExpanded ? triangleOpen : triangleClosed } Used { resolvedReferences.length } reference{ resolvedReferences.length > 1 ? 's' : '' }
          </button>

          { isReferencesExpanded && (
            <div className="mt-1 mr-4 border-r border-white/10 pr-4 space-y-1">
              { resolvedReferences.map( ( ref, index ) =>
              {
                const parsed = parseReference( ref );
                const label = parsed.title && parsed.url
                  ? `${ parsed.title } — ${ shortenUrl( parsed.url ) }`
                  : ( parsed.title || parsed.url || ref );

                if ( parsed.url )
                {
                  return (
                    <a
                      key={ `${ ref }-${ index }` }
                      href={ parsed.url }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-white/70 text-[12px] leading-relaxed hover:text-white"
                    >
                      │ { String( index + 1 ).padStart( 2, '0' ) }  { label }
                    </a>
                  );
                }

                return (
                  <div key={ `${ ref }-${ index }` } className="text-white/70 text-[12px] leading-relaxed">
                    │ { String( index + 1 ).padStart( 2, '0' ) }  { label }
                  </div>
                );
              } ) }
            </div>
          ) }
        </div>
      ) }

      {/* Working Section */ }
      { showWorking && (
        <div className="text-white text-[15px] font-medium flex items-center gap-2">
          <InfinityLogo size={ 72 } speed={ workingSpeed } />
          <span>○ { workingTitle }</span>
        </div>
      ) }
    </div>
  );
}

function parseReference ( ref: string )
{
  const delimiter = ' — ';
  if ( ref.includes( delimiter ) )
  {
    const [ title, url ] = ref.split( delimiter );
    return { title: title?.trim(), url: url?.trim() };
  }

  const urlMatch = ref.match( /(https?:\/\/\S+)/i );
  if ( urlMatch )
  {
    const url = urlMatch[ 1 ];
    const title = ref.replace( url, '' ).trim();
    return { title: title || undefined, url };
  }

  return { title: ref, url: undefined };
}

function shortenUrl ( url: string )
{
  try
  {
    const parsed = new URL( url );
    const path = parsed.pathname.length > 1 ? parsed.pathname : '';
    const shortPath = path.length > 30 ? `${ path.slice( 0, 27 ) }...` : path;
    return `${ parsed.hostname }${ shortPath }`;
  } catch
  {
    return url.length > 40 ? `${ url.slice( 0, 37 ) }...` : url;
  }
}
