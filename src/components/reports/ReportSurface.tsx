"use client";

import { cn } from "@/lib/utils";
import type { ReportExportMode } from "./useReportExport";

export function ReportSurface ( props: {
    exportMode: ReportExportMode;
    children: React.ReactNode;
    className?: string;
} )
{
    const { exportMode, children, className } = props;
    return (
        <div
            data-export-mode={ exportMode }
            className={ cn(
                "text-white",
                exportMode === "pdf" && "export-mode-pdf",
                className
            ) }
        >
            { children }
        </div>
    );
}
