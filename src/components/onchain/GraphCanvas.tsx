'use client';

import { useMemo, useRef, useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape, { Core } from 'cytoscape';
import fcose from 'cytoscape-fcose';
import type { CytoscapeElement } from '@/lib/onchain/types';
import { Plus } from 'lucide-react';

cytoscape.use( fcose );

interface GraphCanvasProps
{
    elements: CytoscapeElement[];
    onNodeSelect?: ( data: Record<string, any> ) => void;
    onEdgeSelect?: ( data: Record<string, any> ) => void;
    onExpandNode?: ( data: Record<string, any> ) => void;
}

export function GraphCanvas ( { elements, onNodeSelect, onEdgeSelect, onExpandNode }: GraphCanvasProps )
{
    const cyRef = useRef<Core | null>( null );
    const [ contextMenu, setContextMenu ] = useState<{ x: number; y: number; node: any } | null>( null );

    const stylesheet = useMemo( () => ( [
        {
            selector: 'node',
            style: {
                'background-color': '#0ea5e9',
                'border-width': 3,
                'border-color': '#0ea5e9',
                'label': 'data(label)',
                'font-size': 13,
                'font-weight': 'bold',
                'color': '#ffffff',
                'text-outline-color': '#264a46',
                'text-outline-width': 3,
                'text-valign': 'bottom',
                'text-margin-y': 10,
                'text-wrap': 'wrap',
                'text-max-width': 120,
                'width': 50,
                'height': 50,
                'overlay-padding': 4
            }
        },
        {
            selector: 'node[isCenter]',
            style: {
                'background-color': '#f59e0b',
                'border-color': '#f59e0b',
                'border-width': 4,
                'width': 80,
                'height': 80,
                'font-size': 16,
                'z-index': 999
            }
        },
        {
            selector: 'node:active',
            style: {
                'overlay-opacity': 0.2,
                'overlay-color': '#38bdf8'
            }
        },
        {
            selector: 'edge',
            style: {
                'line-color': '#22d3ee',
                'width': 2,
                'target-arrow-color': '#22d3ee',
                'target-arrow-shape': 'triangle',
                'curve-style': 'unbundled-bezier',
                'control-point-distances': [ 40, -40 ],
                'control-point-weights': [ 0.25, 0.75 ],
                'label': 'data(valueLabel)',
                'font-size': 10,
                'color': '#fbbf24',
                'text-background-color': '#1d2b28',
                'text-background-opacity': 0.9,
                'text-background-padding': 3,
                'text-border-color': '#fbbf24',
                'text-border-width': 1,
                'text-border-opacity': 0.5,
                'text-margin-y': -10,
                'edge-text-rotation': 'autorotate'
            }
        },
        {
            selector: 'edge:active',
            style: {
                'line-color': '#38bdf8',
                'width': 3
            }
        },
        {
            selector: '.focused',
            style: {
                'background-color': '#38bdf8',
                'border-color': '#38bdf8',
                'border-width': 4
            }
        },
        {
            selector: '.focused-edge',
            style: {
                'line-color': '#fbbf24',
                'target-arrow-color': '#fbbf24',
                'width': 4
            }
        }
    ] ), [] );

    const layout = useMemo( () => ( {
        name: 'concentric',
        animate: true,
        animationDuration: 1000,
        fit: true,
        padding: 100,
        startAngle: 3.14159 / 2,
        sweep: undefined,
        clockwise: true,
        equidistant: false,
        minNodeSpacing: 80,
        boundingBox: undefined,
        avoidOverlap: true,
        nodeDimensionsIncludeLabels: true,
        height: undefined,
        width: undefined,
        spacingFactor: 1.5,
        concentric: function ( node: any )
        {
            // العنوان المركزي في المنتصف
            if ( node.data( 'isCenter' ) )
            {
                return 10;
            }
            // باقي العناوين في الدائرة الخارجية
            return 1;
        },
        levelWidth: function ()
        {
            return 1;
        }
    } ), [] );

    return (
        <div className="relative h-full w-full rounded-2xl border border-white/10 bg-gradient-to-br from-[#0b1414]/80 via-[#264a46]/70 to-[#0b1414]/80">
            { elements.length === 0 ? (
                <div className="flex h-full w-full items-center justify-center">
                    <div className="text-center space-y-2">
                        <p className="text-white/40 text-sm">لا توجد بيانات للعرض</p>
                        <p className="text-white/30 text-xs">ابدأ ببناء الرسم البياني من الأعلى</p>
                    </div>
                </div>
            ) : (
                <>
                    <CytoscapeComponent
                        elements={ elements }
                        layout={ layout }
                        stylesheet={ stylesheet }
                        style={ { width: '100%', height: '100%' } }
                        cy={ ( cy ) =>
                        {
                            if ( cyRef.current ) return;
                            cyRef.current = cy;

                            cy.on( 'tap', 'node', ( event ) =>
                            {
                                const data = event.target.data();
                                onNodeSelect?.( data );
                            } );

                            cy.on( 'cxttap', 'node', ( event ) =>
                            {
                                const renderedPosition = event.renderedPosition || event.position;
                                setContextMenu( {
                                    x: renderedPosition.x,
                                    y: renderedPosition.y,
                                    node: event.target.data()
                                } );
                            } );

                            cy.on( 'tap', 'edge', ( event ) =>
                            {
                                const data = event.target.data();
                                onEdgeSelect?.( data );
                            } );

                            cy.on( 'tap', ( event ) =>
                            {
                                if ( event.target === cy )
                                {
                                    setContextMenu( null );
                                }
                            } );
                        } }
                    />

                    { contextMenu && (
                        <div
                            className="absolute bg-[#264a46]/95 border border-cyan-500/30 rounded-lg shadow-xl backdrop-blur-sm"
                            style={ { left: contextMenu.x, top: contextMenu.y } }
                        >
                            <button
                                onClick={ () =>
                                {
                                    onExpandNode?.( contextMenu.node );
                                    setContextMenu( null );
                                } }
                                className="flex items-center gap-2 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-500/20 transition rounded-lg"
                            >
                                <Plus className="h-4 w-4" />
                                <span>تتبع الأموال من هنا</span>
                            </button>
                        </div>
                    ) }
                </>
            ) }
        </div>
    );
}