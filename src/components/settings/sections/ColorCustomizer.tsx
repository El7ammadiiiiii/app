"use client";

import { useState, useEffect, useId } from "react";
import { Paintbrush, RotateCcw } from "lucide-react";

interface ColorCustomizerProps { }

interface ThemeColors
{
  // رسائل المحادثة
  messageUserBg: string;
  messageUserBorder: string;
  messageAssistantBg: string;
  messageAssistantBorder: string;

  // النصوص
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textAccent: string;

  // قالب الكتابة
  inputBg: string;
  inputBorder: string;
  inputText: string;

  // الشارت
  chartBg: string;
  chartGrid: string;
  chartUp: string;
  chartDown: string;
  chartNeutral: string;

  // اللون الرئيسي
  colorPrimary: string;
}

const DEFAULT_COLORS: ThemeColors = {
  // رسائل المحادثة
  messageUserBg: "rgba(13, 148, 136, 0.18)",
  messageUserBorder: "rgba(13, 148, 136, 0.25)",
  messageAssistantBg: "#081820",
  messageAssistantBorder: "rgba(255, 255, 255, 0.08)",

  // النصوص
  textPrimary: "#f8fafc",
  textSecondary: "#cbd5e1",
  textMuted: "#64748b",
  textAccent: "#2dd4bf",

  // قالب الكتابة
  inputBg: "#081820",
  inputBorder: "rgba(255, 255, 255, 0.08)",
  inputText: "#f8fafc",

  // الشارت
  chartBg: "#081820",
  chartGrid: "rgba(255, 255, 255, 0.06)",
  chartUp: "#22c55e",
  chartDown: "#ef4444",
  chartNeutral: "#64748b",

  // اللون الرئيسي
  colorPrimary: "#0d9488",
};

const STORAGE_KEY = "CCWAYS-custom-colors";

