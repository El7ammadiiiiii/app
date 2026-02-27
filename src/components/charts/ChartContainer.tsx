import React from 'react';
import { ChartConfig, ThemeMode } from '../../lib/ChartConfig';

interface ChartContainerProps
{
  children: React.ReactNode;
  title?: string;
  height?: string;
  className?: string;
  mode?: ThemeMode;
  useGradient?: boolean;
  variant?: 'default' | 'pair-template';
}

export const ChartContainer: React.FC<ChartContainerProps> = ( {
  children,
  title,
  height = '500px',
  className = '',
  mode = 'dark',
  useGradient = true,
  variant = 'default',
} ) =>
{
  const theme = ChartConfig.getTheme( mode );
  const sizeClass = `chart-container-size-${ height.replace( /[^a-z0-9]/gi, '' ) }`;

  const isPairTemplate = variant === 'pair-template';

  const bgClass = isPairTemplate
    ? 'pair-template-chart'
    : useGradient
      ? 'bg-[#223a37]'
      : mode === 'dark'
        ? 'bg-[#223a37]'
        : 'bg-white';

  const textClass = mode === 'dark' ? 'text-[#d1d4dc]' : 'text-[#131722]';
  const borderClass = mode === 'dark' ? 'border-white/[0.08]' : 'border-[#e0e3eb]';

  const frameClass = isPairTemplate
    ? `flex flex-col w-full relative ${ bgClass } ${ textClass } ${ className }` /* Minimal frame */
    : `flex flex-col overflow-hidden backdrop-blur-md py-[6px] px-[10px] rounded-[12px] shadow-[0_4px_20px_rgba(0,0,0,0.25)] border ${ borderClass } ${ bgClass } ${ textClass } ${ className }`;

  return (
    <div
      className={ frameClass }
    >
      <style>{ `.${ sizeClass }{height:${ height };width:100%;position:relative;}` }</style>
      { title && (
        <div
          className={ `mb-1 text-[0.7rem] font-medium py-[2px] border-b ${ borderClass } ${ textClass }` }
        >
          { title }
        </div>
      ) }
      <div className={ sizeClass }>
        { children }
      </div>
    </div>
  );
};
