import svgPaths from "./svg-k8pfy92a1g";

export default function Group() {
  return (
    <div className="content-center flex flex-wrap gap-[8px] items-center relative rounded-[12px] size-full" data-name="Group">
      <div className="content-stretch flex gap-[4px] items-center justify-center px-[8px] py-[4px] relative rounded-[16px] shrink-0" data-name="Button">
        <div className="content-stretch flex items-center justify-center relative rounded-[8px] shrink-0" data-name="Icon">
          <div className="relative shrink-0 size-[16px]" data-name="Binoculars">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
              <g id="Binoculars">
                <path d={svgPaths.p3c44e780} fill="var(--fill-0, #007AFF)" id="Vector" />
              </g>
            </svg>
          </div>
        </div>
        <div className="content-stretch flex flex-col items-start justify-center relative rounded-[12px] shrink-0" data-name="Text">
          <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#007aff] text-[14px] text-center w-full">
            <p className="leading-[20px]">Research</p>
          </div>
        </div>
      </div>
    </div>
  );
}