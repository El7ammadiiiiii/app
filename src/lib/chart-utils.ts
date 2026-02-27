// Glassnode-inspired Color Palette for D3 Charts (dark-theme adapted)
export const GLASSNODE_COLORS = {
    // Primary Data Colors
    primary: "#e5e7eb",        // Main line/data (light for dark backgrounds)
    secondary: "#ff8c42",      // Area fill / accent (orange)
    tertiary: "#4a90e2",       // Secondary line (blue)

    // Status Colors
    positive: "#22c55e",       // Green
    negative: "#ef4444",       // Red
    neutral: "rgba(255,255,255,0.45)", // Neutral text

    // Supporting Colors
    grayLight: "rgba(255,255,255,0.5)",  // Axis tick text
    grayMedium: "rgba(255,255,255,0.4)", // Legend & supporting text
    grayDark: "rgba(255,255,255,0.6)",   // Prominent labels

    // Axis & Domain
    axisText: "rgba(255,255,255,0.5)",
    domainStroke: "rgba(255,255,255,0.12)",
    crosshair: "rgba(255,255,255,0.3)",

    // Multi-series Colors (for stacked charts)
    series: [
        "#ff8c42",  // Orange
        "#4a90e2",  // Blue
        "#22c55e",  // Green
        "#ef4444",  // Red
        "#8b5cf6",  // Purple
        "#f59e0b",  // Amber
        "#10b981",  // Emerald
        "#3b82f6",  // Sky blue
        "#ec4899",  // Pink
        "#14b8a6",  // Teal
    ],

    // Grid & Background (dark-theme)
    gridLine: "rgba(255,255,255,0.07)", // Subtle dark-theme grid
    bgOverlay: "rgba(255,255,255,0.02)", // Subtle background
};

// Chart configuration defaults (Glassnode style)
export const GLASSNODE_CHART_CONFIG = {
    strokeWidth: 2,
    fillOpacity: 0.6,
    showGrid: true,
    gridDashArray: "2,2",

    // Tooltip styling
    tooltip: {
        background: "rgba(0, 0, 0, 0.9)",
        color: "white",
        padding: "8px 12px",
        borderRadius: "6px",
        fontSize: "12px",
    },

    // Axis styling
    axis: {
        color: "rgba(255,255,255,0.5)",
        fontSize: "11px",
        fontFamily: "Inter, system-ui, sans-serif",
    },
};

// Helper: Generate date series
export function generateDateSeries (
    count: number,
    startDate: string = "2024-01-01",
    interval: "daily" | "weekly" | "monthly" = "daily"
): Date[]
{
    const dates: Date[] = [];
    const start = new Date( startDate );

    const dayIncrement = interval === "daily" ? 1 : interval === "weekly" ? 7 : 30;

    for ( let i = 0; i < count; i++ )
    {
        const date = new Date( start );
        date.setDate( date.getDate() + i * dayIncrement );
        dates.push( date );
    }

    return dates;
}

// Helper: Generate mock time-series data
export function generateMockTimeSeries (
    count: number,
    baseValue: number = 100,
    volatility: number = 0.2,
    trend: "up" | "down" | "sideways" = "sideways"
): number[]
{
    const data: number[] = [];
    let currentValue = baseValue;

    for ( let i = 0; i < count; i++ )
    {
        const randomChange = ( Math.random() - 0.5 ) * 2 * volatility;
        const trendFactor = trend === "up" ? 0.001 : trend === "down" ? -0.001 : 0;

        currentValue = currentValue * ( 1 + randomChange + trendFactor );
        data.push( Math.max( 0, currentValue ) );
    }

    return data;
}

// Helper: Format large numbers (Glassnode style)
export function formatCompact ( value: number ): string
{
    if ( Math.abs( value ) >= 1e9 ) return `${ ( value / 1e9 ).toFixed( 2 ) }B`;
    if ( Math.abs( value ) >= 1e6 ) return `${ ( value / 1e6 ).toFixed( 2 ) }M`;
    if ( Math.abs( value ) >= 1e3 ) return `${ ( value / 1e3 ).toFixed( 1 ) }K`;
    return value.toFixed( 2 );
}

// Helper: Format USD values
export function formatUSD ( value: number ): string
{
    return `$${ formatCompact( value ) }`;
}

// Helper: Format percentage
export function formatPercent ( value: number ): string
{
    return `${ value.toFixed( 2 ) }%`;
}

// Helper: Convert ECharts-style data to D3 format
export function echartsToD3Format (
    dates: string[],
    series: { name: string; data: number[] }[]
): any[]
{
    return dates.map( ( date, i ) =>
    {
        const dataPoint: any = { date: new Date( date ) };
        series.forEach( ( s ) =>
        {
            dataPoint[ s.name ] = s.data[ i ] || 0;
        } );
        return dataPoint;
    } );
}

// Helper: Create series config for MultiLineChart
export function createSeriesConfig (
    keys: string[],
    labels?: string[],
    colors?: string[]
): Array<{ key: string; color: string; label: string }>
{
    return keys.map( ( key, i ) => ( {
        key,
        label: labels?.[ i ] || key,
        color: colors?.[ i ] || GLASSNODE_COLORS.series[ i % GLASSNODE_COLORS.series.length ],
    } ) );
}

// Helper: Generate moving average
export function calculateMovingAverage ( data: number[], window: number ): number[]
{
    const result: number[] = [];
    for ( let i = 0; i < data.length; i++ )
    {
        if ( i < window - 1 )
        {
            result.push( data[ i ] );
        } else
        {
            const sum = data.slice( i - window + 1, i + 1 ).reduce( ( a, b ) => a + b, 0 );
            result.push( sum / window );
        }
    }
    return result;
}
