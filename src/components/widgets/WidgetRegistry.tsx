'use client';

/**
 * ═══════════════════════════════════════════════════════════════
 * Wave 7.4 — Widget Registry
 * ═══════════════════════════════════════════════════════════════
 * Maps widget kind → React component for dynamic rendering.
 */

import React from 'react';
import type { WidgetKind, WidgetBlock } from '@/types/contentBlocks';
import { PriceChartWidget } from './PriceChartWidget';
import { TokenSwapWidget } from './TokenSwapWidget';
import { PortfolioWidget } from './PortfolioWidget';

type WidgetComponent = React.ComponentType<any>;

const WIDGET_REGISTRY: Record<WidgetKind, WidgetComponent> = {
  price_chart: PriceChartWidget,
  token_swap: TokenSwapWidget,
  portfolio: PortfolioWidget,
};

export function renderWidget(block: WidgetBlock): React.ReactElement {
  const Component = WIDGET_REGISTRY[block.widgetKind];

  if (!Component) {
    return (
      <div className="text-xs text-red-400 p-2 border border-red-500/20 rounded-lg">
        Unknown widget: {block.widgetKind}
      </div>
    );
  }

  return <Component symbol={block.symbol} {...block.props} />;
}

export { WIDGET_REGISTRY };
