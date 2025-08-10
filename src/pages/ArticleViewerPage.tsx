import { useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import ScholarMeta from "../components/ScholarMeta";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker to use the local version
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString();

export default function ArticleViewerPage() {
  const { slug } = useParams<{ slug: string }>();
  const article = useQuery(api.articles.getArticleBySlug, slug ? { slug } : "skip");
  const [numPages, setNumPages] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"pdf" | "html">("pdf");

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  // Add meta tags to document head - always call useEffect
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

  if (article === undefined) {
    return <div className="text-center p-8">Loading article...</div>;
  }

  if (article === null) {
    return <div className="text-center p-8">Article not found.</div>;
  }

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



  return (
    <>
      <ScholarMeta 
        article={scholarArticle} 
        baseUrl={window.location.origin} 
      />
      <div className="max-w-5xl mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">{article.title}</h1>
        <div className="text-md text-gray-600 mb-4">
          <p><strong>Authors:</strong> {article.authors.map(a => a.name).join(", ")}</p>
          <p><strong>Published:</strong> {new Date(article.publishedAt).toLocaleDateString()}</p>
          {article.doi && <p><strong>DOI:</strong> <a href={`https://doi.org/${article.doi}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{article.doi}</a></p>}
          {article.fileUrl && (
            <p><strong>PDF:</strong> <a href={article.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Download PDF</a></p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {article.keywords.map((keyword, index) => (
            <span key={index} className="px-2 py-1 bg-gray-200 text-gray-800 text-xs rounded-full">
              {keyword}
            </span>
          ))}
        </div>
      </header>

      <div className="border-b border-gray-200 mb-6">
        <div className="flex justify-between items-center">
          <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("pdf")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "pdf"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            PDF View
          </button>
          <button
            onClick={() => setActiveTab("html")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "html"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Abstract
          </button>
          </nav>
          {article.fileUrl && (
            <a
              href={article.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              📄 Download PDF
            </a>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === 'pdf' && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">PDF Viewer</h2>
            {article.fileUrl ? (
              <div className="pdf-container border rounded-lg overflow-hidden">
                <Document
                  file={article.fileUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={(error) => toast.error(`Failed to load PDF: ${error.message}`)}
                  className="flex flex-col items-center"
                >
                  {Array.from(new Array(numPages), (el, index) => (
                    <Page
                      key={`page_${index + 1}`}
                      pageNumber={index + 1}
                      className="mb-4 shadow-lg"
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  ))}
                </Document>
              </div>
            ) : (
              <p>No PDF file available for this article.</p>
            )}
          </div>
        )}

        {activeTab === 'html' && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Abstract</h2>
            <div className="prose max-w-none">
              <ReactMarkdown>{article.abstract}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
