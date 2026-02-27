"use client";

import { useCallback, useRef, useState } from "react";
import { toPng } from "html-to-image";

export type ReportExportMode = "none" | "png" | "pdf";

const getSafePixelRatio = () =>
{
    if ( typeof window === "undefined" ) return 2;
    const dpr = window.devicePixelRatio || 1;
    return Math.min( 2, dpr );
};

const formatFilename = ( base: string, suffix: string ) =>
{
    const safe = base
        .trim()
        .toLowerCase()
        .replaceAll( /[^a-z0-9\-\s_]/g, "" )
        .replaceAll( /\s+/g, "-" )
        .slice( 0, 60 ) || "report";
    return `${ safe }-${ suffix }`;
};

export function useReportExport ( opts: { title: string } )
{
    const exportRef = useRef<HTMLDivElement>( null );
    const [ exportMode, setExportMode ] = useState<ReportExportMode>( "none" );
    const [ isExporting, setIsExporting ] = useState( false );

    const capture = useCallback( async ( mode: ReportExportMode ) =>
    {
        const node = exportRef.current;
        if ( !node ) return null;

        const exportWidth = node.scrollWidth;
        const exportHeight = node.scrollHeight;

        return await toPng( node, {
            cacheBust: true,
            backgroundColor: mode === "pdf" ? "#ffffff" : undefined,
            pixelRatio: getSafePixelRatio(),
            width: exportWidth,
            height: exportHeight,
            style: {
                width: `${ exportWidth }px`,
                height: `${ exportHeight }px`,
            },
            filter: ( target ) =>
            {
                if ( !( target instanceof HTMLElement ) ) return true;
                return target.dataset.exportHide !== "true";
            },
        } );
    }, [] );

    const exportPng = useCallback( async () =>
    {
        if ( isExporting ) return;
        setIsExporting( true );
        setExportMode( "png" );

        try
        {
            await new Promise( requestAnimationFrame );
            const dataUrl = await capture( "png" );
            if ( !dataUrl ) return;
            const link = document.createElement( "a" );
            link.download = `${ formatFilename( opts.title, "image" ) }.png`;
            link.href = dataUrl;
            link.click();
        } finally
        {
            setExportMode( "none" );
            setIsExporting( false );
        }
    }, [ capture, isExporting, opts.title ] );

    const exportPdf = useCallback( async () =>
    {
        if ( isExporting ) return;
        setIsExporting( true );
        setExportMode( "pdf" );

        try
        {
            await new Promise( requestAnimationFrame );
            const dataUrl = await capture( "pdf" );
            if ( !dataUrl ) return;

            const { jsPDF } = await import( "jspdf" );
            const pdf = new jsPDF( { orientation: "portrait", unit: "pt", format: "a4" } );
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            const img = new Image();
            img.src = dataUrl;
            await new Promise<void>( ( resolve ) =>
            {
                img.onload = () => resolve();
            } );

            const imgWidth = pageWidth;
            const imgHeight = ( img.height * pageWidth ) / img.width;
            let remainingHeight = imgHeight;
            let position = 0;

            while ( remainingHeight > 0 )
            {
                pdf.addImage( dataUrl, "PNG", 0, position, imgWidth, imgHeight );
                remainingHeight -= pageHeight;
                position -= pageHeight;
                if ( remainingHeight > 0 ) pdf.addPage();
            }

            pdf.save( `${ formatFilename( opts.title, "export" ) }.pdf` );
        } finally
        {
            setExportMode( "none" );
            setIsExporting( false );
        }
    }, [ capture, isExporting, opts.title ] );

    return {
        exportRef,
        exportMode,
        isExporting,
        exportPng,
        exportPdf,
    };
}
