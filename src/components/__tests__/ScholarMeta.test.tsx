import React from 'react';
import { render } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import ScholarMeta, { validateScholarMeta, ArticleData } from '../ScholarMeta';
import { Id } from '../../../convex/_generated/dataModel';

// Mock the language detection utility
jest.mock('../../lib/languageUtils', () => ({
  detectLanguage: jest.fn((text: string) => {
    if (text.includes('español') || text.includes('análisis') || text.includes('investigación')) {
      return 'es';
    }
    return 'en';
  })
}));

// Mock article data
const mockEnglishArticle: ArticleData = {
  _id: "test-id" as Id<"articles">,
  title: "Advanced Machine Learning Techniques for Data Analysis",
  abstract: "This study presents novel machine learning approaches for analyzing complex datasets. The research demonstrates significant improvements in accuracy and efficiency compared to traditional methods.",
  keywords: ["machine learning", "data analysis", "artificial intelligence", "algorithms"],
  language: "en",
  finalFileId: "file-id" as Id<"_storage">,
  slug: "advanced-ml-techniques",
  publishedAt: 1640995200000, // 2022-01-01
  doi: "10.1000/test.2022.001",
  volume: "15",
  issue: "3",
  pageNumbers: "123-145",
  authors: [
    { name: "John Smith", givenName: "John", familyName: "Smith" },
    { name: "Maria Garcia", givenName: "Maria", familyName: "Garcia" },
    { name: "Chen Wei", givenName: "Wei", familyName: "Chen" }
  ],
  pdfUrl: "https://example.com/papers/advanced-ml-techniques.pdf"
};

const mockSpanishArticle: ArticleData = {
  _id: "test-id-es" as Id<"articles">,
  title: "Técnicas Avanzadas de Aprendizaje Automático para el Análisis de Datos",
  abstract: "Este estudio presenta enfoques novedosos de aprendizaje automático para analizar conjuntos de datos complejos. La investigación demuestra mejoras significativas en precisión y eficiencia comparado con métodos tradicionales.",
  keywords: ["aprendizaje automático", "análisis de datos", "inteligencia artificial", "algoritmos"],
  language: "es",
  finalFileId: "file-id-es" as Id<"_storage">,
  slug: "tecnicas-avanzadas-ml",
  publishedAt: 1640995200000, // 2022-01-01
  doi: "10.1000/test.2022.002",
  volume: "15",
  issue: "4",
  pageNumbers: "200-220",
  authors: [
    { name: "Juan Pérez" },
    { name: "Ana López" }
  ]
};

