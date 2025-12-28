import { useState, useCallback, useRef } from 'react';
import { useCanvasStore } from '@/store/canvasStore';

export const useCanvasParser = () => {
  const { openCanvas, updateContent, setIsStreaming } = useCanvasStore();
  const [chatContent, setChatContent] = useState(""); 
  
  // Parsing state
  const parsingState = useRef<'IDLE' | 'BUFFERING_METADATA' | 'STREAMING_CONTENT'>('IDLE');
  const buffer = useRef("");
  const canvasContent = useRef("");

  const processChunk = useCallback((chunk: string) => {
    let remaining = chunk;

    // Safety break to prevent infinite loops if logic fails
    let loops = 0;
    while (remaining.length > 0 && loops < 100) {
      loops++;
      
      if (parsingState.current === 'IDLE') {
        const startTagIndex = remaining.indexOf("<canvas_action>");
        
        if (startTagIndex !== -1) {
          // Found start tag
          // Append text before tag to chat
          const textBefore = remaining.substring(0, startTagIndex);
          setChatContent(prev => prev + textBefore);
          
          // Switch state
          parsingState.current = 'BUFFERING_METADATA';
          buffer.current = "";
          
          // Advance remaining past the tag
          remaining = remaining.substring(startTagIndex + "<canvas_action>".length);
        } else {
          // No tag, just chat text
          setChatContent(prev => prev + remaining);
          remaining = "";
        }
      } 
      else if (parsingState.current === 'BUFFERING_METADATA') {
        buffer.current += remaining;
        remaining = ""; // Consumed all for buffer check

        // Check if we have <content>
        const contentTagIndex = buffer.current.indexOf("<content>");
        if (contentTagIndex !== -1) {
          // We have metadata!
          const metadataSection = buffer.current.substring(0, contentTagIndex);
          
          const typeMatch = metadataSection.match(/<type>(.*?)<\/type>/);
          const langMatch = metadataSection.match(/<language>(.*?)<\/language>/);
          const titleMatch = metadataSection.match(/<title>(.*?)<\/title>/);
          
          const type = (typeMatch ? typeMatch[1] : 'CODE') as 'CODE' | 'TEXT';
          const language = langMatch ? langMatch[1] : 'markdown';
          const title = titleMatch ? titleMatch[1] : 'Untitled';
          
          // Open Canvas
          openCanvas({
            id: Date.now().toString(), // Simple ID generation
            title,
            type,
            language,
            initialContent: ""
          });
          setIsStreaming(true);
          canvasContent.current = "";
          
          // Switch state
          parsingState.current = 'STREAMING_CONTENT';
          
          // The rest of the buffer is content (after <content>)
          const contentStart = contentTagIndex + "<content>".length;
          const initialContent = buffer.current.substring(contentStart);
          
          // Process this initial content in the next iteration of the loop
          // by setting remaining to it.
          remaining = initialContent;
          buffer.current = ""; // Clear buffer
        }
      }
      else if (parsingState.current === 'STREAMING_CONTENT') {
        // Check for end of content
        const endContentIndex = remaining.indexOf("</content>");
        const endActionIndex = remaining.indexOf("</canvas_action>");
        
        let endIndex = -1;
        let endTagLength = 0;
        
        // We prioritize </content> but fallback to </canvas_action> if content tag is missing
        if (endContentIndex !== -1) {
          endIndex = endContentIndex;
          endTagLength = "</content>".length;
        } else if (endActionIndex !== -1) {
           endIndex = endActionIndex;
           endTagLength = "</canvas_action>".length;
        }
        
        if (endIndex !== -1) {
          // Found end
          const contentPart = remaining.substring(0, endIndex);
          canvasContent.current += contentPart;
          updateContent(canvasContent.current, false); // Update current version
          
          setIsStreaming(false);
          parsingState.current = 'IDLE';
          
          // Advance remaining past the end tag(s)
          // If we found </content>, we also want to skip </canvas_action> if it follows immediately
          let nextStart = endIndex + endTagLength;
          
          // Check if </canvas_action> follows immediately (ignoring whitespace)
          const rest = remaining.substring(nextStart);
          const actionEndIndex = rest.indexOf("</canvas_action>");
          
          if (actionEndIndex !== -1) {
             // If it's close (e.g. just newlines), skip it too
             // For simplicity, we just skip everything until after </canvas_action>
             // assuming no chat text is between </content> and </canvas_action>
             remaining = rest.substring(actionEndIndex + "</canvas_action>".length);
          } else {
             remaining = rest;
          }
        } else {
          // No end tag, all is content
          canvasContent.current += remaining;
          updateContent(canvasContent.current, false);
          remaining = "";
        }
      }
    }
  }, [openCanvas, updateContent, setIsStreaming]);

  return { processChunk, chatContent };
};
