import { useState, useCallback, useRef } from 'react';
import { useCanvasStore, type CanvasType } from '@/store/canvasStore';
import { useChatStore } from '@/store/chatStore';

/** Timeout for BUFFERING_METADATA state — prevents parser hang on malformed XML */
const BUFFER_TIMEOUT_MS = 10_000;

/** Regex to match opening tag with optional command and identifier attributes */
const CANVAS_TAG_REGEX = /<canvas_action(?:\s+command="(create|update|rewrite)")?(?:\s+identifier="([^"]*)")?(?:\s+command="(create|update|rewrite)")?>/;

export const useCanvasParser = () =>
{
  const { createArtifact, updateContent, setIsStreaming, updateExistingArtifact } = useCanvasStore();
  const [ chatContent, setChatContent ] = useState( "" );

  // Track the artifact created during this parsing session
  const currentArtifactId = useRef<string | null>( null );

  // Parsing state
  const parsingState = useRef<'IDLE' | 'BUFFERING_METADATA' | 'STREAMING_CONTENT'>( 'IDLE' );
  const buffer = useRef( "" );
  const canvasContent = useRef( "" );
  const bufferTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>( null );
  // B.1: Track command and identifier for update/rewrite protocol
  const currentCommand = useRef<'create' | 'update' | 'rewrite'>( 'create' );
  const currentIdentifier = useRef<string | null>( null );

  // Wave 4.2: Carry-buffer for partial XML tags split across chunks
  // If a chunk ends with a partial tag like "<canvas_act" or "</conten",
  // we hold it and prepend to the next chunk so tag matching works.
  const carryBuffer = useRef( "" );

  /**
   * Wave 4.2: Detect if `text` ends with a partial opening/closing XML tag.
   * Returns the partial suffix that should be carried to the next chunk,
   * or "" if the text ends cleanly.
   */
  function extractPartialTag ( text: string ): string
  {
    // Check the last N chars for a `<` that could start a tag but hasn't closed with `>`
    // Max tag length: </canvas_action> = 17 chars
    const tail = text.slice( -32 );
    const lastLt = tail.lastIndexOf( '<' );
    if ( lastLt === -1 ) return "";

    const possibleTag = tail.slice( lastLt );
    // If it contains `>` it's a complete tag — no carry needed
    if ( possibleTag.includes( '>' ) ) return "";

    // It's a partial tag — carry it
    return possibleTag;
  }

  const processChunk = useCallback( ( chunk: string ) =>
  {
    // Wave 4.2: Prepend any carried-over partial tag from previous chunk
    let remaining = carryBuffer.current + chunk;
    carryBuffer.current = "";

    // Wave 4.2: Check if current combined text ends with a partial tag
    // Only do this check in IDLE or STREAMING_CONTENT states where tag detection matters
    if ( parsingState.current === 'IDLE' || parsingState.current === 'STREAMING_CONTENT' )
    {
      const partial = extractPartialTag( remaining );
      if ( partial )
      {
        carryBuffer.current = partial;
        remaining = remaining.slice( 0, -partial.length );
        if ( !remaining ) return; // entire chunk was a partial tag — wait for more data
      }
    }

    // Safety break to prevent infinite loops if logic fails
    let loops = 0;
    while ( remaining.length > 0 && loops < 100 )
    {
      loops++;

      if ( parsingState.current === 'IDLE' )
      {
        // B.1: Match both <canvas_action> and <canvas_action command="..." identifier="...">
        const tagMatch = remaining.match( CANVAS_TAG_REGEX );
        const simpleTagIndex = remaining.indexOf( "<canvas_action>" );
        const attributeTagIndex = tagMatch ? remaining.indexOf( tagMatch[0] ) : -1;

        // Determine which tag was found first
        let startTagIndex = -1;
        let tagLength = 0;

        if ( tagMatch && attributeTagIndex !== -1 && ( simpleTagIndex === -1 || attributeTagIndex <= simpleTagIndex ) )
        {
          startTagIndex = attributeTagIndex;
          tagLength = tagMatch[0].length;
          // Extract command and identifier
          currentCommand.current = ( tagMatch[1] || tagMatch[3] || 'create' ) as 'create' | 'update' | 'rewrite';
          currentIdentifier.current = tagMatch[2] || null;
        }
        else if ( simpleTagIndex !== -1 )
        {
          startTagIndex = simpleTagIndex;
          tagLength = "<canvas_action>".length;
          currentCommand.current = 'create';
          currentIdentifier.current = null;
        }

        if ( startTagIndex !== -1 )
        {
          // Found start tag
          const textBefore = remaining.substring( 0, startTagIndex );
          setChatContent( prev => prev + textBefore );

          // Switch state
          parsingState.current = 'BUFFERING_METADATA';
          buffer.current = "";

          // Start timeout — flush to chat if metadata never completes
          if ( bufferTimeoutRef.current ) clearTimeout( bufferTimeoutRef.current );
          bufferTimeoutRef.current = setTimeout( () =>
          {
            if ( parsingState.current === 'BUFFERING_METADATA' )
            {
              setChatContent( prev => prev + buffer.current );
              buffer.current = "";
              parsingState.current = 'IDLE';
            }
          }, BUFFER_TIMEOUT_MS );

          remaining = remaining.substring( startTagIndex + tagLength );
        } else
        {
          // No tag, just chat text
          setChatContent( prev => prev + remaining );
          remaining = "";
        }
      }
      else if ( parsingState.current === 'BUFFERING_METADATA' )
      {
        buffer.current += remaining;
        remaining = "";

        // Check if we have <content>
        const contentTagIndex = buffer.current.indexOf( "<content>" );
        if ( contentTagIndex !== -1 )
        {
          const metadataSection = buffer.current.substring( 0, contentTagIndex );

          const typeMatch = metadataSection.match( /<type>(.*?)<\/type>/ );
          const langMatch = metadataSection.match( /<language>(.*?)<\/language>/ );
          const titleMatch = metadataSection.match( /<title>(.*?)<\/title>/ );

          const type = ( typeMatch ? typeMatch[ 1 ] : 'CODE' ) as CanvasType;
          const language = langMatch ? langMatch[ 1 ] : 'markdown';
          const title = titleMatch ? titleMatch[ 1 ] : 'Untitled';

          // Clear buffer timeout
          if ( bufferTimeoutRef.current ) { clearTimeout( bufferTimeoutRef.current ); bufferTimeoutRef.current = null; }

          const activeChatId = useChatStore.getState().activeChatId;

          // B.1: Route based on command — create vs update/rewrite
          if ( ( currentCommand.current === 'update' || currentCommand.current === 'rewrite' ) && currentIdentifier.current )
          {
            // Update existing artifact — open it + start streaming new version
            const artifactId = currentIdentifier.current;
            currentArtifactId.current = artifactId;

            // Open the artifact so it's visible, then we'll stream content into it
            const store = useCanvasStore.getState();
            const artifact = store.artifacts.find( a => a.id === artifactId );
            if ( artifact )
            {
              store.openArtifact( artifactId );
            }
            setIsStreaming( true );
            canvasContent.current = "";
          }
          else
          {
            // Create new artifact (original behavior)
            const artifactId = createArtifact( {
              title,
              type,
              language,
              content: "",
              chatId: activeChatId || 'unknown',
            } );
            currentArtifactId.current = artifactId;
            setIsStreaming( true );
            canvasContent.current = "";
          }

          // Switch state
          parsingState.current = 'STREAMING_CONTENT';

          const contentStart = contentTagIndex + "<content>".length;
          const initialContent = buffer.current.substring( contentStart );
          remaining = initialContent;
          buffer.current = "";
        }
      }
      else if ( parsingState.current === 'STREAMING_CONTENT' )
      {
        // Check for end of content
        const endContentIndex = remaining.indexOf( "</content>" );
        const endActionIndex = remaining.indexOf( "</canvas_action>" );

        let endIndex = -1;
        let endTagLength = 0;

        if ( endContentIndex !== -1 )
        {
          endIndex = endContentIndex;
          endTagLength = "</content>".length;
        } else if ( endActionIndex !== -1 )
        {
          endIndex = endActionIndex;
          endTagLength = "</canvas_action>".length;
        }

        if ( endIndex !== -1 )
        {
          // Found end
          const contentPart = remaining.substring( 0, endIndex );
          canvasContent.current += contentPart;
          updateContent( canvasContent.current, false );

          // B.1: Save final content — use update path for update/rewrite commands
          if ( currentArtifactId.current )
          {
            if ( currentCommand.current === 'update' || currentCommand.current === 'rewrite' )
            {
              // Add as new version to existing artifact
              useCanvasStore.getState().addVersion( {
                version: useCanvasStore.getState().versions.length + 1,
                content: canvasContent.current,
                timestamp: Date.now(),
              } );
            }
            else
            {
              // Save to newly created artifact
              useCanvasStore.getState().updateArtifact( currentArtifactId.current, canvasContent.current );
            }
          }

          setIsStreaming( false );
          parsingState.current = 'IDLE';

          // Advance past end tags
          let nextStart = endIndex + endTagLength;
          const rest = remaining.substring( nextStart );
          const actionEndIndex = rest.indexOf( "</canvas_action>" );

          if ( actionEndIndex !== -1 )
          {
            remaining = rest.substring( actionEndIndex + "</canvas_action>".length );
          } else
          {
            remaining = rest;
          }
        } else
        {
          // No end tag, all is content
          canvasContent.current += remaining;
          updateContent( canvasContent.current, false );
          remaining = "";
        }
      }
    }
  }, [ createArtifact, updateContent, setIsStreaming, updateExistingArtifact ] );

  const reset = useCallback( () =>
  {
    parsingState.current = 'IDLE';
    buffer.current = "";
    canvasContent.current = "";
    carryBuffer.current = "";
    currentArtifactId.current = null;
    currentCommand.current = 'create';
    currentIdentifier.current = null;
    if ( bufferTimeoutRef.current ) { clearTimeout( bufferTimeoutRef.current ); bufferTimeoutRef.current = null; }
    setChatContent( "" );
    setIsStreaming( false );
  }, [ setIsStreaming ] );

  return { processChunk, chatContent, reset, currentArtifactId };
};
