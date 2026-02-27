/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERPLEXITY TEXTS - Multi-language
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * نصوص واجهة Perplexity بجميع اللغات المدعومة
 * 
 * @version 1.0.0
 */

import { LocaleCode } from './locales';

export interface PerplexityTexts {
  // Search Phases
  searching: string;
  readingSources: string;
  analyzing: string;
  generating: string;
  
  // UI Labels
  sources: string;
  source: string;
  moreSource: string;
  moreSources: string;
  related: string;
  relatedQuestions: string;
  viewSource: string;
  copyAnswer: string;
  shareAnswer: string;
  
  // Status
  searchComplete: string;
  noResults: string;
  error: string;
  retry: string;
  
  // Agent Names
  agents: {
    general: string;
    technicalAnalysis: string;
    onChain: string;
    fundamentalAnalysis: string;
    cccwaysAcademy: string;
  };
  
  // Tools
  tools: {
    research: string;
    search: string;
  };
}

const texts: Record<LocaleCode, PerplexityTexts> = {
  ar: {
    searching: 'جارِ البحث في الويب...',
    readingSources: 'قراءة {count} مصادر',
    analyzing: 'تحليل المعلومات...',
    generating: 'توليد الإجابة...',
    sources: 'المصادر',
    source: 'مصدر',
    moreSource: 'مصدر إضافي',
    moreSources: 'مصادر إضافية',
    related: 'ذات صلة',
    relatedQuestions: 'أسئلة ذات صلة',
    viewSource: 'عرض المصدر',
    copyAnswer: 'نسخ الإجابة',
    shareAnswer: 'مشاركة',
    searchComplete: 'اكتمل البحث',
    noResults: 'لم يتم العثور على نتائج',
    error: 'حدث خطأ',
    retry: 'إعادة المحاولة',
    agents: {
      general: 'الوكيل العام',
      technicalAnalysis: 'وكيل التحليل الفني',
      onChain: 'وكيل On-Chain',
      fundamentalAnalysis: 'وكيل التحليل الأساسي',
      cccwaysAcademy: 'وكيل أكاديمية CCCWays',
    },
    tools: {
      research: 'بحث عميق',
      search: 'بحث',
    },
  },
  
  en: {
    searching: 'Searching the web...',
    readingSources: 'Reading {count} sources',
    analyzing: 'Analyzing information...',
    generating: 'Generating answer...',
    sources: 'Sources',
    source: 'Source',
    moreSource: 'more source',
    moreSources: 'more sources',
    related: 'Related',
    relatedQuestions: 'Related Questions',
    viewSource: 'View Source',
    copyAnswer: 'Copy Answer',
    shareAnswer: 'Share',
    searchComplete: 'Search complete',
    noResults: 'No results found',
    error: 'An error occurred',
    retry: 'Retry',
    agents: {
      general: 'General Agent',
      technicalAnalysis: 'Technical Analysis Agent',
      onChain: 'On-Chain Agent',
      fundamentalAnalysis: 'Fundamental Analysis Agent',
      cccwaysAcademy: 'CCCWays Academy Agent',
    },
    tools: {
      research: 'Deep Research',
      search: 'Search',
    },
  },
  
  fr: {
    searching: 'Recherche sur le web...',
    readingSources: 'Lecture de {count} sources',
    analyzing: 'Analyse des informations...',
    generating: 'Génération de la réponse...',
    sources: 'Sources',
    source: 'Source',
    moreSource: 'source supplémentaire',
    moreSources: 'sources supplémentaires',
    related: 'Connexe',
    relatedQuestions: 'Questions connexes',
    viewSource: 'Voir la source',
    copyAnswer: 'Copier la réponse',
    shareAnswer: 'Partager',
    searchComplete: 'Recherche terminée',
    noResults: 'Aucun résultat trouvé',
    error: 'Une erreur est survenue',
    retry: 'Réessayer',
    agents: {
      general: 'Agent Général',
      technicalAnalysis: 'Agent d\'Analyse Technique',
      onChain: 'Agent On-Chain',
      fundamentalAnalysis: 'Agent d\'Analyse Fondamentale',
      cccwaysAcademy: 'Agent Académie CCCWays',
    },
    tools: {
      research: 'Recherche Approfondie',
      search: 'Recherche',
    },
  },
  
  es: {
    searching: 'Buscando en la web...',
    readingSources: 'Leyendo {count} fuentes',
    analyzing: 'Analizando información...',
    generating: 'Generando respuesta...',
    sources: 'Fuentes',
    source: 'Fuente',
    moreSource: 'fuente más',
    moreSources: 'fuentes más',
    related: 'Relacionado',
    relatedQuestions: 'Preguntas relacionadas',
    viewSource: 'Ver fuente',
    copyAnswer: 'Copiar respuesta',
    shareAnswer: 'Compartir',
    searchComplete: 'Búsqueda completada',
    noResults: 'No se encontraron resultados',
    error: 'Ocurrió un error',
    retry: 'Reintentar',
    agents: {
      general: 'Agente General',
      technicalAnalysis: 'Agente de Análisis Técnico',
      onChain: 'Agente On-Chain',
      fundamentalAnalysis: 'Agente de Análisis Fundamental',
      cccwaysAcademy: 'Agente Academia CCCWays',
    },
    tools: {
      research: 'Investigación Profunda',
      search: 'Búsqueda',
    },
  },
  
  de: {
    searching: 'Suche im Web...',
    readingSources: '{count} Quellen lesen',
    analyzing: 'Informationen analysieren...',
    generating: 'Antwort generieren...',
    sources: 'Quellen',
    source: 'Quelle',
    moreSource: 'weitere Quelle',
    moreSources: 'weitere Quellen',
    related: 'Verwandt',
    relatedQuestions: 'Verwandte Fragen',
    viewSource: 'Quelle anzeigen',
    copyAnswer: 'Antwort kopieren',
    shareAnswer: 'Teilen',
    searchComplete: 'Suche abgeschlossen',
    noResults: 'Keine Ergebnisse gefunden',
    error: 'Ein Fehler ist aufgetreten',
    retry: 'Wiederholen',
    agents: {
      general: 'Allgemeiner Agent',
      technicalAnalysis: 'Technischer Analyse-Agent',
      onChain: 'On-Chain Agent',
      fundamentalAnalysis: 'Fundamentalanalyse-Agent',
      cccwaysAcademy: 'CCCWays Akademie Agent',
    },
    tools: {
      research: 'Tiefenforschung',
      search: 'Suche',
    },
  },
  
  tr: {
    searching: 'Web\'de aranıyor...',
    readingSources: '{count} kaynak okunuyor',
    analyzing: 'Bilgiler analiz ediliyor...',
    generating: 'Yanıt oluşturuluyor...',
    sources: 'Kaynaklar',
    source: 'Kaynak',
    moreSource: 'daha fazla kaynak',
    moreSources: 'daha fazla kaynak',
    related: 'İlgili',
    relatedQuestions: 'İlgili Sorular',
    viewSource: 'Kaynağı Görüntüle',
    copyAnswer: 'Yanıtı Kopyala',
    shareAnswer: 'Paylaş',
    searchComplete: 'Arama tamamlandı',
    noResults: 'Sonuç bulunamadı',
    error: 'Bir hata oluştu',
    retry: 'Tekrar Dene',
    agents: {
      general: 'Genel Ajan',
      technicalAnalysis: 'Teknik Analiz Ajanı',
      onChain: 'On-Chain Ajanı',
      fundamentalAnalysis: 'Temel Analiz Ajanı',
      cccwaysAcademy: 'CCCWays Akademi Ajanı',
    },
    tools: {
      research: 'Derin Araştırma',
      search: 'Arama',
    },
  },
  
  ru: {
    searching: 'Поиск в интернете...',
    readingSources: 'Чтение {count} источников',
    analyzing: 'Анализ информации...',
    generating: 'Генерация ответа...',
    sources: 'Источники',
    source: 'Источник',
    moreSource: 'ещё источник',
    moreSources: 'ещё источников',
    related: 'Связанные',
    relatedQuestions: 'Связанные вопросы',
    viewSource: 'Просмотр источника',
    copyAnswer: 'Копировать ответ',
    shareAnswer: 'Поделиться',
    searchComplete: 'Поиск завершён',
    noResults: 'Результаты не найдены',
    error: 'Произошла ошибка',
    retry: 'Повторить',
    agents: {
      general: 'Общий агент',
      technicalAnalysis: 'Агент технического анализа',
      onChain: 'On-Chain агент',
      fundamentalAnalysis: 'Агент фундаментального анализа',
      cccwaysAcademy: 'Агент Академии CCCWays',
    },
    tools: {
      research: 'Глубокое исследование',
      search: 'Поиск',
    },
  },
  
  zh: {
    searching: '正在搜索网页...',
    readingSources: '正在阅读 {count} 个来源',
    analyzing: '正在分析信息...',
    generating: '正在生成回答...',
    sources: '来源',
    source: '来源',
    moreSource: '更多来源',
    moreSources: '更多来源',
    related: '相关',
    relatedQuestions: '相关问题',
    viewSource: '查看来源',
    copyAnswer: '复制回答',
    shareAnswer: '分享',
    searchComplete: '搜索完成',
    noResults: '未找到结果',
    error: '发生错误',
    retry: '重试',
    agents: {
      general: '通用代理',
      technicalAnalysis: '技术分析代理',
      onChain: '链上分析代理',
      fundamentalAnalysis: '基本面分析代理',
      cccwaysAcademy: 'CCCWays学院代理',
    },
    tools: {
      research: '深度研究',
      search: '搜索',
    },
  },
  
  ja: {
    searching: 'ウェブを検索中...',
    readingSources: '{count}件のソースを読み込み中',
    analyzing: '情報を分析中...',
    generating: '回答を生成中...',
    sources: 'ソース',
    source: 'ソース',
    moreSource: '追加ソース',
    moreSources: '追加ソース',
    related: '関連',
    relatedQuestions: '関連する質問',
    viewSource: 'ソースを表示',
    copyAnswer: '回答をコピー',
    shareAnswer: '共有',
    searchComplete: '検索完了',
    noResults: '結果が見つかりませんでした',
    error: 'エラーが発生しました',
    retry: '再試行',
    agents: {
      general: '汎用エージェント',
      technicalAnalysis: 'テクニカル分析エージェント',
      onChain: 'オンチェーンエージェント',
      fundamentalAnalysis: 'ファンダメンタル分析エージェント',
      cccwaysAcademy: 'CCCWaysアカデミーエージェント',
    },
    tools: {
      research: '詳細調査',
      search: '検索',
    },
  },
  
  ko: {
    searching: '웹 검색 중...',
    readingSources: '{count}개의 소스 읽는 중',
    analyzing: '정보 분석 중...',
    generating: '답변 생성 중...',
    sources: '소스',
    source: '소스',
    moreSource: '추가 소스',
    moreSources: '추가 소스',
    related: '관련',
    relatedQuestions: '관련 질문',
    viewSource: '소스 보기',
    copyAnswer: '답변 복사',
    shareAnswer: '공유',
    searchComplete: '검색 완료',
    noResults: '결과를 찾을 수 없습니다',
    error: '오류가 발생했습니다',
    retry: '다시 시도',
    agents: {
      general: '일반 에이전트',
      technicalAnalysis: '기술 분석 에이전트',
      onChain: '온체인 에이전트',
      fundamentalAnalysis: '펀더멘탈 분석 에이전트',
      cccwaysAcademy: 'CCCWays 아카데미 에이전트',
    },
    tools: {
      research: '심층 연구',
      search: '검색',
    },
  },
};

export function getPerplexityText(locale: LocaleCode): PerplexityTexts {
  return texts[locale] || texts.ar;
}

export function formatText(text: string, params: Record<string, string | number>): string {
  let result = text;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(`{${key}}`, String(value));
  }
  return result;
}

export default texts;
