'use client';

/**
 * Divergence Advanced Settings
 * إعدادات متقدمة للدايفرجنس
 * 
 * Fine-tune detection engine parameters
 * ضبط دقيق لمعلمات محرك الكشف
 */

import React, { useState, useEffect } from 'react';
import { ExtendedIndicatorType } from '@/lib/scanners/divergence-types-catalog';

interface AdvancedSettings {
  // Detection Settings
  detection: {
    minBars: number;           // 10-100
    maxBars: number;           // 20-200
    minProminence: number;     // 0.1-5.0
    slopeThreshold: number;    // 0.01-1.0
    strictMode: boolean;
    useWickAnalysis: boolean;
    // 🆕 إعدادات التزامن والنطاق
    pivotRange: number;        // 2-7 (نطاق البحث عن القمم/القيعان)
    maxSyncOffset: number;     // 0-5 (الحد الأقصى للفرق بين السعر والمؤشر)
    timeframeAdaptive: boolean; // تعديل تلقائي حسب الفريم
    pivotLookback: number;      // 1-5 (نطاق التحقق من القمة المحلية)
  };
  
  // Debug Settings
  debug: {
    enabled: boolean;          // وضع التشخيص
    logLevel: 'OFF' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'TRACE';
  };
  
  // Indicator Periods
  indicators: {
    rsiPeriod: number;         // 5-50
    macdFast: number;          // 5-26
    macdSlow: number;          // 12-52
    macdSignal: number;        // 5-20
    obvSmooth: number;         // 1-20
    mfiPeriod: number;         // 5-50
    cciPeriod: number;         // 10-50
    williamsRPeriod: number;   // 5-50
    stochRsiPeriod: number;    // 5-50
    rocPeriod: number;         // 5-50
    forceIndexPeriod: number;  // 5-50
    cmfPeriod: number;         // 10-50
  };
  
  // Validation Settings
  validation: {
    minLineIntegrity: number;  // 0-100%
    volumeConfirmation: boolean;
    volumeWeight: number;      // 0-2.0
    multiTimeframeConfirmation: boolean;
  };
  
  // Performance Settings
  performance: {
    maxParallelScans: number;  // 1-8
    cacheDuration: number;     // 60-600 seconds
    enableProgressiveLoading: boolean;
  };
}

const DEFAULT_SETTINGS: AdvancedSettings = {
  detection: {
    minBars: 20,
    maxBars: 100,
    minProminence: 1.5,
    slopeThreshold: 0.1,
    strictMode: false,
    useWickAnalysis: true,
    // 🆕 الإعدادات الافتراضية للتزامن
    pivotRange: 3,
    maxSyncOffset: 3,
    timeframeAdaptive: true,
    pivotLookback: 2
  },
  debug: {
    enabled: false,
    logLevel: 'OFF'
  },
  indicators: {
    rsiPeriod: 14,
    macdFast: 12,
    macdSlow: 26,
    macdSignal: 9,
    obvSmooth: 10,
    mfiPeriod: 14,
    cciPeriod: 20,
    williamsRPeriod: 14,
    stochRsiPeriod: 14,
    rocPeriod: 12,
    forceIndexPeriod: 13,
    cmfPeriod: 20
  },
  validation: {
    minLineIntegrity: 70,
    volumeConfirmation: true,
    volumeWeight: 1.0,
    multiTimeframeConfirmation: false
  },
  performance: {
    maxParallelScans: 4,
    cacheDuration: 120,
    enableProgressiveLoading: true
  }
};

interface DivergenceAdvancedSettingsProps {
  onSettingsChange?: (settings: AdvancedSettings) => void;
}

