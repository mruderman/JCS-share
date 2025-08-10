/**
 * Detects the primary language of text content
 * Uses the langdetect library if available, falls back to heuristic detection
 */
export function detectLanguage(text: string): string {
  try {
    // Try to use langdetect library
    const langdetect = require('langdetect');
    const detected = langdetect.detect(text);
    if (detected && detected.length > 0) {
      return detected[0].lang;
    }
  } catch (error) {
    // Fall back to heuristic detection if langdetect fails
  }
  
  // Simple heuristic-based language detection
  const spanishIndicators = /\b(el|la|los|las|de|del|en|con|por|para|que|es|son|está|están|tiene|tienen|artículo|investigación|estudio|análisis|resultados|conclusiones)\b/gi;
  const englishIndicators = /\b(the|and|or|of|in|on|at|to|for|with|by|from|that|this|is|are|was|were|have|has|had|article|research|study|analysis|results|conclusions)\b/gi;
  
  const spanishMatches = (text.match(spanishIndicators) || []).length;
  const englishMatches = (text.match(englishIndicators) || []).length;
  
  if (spanishMatches > englishMatches && spanishMatches > 3) {
    return 'es';
  }
  return 'en'; // Default to English
}

/**
 * Maps language codes to full language names
 */
export const languageNames: Record<string, string> = {
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'zh': 'Chinese',
  'ja': 'Japanese',
  'ko': 'Korean',
  'ru': 'Russian',
  'ar': 'Arabic',
};

/**
 * Gets the full language name from a language code
 */
export function getLanguageName(code: string): string {
  return languageNames[code] || code;
}
