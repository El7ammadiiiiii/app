"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Check } from "lucide-react";
import
{
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "cmdk";

import { cn } from "@/lib/utils";

export type CmdkSelectOption = {
  value: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
};

export type CmdkSelectModalProps = {
  open: boolean;
  onOpenChange: ( open: boolean ) => void;
  title: string;
  idBase: string;

  value: string;
  onValueChange: ( value: string ) => void;
  options: CmdkSelectOption[];

  searchPlaceholder: string;
  emptyLabel: string;
  closeLabel: string;
};

export function CmdkSelectModal ( {
  open,
  onOpenChange,
  title,
  idBase,
  value,
  onValueChange,
  options,
  searchPlaceholder,
  emptyLabel,
  closeLabel,
}: CmdkSelectModalProps )
{
  const titleId = `${ idBase }-modal-title`;
  const inputId = `${ idBase }-modal-search`;

  const [ query, setQuery ] = React.useState( "" );

  React.useEffect( () =>
  {
    if ( !open ) setQuery( "" );
  }, [ open ] );

  React.useEffect( () =>
  {
    if ( !open ) return;

    const onKeyDown = ( e: KeyboardEvent ) =>
    {
      if ( e.key === "Escape" ) onOpenChange( false );
    };

    document.addEventListener( "keydown", onKeyDown );
    return () => document.removeEventListener( "keydown", onKeyDown );
  }, [ open, onOpenChange ] );

  const filteredOptions = React.useMemo( () =>
  {
    const q = query.trim().toLowerCase();
    if ( !q ) return options;

    return options.filter( ( opt ) =>
    {
      const hay = `${ opt.label } ${ opt.description ?? "" }`.toLowerCase();
      return hay.includes( q );
    } );
  }, [ options, query ] );

  return (
    <AnimatePresence>
      { open && (
        <motion.div
          className="fixed inset-0 z-[1000]"
          initial={ { opacity: 0 } }
          animate={ { opacity: 1 } }
          exit={ { opacity: 0 } }
        >
          {/* Backdrop */ }
          <button
            type="button"
            aria-label={ closeLabel }
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={ () => onOpenChange( false ) }
          />

          {/* Centered modal */ }
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={ titleId }
              className={ cn(
                "w-full max-w-md rounded-2xl overflow-hidden",
                "bg-[#264a46]/90 backdrop-blur-2xl",
                "border border-white/10",
                "shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
              ) }
              initial={ { opacity: 0, y: 10, scale: 0.98 } }
              animate={ { opacity: 1, y: 0, scale: 1 } }
              exit={ { opacity: 0, y: 10, scale: 0.98 } }
              transition={ { type: "spring", damping: 26, stiffness: 260 } }
              onClick={ ( e ) => e.stopPropagation() }
            >
              {/* Header */ }
              <div className="relative px-4 py-3 border-b border-white/8">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    aria-label={ closeLabel }
                    className={ cn(
                      "inline-flex items-center justify-center",
                      "h-8 w-8 rounded-md",
                      "text-white/60 hover:text-white/90 hover:bg-white/10",
                      "focus:outline-none focus:ring-1 focus:ring-teal-500/40"
                    ) }
                    onClick={ () => onOpenChange( false ) }
                  >
                    <X className="h-4 w-4" />
                  </button>

                  <h2 id={ titleId } className="text-sm font-semibold text-white/90">
                    { title }
                  </h2>
                </div>
              </div>

              {/* Body */ }
              <div className="px-3 py-3">
                <Command shouldFilter={ false } className="w-full">
                  <CommandInput
                    id={ inputId }
                    value={ query }
                    onValueChange={ setQuery }
                    placeholder={ searchPlaceholder }
                    autoFocus
                    className={ cn(
                      "w-full rounded-xl",
                      "bg-white/8 border border-white/10",
                      "px-3 py-2 text-[13px] text-white/90",
                      "placeholder:text-white/40",
                      "focus:outline-none focus:ring-1 focus:ring-teal-500/40 focus:border-teal-500/30"
                    ) }
                  />

                  <CommandList
                    className={ cn(
                      "mt-3 max-h-[52vh] overflow-y-auto custom-scrollbar",
                      "rounded-xl"
                    ) }
                  >
                    <CommandEmpty className="px-3 py-6 text-center text-[12px] text-white/40">
                      { emptyLabel }
                    </CommandEmpty>

                    <CommandGroup>
                      { filteredOptions.map( ( opt ) =>
                      {
                        const selected = opt.value === value;
                        return (
                          <CommandItem
                            key={ opt.value }
                            value={ opt.value }
                            onSelect={ () =>
                            {
                              onValueChange( opt.value );
                              onOpenChange( false );
                            } }
                            className={ cn(
                              "flex items-center gap-3 rounded-xl px-3 py-2.5",
                              "text-[13px] text-white/90",
                              "cursor-pointer select-none",
                              "hover:bg-white/10 aria-selected:bg-white/10",
                              selected && "bg-white/15 border border-white/15"
                            ) }
                          >
                            <div className="shrink-0 w-4">
                              { selected ? <Check className="h-4 w-4 text-teal-400" /> : null }
                            </div>

                            <div className="min-w-0 flex-1 text-right">
                              <div className="font-medium leading-5 text-white/90">{ opt.label }</div>
                              { opt.description ? (
                                <div className="mt-0.5 text-[11px] text-white/50 line-clamp-1 truncate">
                                  { opt.description }
                                </div>
                              ) : null }
                            </div>

                            { opt.icon ? <div className="shrink-0 text-white/60">{ opt.icon }</div> : null }
                          </CommandItem>
                        );
                      } ) }
                    </CommandGroup>
                  </CommandList>
                </Command>
              </div>
            </motion.div>
          </div>
        </motion.div>
      ) }
    </AnimatePresence>
  );
}
