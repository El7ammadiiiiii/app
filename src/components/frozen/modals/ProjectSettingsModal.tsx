"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import
    {
        X,
        Settings,
        Trash2,
        FileText,
        Brain,
        Palette,
        Save,
        AlertTriangle,
    } from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { useSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";
import { PROJECT_COLORS } from "@/types/project";
import { ConfirmModal } from "@/components/settings";

interface ProjectSettingsModalProps
{
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
}

const EMOJI_OPTIONS = [
    "📁", "💼", "🎯", "🚀", "💡", "📊", "🔬", "🎨",
    "📚", "🌟", "💬", "🔧", "📈", "🎓", "🏆", "🔥"
];

export function ProjectSettingsModal ( {
    isOpen,
    onClose,
    projectId,
}: ProjectSettingsModalProps )
{
    const { projects, updateProject, deleteProject } = useProjectStore();
    const project = projects.find( ( p ) => p.id === projectId );
    const { playSound } = useSound();

    const [ name, setName ] = useState( project?.name || "" );
    const [ emoji, setEmoji ] = useState( project?.emoji || "📁" );
    const [ color, setColor ] = useState( project?.color || "turquoise" );
    const [ instructions, setInstructions ] = useState( project?.instructions || "" );
    const [ description, setDescription ] = useState( project?.description || "" );
    const [ showDeleteConfirm, setShowDeleteConfirm ] = useState( false );
    const [ activeTab, setActiveTab ] = useState<"general" | "instructions" | "memory">( "general" );

    const handleSave = () =>
    {
        if ( !projectId || !name.trim() ) return;

        updateProject( projectId, {
            name: name.trim(),
            emoji,
            color,
            instructions,
            description,
        } );

        playSound( "click" );
        onClose();
    };

    const handleDelete = () =>
    {
        deleteProject( projectId );
        playSound( "click" );
        setShowDeleteConfirm( false );
        onClose();
    };

    if ( !project ) return null;

    return (
        <>
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
                            className="relative w-full max-w-lg mx-4 bg-[#264a46]/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
                            onClick={ ( e ) => e.stopPropagation() }
                        >
                            {/* Header */ }
                            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
                                        <Settings className="w-5 h-5 text-teal-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-white/90">إعدادات المشروع</h2>
                                        <p className="text-xs text-white/50">{ project.name }</p>
                                    </div>
                                </div>
                                <button
                                    onClick={ onClose }
                                    className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white/90 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Tabs */ }
                            <div className="flex items-center gap-1 px-5 pt-4 pb-2">
                                { [
                                    { id: "general", label: "عام", icon: Palette },
                                    { id: "instructions", label: "التعليمات", icon: FileText },
                                    { id: "memory", label: "الذاكرة", icon: Brain },
                                ].map( ( tab ) => (
                                    <button
                                        key={ tab.id }
                                        onClick={ () => setActiveTab( tab.id as any ) }
                                        className={ cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                            activeTab === tab.id
                                                ? "bg-teal-500/20 text-teal-400"
                                                : "text-white/60 hover:text-white/90 hover:bg-white/5"
                                        ) }
                                    >
                                        <tab.icon className="w-4 h-4" />
                                        { tab.label }
                                    </button>
                                ) ) }
                            </div>

                            {/* Content */ }
                            <div className="px-5 py-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                                { activeTab === "general" && (
                                    <div className="space-y-4">
                                        {/* Project Name */ }
                                        <div>
                                            <label className="block text-sm font-medium text-white/70 mb-2">
                                                اسم المشروع
                                            </label>
                                            <input
                                                type="text"
                                                value={ name }
                                                onChange={ ( e ) => setName( e.target.value ) }
                                                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 
                                 text-white/90 placeholder:text-white/40 focus:outline-none focus:border-teal-500/50
                                 transition-colors text-sm"
                                                placeholder="أدخل اسم المشروع"
                                            />
                                        </div>

                                        {/* Description */ }
                                        <div>
                                            <label className="block text-sm font-medium text-white/70 mb-2">
                                                الوصف
                                            </label>
                                            <textarea
                                                value={ description }
                                                onChange={ ( e ) => setDescription( e.target.value ) }
                                                rows={ 2 }
                                                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 
                                 text-white/90 placeholder:text-white/40 focus:outline-none focus:border-teal-500/50
                                 transition-colors text-sm resize-none"
                                                placeholder="وصف مختصر للمشروع"
                                            />
                                        </div>

                                        {/* Emoji Selector */ }
                                        <div>
                                            <label className="block text-sm font-medium text-white/70 mb-2">
                                                الأيقونة
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                { EMOJI_OPTIONS.map( ( e ) => (
                                                    <button
                                                        key={ e }
                                                        onClick={ () => setEmoji( e ) }
                                                        className={ cn(
                                                            "w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all",
                                                            emoji === e
                                                                ? "bg-teal-500/30 border-2 border-teal-500"
                                                                : "bg-white/5 border border-white/10 hover:bg-white/10"
                                                        ) }
                                                    >
                                                        { e }
                                                    </button>
                                                ) ) }
                                            </div>
                                        </div>

                                        {/* Color Selector */ }
                                        <div>
                                            <label className="block text-sm font-medium text-white/70 mb-2">
                                                اللون
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                { Object.entries( PROJECT_COLORS ).map( ( [ key, value ] ) => (
                                                    <button
                                                        key={ key }
                                                        onClick={ () => setColor( key ) }
                                                        className={ cn(
                                                            "w-8 h-8 rounded-lg transition-all",
                                                            color === key && "ring-2 ring-white ring-offset-2 ring-offset-[#264a46]"
                                                        ) }
                                                        style={ { backgroundColor: value } }
                                                    />
                                                ) ) }
                                            </div>
                                        </div>
                                    </div>
                                ) }

                                { activeTab === "instructions" && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-white/70 mb-2">
                                                تعليمات المشروع
                                            </label>
                                            <p className="text-xs text-white/50 mb-3">
                                                أضف تعليمات مخصصة ستطبق على جميع المحادثات في هذا المشروع
                                            </p>
                                            <textarea
                                                value={ instructions }
                                                onChange={ ( e ) => setInstructions( e.target.value ) }
                                                rows={ 8 }
                                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                                 text-white/90 placeholder:text-white/40 focus:outline-none focus:border-teal-500/50
                                 transition-colors text-sm resize-none"
                                                placeholder="مثال: أنت خبير في التحليل الفني للعملات الرقمية..."
                                            />
                                        </div>
                                    </div>
                                ) }

                                { activeTab === "memory" && (
                                    <div className="space-y-4">
                                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                            <div className="flex items-center gap-3 mb-3">
                                                <Brain className="w-5 h-5 text-teal-400" />
                                                <span className="text-sm font-medium text-white/90">ذاكرة المشروع</span>
                                            </div>
                                            <p className="text-xs text-white/60 mb-4">
                                                سيتذكر المساعد المعلومات المهمة من محادثاتك في هذا المشروع
                                            </p>

                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                                    <span className="text-sm text-white/70">عدد الذكريات</span>
                                                    <span className="text-sm font-medium text-teal-400">0</span>
                                                </div>
                                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                                    <span className="text-sm text-white/70">آخر تحديث</span>
                                                    <span className="text-sm font-medium text-white/50">-</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) }
                            </div>

                            {/* Footer */ }
                            <div className="flex items-center justify-between px-5 py-4 border-t border-white/10">
                                <button
                                    onClick={ () => setShowDeleteConfirm( true ) }
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium 
                           text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    حذف المشروع
                                </button>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={ onClose }
                                        className="px-4 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white/90 
                             hover:bg-white/10 transition-colors"
                                    >
                                        إلغاء
                                    </button>
                                    <button
                                        onClick={ handleSave }
                                        disabled={ !name.trim() }
                                        className={ cn(
                                            "flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all",
                                            name.trim()
                                                ? "bg-teal-500 text-white hover:bg-teal-600 shadow-lg shadow-teal-500/25"
                                                : "bg-white/10 text-white/40 cursor-not-allowed"
                                        ) }
                                    >
                                        <Save className="w-4 h-4" />
                                        حفظ التغييرات
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                ) }
            </AnimatePresence>

            {/* Delete Confirmation */ }
            <ConfirmModal
                isOpen={ showDeleteConfirm }
                onClose={ () => setShowDeleteConfirm( false ) }
                onConfirm={ handleDelete }
                title="حذف المشروع"
                message={ `هل أنت متأكد من حذف المشروع "${ project.name }"؟ سيتم حذف جميع المحادثات والملفات المرتبطة به.` }
                confirmText="حذف"
                cancelText="إلغاء"
                variant="danger"
            />
        </>
    );
}
