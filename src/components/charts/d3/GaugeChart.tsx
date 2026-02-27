"use client";

import { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import { GLASSNODE_COLORS } from "@/lib/chart-utils";

interface GaugeChartProps
{
    value: number;
    min?: number;
    max?: number;
    label?: string;
    unit?: string;
    height?: number;
    color?: string;
    thresholds?: { value: number; color: string }[];
    className?: string;
}

export default function GaugeChart ( {
    value,
    min = 0,
    max = 100,
    label = "",
    unit = "",
    height = 180,
    color = GLASSNODE_COLORS.secondary,
    thresholds,
    className = "",
}: GaugeChartProps )
{
    const svgRef = useRef<SVGSVGElement>( null );
    const containerRef = useRef<HTMLDivElement>( null );

    const render = useCallback( () =>
    {
        if ( !svgRef.current || !containerRef.current ) return;

        const svg = d3.select( svgRef.current );
        svg.selectAll( "*" ).remove();

        const cw = containerRef.current.clientWidth;
        const ch = containerRef.current.clientHeight || height;
        const w = Math.min( cw, ch * 1.8 );
        const h = ch;
        const radius = Math.min( w / 2 - 10, h - 30 );
        const thick = Math.max( 12, radius * 0.18 );

        svg.attr( "width", cw ).attr( "height", h );

        const g = svg.append( "g" ).attr( "transform", `translate(${ cw / 2 },${ h - 16 })` );

        const angle = d3.scaleLinear().domain( [ min, max ] ).range( [ -Math.PI / 2, Math.PI / 2 ] ).clamp( true );

        // Fill color based on thresholds
        let fillColor = color;
        if ( thresholds )
        {
            for ( const t of thresholds )
            {
                if ( value >= t.value ) fillColor = t.color;
            }
        }

        // Background arc
        const bgArc = d3.arc()
            .innerRadius( radius - thick )
            .outerRadius( radius )
            .startAngle( -Math.PI / 2 )
            .endAngle( Math.PI / 2 )
            .cornerRadius( thick / 2 );

        g.append( "path" ).attr( "d", bgArc as any ).attr( "fill", "rgba(255,255,255,0.06)" );

        // Value arc
        const valArc = d3.arc()
            .innerRadius( radius - thick )
            .outerRadius( radius )
            .startAngle( -Math.PI / 2 )
            .endAngle( angle( Math.min( Math.max( value, min ), max ) ) )
            .cornerRadius( thick / 2 );

        // Gradient
        const gradId = `gauge-grad-${ Math.random().toString( 36 ).slice( 2 ) }`;
        const grad = svg.append( "defs" ).append( "linearGradient" ).attr( "id", gradId )
            .attr( "x1", "0%" ).attr( "y1", "0%" ).attr( "x2", "100%" ).attr( "y2", "0%" );
        grad.append( "stop" ).attr( "offset", "0%" ).attr( "stop-color", fillColor ).attr( "stop-opacity", 0.7 );
        grad.append( "stop" ).attr( "offset", "100%" ).attr( "stop-color", fillColor ).attr( "stop-opacity", 1 );

        g.append( "path" ).attr( "d", valArc as any ).attr( "fill", `url(#${ gradId })` )
            .attr( "opacity", 0 ).transition().duration( 700 ).ease( d3.easeCubicOut ).attr( "opacity", 1 );

        // Needle
        const needleAngle = angle( Math.min( Math.max( value, min ), max ) );
        const needleLen = radius - thick - 8;
        g.append( "line" )
            .attr( "x1", 0 ).attr( "y1", 0 )
            .attr( "x2", Math.cos( needleAngle - Math.PI / 2 ) * needleLen )
            .attr( "y2", Math.sin( needleAngle - Math.PI / 2 ) * needleLen )
            .attr( "stroke", "#fff" ).attr( "stroke-width", 2 ).attr( "stroke-linecap", "round" );
        g.append( "circle" ).attr( "cx", 0 ).attr( "cy", 0 ).attr( "r", 4 ).attr( "fill", "#fff" );

        // Value text
        g.append( "text" ).attr( "text-anchor", "middle" ).attr( "y", -radius * 0.3 )
            .attr( "fill", "#fff" ).style( "font-size", `${ Math.max( 16, radius * 0.25 ) }px` )
            .style( "font-weight", "700" ).style( "font-family", "Inter, system-ui, sans-serif" )
            .text( `${ d3.format( "," )( Math.round( value ) ) }${ unit }` );

        // Label
        if ( label )
        {
            g.append( "text" ).attr( "text-anchor", "middle" ).attr( "y", -radius * 0.12 )
                .attr( "fill", "rgba(255,255,255,0.45)" ).style( "font-size", "10px" )
                .style( "font-family", "Inter, system-ui, sans-serif" ).text( label );
        }

        // Min/Max labels
        g.append( "text" ).attr( "x", -radius + 4 ).attr( "y", 14 ).attr( "text-anchor", "start" )
            .attr( "fill", "rgba(255,255,255,0.3)" ).style( "font-size", "9px" )
            .style( "font-family", "Inter, system-ui, sans-serif" ).text( String( min ) );
        g.append( "text" ).attr( "x", radius - 4 ).attr( "y", 14 ).attr( "text-anchor", "end" )
            .attr( "fill", "rgba(255,255,255,0.3)" ).style( "font-size", "9px" )
            .style( "font-family", "Inter, system-ui, sans-serif" ).text( String( max ) );

    }, [ value, min, max, label, unit, height, color, thresholds ] );

    useEffect( () =>
    {
        render();
        const obs = new ResizeObserver( () => render() );
        if ( containerRef.current ) obs.observe( containerRef.current );
        return () => obs.disconnect();
    }, [ render ] );

    return (
        <div ref={ containerRef } className={ `relative w-full h-full ${ className }` }>
            <svg ref={ svgRef } className="w-full h-full" />
        </div>
    );
}
