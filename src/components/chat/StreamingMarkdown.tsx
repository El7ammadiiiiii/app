"use client";

import React, { useMemo, useRef, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";

/**
 * ── Wave 2.2 + 4.4: StreamingMarkdown ──
 * 
 * Incremental markdown parsing for streaming messages.
 * 
 * During streaming, splits content into two zones:
 * - **Frozen zone**: all complete paragraphs (before last \n\n).
 *   Cached as a React element tree — NOT re-parsed on each token.
 * - **Active zone**: the last paragraph being streamed.
 *   Only this part gets re-parsed via ReactMarkdown per token.
 * 
 * For completed messages: renders the full content normally (no split).
 * 
 * This is the "Perplexity MarkdownStreamer" pattern:
 * pop last AST child → re-parse delta → merge.
 * We approximate it at the markdown source level for simplicity.
 */

interface StreamingMarkdownProps
{
  content: string;
  isStreaming?: boolean;
}

/** Shared remark/rehype plugin arrays */
const REMARK_PLUGINS = [ remarkGfm, remarkMath ] as any[];
const REHYPE_PLUGINS_STATIC = [ rehypeHighlight, rehypeKatex ] as any[];

/**
 * Custom rehype plugin that wraps text nodes in <span class="word-fade">
 * during streaming. Only applied to the active zone.
 */
function rehypeWordFade ()
{
  return ( tree: any ) =>
  {
    visit( tree );
  };

  function visit ( node: any )
  {
    if ( !node.children ) return;

    const newChildren: any[] = [];

    for ( const child of node.children )
    {
      if ( child.type === "text" && child.value )
      {
        const parts = child.value.split( /(\s+)/ );
        for ( const part of parts )
        {
          if ( !part ) continue;
          if ( /^\s+$/.test( part ) )
          {
            newChildren.push( { type: "text", value: part } );
          } else
          {
            newChildren.push( {
              type: "element",
              tagName: "span",
              properties: { className: [ "word-fade" ] },
              children: [ { type: "text", value: part } ],
            } );
          }
        }
      } else
      {
        visit( child );
        newChildren.push( child );
      }
    }

    node.children = newChildren;
  }
}

const REHYPE_PLUGINS_STREAMING = [ rehypeHighlight, rehypeKatex, rehypeWordFade ] as any[];

/**
 * Split content into frozen prefix + active tail at the last double newline.
 * The frozen prefix contains all complete markdown blocks.
 * The active tail is the last block being actively written.
 */
function splitAtLastBlock ( content: string ): [ string, string ]
{
  // Find last \n\n boundary (end of a complete block)
  const lastDoubleNewline = content.lastIndexOf( "\n\n" );
  if ( lastDoubleNewline === -1 )
  {
    // No complete block yet — everything is active
    return [ "", content ];
  }
  const frozen = content.slice( 0, lastDoubleNewline + 2 ); // include the \n\n
  const active = content.slice( lastDoubleNewline + 2 );
  return [ frozen, active ];
}

/** Frozen zone — memoized rendering of completed blocks */
const FrozenMarkdown = memo( function FrozenMarkdown ( { content }: { content: string } )
{
  if ( !content ) return null;
  return (
    <ReactMarkdown
      remarkPlugins={ REMARK_PLUGINS }
      rehypePlugins={ REHYPE_PLUGINS_STATIC }
    >
      { content }
    </ReactMarkdown>
  );
} );

export function StreamingMarkdown ( { content, isStreaming = false }: StreamingMarkdownProps )
{
  // ── Static render (completed messages) ──
  if ( !isStreaming )
  {
    return (
      <ReactMarkdown
        remarkPlugins={ REMARK_PLUGINS }
        rehypePlugins={ REHYPE_PLUGINS_STATIC }
      >
        { content }
      </ReactMarkdown>
    );
  }

  // ── Wave 4.4: Incremental streaming render ──
  // Split into frozen (cached) + active (re-parsed per token)
  const [ frozenContent, activeContent ] = splitAtLastBlock( content );

  return (
    <>
      { frozenContent && <FrozenMarkdown content={ frozenContent } /> }
      { activeContent && (
        <ReactMarkdown
          remarkPlugins={ REMARK_PLUGINS }
          rehypePlugins={ REHYPE_PLUGINS_STREAMING }
        >
          { activeContent }
        </ReactMarkdown>
      ) }
    </>
  );
}

export default StreamingMarkdown;
