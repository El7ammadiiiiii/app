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
import { TrendingUp, TrendingDown } from "lucide-react";

interface ICOListViewProps
{
  data: TokenSaleProject[];
  onRowClick: ( project: TokenSaleProject ) => void;
}

export function ICOListView ( { data, onRowClick }: ICOListViewProps )
{
  return (
    <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-white/[0.04] text-white/50 font-medium border-b border-white/10">
            <tr>
              <th className="px-4 py-3.5">#</th>
              <th className="px-4 py-3.5">Project</th>
              <th className="px-4 py-3.5">Type</th>
              <th className="px-4 py-3.5">Category</th>
              <th className="px-4 py-3.5 text-right">Price</th>
              <th className="px-4 py-3.5 text-right">ROI</th>
              <th className="px-4 py-3.5 text-right">Raise</th>
              <th className="px-4 py-3.5">Launchpad</th>
              <th className="px-4 py-3.5 text-right">Total Raised</th>
              <th className="px-4 py-3.5 text-right">Mkt Cap</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            { data.map( ( item, idx ) =>
            {
              const pct = formatPercent( item.percentChange?.h24 );
              const firstCs = item.crowdsales?.[ 0 ] || null;
              const saleTypes = item.crowdsales?.map( c => c.type ).filter( Boolean ) || [];
              const mainLaunchpad = item.launchpads?.[ 0 ]?.name || firstCs?.platformName || firstCs?.platformKey || null;
              const catName = typeof item.category === 'string' ? item.category : ( item.category as any )?.name || item.categoryName || null;

              return (
                <tr key={ item.id } onClick={ () => onRowClick( item ) } className="group hover:bg-white/[0.04] transition-colors cursor-pointer">
                  <td className="px-4 py-3.5 text-white/40 text-xs">{ item.rank ?? idx + 1 }</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-white/[0.06] overflow-hidden flex-shrink-0 border border-white/10">
                        { item.images?.x60 ? (
                          <img src={ item.images.x60 } alt={ item.symbol } className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/40">
                            { ( item.symbol || item.name )?.charAt( 0 ) }
                          </div>
                        ) }
                      </div>
                      <div>
                        <div className="font-extrabold text-white group-hover:text-cyan-200 transition-colors text-xs">{ item.name }</div>
                        <div className="text-[10px] text-white/50 font-mono">{ item.symbol }</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 flex-wrap">
                      { saleTypes.length > 0 ? (
                        saleTypes.slice( 0, 2 ).map( ( t ) => (
                          <span key={ t } className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-500/10 text-orange-300 border border-orange-500/20">
                            { t }
                          </span>
                        ) )
                      ) : (
                        <span className={ `px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${ lifeCycleBadgeClass( item.lifeCycle ) }` }>
                          { lifeCycleLabel( item.lifeCycle ) }
                        </span>
                      ) }
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-white/60">
                    { catName || "—" }
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-white/80 text-xs">
                    { item.price ? formatUSD( item.price )
                      : item.salePrice != null ? `$${ item.salePrice }` : "—" }
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    { item.roi != null && item.roi > 0 ? (
                      <span className={ `font-mono text-xs ${ item.roi >= 1 ? "text-green-400" : "text-red-400" }` }>
                        { item.roi.toFixed( 2 ) }x
                      </span>
                    ) : (
                      <span className={ `font-mono text-xs flex items-center justify-end gap-1 ${ pct.positive ? "text-green-400" : "text-red-400" }` }>
                        { pct.text !== "—" && ( pct.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" /> ) }
                        { pct.text }
                      </span>
                    ) }
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-xs text-green-400/80">
                    { firstCs?.raise != null ? formatUSD( firstCs.raise ) : item.totalRaised ? formatUSD( item.totalRaised ) : "—" }
                  </td>
                  <td className="px-4 py-3.5 text-xs text-white/60 truncate max-w-[140px]">
                    { mainLaunchpad || "—" }
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-xs text-cyan-400/80">
                    { item.totalRaised ? formatUSD( item.totalRaised ) : "—" }
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-white/70 text-xs">
                    { formatUSD( item.marketCap ) }
                  </td>
                </tr>
              );
            } ) }
          </tbody>
        </table>
      </div>
    </div>
  );
}
