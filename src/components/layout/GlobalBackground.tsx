"use client";

import React from "react";
import { InfinityWireframes } from "@/components/ui/InfinityWireframes";

export function GlobalBackground ()
{
    return (
        <>
            <div className="fixed inset-0 -z-20 theme-bg" />
            <InfinityWireframes opacity={ 0.07 } />
        </>
    );
}
