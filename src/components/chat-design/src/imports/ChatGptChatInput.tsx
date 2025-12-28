import svgPaths from "./svg-v3fkwrmioa";

export default function ChatGptChatInput() {
  return (
    <div className="backdrop-blur-[20px] backdrop-filter bg-[rgba(255,255,255,0.8)] relative rounded-[24px] size-full" data-name="ChatGPT Chat Input">
      <div className="flex flex-col justify-center max-w-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[12px] items-start justify-center max-w-[inherit] overflow-clip p-[12px] relative size-full">
          <div className="relative rounded-[8px] shrink-0 w-full" data-name="Text">
            <div className="flex flex-col justify-center overflow-clip rounded-[inherit] size-full">
              <div className="content-stretch flex flex-col items-start justify-center px-[8px] py-[4px] relative w-full">
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[20px] not-italic relative shrink-0 text-[14px] text-[rgba(0,0,0,0.4)] w-full">Get a detailed report</p>
              </div>
            </div>
          </div>
          <div className="content-center flex flex-wrap gap-[8px] items-center min-h-[28px] relative rounded-[8px] shrink-0 w-full" data-name="ChatGPT Chat Input/Assets">
            <div className="basis-0 content-center flex flex-wrap gap-[8px] grow items-center min-h-px min-w-px relative rounded-[12px] shrink-0" data-name="Group">
              <div className="content-stretch flex items-center justify-center min-h-[28px] min-w-[28px] p-[4px] relative rounded-[80px] shrink-0" data-name="Button">
                <div className="content-stretch flex items-center justify-center relative rounded-[8px] shrink-0" data-name="Icon">
                  <div className="relative shrink-0 size-[16px]" data-name="Add">
                    <div className="absolute inset-[0_-75%_-75%_0]">
                      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 28 28">
                        <g id="Add">
                          <path d={svgPaths.pe381e80} fill="var(--fill-0, black)" id="Vector" />
                        </g>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              <div className="content-stretch flex items-center justify-center min-h-[28px] min-w-[28px] p-[4px] relative rounded-[80px] shrink-0" data-name="Button">
                <div className="content-stretch flex items-center justify-center relative rounded-[8px] shrink-0" data-name="Icon">
                  <div className="relative shrink-0 size-[16px]" data-name="SlidersHorizontal">
                    <div className="absolute inset-[0_-75%_-62.55%_0]">
                      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 28 26.0078">
                        <g id="SlidersHorizontal">
                          <path d={svgPaths.p24f7c000} fill="var(--fill-0, black)" id="Vector" />
                        </g>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              <div className="h-[28px] relative shrink-0 w-0" data-name="Line">
                <div className="absolute inset-[0_-1px_0_0]">
                  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1 28">
                    <g id="Line">
                      <line id="Line_2" stroke="var(--stroke-0, black)" strokeLinecap="round" strokeOpacity="0.1" x1="0.500001" x2="0.5" y1="0.5" y2="27.5" />
                    </g>
                  </svg>
                </div>
              </div>
              <div className="content-stretch flex gap-[4px] items-center justify-center px-[8px] py-[4px] relative rounded-[16px] shrink-0" data-name="Button">
                <div className="content-stretch flex items-center justify-center relative rounded-[8px] shrink-0" data-name="Icon">
                  <div className="relative shrink-0 size-[16px]" data-name="LineSegments">
                    <div className="absolute inset-[0_-93.75%_-81.25%_0]">
                      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 30.9994 29.0006">
                        <g id="LineSegments">
                          <path d={svgPaths.p32157100} fill="var(--fill-0, black)" id="Vector" />
                        </g>
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="content-stretch flex flex-col items-start justify-center relative rounded-[12px] shrink-0" data-name="Text">
                  <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-black text-center w-full">
                    <p className="leading-[20px]">Sources</p>
                  </div>
                </div>
                <div className="content-stretch flex items-center justify-center relative rounded-[8px] shrink-0" data-name="Icon 2">
                  <div className="relative shrink-0 size-[16px]" data-name="ArrowLineDown2">
                    <div className="absolute inset-[0_-56.25%_-31.25%_0]">
                      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 25 21">
                        <g id="ArrowLineDown2">
                          <path clipRule="evenodd" d={svgPaths.p2725f100} fill="var(--fill-0, black)" fillOpacity="0.4" fillRule="evenodd" id="Vector" />
                        </g>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="absolute border-[0.5px] border-[rgba(0,0,0,0.04)] border-solid inset-0 pointer-events-none rounded-[24px] shadow-[0px_4px_10px_0px_rgba(0,0,0,0.1)]" />
    </div>
  );
}