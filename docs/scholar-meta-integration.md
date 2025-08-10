# Google Scholar Meta Tags Integration Guide

This guide explains how to integrate Google Scholar-compatible meta tags into your Cyan Science journal application.

## Overview

The `ScholarMeta` component automatically generates Highwire Press format meta tags that Google Scholar uses to index academic articles. It handles:

- Language detection and consistency
- Author name parsing and formatting
- Canonical PDF and HTML URLs
- Bibliographic metadata (DOI, volume, issue, pages)
- Validation of generated tags

## Current Integration

The component is already integrated into your `ArticleViewerPage` component. Here's how it works:

### 1. Article Data Transformation

```tsx
// Transform article data for ScholarMeta component
const scholarArticle = {
  ...article,
  authors: article.authors.map(author => ({
    name: author.name,
    givenName: author.name.split(' ').slice(0, -1).join(' ') || '',
    familyName: author.name.split(' ').slice(-1)[0] || author.name
  })),
  pdfUrl: article.fileUrl || undefined
};
```

### 2. Meta Tag Injection

```tsx
<ScholarMeta 
  article={scholarArticle} 
  baseUrl={window.location.origin} 
/>
```

## Generated Meta Tags

For each article, the component generates:

### Required Tags
- `citation_language` - Article language (auto-detected)
- `citation_title` - Article title
- `citation_author` - One per author (LastName, FirstName format)
- `citation_publication_date` - Publication date (YYYY/MM/DD)
- `citation_pdf_url` - Direct PDF link

### Optional Tags (when data available)
- `citation_journal_title` - "Cyan Science"
- `citation_volume` - Volume number
- `citation_issue` - Issue number
- `citation_firstpage` / `citation_lastpage` - Page range
- `citation_doi` - Digital Object Identifier
- `citation_keywords` - Semicolon-separated keywords
- `citation_abstract_html_url` - Abstract page URL
- `citation_fulltext_html_url` - Full article URL

### Dublin Core Fallbacks
- `DC.title`, `DC.creator`, `DC.date`, `DC.identifier`, `DC.language`

## Language Detection

The component uses a two-tier language detection system:

1. **Primary**: Uses the `langdetect` library (already in your dependencies)
2. **Fallback**: Heuristic detection based on common words

Languages are detected from the article title and abstract, ensuring all meta tags use consistent language codes.

## Validation

Use the validation helper to check for issues:

```tsx
import { validateScholarMeta } from '@/components/ScholarMeta';

// After page load
const issues = validateScholarMeta(document);
if (issues.length > 0) {
  console.warn('Scholar meta validation issues:', issues);
}
```

Common validation checks:
- Missing required tags
- Language inconsistencies
- Duplicate language declarations
- Content-language mismatches

## Testing

Run the test suite:

```bash
npm test ScholarMeta
```

Tests cover:
- English and Spanish article rendering
- Author name parsing
- Missing field handling
- Validation function accuracy

## Best Practices

### 1. PDF Accessibility
Ensure your PDF files are publicly accessible:
```tsx
// In your Convex articles query
const fileUrl = await ctx.storage.getUrl(article.finalFileId);
```

### 2. Consistent Metadata
Keep article metadata consistent between database and display:
- Use the same publication date format
- Maintain author name consistency
- Ensure language codes match content

### 3. SEO Integration
The component works alongside standard SEO meta tags:
```tsx
useEffect(() => {
  if (article) {
    document.title = `${article.title} - Cyan Science`;
    
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', article.abstract.substring(0, 160) + '...');
  }
}, [article]);
```

## Troubleshooting

### Common Issues

1. **Missing PDF URLs**: Ensure `ctx.storage.getUrl()` returns valid URLs
2. **Language Detection Errors**: Check that article content has sufficient text
3. **Author Name Parsing**: Verify author names follow "FirstName LastName" format
4. **Date Format Issues**: Ensure `publishedAt` is a valid timestamp

### Debug Mode

Add debug logging to check generated tags:
```tsx
useEffect(() => {
  const metaTags = document.querySelectorAll('meta[name^="citation_"]');
  console.log('Generated Scholar meta tags:', Array.from(metaTags).map(tag => ({
    name: tag.getAttribute('name'),
    content: tag.getAttribute('content')
  })));
}, [article]);
```

## Future Enhancements

Consider these improvements:

1. **Multilingual Support**: Generate separate meta tag blocks for each language version
2. **Enhanced Language Detection**: Integrate more sophisticated language detection
3. **Citation Formats**: Support additional citation formats beyond Highwire
4. **Automated Validation**: Add runtime validation in development mode

## Google Scholar Indexing

After implementing these meta tags:

1. **Submit to Google Scholar**: Use Google Scholar's inclusion request form
2. **Monitor Indexing**: Check Google Scholar for your articles periodically
3. **Validate URLs**: Ensure all PDF and HTML URLs remain accessible
4. **Update Sitemaps**: Include article URLs in your XML sitemap

The meta tags should significantly improve your articles' discoverability in Google Scholar search results.
