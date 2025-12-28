import svgPaths from "./svg-d2yorthb3w";

export default function Group() {
  return (
    <div className="content-center flex flex-wrap gap-[8px] items-center relative rounded-[80px] size-full" data-name="Group">
      <div className="content-stretch flex items-center justify-center min-h-[28px] min-w-[28px] p-[4px] relative rounded-[80px] shrink-0" data-name="1">
        <div className="content-stretch flex items-center justify-center relative rounded-[8px] shrink-0" data-name="Icon">
          <div className="relative shrink-0 size-[16px]" data-name="Microphone">
            <div className="absolute inset-[0_-62.5%_-87.5%_0]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 26 30">
                <g id="Microphone">
                  <path d={svgPaths.p18b46c80} fill="var(--fill-0, black)" id="Vector" />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-[rgba(0,0,0,0.04)] content-stretch flex items-center justify-center min-h-[28px] min-w-[28px] p-[4px] relative rounded-[80px] shrink-0" data-name="Button">
        <div className="content-stretch flex items-center justify-center relative rounded-[8px] shrink-0" data-name="Icon">
          <div className="relative shrink-0 size-[16px]" data-name="ArrowUp">
            <div className="absolute inset-[0_-62.5%_-75%_0]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 26.0008 28">
                <g id="ArrowUp">
                  <path d={svgPaths.p3a6ce400} fill="var(--fill-0, black)" id="Vector" />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}