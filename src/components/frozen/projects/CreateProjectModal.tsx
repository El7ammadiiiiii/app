"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Settings } from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { PROJECT_TEMPLATES, type ProjectColor } from "@/types/project";
import { EmojiPicker } from "./EmojiPicker";
import { ProjectTemplates } from "./ProjectTemplates";
import { useSound } from "@/lib/sounds";

export function CreateProjectModal ()
{
  const { isCreateModalOpen, closeCreateModal, createProject } = useProjectStore();
  const { playSound } = useSound();

  const [ name, setName ] = useState( "" );
  const [ emoji, setEmoji ] = useState( "📁" );
  const [ color, setColor ] = useState<ProjectColor>( "turquoise" );
  const [ description, setDescription ] = useState( "" );
  const [ instructions, setInstructions ] = useState( "" );
  const [ selectedTemplate, setSelectedTemplate ] = useState<import( "@/types/project" ).ProjectTemplate | null>( null );
  const [ showEmojiPicker, setShowEmojiPicker ] = useState( false );

  // عند اختيار قالب
  const handleTemplateSelect = ( templateId: string | null ) =>
  {
    setSelectedTemplate( templateId as import( "@/types/project" ).ProjectTemplate | null );
    if ( templateId )
    {
      const template = PROJECT_TEMPLATES.find( t => t.id === templateId );
      if ( template )
      {
        setEmoji( template.emoji );
        setColor( template.color );
        setInstructions( template.instructions );
        setDescription( template.description );
        if ( !name )
        {
          setName( template.name );
        }
      }
    }
  };

  // إنشاء المشروع
  const handleCreate = () =>
  {
    if ( !name.trim() ) return;

    createProject( {
      name: name.trim(),
      emoji,
      color,
      description: description.trim(),
      instructions: instructions.trim(),
      template: selectedTemplate || undefined,
    } );

    playSound( "projectCreate" );
    resetForm();
    closeCreateModal();
  };

  // إعادة تعيين النموذج
  const resetForm = () =>
  {
    setName( "" );
    setEmoji( "📁" );
    setColor( "turquoise" );
    setDescription( "" );
    setInstructions( "" );
    setSelectedTemplate( null );
    setShowEmojiPicker( false );
  };

  // إغلاق Modal
  const handleClose = () =>
  {
    resetForm();
    closeCreateModal();
  };

  return (
    <AnimatePresence>
      { isCreateModalOpen && (
        <>
          {/* Backdrop */ }
          <motion.div
            initial={ { opacity: 0 } }
            animate={ { opacity: 1 } }
            exit={ { opacity: 0 } }
            onClick={ handleClose }
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
          />

          {/* Modal */ }
          <motion.div
            initial={ { opacity: 0, scale: 0.95, y: 20 } }
            animate={ { opacity: 1, scale: 1, y: 0 } }
            exit={ { opacity: 0, scale: 0.95, y: 20 } }
            transition={ { type: "spring", duration: 0.3 } }
            className="fixed inset-x-4 bottom-20 md:inset-auto md:left-1/2 md:bottom-auto md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 
                       md:w-[420px] bg-[#264a46]/90 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */ }
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h2 className="text-base font-semibold text-white/90">
                إنشاء مشروع
              </h2>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  title="إعدادات"
                >
                  <Settings className="w-4 h-4 text-white/50" />
                </button>
                <button
                  onClick={ handleClose }
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>
            </div>

            {/* Content */ }
            <div className="px-4 pb-4 pt-3 space-y-3">
              {/* اسم المشروع مع الإيموجي */ }
              <div className="flex gap-2">
                {/* Emoji Picker */ }
                <div className="relative">
                  <button
                    type="button"
                    onClick={ () => setShowEmojiPicker( !showEmojiPicker ) }
                    className="w-10 h-10 rounded-lg border border-white/10
                             hover:border-white/20 
                             transition-colors flex items-center justify-center
                             text-lg bg-white/5"
                  >
                    { emoji }
                  </button>

                  <AnimatePresence>
                    { showEmojiPicker && (
                      <motion.div
                        initial={ { opacity: 0, scale: 0.9, y: -10 } }
                        animate={ { opacity: 1, scale: 1, y: 0 } }
                        exit={ { opacity: 0, scale: 0.9, y: -10 } }
                        className="absolute top-12 right-0 z-10 
                                 bg-[#264a46]/95 backdrop-blur-xl
                                 border border-white/10 
                                 rounded-xl shadow-lg min-w-[240px]"
                      >
                        <EmojiPicker
                          selectedEmoji={ emoji }
                          onSelect={ ( e ) =>
                          {
                            setEmoji( e );
                            setShowEmojiPicker( false );
                          } }
                        />
                      </motion.div>
                    ) }
                  </AnimatePresence>
                </div>

                {/* اسم المشروع */ }
                <input
                  type="text"
                  value={ name }
                  onChange={ ( e ) => setName( e.target.value ) }
                  placeholder="اسم المشروع"
                  className="flex-1 h-10 px-3 rounded-lg 
                           border border-white/10 
                           bg-white/5
                           focus:border-teal-500/50 
                           focus:ring-0 outline-none transition-colors 
                           text-white/90 text-sm
                           placeholder:text-white/40"
                  autoFocus
                />
              </div>

              {/* القوالب كـ Pills */ }
              <ProjectTemplates
                selectedTemplate={ selectedTemplate }
                onSelect={ handleTemplateSelect }
              />

              {/* نص وصفي في صندوق */ }
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <p className="text-xs text-white/60 leading-relaxed flex items-start gap-2">
                  <span>💡</span>
                  <span>
                    تحتفظ المشروعات بالدردشات والملفات والتعليمات المخصصة في مكان واحد.
                    يمكنك استخدامها لمساعدتك في العمل، أو لتنظيم أفكارك.
                  </span>
                </p>
              </div>

              {/* زر الإنشاء */ }
              <div className="flex justify-end">
                <motion.button
                  onClick={ handleCreate }
                  disabled={ !name.trim() }
                  className="px-4 py-2 rounded-lg 
                           bg-teal-500 
                           hover:bg-teal-600
                           text-white 
                           text-sm font-medium
                           disabled:opacity-40 disabled:cursor-not-allowed
                           transition-colors shadow-lg shadow-teal-500/25"
                  whileHover={ { scale: 1.02 } }
                  whileTap={ { scale: 0.98 } }
                >
                  إنشاء مشروع
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      ) }
    </AnimatePresence>
  );
}
