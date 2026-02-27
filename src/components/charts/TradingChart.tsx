"use client";

/**
 * Legacy `TradingChart` implementation archived.
 *
 * This file is kept as a backwards-compatible import path and now simply
 * re-exports the modern `TradingChartV2` implementation and shared types.
 */
export { TradingChartV2 as TradingChart } from "./TradingChartV2";
export type { TradingChartProps } from "./TradingChartV2";
export type { CandleData, ChartIndicatorSettings } from "./types";