describe('ScholarMeta Component', () => {
  let dom: JSDOM;
  let document: Document;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    document = dom.window.document;
    global.document = document;
  });

  test('renders English article meta tags correctly', () => {
    const { container } = render(
      <ScholarMeta article={mockEnglishArticle} baseUrl="https://example.com" />
    );

    // Move meta tags to document head for testing
    const metaTags = container.querySelectorAll('meta');
    metaTags.forEach(tag => document.head.appendChild(tag.cloneNode(true)));

    // Test required tags
    expect(document.querySelector('meta[name="citation_language"]')?.getAttribute('content')).toBe('en');
    expect(document.querySelector('meta[name="citation_title"]')?.getAttribute('content')).toBe(mockEnglishArticle.title);
    expect(document.querySelector('meta[name="citation_publication_date"]')?.getAttribute('content')).toBe('2022/01/01');
    expect(document.querySelector('meta[name="citation_pdf_url"]')?.getAttribute('content')).toBe(mockEnglishArticle.pdfUrl);

    // Test authors
    const authorTags = document.querySelectorAll('meta[name="citation_author"]');
    expect(authorTags).toHaveLength(3);
    expect(authorTags[0].getAttribute('content')).toBe('Smith, John');
    expect(authorTags[1].getAttribute('content')).toBe('Garcia, Maria');
    expect(authorTags[2].getAttribute('content')).toBe('Chen, Wei');

    // Test journal info
    expect(document.querySelector('meta[name="citation_journal_title"]')?.getAttribute('content')).toBe('Cyan Science');
    expect(document.querySelector('meta[name="citation_volume"]')?.getAttribute('content')).toBe('15');
    expect(document.querySelector('meta[name="citation_issue"]')?.getAttribute('content')).toBe('3');
    expect(document.querySelector('meta[name="citation_doi"]')?.getAttribute('content')).toBe(mockEnglishArticle.doi);

    // Test keywords
    expect(document.querySelector('meta[name="citation_keywords"]')?.getAttribute('content')).toBe(
      'machine learning; data analysis; artificial intelligence; algorithms'
    );

    // Test page numbers
    expect(document.querySelector('meta[name="citation_firstpage"]')?.getAttribute('content')).toBe('123');
    expect(document.querySelector('meta[name="citation_lastpage"]')?.getAttribute('content')).toBe('145');
  });

  test('renders Spanish article meta tags correctly', () => {
    const { container } = render(
      <ScholarMeta article={mockSpanishArticle} baseUrl="https://example.com" />
    );

    // Move meta tags to document head for testing
    const metaTags = container.querySelectorAll('meta');
    metaTags.forEach(tag => document.head.appendChild(tag.cloneNode(true)));

    // Test language detection
    expect(document.querySelector('meta[name="citation_language"]')?.getAttribute('content')).toBe('es');
    expect(document.querySelector('meta[name="citation_title"]')?.getAttribute('content')).toBe(mockSpanishArticle.title);

    // Test authors without explicit given/family names
    const authorTags = document.querySelectorAll('meta[name="citation_author"]');
    expect(authorTags).toHaveLength(2);
    expect(authorTags[0].getAttribute('content')).toBe('Pérez, Juan');
    expect(authorTags[1].getAttribute('content')).toBe('López, Ana');

    // Test Spanish keywords
    expect(document.querySelector('meta[name="citation_keywords"]')?.getAttribute('content')).toBe(
      'aprendizaje automático; análisis de datos; inteligencia artificial; algoritmos'
    );
  });

  test('handles missing optional fields gracefully', () => {
    const minimalArticle: ArticleData = {
      _id: "minimal-id" as Id<"articles">,
      title: "Minimal Article",
      abstract: "A minimal article for testing",
      keywords: [],
      language: "en",
      finalFileId: "file-id" as Id<"_storage">,
      slug: "minimal-article",
      publishedAt: 1640995200000,
      authors: [{ name: "Single Author" }]
    };

    const { container } = render(
      <ScholarMeta article={minimalArticle} baseUrl="https://example.com" />
    );

    // Move meta tags to document head for testing
    const metaTags = container.querySelectorAll('meta');
    metaTags.forEach(tag => document.head.appendChild(tag.cloneNode(true)));

    // Should still have required tags
    expect(document.querySelector('meta[name="citation_title"]')).toBeTruthy();
    expect(document.querySelector('meta[name="citation_author"]')).toBeTruthy();
    expect(document.querySelector('meta[name="citation_publication_date"]')).toBeTruthy();

    // Optional tags should not be present
    expect(document.querySelector('meta[name="citation_doi"]')).toBeFalsy();
    expect(document.querySelector('meta[name="citation_volume"]')).toBeFalsy();
    expect(document.querySelector('meta[name="citation_keywords"]')).toBeFalsy();
  });

  test('validates meta tags correctly', () => {
    // Create a document with valid meta tags
    const validMeta = [
      { name: 'citation_title', content: 'Test Article' },
      { name: 'citation_author', content: 'Smith, John' },
      { name: 'citation_publication_date', content: '2022/01/01' },
      { name: 'citation_pdf_url', content: 'https://example.com/test.pdf' },
      { name: 'citation_language', content: 'en' }
    ];

    validMeta.forEach(({ name, content }) => {
      const meta = document.createElement('meta');
      meta.setAttribute('name', name);
      meta.setAttribute('content', content);
      document.head.appendChild(meta);
    });

    const issues = validateScholarMeta(document);
    expect(issues).toHaveLength(0);
  });

  test('detects missing required tags', () => {
    // Create a document with missing required tags
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'citation_title');
    meta.setAttribute('content', 'Test Article');
    document.head.appendChild(meta);

    const issues = validateScholarMeta(document);
    expect(issues).toContain('Missing required tag: citation_author');
    expect(issues).toContain('Missing required tag: citation_publication_date');
    expect(issues).toContain('Missing required tag: citation_pdf_url');
  });

  test('detects language inconsistencies', () => {
    const metaTags = [
      { name: 'citation_language', content: 'en' },
      { name: 'citation_language', content: 'es' },
      { name: 'citation_title', content: 'Test Article' },
      { name: 'citation_author', content: 'Smith, John' },
      { name: 'citation_publication_date', content: '2022/01/01' },
      { name: 'citation_pdf_url', content: 'https://example.com/test.pdf' }
    ];

    metaTags.forEach(({ name, content }) => {
      const meta = document.createElement('meta');
      meta.setAttribute('name', name);
      meta.setAttribute('content', content);
      document.head.appendChild(meta);
    });

    const issues = validateScholarMeta(document);
    expect(issues.some(issue => issue.includes('Multiple languages found'))).toBe(true);
  });
});
