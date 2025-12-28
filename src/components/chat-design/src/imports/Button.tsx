import svgPaths from "./svg-44rbb9np92";

export default function Button() {
  return (
    <div className="relative rounded-[80px] size-full" data-name="Button">
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.1)] border-solid inset-0 pointer-events-none rounded-[80px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex gap-[4px] items-center justify-center px-[8px] py-[4px] relative size-full">
          <div className="content-stretch flex items-center justify-center relative rounded-[8px] shrink-0" data-name="Icon">
            <div className="relative shrink-0 size-[16px]" data-name="GlobeSimple">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
                <g id="GlobeSimple">
                  <path d={svgPaths.pd00c960} fill="var(--fill-0, black)" id="Vector" />
                </g>
              </svg>
            </div>
          </div>
          <div className="content-stretch flex flex-col items-start justify-center relative rounded-[12px] shrink-0" data-name="Text">
            <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-black text-center w-full">
              <p className="leading-[20px]">Search</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}