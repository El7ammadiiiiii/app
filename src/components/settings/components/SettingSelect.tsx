"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "../store/settingsStore";
import { getUiTexts, resolveUiLocale } from "@/lib/i18n/ui-texts";
import { CmdkSelectModal } from "./CmdkSelectModal";

interface SelectOption
{
  value: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
}

interface SettingSelectProps
{
  value: string;
  onValueChange: ( value: string ) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  description?: string;
  className?: string;
  /**
   * Rendering variant.
   * - "dropdown" (default): existing inline dropdown
   * - "cmdk": opens a centered searchable modal (mobile-first)
   */
  variant?: "dropdown" | "cmdk";
  /** Optional title for the cmdk modal; falls back to label, then ui-texts. */
  modalTitle?: string;
  /**
   * Stable id for a11y/tests. Recommended to pass explicitly from callers.
   * If omitted, a React-generated id is used.
   */
  id?: string;
}

export function SettingSelect ( {
  value,
  onValueChange,
  options,
  placeholder,
  disabled = false,
  label,
  description,
  className,
  variant = "dropdown",
  modalTitle,
  id,
}: SettingSelectProps )
{
  const [ isOpen, setIsOpen ] = React.useState( false );
  const selectRef = React.useRef<HTMLDivElement>( null );
  const reactId = React.useId();

  const storeLanguage = useSettingsStore( ( s ) => s.language );
  const uiLocale = resolveUiLocale( {
    storeLanguage,
    documentLang: typeof document !== "undefined" ? document.documentElement.lang : null,
  } );
  const uiTexts = getUiTexts( uiLocale );

  const baseId = id ?? `setting-select-${ reactId }`;
  const labelId = `${ baseId }-label`;
  const descriptionId = `${ baseId }-description`;
  const triggerId = `${ baseId }-trigger`;
  const listId = `${ baseId }-listbox`;

  const computedPlaceholder = placeholder ?? uiTexts.selectPlaceholder;
  const computedModalTitle = modalTitle ?? label ?? uiTexts.selectModalTitleFallback;
  // In Settings cards, titles/descriptions are already rendered by the parent.
  // Only render an internal header when explicit label/description is provided.
  const hasHeader = Boolean( label || description );

  const selectedOption = options.find( ( opt ) => opt.value === value );

  React.useEffect( () =>
  {
    if ( variant !== "dropdown" ) return;
    const handleClickOutside = ( event: MouseEvent ) =>
    {
      if ( selectRef.current && !selectRef.current.contains( event.target as Node ) )
      {
        setIsOpen( false );
      }
    };
    document.addEventListener( "mousedown", handleClickOutside );
    return () => document.removeEventListener( "mousedown", handleClickOutside );
  }, [] );

  return (
    <div className={ cn( hasHeader ? "w-full" : "w-fit", className ) } ref={ selectRef }>
      { hasHeader && (
        <div className="mb-2 text-right">
          <span id={ labelId } className="text-sm font-medium text-white/90">{ label }</span>
          { description && (
            <p id={ descriptionId } className="text-xs text-white/50 mt-1 leading-relaxed">
              { description }
            </p>
          ) }
        </div>
      ) }

      <div className="relative">
        <button
          type="button"
          onClick={ () => !disabled && setIsOpen( !isOpen ) }
          disabled={ disabled }
          id={ triggerId }
          aria-expanded={ isOpen }
          aria-haspopup={ variant === "cmdk" ? "dialog" : "listbox" }
          aria-controls={ variant === "cmdk" ? undefined : listId }
          aria-labelledby={ label ? labelId : undefined }
          aria-describedby={ description ? descriptionId : undefined }
          aria-label={ label ? undefined : computedModalTitle }
          className={ cn(
            "bg-white/10 border border-white/12 hover:bg-white/15",
            "inline-flex items-center gap-2 rounded-lg backdrop-blur-sm",
            "px-3 py-2 text-sm leading-5 transition-all",
            disabled && "opacity-50 cursor-not-allowed",
            isOpen && "border-teal-500/40 bg-white/15"
          ) }
        >
          <ChevronDown className={ cn( "w-4 h-4 text-white/50 transition-transform", isOpen && "rotate-180" ) } />
          <span className={ cn( selectedOption ? "text-white/90" : "text-white/50" ) }>
            { selectedOption?.label || computedPlaceholder }
          </span>
        </button>

        { variant === "cmdk" ? (
          <CmdkSelectModal
            open={ isOpen }
            onOpenChange={ setIsOpen }
            title={ computedModalTitle }
            idBase={ baseId }
            value={ value }
            onValueChange={ onValueChange }
            options={ options }
            searchPlaceholder={ uiTexts.selectSearchPlaceholder }
            emptyLabel={ uiTexts.selectEmptyLabel }
            closeLabel={ uiTexts.closeLabel }
          />
        ) : (
          <AnimatePresence>
            { isOpen && (
              <motion.div
                id={ listId }
                role="listbox"
                aria-labelledby={ label ? labelId : undefined }
                initial={ { opacity: 0, y: 4, scale: 0.98 } }
                animate={ { opacity: 1, y: 0, scale: 1 } }
                exit={ { opacity: 0, y: 4, scale: 0.98 } }
                className="absolute left-0 top-full mt-1.5 z-50 min-w-[160px] py-1 rounded-xl
                         bg-[#264a46]/90 backdrop-blur-2xl
                         border border-white/10
                         shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
              >
                <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
                  { options.map( ( option ) => (
                    <button
                      key={ option.value }
                      type="button"
                      role="option"
                      aria-selected={ value === option.value }
                      onClick={ () =>
                      {
                        onValueChange( option.value );
                        setIsOpen( false );
                      } }
                      className={ cn(
                        "w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition-colors",
                        value === option.value
                          ? "bg-white/15 text-teal-400"
                          : "hover:bg-white/10 text-white/90"
                      ) }
                    >
                      { value === option.value && <Check className="w-4 h-4 shrink-0 text-teal-400" /> }
                      <div className="flex-1 text-right">
                        <div className="font-medium">{ option.label }</div>
                        { option.description && (
                          <div className="text-xs text-white/50 mt-1">
                            { option.description }
                          </div>
                        ) }
                      </div>
                      { option.icon && <span className="shrink-0 text-white/60">{ option.icon }</span> }
                    </button>
                  ) ) }
                </div>
              </motion.div>
            ) }
          </AnimatePresence>
        ) }
      </div>
    </div>
  );
}
