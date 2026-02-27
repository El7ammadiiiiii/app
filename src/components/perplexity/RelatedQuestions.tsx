/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * RELATED QUESTIONS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * أسئلة مقترحة ذات صلة بتصميم Glassmorphism
 * 
 * @version 1.0.0
 */

'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { RelatedQuestion } from '@/types/perplexity';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface RelatedQuestionsProps {
  questions: RelatedQuestion[];
  onQuestionClick?: (question: string) => void;
  className?: string;
}

const RelatedQuestions = memo(function RelatedQuestions({
  questions,
  onQuestionClick,
  className,
}: RelatedQuestionsProps) {
  const { t, isRTL } = useLocale();
  
  if (!questions.length) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className={cn('mt-6', className)}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Section Header */}
      <div className="perplexity-section-header">
        <Sparkles className="w-4 h-4 text-blue-400" />
        <span className="perplexity-section-title">{t.relatedQuestions}</span>
      </div>
      
      {/* Questions Grid */}
      <div className="perplexity-related-grid">
        {questions.slice(0, 4).map((question, index) => (
          <motion.button
            key={question.id}
            initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="perplexity-glass-card perplexity-related-card text-start"
            onClick={() => onQuestionClick?.(question.question)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Arrow Icon */}
            <div className="arrow-icon">
              <ArrowRight className="w-4 h-4" />
            </div>
            
            {/* Question Text */}
            <span className="question-text flex-1">
              {question.question}
            </span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
});

export default RelatedQuestions;
