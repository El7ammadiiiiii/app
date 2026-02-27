'use client';

import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, ensureAnonymousAuth } from '@/lib/firebase/client';
import { Palette, ChevronDown } from 'lucide-react';

interface Template
{
  id: string;
  name: string;
  color: string;
  description: string;
}

const TEMPLATES: Template[] = [
  { id: 'default', name: 'الافتراضي', color: '#6366f1', description: 'التصميم القياسي للنظام' },
  { id: 'ocean', name: 'المحيط', color: '#0ea5e9', description: 'ألوان زرقاء هادئة' },
  { id: 'emerald', name: 'الزمرد', color: '#10b981', description: 'تنسيق أخضر مريح' },
  { id: 'sunset', name: 'الغروب', color: '#f97316', description: 'ألوان دافئة وحيوية' },
  { id: 'berry', name: 'التوت', color: '#ec4899', description: 'تصميم عصري وجريء' },
  { id: 'mint', name: 'النعناع', color: '#14b8a6', description: 'ألوان فاتحة ومنعشة' },
];

const TEMPLATE_COLOR_CLASS: Record<string, string> = {
  '#6366f1': 'bg-[#6366f1]',
  '#0ea5e9': 'bg-[#0ea5e9]',
  '#10b981': 'bg-[#10b981]',
  '#f97316': 'bg-[#f97316]',
  '#ec4899': 'bg-[#ec4899]',
  '#14b8a6': 'bg-[#14b8a6]',
};

interface TemplatesDropdownProps
{
  selectedTemplate: string;
  onTemplateChange: ( template: string ) => void;
}

export default function TemplatesDropdown ( { selectedTemplate, onTemplateChange }: TemplatesDropdownProps )
{
  const [ open, setOpen ] = useState( false );
  const [ loading, setLoading ] = useState( false );

  const TEMPLATE_KEY = 'pattern_scanner_selected_template';

  useEffect( () =>
  {
    const local = localStorage.getItem( TEMPLATE_KEY );
    if ( local ) onTemplateChange( local );

    const init = async () =>
    {
      if ( !db ) return;
      try
      {
        setLoading( true );
        const user = await ensureAnonymousAuth();
        if ( !user ) return;

        const d = doc( db, 'user_settings', user.uid );
        const snap = await getDoc( d );
        if ( snap.exists() )
        {
          const data = snap.data();
          if ( data?.patternTemplateId )
          {
            onTemplateChange( data.patternTemplateId );
            localStorage.setItem( TEMPLATE_KEY, data.patternTemplateId );
          }
        }
      } catch ( err )
      {
        console.warn( 'TemplatesDropdown: failed to load from Firestore', err );
      } finally
      {
        setLoading( false );
      }
    };

    init();
  }, [ onTemplateChange ] );

  const saveSelection = async ( id: string ) =>
  {
    if ( !db ) return;
    try
    {
      localStorage.setItem( TEMPLATE_KEY, id );
      const user = await ensureAnonymousAuth();
      if ( !user ) return;

      const d = doc( db, 'user_settings', user.uid );
      await setDoc( d, {
        patternTemplateId: id,
        updatedAt: serverTimestamp(),
        userId: user.uid
      }, { merge: true } );
    } catch ( err )
    {
      console.warn( 'TemplatesDropdown: failed to save to Firestore', err );
    }
  };

  const currentTemplate = TEMPLATES.find( t => t.id === selectedTemplate ) || TEMPLATES[ 0 ];

  return (
    <div className="relative inline-block text-right">
      <button
        type="button"
        onClick={ () => setOpen( !open ) }
        className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-200 hover:bg-white/10 transition-all shadow-lg"
        title="تغيير القالب"
      >
        <Palette className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-medium">{ currentTemplate.name }</span>
        <ChevronDown className={ `w-4 h-4 transition-transform ${ open ? 'rotate-180' : '' }` } />
      </button>

      { open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={ () => setOpen( false ) }
          />
          <div className="absolute right-0 mt-2 w-72 z-50 p-3 rounded-xl shadow-2xl overlay-dropdown">
            <div className="grid grid-cols-1 gap-2">
              { TEMPLATES.map( t => (
                <button
                  key={ t.id }
                  type="button"
                  title={ t.name }
                  onClick={ async () =>
                  {
                    onTemplateChange( t.id );
                    setOpen( false );
                    await saveSelection( t.id );
                  } }
                  className={ `flex items-center gap-3 p-2 rounded-lg transition-all ${ selectedTemplate === t.id
                    ? 'bg-cyan-500/10 border border-cyan-500/30'
                    : 'hover:bg-white/5 border border-transparent'
                    }` }
                >
                  <div
                    className={ `w-8 h-8 rounded-md shadow-inner flex-shrink-0 ${ TEMPLATE_COLOR_CLASS[ t.color ] || 'bg-white/20' }` }
                  />
                  <div className="text-right">
                    <div className="text-white text-xs font-bold">{ t.name }</div>
                    <div className="text-[10px] text-slate-400">{ t.description }</div>
                  </div>
                </button>
              ) ) }
            </div>
          </div>
        </>
      ) }
    </div>
  );
}
