import React from 'react';
import { Id } from '../../convex/_generated/dataModel';
import { detectLanguage } from '../lib/languageUtils';

export interface ArticleData {
  _id: Id<"articles">;
  title: string;
  abstract: string;
  keywords: string[];
  language: string;
  finalFileId: Id<"_storage">;
  slug: string;
  publishedAt: number;
  doi?: string;
  volume?: string;
  issue?: string;
  pageNumbers?: string;
  authors?: Array<{
    name: string;
    givenName?: string;
    familyName?: string;
  }>;
  pdfUrl?: string;
}

export interface ScholarMetaProps {
  article: ArticleData;
  baseUrl?: string;
}



/**
 * Formats a date as YYYY/MM/DD for Google Scholar
 */
function formatScholarDate(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

/**
 * Parses author name into given and family names
 */
function parseAuthorName(name: string): { givenName: string; familyName: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return { givenName: '', familyName: parts[0] };
  }
  
  // Assume last part is family name, rest are given names
  const familyName = parts[parts.length - 1];
  const givenName = parts.slice(0, -1).join(' ');
  
  return { givenName, familyName };
}

/**
 * Validates Google Scholar meta tags
 */
export function validateScholarMeta(document: Document): string[] {
  const issues: string[] = [];
  
  // Get all meta tags
  const metaTags = Array.from(document.querySelectorAll('meta[name^="citation_"]'));
  
  // Check for required tags
  const requiredTags = ['citation_title', 'citation_author', 'citation_publication_date', 'citation_pdf_url'];
  for (const required of requiredTags) {
    if (!metaTags.some(tag => tag.getAttribute('name') === required)) {
      issues.push(`Missing required tag: ${required}`);
    }
  }
  
  // Check for language consistency
  const languageTags = metaTags.filter(tag => tag.getAttribute('name') === 'citation_language');
  const languages = languageTags.map(tag => tag.getAttribute('content')).filter(Boolean);
  const uniqueLanguages = [...new Set(languages)];
  
  if (uniqueLanguages.length > 1) {
    issues.push(`Multiple languages found in citation_language tags: ${uniqueLanguages.join(', ')}`);
  }
  
  // Check for duplicate languages in content
  const contentTags = metaTags.filter(tag => 
    ['citation_title', 'citation_abstract_html_url', 'citation_keywords'].includes(tag.getAttribute('name') || '')
  );
  
  for (const tag of contentTags) {
    const content = tag.getAttribute('content') || '';
    const detectedLang = detectLanguage(content);
    if (languages.length > 0 && !languages.includes(detectedLang)) {
      issues.push(`Content language mismatch in ${tag.getAttribute('name')}: detected ${detectedLang}, expected ${languages[0]}`);
    }
  }
  
  return issues;
}

/**
 * Google Scholar Meta Tags Component
 * Generates Highwire Press meta tags for academic articles
 */
export default function ScholarMeta({ article, baseUrl = '' }: ScholarMetaProps) {
  // Detect primary language from title and abstract
  const primaryLanguage = article.language || detectLanguage(`${article.title} ${article.abstract}`);
  
  // Format publication date
  const publicationDate = formatScholarDate(article.publishedAt);
  
  // Generate PDF URL
  const pdfUrl = article.pdfUrl || `${baseUrl}/api/files/${article.finalFileId}`;
  
  // Generate canonical URL
  const canonicalUrl = `${baseUrl}/article/${article.slug}`;
  
  // Parse authors
  const authors = article.authors || [];
  
  return (
    <>
      {/* Language */}
      <meta name="citation_language" content={primaryLanguage} />
      
      {/* Title */}
      <meta name="citation_title" content={article.title} />
      
      {/* Authors */}
      {authors.map((author, index) => {
        const { givenName, familyName } = author.givenName && author.familyName 
          ? { givenName: author.givenName, familyName: author.familyName }
          : parseAuthorName(author.name);
        
        return (
          <meta 
            key={`author-${index}`}
            name="citation_author" 
            content={`${familyName}, ${givenName}`.replace(/, $/, '')} 
          />
        );
      })}
      
      {/* Publication Date */}
      <meta name="citation_publication_date" content={publicationDate} />
      
      {/* Journal/Publisher Info */}
      <meta name="citation_journal_title" content="Cyan Science" />
      
      {/* Volume and Issue */}
      {article.volume && (
        <meta name="citation_volume" content={article.volume} />
      )}
      {article.issue && (
        <meta name="citation_issue" content={article.issue} />
      )}
      
      {/* Page Numbers */}
      {article.pageNumbers && (
        <meta name="citation_firstpage" content={article.pageNumbers.split('-')[0]} />
      )}
      {article.pageNumbers && article.pageNumbers.includes('-') && (
        <meta name="citation_lastpage" content={article.pageNumbers.split('-')[1]} />
      )}
      
      {/* DOI */}
      {article.doi && (
        <meta name="citation_doi" content={article.doi} />
      )}
      
      {/* Abstract */}
      <meta name="citation_abstract_html_url" content={canonicalUrl} />
      
      {/* Keywords */}
      {article.keywords.length > 0 && (
        <meta name="citation_keywords" content={article.keywords.join('; ')} />
      )}
      
      {/* PDF URL - Most important for Google Scholar */}
      <meta name="citation_pdf_url" content={pdfUrl} />
      
      {/* Additional URLs */}
      <meta name="citation_fulltext_html_url" content={canonicalUrl} />
      
      {/* Dublin Core fallbacks (only if required values are missing) */}
      <meta name="DC.title" content={article.title} />
      <meta name="DC.creator" content={authors.map(a => a.name).join('; ')} />
      <meta name="DC.date" content={new Date(article.publishedAt).toISOString().split('T')[0]} />
      <meta name="DC.identifier" content={article.doi || canonicalUrl} />
      <meta name="DC.language" content={primaryLanguage} />
    </>
  );
}