export function DivergenceAdvancedSettings({ 
  onSettingsChange 
}: DivergenceAdvancedSettingsProps) {
  const [settings, setSettings] = useState<AdvancedSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<'detection' | 'indicators' | 'validation' | 'performance'>('detection');

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('divergence_advanced_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings(parsed);
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = (newSettings: AdvancedSettings) => {
    setSettings(newSettings);
    localStorage.setItem('divergence_advanced_settings', JSON.stringify(newSettings));
    onSettingsChange?.(newSettings);
  };

  // Reset to defaults
  const resetToDefaults = () => {
    saveSettings(DEFAULT_SETTINGS);
  };

  return (
    <div className="template-card rounded-xl overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1a4a4d] bg-[#0f3133]">
        <button
          onClick={() => setActiveTab('detection')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'detection'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          🎯 الكشف
        </button>
        <button
          onClick={() => setActiveTab('indicators')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'indicators'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          📊 المؤشرات
        </button>
        <button
          onClick={() => setActiveTab('validation')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'validation'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          ✅ التحقق
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'performance'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          ⚡ الأداء
        </button>
        
        <div className="flex-1" />
        
        <button
          onClick={resetToDefaults}
          className="px-3 py-2 rounded-lg bg-gray-500/10 hover:bg-gray-500/20 text-gray-400 text-sm border border-gray-500/30 transition-all"
        >
          إعادة تعيين
        </button>
      </div>

      {/* Content */}
      <div className="p-6 max-h-[500px] overflow-y-auto">
        {/* Detection Tab */}
        {activeTab === 'detection' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white mb-4">إعدادات الكشف</h3>
            
            {/* Min Bars */}
            <div>
              <label className="text-sm text-gray-300 mb-2 block">
                الحد الأدنى للشموع: <span className="text-cyan-400 font-bold">{settings.detection.minBars}</span>
              </label>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={settings.detection.minBars}
                onChange={(e) => saveSettings({
                  ...settings,
                  detection: { ...settings.detection, minBars: parseInt(e.target.value) }
                })}
                className="w-full h-2 bg-[#1a4a4d] rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>10</span>
                <span>100</span>
              </div>
            </div>

            {/* Max Bars */}
            <div>
              <label className="text-sm text-gray-300 mb-2 block">
                الحد الأقصى للشموع: <span className="text-cyan-400 font-bold">{settings.detection.maxBars}</span>
              </label>
              <input
                type="range"
                min="20"
                max="200"
                step="10"
                value={settings.detection.maxBars}
                onChange={(e) => saveSettings({
                  ...settings,
                  detection: { ...settings.detection, maxBars: parseInt(e.target.value) }
                })}
                className="w-full h-2 bg-[#1a4a4d] rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>20</span>
                <span>200</span>
              </div>
            </div>

            {/* Min Prominence */}
            <div>
              <label className="text-sm text-gray-300 mb-2 block">
                أقل بروز: <span className="text-cyan-400 font-bold">{settings.detection.minProminence.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min="0.1"
                max="5.0"
                step="0.1"
                value={settings.detection.minProminence}
                onChange={(e) => saveSettings({
                  ...settings,
                  detection: { ...settings.detection, minProminence: parseFloat(e.target.value) }
                })}
                className="w-full h-2 bg-[#1a4a4d] rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0.1</span>
                <span>5.0</span>
              </div>
            </div>

            {/* Slope Threshold */}
            <div>
              <label className="text-sm text-gray-300 mb-2 block">
                حد الميل: <span className="text-cyan-400 font-bold">{settings.detection.slopeThreshold.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0.01"
                max="1.0"
                step="0.01"
                value={settings.detection.slopeThreshold}
                onChange={(e) => saveSettings({
                  ...settings,
                  detection: { ...settings.detection, slopeThreshold: parseFloat(e.target.value) }
                })}
                className="w-full h-2 bg-[#1a4a4d] rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0.01</span>
                <span>1.0</span>
              </div>
            </div>

            {/* Toggles */}
            <div className="flex items-center justify-between p-3 bg-[#0f3133] rounded-lg">
              <span className="text-sm text-gray-300">الوضع الصارم</span>
              <button
                onClick={() => saveSettings({
                  ...settings,
                  detection: { ...settings.detection, strictMode: !settings.detection.strictMode }
                })}
                className={`w-12 h-6 rounded-full transition-all ${
                  settings.detection.strictMode ? 'bg-cyan-500' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.detection.strictMode ? 'ml-6' : 'ml-1'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#0f3133] rounded-lg">
              <span className="text-sm text-gray-300">تحليل الظلال</span>
              <button
                onClick={() => saveSettings({
                  ...settings,
                  detection: { ...settings.detection, useWickAnalysis: !settings.detection.useWickAnalysis }
                })}
                className={`w-12 h-6 rounded-full transition-all ${
                  settings.detection.useWickAnalysis ? 'bg-cyan-500' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.detection.useWickAnalysis ? 'ml-6' : 'ml-1'
                }`} />
              </button>
            </div>
            
            {/* 🆕 Separator for Sync Settings */}
            <div className="border-t border-[#1a4a4d] pt-4 mt-4">
              <h4 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <span>🔄</span> إعدادات التزامن
              </h4>
              
              {/* Pivot Range */}
              <div className="mb-4">
                <label className="text-sm text-gray-300 mb-2 block">
                  نطاق البحث عن القمم/القيعان: <span className="text-cyan-400 font-bold">±{settings.detection.pivotRange}</span> شموع
                </label>
                <input
                  type="range"
                  min="2"
                  max="7"
                  step="1"
                  value={settings.detection.pivotRange}
                  onChange={(e) => saveSettings({
                    ...settings,
                    detection: { ...settings.detection, pivotRange: parseInt(e.target.value) }
                  })}
                  className="w-full h-2 bg-[#1a4a4d] rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>±2 (حساس)</span>
                  <span>±7 (صارم)</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  نطاق أصغر = قمم/قيعان أكثر | نطاق أكبر = قمم/قيعان أقوى
                </p>
              </div>
              
              {/* Max Sync Offset */}
              <div className="mb-4">
                <label className="text-sm text-gray-300 mb-2 block">
                  الحد الأقصى للتزامن: <span className={`font-bold ${
                    settings.detection.maxSyncOffset === 0 ? 'text-green-400' :
                    settings.detection.maxSyncOffset <= 2 ? 'text-yellow-400' :
                    'text-orange-400'
                  }`}>
                    {settings.detection.maxSyncOffset === 0 ? 'تطابق تام' : `±${settings.detection.maxSyncOffset} شموع`}
                  </span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="1"
                  value={settings.detection.maxSyncOffset}
                  onChange={(e) => saveSettings({
                    ...settings,
                    detection: { ...settings.detection, maxSyncOffset: parseInt(e.target.value) }
                  })}
                  className="w-full h-2 bg-[#1a4a4d] rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0 (صارم جداً)</span>
                  <span>5 (مرن)</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  الفرق المسموح بين قمة السعر وقمة المؤشر | 0 = تطابق تام فقط
                </p>
              </div>
              
              {/* Timeframe Adaptive */}
              <div className="flex items-center justify-between p-3 bg-[#0f3133] rounded-lg mb-4">
                <div>
                  <span className="text-sm text-gray-300">تعديل تلقائي حسب الفريم</span>
                  <p className="text-xs text-gray-500 mt-1">
                    {settings.detection.timeframeAdaptive 
                      ? '1H→±2, 4H→±3, Daily→±4, Weekly→±5' 
                      : 'استخدام القيم الثابتة أعلاه'}
                  </p>
                </div>
                <button
                  onClick={() => saveSettings({
                    ...settings,
                    detection: { ...settings.detection, timeframeAdaptive: !settings.detection.timeframeAdaptive }
                  })}
                  className={`w-12 h-6 rounded-full transition-all ${
                    settings.detection.timeframeAdaptive ? 'bg-cyan-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-all ${
                    settings.detection.timeframeAdaptive ? 'ml-6' : 'ml-1'
                  }`} />
                </button>
              </div>
              
              {/* Pivot Lookback */}
              <div className="mb-4">
                <label className="text-sm text-gray-300 mb-2 block">
                  نطاق التحقق من Pivot: <span className="text-cyan-400 font-bold">±{settings.detection.pivotLookback}</span> شموع
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={settings.detection.pivotLookback}
                  onChange={(e) => saveSettings({
                    ...settings,
                    detection: { ...settings.detection, pivotLookback: parseInt(e.target.value) }
                  })}
                  className="w-full h-2 bg-[#1a4a4d] rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1 (حساس)</span>
                  <span>5 (صارم)</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  يتحقق أن النقطة أعلى/أدنى من جيرانها | موحدة للسعر والمؤشر
                </p>
              </div>
            </div>
            
            {/* 🆕 Debug Mode Section */}
            <div className="border-t border-[#1a4a4d] pt-4 mt-4">
              <h4 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <span>🐛</span> وضع التشخيص
              </h4>
              
              {/* Debug Mode Toggle */}
              <div className="flex items-center justify-between p-3 bg-[#0f3133] rounded-lg mb-4">
                <div>
                  <span className="text-sm text-gray-300">تفعيل وضع Debug</span>
                  <p className="text-xs text-orange-500 mt-1">
                    ⚠️ يبطئ الأداء ويستهلك ذاكرة أكثر
                  </p>
                </div>
                <button
                  onClick={() => saveSettings({
                    ...settings,
                    debug: { ...settings.debug, enabled: !settings.debug?.enabled }
                  })}
                  className={`w-12 h-6 rounded-full transition-all ${
                    settings.debug?.enabled ? 'bg-orange-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-all ${
                    settings.debug?.enabled ? 'ml-6' : 'ml-1'
                  }`} />
                </button>
              </div>
              
              {/* Log Level Selector */}
              {settings.debug?.enabled && (
                <div className="mb-4">
                  <label className="text-sm text-gray-300 mb-2 block">
                    مستوى التسجيل: <span className="text-cyan-400 font-bold">{settings.debug.logLevel}</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['OFF', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => saveSettings({
                          ...settings,
                          debug: { ...settings.debug, logLevel: level }
                        })}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          settings.debug.logLevel === level
                            ? 'bg-cyan-500 text-white'
                            : 'bg-[#1a4a4d] text-gray-400 hover:bg-[#1a4a4d]'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    ERROR → WARN → INFO → DEBUG → TRACE (من الأقل إلى الأكثر)
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Indicators Tab */}
        {activeTab === 'indicators' && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white mb-4">فترات المؤشرات</h3>
            
            {Object.entries(settings.indicators).map(([key, value]) => {
              const labels: Record<string, string> = {
                rsiPeriod: 'RSI',
                macdFast: 'MACD Fast',
                macdSlow: 'MACD Slow',
                macdSignal: 'MACD Signal',
                obvSmooth: 'OBV Smooth',
                mfiPeriod: 'MFI',
                cciPeriod: 'CCI',
                williamsRPeriod: 'Williams %R',
                stochRsiPeriod: 'Stoch RSI',
                rocPeriod: 'ROC',
                forceIndexPeriod: 'Force Index',
                cmfPeriod: 'CMF'
              };
              
              return (
                <div key={key} className="flex items-center gap-3 p-2 bg-[#0f3133] rounded-lg">
                  <div className="w-32 text-sm text-gray-300">{labels[key]}</div>
                  <input
                    type="number"
                    min="5"
                    max="52"
                    value={value}
                    onChange={(e) => saveSettings({
                      ...settings,
                      indicators: { ...settings.indicators, [key]: parseInt(e.target.value) }
                    })}
                    className="flex-1 px-3 py-1.5 bg-[#1a4a4d] border border-[#1a4a4d] rounded text-white text-sm"
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Validation Tab */}
        {activeTab === 'validation' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white mb-4">إعدادات التحقق</h3>
            
            {/* Line Integrity */}
            <div>
              <label className="text-sm text-gray-300 mb-2 block">
                الحد الأدنى لسلامة الخط: <span className="text-cyan-400 font-bold">{settings.validation.minLineIntegrity}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={settings.validation.minLineIntegrity}
                onChange={(e) => saveSettings({
                  ...settings,
                  validation: { ...settings.validation, minLineIntegrity: parseInt(e.target.value) }
                })}
                className="w-full h-2 bg-[#1a4a4d] rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Volume Weight */}
            <div>
              <label className="text-sm text-gray-300 mb-2 block">
                وزن الحجم: <span className="text-cyan-400 font-bold">{settings.validation.volumeWeight.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="2.0"
                step="0.1"
                value={settings.validation.volumeWeight}
                onChange={(e) => saveSettings({
                  ...settings,
                  validation: { ...settings.validation, volumeWeight: parseFloat(e.target.value) }
                })}
                className="w-full h-2 bg-[#1a4a4d] rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Toggles */}
            <div className="flex items-center justify-between p-3 bg-[#0f3133] rounded-lg">
              <span className="text-sm text-gray-300">تأكيد الحجم</span>
              <button
                onClick={() => saveSettings({
                  ...settings,
                  validation: { ...settings.validation, volumeConfirmation: !settings.validation.volumeConfirmation }
                })}
                className={`w-12 h-6 rounded-full transition-all ${
                  settings.validation.volumeConfirmation ? 'bg-cyan-500' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.validation.volumeConfirmation ? 'ml-6' : 'ml-1'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#0f3133] rounded-lg">
              <span className="text-sm text-gray-300">تأكيد متعدد الأطر</span>
              <button
                onClick={() => saveSettings({
                  ...settings,
                  validation: { ...settings.validation, multiTimeframeConfirmation: !settings.validation.multiTimeframeConfirmation }
                })}
                className={`w-12 h-6 rounded-full transition-all ${
                  settings.validation.multiTimeframeConfirmation ? 'bg-cyan-500' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.validation.multiTimeframeConfirmation ? 'ml-6' : 'ml-1'
                }`} />
              </button>
            </div>
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white mb-4">إعدادات الأداء</h3>
            
            {/* Max Parallel Scans */}
            <div>
              <label className="text-sm text-gray-300 mb-2 block">
                الحد الأقصى للمسح المتزامن: <span className="text-cyan-400 font-bold">{settings.performance.maxParallelScans}</span>
              </label>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={settings.performance.maxParallelScans}
                onChange={(e) => saveSettings({
                  ...settings,
                  performance: { ...settings.performance, maxParallelScans: parseInt(e.target.value) }
                })}
                className="w-full h-2 bg-[#1a4a4d] rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1</span>
                <span>8</span>
              </div>
            </div>

            {/* Cache Duration */}
            <div>
              <label className="text-sm text-gray-300 mb-2 block">
                مدة التخزين المؤقت: <span className="text-cyan-400 font-bold">{settings.performance.cacheDuration}s</span>
              </label>
              <input
                type="range"
                min="60"
                max="600"
                step="30"
                value={settings.performance.cacheDuration}
                onChange={(e) => saveSettings({
                  ...settings,
                  performance: { ...settings.performance, cacheDuration: parseInt(e.target.value) }
                })}
                className="w-full h-2 bg-[#1a4a4d] rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>60s</span>
                <span>600s</span>
              </div>
            </div>

            {/* Progressive Loading */}
            <div className="flex items-center justify-between p-3 bg-[#0f3133] rounded-lg">
              <span className="text-sm text-gray-300">التحميل التدريجي</span>
              <button
                onClick={() => saveSettings({
                  ...settings,
                  performance: { ...settings.performance, enableProgressiveLoading: !settings.performance.enableProgressiveLoading }
                })}
                className={`w-12 h-6 rounded-full transition-all ${
                  settings.performance.enableProgressiveLoading ? 'bg-cyan-500' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.performance.enableProgressiveLoading ? 'ml-6' : 'ml-1'
                }`} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DivergenceAdvancedSettings;
