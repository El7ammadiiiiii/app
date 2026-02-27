import { EXCHANGE_CONFIGS } from "@/constants/exchanges";
import type { ExchangeId } from "@/types/exchanges";

export const EXCHANGE_PRIORITY: ExchangeId[] = Object.keys( EXCHANGE_CONFIGS ) as ExchangeId[];

export const EXCHANGE_LABELS: Record<ExchangeId, { name: string; color: string }> = Object.fromEntries(
    Object.values( EXCHANGE_CONFIGS ).map( ( config ) => [
        config.id,
        { name: config.name, color: config.color || "#CCCCCC" }
    ] )
) as Record<ExchangeId, { name: string; color: string }>;

export const isPriorityExchange = ( exchangeId: ExchangeId ) =>
    EXCHANGE_PRIORITY.includes( exchangeId );
