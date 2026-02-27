"use client";

import { Download, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import
    {
        DropdownMenu,
        DropdownMenuContent,
        DropdownMenuItem,
        DropdownMenuTrigger,
    } from "@/components/ui/dropdown-menu";

export function ReportExportBar ( props: {
    title: string;
    subtitle?: string;
    summaryLines?: string[];
    isExporting: boolean;
    onExportPng: () => void;
    onExportPdf: () => void;
} )
{
    const { title, subtitle, summaryLines, isExporting, onExportPng, onExportPdf } = props;

    return (
        <div
            className={ cn(
                "theme-card border border-white/10 rounded-2xl",
                "bg-white/5 backdrop-blur-xl",
                "p-4 sm:p-5",
                "flex flex-col gap-3"
            ) }
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-white font-bold text-base sm:text-lg truncate">{ title }</div>
                    { subtitle && (
                        <div className="text-muted-foreground text-xs sm:text-sm mt-0.5 truncate">{ subtitle }</div>
                    ) }
                </div>

                <div data-export-hide="true" className="shrink-0">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                disabled={ isExporting }
                                className={ cn(
                                    "inline-flex items-center gap-2",
                                    "px-3 py-2 rounded-xl",
                                    "border border-white/[0.10]",
                                    "bg-white/5 hover:bg-white/10",
                                    "text-white text-sm",
                                    "transition-colors",
                                    isExporting && "opacity-60 cursor-not-allowed"
                                ) }
                            >
                                { isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" /> }
                                <span className="hidden sm:inline">Snapshot</span>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[180px]">
                            <DropdownMenuItem onClick={ onExportPng }>
                                <ImageIcon className="w-4 h-4 mr-2" /> PNG
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={ onExportPdf }>
                                <FileText className="w-4 h-4 mr-2" /> PDF
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            { summaryLines && summaryLines.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    { summaryLines.slice( 0, 6 ).map( ( line, idx ) => (
                        <div key={ idx } className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                            <div className="text-xs text-gray-200/90 leading-relaxed">{ line }</div>
                        </div>
                    ) ) }
                </div>
            ) }
        </div>
    );
}
