"use client";

import { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import { GLASSNODE_COLORS } from "@/lib/chart-utils";

interface DataPoint
{
    label: string;
    value: number;
    [ key: string ]: any;
}

interface BarChartProps
{
    data: DataPoint[];
    height?: number;
    color?: string;
    yAxisLabel?: string;
    showGrid?: boolean;
    orientation?: "vertical" | "horizontal";
    formatY?: ( v: number ) => string;
    className?: string;
}

export default function BarChart ( {
    data,
    height = 360,
    color = "#ff8c42",
    yAxisLabel = "",
    showGrid = true,
    orientation = "vertical",
    formatY,
    className = "",
}: BarChartProps )
{
    const svgRef = useRef<SVGSVGElement>( null );
    const containerRef = useRef<HTMLDivElement>( null );
    const tooltipRef = useRef<HTMLDivElement | null>( null );

    const render = useCallback( () =>
    {
        if ( !data || data.length === 0 || !svgRef.current || !containerRef.current ) return;

        const svg = d3.select( svgRef.current );
        svg.selectAll( "*" ).remove();

        const cw = containerRef.current.clientWidth;
        const ch = containerRef.current.clientHeight || height;
        const m = { top: 16, right: 16, bottom: 52, left: 52 };
        const w = cw - m.left - m.right;
        const h = ch - m.top - m.bottom;

        svg.attr( "width", cw ).attr( "height", ch );
        const g = svg.append( "g" ).attr( "transform", `translate(${ m.left },${ m.top })` );
        const fmtY = formatY || d3.format( "~s" );

        if ( orientation === "vertical" )
        {
            const x = d3.scaleBand().domain( data.map( ( d ) => d.label ) ).range( [ 0, w ] ).padding( 0.25 );
            const y = d3.scaleLinear().domain( [ 0, d3.max( data, ( d ) => d.value ) || 0 ] ).nice().range( [ h, 0 ] );

            if ( showGrid )
            {
                g.append( "g" ).selectAll( "line" ).data( y.ticks( 5 ) ).join( "line" )
                    .attr( "x1", 0 ).attr( "x2", w ).attr( "y1", ( d ) => y( d ) ).attr( "y2", ( d ) => y( d ) )
                    .attr( "stroke", GLASSNODE_COLORS.gridLine ).attr( "stroke-width", 1 ).attr( "stroke-dasharray", "2,3" );
            }

            // Bars with animation
            g.selectAll( ".bar" ).data( data ).join( "rect" ).attr( "class", "bar" )
                .attr( "x", ( d ) => x( d.label ) || 0 ).attr( "width", x.bandwidth() )
                .attr( "fill", color ).attr( "rx", 3 )
                .attr( "y", h ).attr( "height", 0 )
                .transition().duration( 600 ).delay( ( _, i ) => i * 30 ).ease( d3.easeCubicOut )
                .attr( "y", ( d ) => y( d.value ) ).attr( "height", ( d ) => h - y( d.value ) );

            // X Axis
            g.append( "g" ).attr( "transform", `translate(0,${ h })` )
                .call( d3.axisBottom( x ).tickSize( 0 ).tickPadding( 8 ) )
                .call( ( g ) => g.select( ".domain" ).attr( "stroke", GLASSNODE_COLORS.domainStroke ) )
                .selectAll( "text" ).attr( "fill", GLASSNODE_COLORS.axisText ).style( "font-size", "10px" ).style( "font-family", "Inter, system-ui, sans-serif" )
                .attr( "transform", data.length > 8 ? "rotate(-40)" : "rotate(0)" ).style( "text-anchor", data.length > 8 ? "end" : "middle" );

            // Y Axis
            g.append( "g" )
                .call( d3.axisLeft( y ).ticks( 5 ).tickSize( 0 ).tickPadding( 6 ).tickFormat( ( d ) => fmtY( d as number ) ) )
                .call( ( g ) => g.select( ".domain" ).remove() )
                .selectAll( "text" ).attr( "fill", GLASSNODE_COLORS.axisText ).style( "font-size", "10px" ).style( "font-family", "Inter, system-ui, sans-serif" );

            if ( yAxisLabel )
            {
                g.append( "text" ).attr( "transform", "rotate(-90)" )
                    .attr( "y", -m.left + 12 ).attr( "x", -h / 2 ).attr( "text-anchor", "middle" )
                    .attr( "fill", GLASSNODE_COLORS.grayMedium ).style( "font-size", "10px" ).style( "font-family", "Inter, system-ui, sans-serif" )
                    .text( yAxisLabel );
            }
        } else
        {
            const x = d3.scaleLinear().domain( [ 0, d3.max( data, ( d ) => d.value ) || 0 ] ).nice().range( [ 0, w ] );
            const y = d3.scaleBand().domain( data.map( ( d ) => d.label ) ).range( [ 0, h ] ).padding( 0.25 );

            if ( showGrid )
            {
                g.append( "g" ).selectAll( "line" ).data( x.ticks( 5 ) ).join( "line" )
                    .attr( "x1", ( d ) => x( d ) ).attr( "x2", ( d ) => x( d ) ).attr( "y1", 0 ).attr( "y2", h )
                    .attr( "stroke", GLASSNODE_COLORS.gridLine ).attr( "stroke-width", 1 ).attr( "stroke-dasharray", "2,3" );
            }

            g.selectAll( ".bar" ).data( data ).join( "rect" ).attr( "class", "bar" )
                .attr( "y", ( d ) => y( d.label ) || 0 ).attr( "height", y.bandwidth() )
                .attr( "fill", color ).attr( "rx", 3 )
                .attr( "x", 0 ).attr( "width", 0 )
                .transition().duration( 600 ).delay( ( _, i ) => i * 30 ).ease( d3.easeCubicOut )
                .attr( "width", ( d ) => x( d.value ) );

            g.append( "g" ).attr( "transform", `translate(0,${ h })` )
                .call( d3.axisBottom( x ).ticks( 5 ).tickSize( 0 ).tickPadding( 6 ).tickFormat( ( d ) => fmtY( d as number ) ) )
                .call( ( g ) => g.select( ".domain" ).attr( "stroke", GLASSNODE_COLORS.domainStroke ) )
                .selectAll( "text" ).attr( "fill", GLASSNODE_COLORS.axisText ).style( "font-size", "10px" ).style( "font-family", "Inter, system-ui, sans-serif" );

            g.append( "g" )
                .call( d3.axisLeft( y ).tickSize( 0 ).tickPadding( 6 ) )
                .call( ( g ) => g.select( ".domain" ).remove() )
                .selectAll( "text" ).attr( "fill", GLASSNODE_COLORS.axisText ).style( "font-size", "10px" ).style( "font-family", "Inter, system-ui, sans-serif" );
        }

        // Tooltip
        if ( !tooltipRef.current && containerRef.current )
        {
            tooltipRef.current = document.createElement( "div" );
            Object.assign( tooltipRef.current.style, {
                position: "absolute", visibility: "hidden", pointerEvents: "none", zIndex: "50",
                background: "rgba(0,0,0,0.92)", color: "#fff", padding: "6px 10px",
                borderRadius: "8px", fontSize: "11px", fontFamily: "Inter, system-ui, sans-serif",
                boxShadow: "0 4px 12px rgba(0,0,0,0.4)", lineHeight: "1.5", border: "1px solid rgba(255,255,255,0.08)",
            } );
            containerRef.current.appendChild( tooltipRef.current );
        }
        const tooltip = tooltipRef.current!;

        g.selectAll( ".bar" )
            .on( "mouseover", function ( event, d: any )
            {
                d3.select( this ).transition().duration( 120 ).attr( "opacity", 0.75 );
                tooltip.innerHTML = `<div style="font-weight:600;margin-bottom:2px">${ d.label }</div><div style="color:${ color }">${ fmtY( d.value ) }</div>`;
                tooltip.style.visibility = "visible";
            } )
            .on( "mousemove", ( event ) =>
            {
                const rect = containerRef.current!.getBoundingClientRect();
                const tx = Math.min( Math.max( event.clientX - rect.left + 12, 0 ), cw - 140 );
                const ty = Math.min( Math.max( event.clientY - rect.top - 10, 0 ), ch - 50 );
                tooltip.style.left = `${ tx }px`;
                tooltip.style.top = `${ ty }px`;
            } )
            .on( "mouseout", function ()
            {
                d3.select( this ).transition().duration( 120 ).attr( "opacity", 1 );
                tooltip.style.visibility = "hidden";
            } )
            .on( "touchstart", function ( event, d: any )
            {
                event.preventDefault();
                d3.select( this ).attr( "opacity", 0.75 );
                tooltip.innerHTML = `<div style="font-weight:600;margin-bottom:2px">${ d.label }</div><div style="color:${ color }">${ fmtY( d.value ) }</div>`;
                tooltip.style.visibility = "visible";
            } )
            .on( "touchend", function ()
            {
                d3.select( this ).attr( "opacity", 1 );
                tooltip.style.visibility = "hidden";
            } );

    }, [ data, height, color, yAxisLabel, showGrid, orientation, formatY ] );

    useEffect( () =>
    {
        render();
        const obs = new ResizeObserver( () => render() );
        if ( containerRef.current ) obs.observe( containerRef.current );
        return () => { obs.disconnect(); tooltipRef.current?.remove(); tooltipRef.current = null; };
    }, [ render ] );

    return (
        <div ref={ containerRef } className={ `relative w-full h-full ${ className }` }>
            <svg ref={ svgRef } className="w-full h-full" />
        </div>
    );
}