export function ColorCustomizer ( { }: ColorCustomizerProps )
{
  const [ colors, setColors ] = useState<ThemeColors>( DEFAULT_COLORS );
  const [ hasChanges, setHasChanges ] = useState( false );
  const previewClass = "color-customizer-preview";

  // تحميل الألوان المحفوظة
  useEffect( () =>
  {
    const saved = localStorage.getItem( STORAGE_KEY );
    if ( saved )
    {
      try
      {
        const parsed = JSON.parse( saved );
        setColors( parsed );
        applyColors( parsed );
      } catch ( e )
      {
        console.error( "Failed to load custom colors:", e );
      }
    }
  }, [] );

  // تطبيق الألوان على CSS variables
  const applyColors = ( newColors: ThemeColors ) =>
  {
    const root = document.documentElement;

    // رسائل المحادثة
    root.style.setProperty( "--message-user-bg-custom", newColors.messageUserBg );
    root.style.setProperty( "--message-user-border-custom", newColors.messageUserBorder );
    root.style.setProperty( "--message-assistant-bg-custom", newColors.messageAssistantBg );
    root.style.setProperty( "--message-assistant-border-custom", newColors.messageAssistantBorder );

    // النصوص
    root.style.setProperty( "--text-primary-custom", newColors.textPrimary );
    root.style.setProperty( "--text-secondary-custom", newColors.textSecondary );
    root.style.setProperty( "--text-muted-custom", newColors.textMuted );
    root.style.setProperty( "--text-accent-custom", newColors.textAccent );

    // قالب الكتابة
    root.style.setProperty( "--input-bg-custom", newColors.inputBg );
    root.style.setProperty( "--input-border-custom", newColors.inputBorder );
    root.style.setProperty( "--input-text-custom", newColors.inputText );

    // الشارت
    root.style.setProperty( "--chart-bg-custom", newColors.chartBg );
    root.style.setProperty( "--chart-grid-custom", newColors.chartGrid );
    root.style.setProperty( "--chart-up-custom", newColors.chartUp );
    root.style.setProperty( "--chart-down-custom", newColors.chartDown );
    root.style.setProperty( "--chart-neutral-custom", newColors.chartNeutral );

    // اللون الرئيسي
    root.style.setProperty( "--color-primary-custom", newColors.colorPrimary );
  };

  const handleColorChange = ( key: keyof ThemeColors, value: string ) =>
  {
    const newColors = { ...colors, [ key ]: value };
    setColors( newColors );
    setHasChanges( true );
  };

  const handleSave = () =>
  {
    localStorage.setItem( STORAGE_KEY, JSON.stringify( colors ) );
    applyColors( colors );
    setHasChanges( false );
  };

  const handleReset = () =>
  {
    setColors( DEFAULT_COLORS );
    localStorage.removeItem( STORAGE_KEY );
    applyColors( DEFAULT_COLORS );
    setHasChanges( false );
  };

  // Helper لتحويل rgba إلى hex
  const rgbaToHex = ( rgba: string ): string =>
  {
    if ( rgba.startsWith( "#" ) ) return rgba;
    if ( rgba.startsWith( "rgba" ) )
    {
      const match = rgba.match( /rgba?\((\d+),\s*(\d+),\s*(\d+)/ );
      if ( match )
      {
        const r = parseInt( match[ 1 ] ).toString( 16 ).padStart( 2, "0" );
        const g = parseInt( match[ 2 ] ).toString( 16 ).padStart( 2, "0" );
        const b = parseInt( match[ 3 ] ).toString( 16 ).padStart( 2, "0" );
        return `#${ r }${ g }${ b }`;
      }
    }
    return "#000000";
  };

  const ColorPicker = ( { label, value, onChange, description }: {
    label: string;
    value: string;
    onChange: ( val: string ) => void;
    description?: string;
  } ) =>
  {
    const labelId = useId();
    const colorInputId = useId();
    const textInputId = useId();
    const descriptionId = useId();

    return (
      <div className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--glass-bg-hover)] transition-colors">
        <div className="flex-1">
          <label
            id={ labelId }
            htmlFor={ textInputId }
            className="text-sm font-medium text-foreground"
          >
            { label }
          </label>
          { description && (
            <p id={ descriptionId } className="text-xs text-muted-foreground mt-0.5">{ description }</p>
          ) }
        </div>
        <div className="flex items-center gap-3">
          <input
            id={ colorInputId }
            type="color"
            value={ rgbaToHex( value ) }
            onChange={ ( e ) => onChange( e.target.value ) }
            className="w-7 h-7 rounded cursor-pointer border border-border"
            aria-labelledby={ labelId }
            aria-describedby={ description ? descriptionId : undefined }
            title={ label }
          />
          <input
            id={ textInputId }
            type="text"
            value={ value }
            onChange={ ( e ) => onChange( e.target.value ) }
            className="w-32 px-2 py-1 text-xs rounded border border-border bg-surface text-foreground font-mono"
            aria-labelledby={ labelId }
            aria-describedby={ description ? descriptionId : undefined }
            title={ label }
          />
        </div>
      </div>
    );
  };

  return (
    <div className={ `space-y-6 ${ previewClass }` }>
      <style>{ `.${ previewClass }{
        --preview-message-user-bg:${ colors.messageUserBg };
        --preview-message-user-border:${ colors.messageUserBorder };
        --preview-message-assistant-bg:${ colors.messageAssistantBg };
        --preview-message-assistant-border:${ colors.messageAssistantBorder };
        --preview-text-primary:${ colors.textPrimary };
        --preview-text-secondary:${ colors.textSecondary };
        --preview-text-muted:${ colors.textMuted };
        --preview-text-accent:${ colors.textAccent };
        --preview-input-bg:${ colors.inputBg };
        --preview-input-border:${ colors.inputBorder };
        --preview-input-text:${ colors.inputText };
        --preview-chart-bg:${ colors.chartBg };
        --preview-chart-grid:${ colors.chartGrid };
        --preview-chart-up:${ colors.chartUp };
        --preview-chart-down:${ colors.chartDown };
        --preview-chart-neutral:${ colors.chartNeutral };
        --preview-color-primary:${ colors.colorPrimary };
      }`}</style>
      {/* Header */ }
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paintbrush className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">تخصيص الألوان</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={ handleReset }
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-[var(--glass-bg-hover)] text-sm transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            استعادة الافتراضي
          </button>
          { hasChanges && (
            <button
              onClick={ handleSave }
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              حفظ التغييرات
            </button>
          ) }
        </div>
      </div>

      {/* معاينة مباشرة */ }
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground/70 px-3">معاينة مباشرة</h4>
        <div className="border border-border rounded-xl p-6 space-y-6">

          {/* نموذج الرسائل */ }
          <div className="space-y-3">
            <div className="text-xs font-medium text-muted-foreground mb-2">رسائل المحادثة</div>

            {/* رسالة المستخدم */ }
            <div className="flex justify-end">
              <div
                className="max-w-[80%] rounded-2xl px-4 py-3 bg-[var(--preview-message-user-bg)] border border-[var(--preview-message-user-border)]"
              >
                <p className="text-sm text-[var(--preview-text-primary)]">
                  مرحباً! هذا مثال على رسالة من المستخدم
                </p>
              </div>
            </div>

            {/* رسالة المساعد */ }
            <div className="flex justify-start">
              <div
                className="max-w-[80%] rounded-2xl px-4 py-3 bg-[var(--preview-message-assistant-bg)] border border-[var(--preview-message-assistant-border)]"
              >
                <p className="text-sm text-[var(--preview-text-primary)]">
                  أهلاً بك! هذا مثال على رسالة من المساعد الذكي
                </p>
              </div>
            </div>
          </div>

          {/* نموذج قالب الكتابة */ }
          <div className="space-y-3">
            <div className="text-xs font-medium text-muted-foreground mb-2">قالب الكتابة</div>
            <div
              className="rounded-xl px-4 py-3 flex items-center gap-2 bg-[var(--preview-input-bg)] border border-[var(--preview-input-border)]"
            >
              <input
                type="text"
                placeholder="اكتب رسالتك هنا..."
                className="flex-1 bg-transparent outline-none text-sm text-[var(--preview-input-text)]"
                disabled
              />
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--preview-color-primary)]">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 } d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
            </div>
          </div>

          {/* نموذج النصوص */ }
          <div className="space-y-3">
            <div className="text-xs font-medium text-muted-foreground mb-2">ألوان النصوص</div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--preview-text-primary)]">
                نص أساسي - Primary Text
              </p>
              <p className="text-sm text-[var(--preview-text-secondary)]">
                نص ثانوي - Secondary Text
              </p>
              <p className="text-xs text-[var(--preview-text-muted)]">
                نص باهت - Muted Text
              </p>
              <p className="text-sm font-semibold text-[var(--preview-text-accent)]">
                نص مميز - Accent Text
              </p>
            </div>
          </div>

          {/* نموذج الشارت */ }
          <div className="space-y-3">
            <div className="text-xs font-medium text-muted-foreground mb-2">الرسوم البيانية</div>
            <div
              className="rounded-xl p-3 relative h-32 bg-[var(--preview-chart-bg)]"
            >
              {/* شبكة الخلفية */ }
              <div className="absolute inset-0 flex flex-col justify-between p-4">
                { [ ...Array( 5 ) ].map( ( _, i ) => (
                  <div key={ i } className="w-full h-px bg-[var(--preview-chart-grid)]" />
                ) ) }
              </div>

              {/* الشموع */ }
              <div className="absolute inset-0 p-3 flex items-end justify-around gap-1">
                {/* شمعة صاعدة */ }
                <div className="flex flex-col items-center gap-0.5 w-8">
                  <div className="w-0.5 h-5 bg-[var(--preview-chart-up)]" />
                  <div className="w-full h-10 rounded-sm bg-[var(--preview-chart-up)] opacity-80" />
                  <div className="w-0.5 h-4 bg-[var(--preview-chart-up)]" />
                </div>

                {/* شمعة هابطة */ }
                <div className="flex flex-col items-center gap-0.5 w-8">
                  <div className="w-0.5 h-4 bg-[var(--preview-chart-down)]" />
                  <div className="w-full h-12 rounded-sm bg-[var(--preview-chart-down)] opacity-80" />
                  <div className="w-0.5 h-3 bg-[var(--preview-chart-down)]" />
                </div>

                {/* شمعة صاعدة */ }
                <div className="flex flex-col items-center gap-0.5 w-8">
                  <div className="w-0.5 h-6 bg-[var(--preview-chart-up)]" />
                  <div className="w-full h-14 rounded-sm bg-[var(--preview-chart-up)] opacity-80" />
                  <div className="w-0.5 h-3 bg-[var(--preview-chart-up)]" />
                </div>

                {/* شمعة حيادية */ }
                <div className="flex flex-col items-center gap-0.5 w-8">
                  <div className="w-0.5 h-5 bg-[var(--preview-chart-neutral)]" />
                  <div className="w-full h-2 rounded-sm bg-[var(--preview-chart-neutral)] opacity-80" />
                  <div className="w-0.5 h-5 bg-[var(--preview-chart-neutral)]" />
                </div>

                {/* شمعة صاعدة */ }
                <div className="flex flex-col items-center gap-0.5 w-8">
                  <div className="w-0.5 h-7 bg-[var(--preview-chart-up)]" />
                  <div className="w-full h-16 rounded-sm bg-[var(--preview-chart-up)] opacity-80" />
                  <div className="w-0.5 h-3 bg-[var(--preview-chart-up)]" />
                </div>

                {/* شمعة هابطة */ }
                <div className="flex flex-col items-center gap-0.5 w-8">
                  <div className="w-0.5 h-5 bg-[var(--preview-chart-down)]" />
                  <div className="w-full h-10 rounded-sm bg-[var(--preview-chart-down)] opacity-80" />
                  <div className="w-0.5 h-4 bg-[var(--preview-chart-down)]" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* رسائل المحادثة */ }
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground/70 px-3">رسائل المحادثة</h4>
        <div className="space-y-1 border border-border rounded-xl p-2">
          <ColorPicker
            label="خلفية رسالة المستخدم"
            value={ colors.messageUserBg }
            onChange={ ( v ) => handleColorChange( "messageUserBg", v ) }
            description="الرسالة التي يكتبها المستخدم"
          />
          <ColorPicker
            label="حدود رسالة المستخدم"
            value={ colors.messageUserBorder }
            onChange={ ( v ) => handleColorChange( "messageUserBorder", v ) }
          />
          <div className="h-px bg-border my-2" />
          <ColorPicker
            label="خلفية رسالة المساعد"
            value={ colors.messageAssistantBg }
            onChange={ ( v ) => handleColorChange( "messageAssistantBg", v ) }
            description="الرسالة التي يردّ بها الـ AI"
          />
          <ColorPicker
            label="حدود رسالة المساعد"
            value={ colors.messageAssistantBorder }
            onChange={ ( v ) => handleColorChange( "messageAssistantBorder", v ) }
          />
        </div>
      </div>

      {/* النصوص */ }
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground/70 px-3">ألوان النصوص</h4>
        <div className="space-y-1 border border-border rounded-xl p-2">
          <ColorPicker
            label="النص الرئيسي"
            value={ colors.textPrimary }
            onChange={ ( v ) => handleColorChange( "textPrimary", v ) }
            description="النصوص الأساسية في التطبيق"
          />
          <ColorPicker
            label="النص الثانوي"
            value={ colors.textSecondary }
            onChange={ ( v ) => handleColorChange( "textSecondary", v ) }
          />
          <ColorPicker
            label="النص الخافت"
            value={ colors.textMuted }
            onChange={ ( v ) => handleColorChange( "textMuted", v ) }
          />
          <ColorPicker
            label="النص المميز"
            value={ colors.textAccent }
            onChange={ ( v ) => handleColorChange( "textAccent", v ) }
            description="الروابط والعناصر المميزة"
          />
        </div>
      </div>

      {/* قالب الكتابة */ }
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground/70 px-3">قالب الكتابة (Input Box)</h4>
        <div className="space-y-1 border border-border rounded-xl p-2">
          <ColorPicker
            label="خلفية قالب الكتابة"
            value={ colors.inputBg }
            onChange={ ( v ) => handleColorChange( "inputBg", v ) }
          />
          <ColorPicker
            label="حدود قالب الكتابة"
            value={ colors.inputBorder }
            onChange={ ( v ) => handleColorChange( "inputBorder", v ) }
          />
          <ColorPicker
            label="لون النص في القالب"
            value={ colors.inputText }
            onChange={ ( v ) => handleColorChange( "inputText", v ) }
          />
        </div>
      </div>

      {/* الشارت */ }
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground/70 px-3">الرسوم البيانية (Charts)</h4>
        <div className="space-y-1 border border-border rounded-xl p-2">
          <ColorPicker
            label="خلفية الشارت"
            value={ colors.chartBg }
            onChange={ ( v ) => handleColorChange( "chartBg", v ) }
          />
          <ColorPicker
            label="خطوط الشبكة"
            value={ colors.chartGrid }
            onChange={ ( v ) => handleColorChange( "chartGrid", v ) }
          />
          <div className="h-px bg-border my-2" />
          <ColorPicker
            label="لون الصعود"
            value={ colors.chartUp }
            onChange={ ( v ) => handleColorChange( "chartUp", v ) }
            description="الشموع الخضراء"
          />
          <ColorPicker
            label="لون الهبوط"
            value={ colors.chartDown }
            onChange={ ( v ) => handleColorChange( "chartDown", v ) }
            description="الشموع الحمراء"
          />
          <ColorPicker
            label="لون محايد"
            value={ colors.chartNeutral }
            onChange={ ( v ) => handleColorChange( "chartNeutral", v ) }
          />
        </div>
      </div>

      {/* اللون الرئيسي */ }
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground/70 px-3">اللون الرئيسي</h4>
        <div className="space-y-1 border border-border rounded-xl p-2">
          <ColorPicker
            label="اللون الأساسي (Primary)"
            value={ colors.colorPrimary }
            onChange={ ( v ) => handleColorChange( "colorPrimary", v ) }
            description="الأزرار والعناصر التفاعلية"
          />
        </div>
      </div>

      {/* معاينة */ }
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground/70 px-3">معاينة</h4>
        <div className="border border-border rounded-xl p-4 space-y-3">
          {/* رسالة مستخدم */ }
          <div
            className="p-3 rounded-lg text-sm bg-[var(--preview-message-user-bg)] border border-[var(--preview-message-user-border)] text-[var(--preview-text-primary)]"
          >
            مرحباً! هذه رسالة من المستخدم
          </div>

          {/* رسالة مساعد */ }
          <div
            className="p-3 rounded-lg text-sm bg-[var(--preview-message-assistant-bg)] border border-[var(--preview-message-assistant-border)] text-[var(--preview-text-primary)]"
          >
            مرحباً! أنا المساعد الذكي، كيف يمكنني مساعدتك؟
          </div>

          {/* Input box */ }
          <div
            className="p-3 rounded-lg text-sm bg-[var(--preview-input-bg)] border border-[var(--preview-input-border)] text-[var(--preview-input-text)]"
          >
            اكتب رسالتك هنا...
          </div>

          {/* زر */ }
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[var(--preview-color-primary)]"
          >
            زر تجريبي
          </button>
        </div>
      </div>
    </div>
  );
}
