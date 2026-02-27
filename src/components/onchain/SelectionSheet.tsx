'use client';

import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectionSheetProps
{
    open: boolean;
    title: string;
    subtitle?: string;
    onClose: () => void;
    children: ReactNode;
    variant?: 'compact' | 'expanded';
}

export function SelectionSheet ( {
    open,
    title,
    subtitle,
    onClose,
    children,
    variant = 'expanded'
}: SelectionSheetProps )
{
    if ( !open ) return null;

    return (
        <>
            <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={ onClose } />
            <div
                className={ cn(
                    "fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border border-white/10 glass-lite glass-lite--strong p-4 shadow-2xl",
                    variant === 'compact' ? 'max-h-[40vh]' : 'max-h-[60vh]'
                ) }
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                        <h3 className="text-base font-semibold text-white">{ title }</h3>
                        { subtitle && <p className="text-xs text-white/60">{ subtitle }</p> }
                    </div>
                    <button
                        onClick={ onClose }
                        className="rounded-full border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="mt-4 max-h-[45vh] overflow-y-auto pr-1 custom-scrollbar">
                    { children }
                </div>
            </div>
        </>
    );
}
