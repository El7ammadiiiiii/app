"use client";

import React from "react";
import
{
  TokenSaleProject,
  formatUSD,
  formatPercent,
  lifeCycleLabel,
  lifeCycleBadgeClass,
} from "@/lib/services/cryptorank";
import { TrendingUp, TrendingDown, Tag, DollarSign, Rocket, BarChart3, Calendar } from "lucide-react";

interface ICOCardViewProps
{
  data: TokenSaleProject[];
  onCardClick: ( project: TokenSaleProject ) => void;
}

export function ICOCardView ( { data, onCardClick }: ICOCardViewProps )
{
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      { data.map( ( item ) =>
      {
        const pct = formatPercent( item.percentChange?.h24 );
        const firstCs = item.crowdsales?.[ 0 ] || null;
        const hasIcoInfo = firstCs || item.totalRaised || ( item.launchpads && item.launchpads.length > 0 );
        const saleTypes = item.crowdsales?.map( c => c.type ).filter( Boolean ) || [];
        const mainLaunchpad = item.launchpads?.[ 0 ]?.name || firstCs?.platformName || firstCs?.platformKey || null;

        return (
          <div
            key={ item.id }
            onClick={ () => onCardClick( item ) }
            className="group rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.06] transition-colors p-4 cursor-pointer overflow-hidden"
          >
            {/* Top badges */ }
            <div className="flex items-center justify-between gap-1.5 mb-3">
              <div className="flex items-center gap-1 flex-wrap">
                { saleTypes.length > 0 ? (
                  saleTypes.slice( 0, 2 ).map( ( t ) => (
                    <span key={ t } className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-orange-500/10 text-orange-300 border-orange-500/20">
                      { t }
                    </span>
                  ) )
                ) : firstCs && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-orange-500/10 text-orange-300 border-orange-500/20">
                    { firstCs.type }
                  </span>
                ) }
              </div>
              <span className={ `px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${ lifeCycleBadgeClass( item.lifeCycle ) }` }>
                { lifeCycleLabel( item.lifeCycle ) }
              </span>
            </div>

            {/* Project header */ }
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden flex-shrink-0">
                { item.images?.x60 ? (
                  <img src={ item.images.x60 } alt={ item.symbol } className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white/40 bg-white/[0.06]">
                    { ( item.symbol || item.name )?.charAt( 0 ) }
                  </div>
                ) }
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-extrabold text-white group-hover:text-cyan-200 transition-colors truncate text-sm" title={ item.name }>
                  { item.name }
                </h3>
                <p className="text-xs text-white/50 font-mono mt-0.5">
                  { item.symbol }
                  { item.rank && <span className="ml-2 text-white/30">#{ item.rank }</span> }
                </p>
              </div>
            </div>

            {/* Category badge */ }
            { ( item.category || item.categoryName ) && (
              <div className="mb-3">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px]">
                  <Tag className="w-2.5 h-2.5" /> { typeof item.category === 'string' ? item.category : ( item.category as any )?.name || item.categoryName }
                </span>
              </div>
            ) }

            {/* Short description if available */ }
            { item.shortDescription && (
              <p className="text-[11px] text-white/40 mb-3 line-clamp-2 leading-relaxed">
                { item.shortDescription }
              </p>
            ) }

            {/* Metrics - ICO focused or market focused */ }
            <div className="grid grid-cols-2 gap-y-2.5 gap-x-2 text-sm border-t border-white/[0.08] pt-3">
              { hasIcoInfo ? (
                <>
                  <div>
                    <div className="text-[10px] text-white/40 mb-0.5 flex items-center gap-0.5"><DollarSign className="w-2.5 h-2.5" /> Raise</div>
                    <div className="font-mono text-white/90 text-xs">
                      { firstCs?.raise != null ? formatUSD( firstCs.raise )
                        : item.totalRaised ? formatUSD( item.totalRaised )
                          : "—" }
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/40 mb-0.5 flex items-center gap-0.5"><Rocket className="w-2.5 h-2.5" /> Launchpad</div>
                    <div className="font-mono text-white/80 text-xs truncate">{ mainLaunchpad || "—" }</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/40 mb-0.5">Total Raised</div>
                    <div className="font-mono text-green-400/90 text-xs">{ item.totalRaised ? formatUSD( item.totalRaised ) : "—" }</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/40 mb-0.5 flex items-center gap-0.5">
                      { item.roi != null ? <><BarChart3 className="w-2.5 h-2.5" /> ROI</> : "Price" }
                    </div>
                    <div className={ `font-mono text-xs ${ item.roi != null && item.roi >= 1 ? "text-green-400" : item.roi != null ? "text-red-400" : "text-white/90" }` }>
                      { item.roi != null
                        ? `${ item.roi.toFixed( 2 ) }x`
                        : item.price ? formatUSD( item.price )
                          : item.salePrice != null ? `$${ item.salePrice }` : "—" }
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="text-[10px] text-white/40 mb-0.5">Price</div>
                    <div className="font-mono text-white/90 text-xs">{ item.price ? formatUSD( item.price ) : "—" }</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/40 mb-0.5">24h</div>
                    <div className={ `font-mono text-xs flex items-center gap-1 ${ pct.positive ? "text-green-400" : "text-red-400" }` }>
                      { pct.text !== "—" && ( pct.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" /> ) }
                      { pct.text }
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/40 mb-0.5">Mkt Cap</div>
                    <div className="font-mono text-white/80 text-xs">{ formatUSD( item.marketCap ) }</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/40 mb-0.5">Volume</div>
                    <div className="font-mono text-white/80 text-xs">{ formatUSD( item.volume24h ) }</div>
                  </div>
                </>
              ) }
            </div>

            {/* Funds/Investors indicator */ }
            { item.funds && item.funds.length > 0 && (
              <div className="mt-2 pt-2 border-t border-white/[0.05]">
                <div className="flex items-center gap-1">
                  <div className="flex -space-x-1">
                    { item.funds.slice( 0, 4 ).map( ( f, fi ) => (
                      f.image ? (
                        <img key={ fi } src={ f.image } alt={ f.name } title={ f.name }
                          className="w-4 h-4 rounded-full border border-black/50" />
                      ) : (
                        <div key={ fi } title={ f.name }
                          className="w-4 h-4 rounded-full border border-black/50 bg-white/10 flex items-center justify-center text-[7px] text-white/50">
                          { f.name.charAt( 0 ) }
                        </div>
                      )
                    ) ) }
                  </div>
                  <span className="text-[9px] text-white/30 ml-1">
                    { item.funds.length } investor{ item.funds.length > 1 ? "s" : "" }
                  </span>
                </div>
              </div>
            ) }
          </div>
        );
      } ) }
    </div>
  );
}
