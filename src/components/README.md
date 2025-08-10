# Google Scholar Meta Tags Component

This component generates Google Scholar-compatible meta tags for academic articles following the Highwire Press format.

## Features

- **Language Detection**: Automatically detects the primary language of articles and ensures consistent language tagging
- **Author Parsing**: Handles author names in various formats, maintaining proper given-name/family-name order
- **Canonical URLs**: Generates proper PDF and HTML URLs for Google Scholar indexing
- **Validation**: Includes validation helper to check for common meta tag issues
- **Bilingual Support**: Designed to handle multiple language versions (generate separate blocks for each language)

## Usage

### Basic Implementation

```tsx
import ScholarMeta from '@/components/ScholarMeta';

// In your article page component
export default function ArticlePage({ article }: { article: ArticleData }) {
  return (
    <>
      <head>
        <ScholarMeta 
          article={article} 
          baseUrl="https://your-domain.com" 
        />
      </head>
      {/* Rest of your page content */}
    </>
  );
}
```

### With Next.js App Router

```tsx
// app/article/[slug]/page.tsx
import { Metadata } from 'next';
import ScholarMeta from '@/components/ScholarMeta';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const article = await getArticleBySlug(params.slug);
  
  return {
    title: article.title,
    description: article.abstract,
    // Other standard meta tags
  };
}

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const article = getArticleBySlug(params.slug);
  
  return (
    <>
      <ScholarMeta 
        article={article} 
        baseUrl={process.env.NEXT_PUBLIC_BASE_URL || ''} 
      />
      {/* Article content */}
    </>
  );
}
```

### Integration with Your Current App

For your existing Convex-based application, integrate the component in your `ArticleViewerPage`:

```tsx
// src/pages/ArticleViewerPage.tsx
import ScholarMeta from '../components/ScholarMeta';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export default function ArticleViewerPage() {
  const { slug } = useParams();
  const article = useQuery(api.articles.getBySlug, { slug: slug || "" });
  
  if (!article) return <div>Loading...</div>;
  
  return (
    <>
      <ScholarMeta 
        article={article} 
        baseUrl={window.location.origin} 
      />
      {/* Existing article content */}
    </>
  );
}
```

## Data Requirements

The component expects an `ArticleData` object with the following structure:

```typescript
interface ArticleData {
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
```

## Validation

Use the validation helper to check for common issues:

```tsx
import { validateScholarMeta } from '@/components/ScholarMeta';

// After rendering the component
const issues = validateScholarMeta(document);
if (issues.length > 0) {
  console.warn('Scholar meta validation issues:', issues);
}
```

## Language Support

The component automatically detects article language and ensures all meta tags use consistent language. For bilingual articles, render separate `ScholarMeta` components:

```tsx
// For bilingual articles
{article.translations?.map(translation => (
  <ScholarMeta 
    key={translation.language}
    article={{...article, ...translation}} 
    baseUrl={baseUrl} 
  />
))}
```

## Generated Meta Tags

The component generates the following Highwire Press meta tags:

- `citation_language` - Article language
- `citation_title` - Article title
- `citation_author` - One tag per author (LastName, FirstName format)
- `citation_publication_date` - Publication date (YYYY/MM/DD)
- `citation_journal_title` - Journal name
- `citation_volume` - Volume number (if available)
- `citation_issue` - Issue number (if available)
- `citation_firstpage` / `citation_lastpage` - Page numbers (if available)
- `citation_doi` - DOI (if available)
- `citation_keywords` - Semicolon-separated keywords
- `citation_pdf_url` - Direct PDF link (most important for Google Scholar)
- `citation_fulltext_html_url` - HTML version URL
- `citation_abstract_html_url` - Abstract URL

Plus Dublin Core fallbacks for compatibility.

## Testing

Run the test suite:

```bash
npm test ScholarMeta
```

The tests validate:
- Correct meta tag generation for English and Spanish articles
- Author name parsing and formatting
- Language detection and consistency
- Validation function accuracy
- Handling of missing optional fields

## Notes

- The PDF URL (`citation_pdf_url`) is the most critical tag for Google Scholar indexing
- Ensure your PDF files are publicly accessible at the provided URLs
- Language detection uses simple heuristics - consider integrating a more sophisticated language detection library for production use
- The component follows Google Scholar's preference for Highwire Press format over Dublin Core
