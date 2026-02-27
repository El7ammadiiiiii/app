"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FolderInput, Folder, Search, Check } from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { useSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";

interface MoveToProjectModalProps
{
    isOpen: boolean;
    onClose: () => void;
    chatId: string;
    currentProjectId: string;
}

export function MoveToProjectModal ( {
    isOpen,
    onClose,
    chatId,
    currentProjectId,
}: MoveToProjectModalProps )
{
    const [ searchQuery, setSearchQuery ] = useState( "" );
    const [ selectedProjectId, setSelectedProjectId ] = useState<string | null>( null );
    const { projects, moveChat } = useProjectStore();
    const { playSound } = useSound();

    const filteredProjects = projects.filter(
        ( p ) =>
            !p.isArchived &&
            p.id !== currentProjectId &&
            ( p.name.toLowerCase().includes( searchQuery.toLowerCase() ) ||
                p.emoji?.includes( searchQuery ) )
    );

    const handleMove = () =>
    {
        if ( !selectedProjectId || !chatId ) return;

        moveChat( chatId, selectedProjectId );
        playSound( "click" );
        onClose();
    };

    return (
        <AnimatePresence>
            { isOpen && (
                <motion.div
                    initial={ { opacity: 0 } }
                    animate={ { opacity: 1 } }
                    exit={ { opacity: 0 } }
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm"
                    onClick={ onClose }
                >
                    <motion.div
                        initial={ { opacity: 0, scale: 0.95, y: 20 } }
                        animate={ { opacity: 1, scale: 1, y: 0 } }
                        exit={ { opacity: 0, scale: 0.95, y: 20 } }
                        transition={ { type: "spring", damping: 25, stiffness: 300 } }
                        className="relative w-full max-w-md mx-4 bg-[#264a46]/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
                        onClick={ ( e ) => e.stopPropagation() }
                    >
                        {/* Header */ }
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
                                    <FolderInput className="w-5 h-5 text-teal-400" />
                                </div>
                                <h2 className="text-lg font-semibold text-white/90">نقل المحادثة</h2>
                            </div>
                            <button
                                onClick={ onClose }
                                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white/90 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search */ }
                        <div className="px-5 py-3">
                            <div className="relative">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                <input
                                    type="text"
                                    placeholder="البحث عن مشروع..."
                                    value={ searchQuery }
                                    onChange={ ( e ) => setSearchQuery( e.target.value ) }
                                    className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-white/5 border border-white/10 
                           text-white/90 placeholder:text-white/40 focus:outline-none focus:border-teal-500/50
                           transition-colors text-sm"
                                />
                            </div>
                        </div>

                        {/* Projects List */ }
                        <div className="px-5 pb-3 max-h-[280px] overflow-y-auto custom-scrollbar">
                            { filteredProjects.length === 0 ? (
                                <div className="text-center py-8 text-white/50">
                                    <Folder className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">لا توجد مشاريع متاحة</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    { filteredProjects.map( ( project ) => (
                                        <motion.button
                                            key={ project.id }
                                            onClick={ () => setSelectedProjectId( project.id ) }
                                            whileHover={ { scale: 1.01 } }
                                            whileTap={ { scale: 0.99 } }
                                            className={ cn(
                                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                                                selectedProjectId === project.id
                                                    ? "bg-teal-500/20 border border-teal-500/30"
                                                    : "bg-white/5 border border-transparent hover:bg-white/10 hover:border-white/10"
                                            ) }
                                        >
                                            <span className="text-lg">{ project.emoji || "📁" }</span>
                                            <div className="flex-1 text-right">
                                                <p className="text-sm font-medium text-white/90">{ project.name }</p>
                                                <p className="text-xs text-white/50">{ project.chatsCount } محادثة</p>
                                            </div>
                                            { selectedProjectId === project.id && (
                                                <div className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center">
                                                    <Check className="w-3 h-3 text-white" />
                                                </div>
                                            ) }
                                        </motion.button>
                                    ) ) }
                                </div>
                            ) }
                        </div>

                        {/* Footer */ }
                        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/10">
                            <button
                                onClick={ onClose }
                                className="px-4 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white/90 
                         hover:bg-white/10 transition-colors"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={ handleMove }
                                disabled={ !selectedProjectId }
                                className={ cn(
                                    "px-5 py-2 rounded-xl text-sm font-medium transition-all",
                                    selectedProjectId
                                        ? "bg-teal-500 text-white hover:bg-teal-600 shadow-lg shadow-teal-500/25"
                                        : "bg-white/10 text-white/40 cursor-not-allowed"
                                ) }
                            >
                                نقل المحادثة
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            ) }
        </AnimatePresence>
    );
}
