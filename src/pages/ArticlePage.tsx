import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useParams } from "react-router-dom";

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const article = useQuery(api.articles.getArticleBySlug, slug ? { slug } : "skip");

  if (article === undefined) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (article === null) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Article Not Found</h1>
        <p className="text-gray-600">The article you're looking for doesn't exist or has been removed.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Article Header */}
      <div className="bg-white rounded-lg shadow-sm border p-8 mb-6">
        <div className="mb-6">
          <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full mb-4">
            Published Article
          </span>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {article.title}
          </h1>
        </div>

        {/* Authors */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Authors</h3>
          <div className="flex flex-wrap gap-4">
            {article.authors.map((author, index) => (
              <div key={author.id} className="flex items-center">
                <span className="text-gray-900 font-medium">{author.name}</span>
                {author.orcid && (
                  <a
                    href={`https://orcid.org/${author.orcid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-green-600 hover:text-green-700 text-sm"
                  >
                    ORCID
                  </a>
                )}
                {index < article.authors.length - 1 && (
                  <span className="ml-2 text-gray-400">•</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Publication Details */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Published:</span>
            <span className="ml-2 text-gray-600">
              {new Date(article.publishedAt).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Language:</span>
            <span className="ml-2 text-gray-600 capitalize">{article.language}</span>
          </div>
          {article.volume && (
            <div>
              <span className="font-medium text-gray-700">Volume:</span>
              <span className="ml-2 text-gray-600">{article.volume}</span>
            </div>
          )}
          {article.issue && (
            <div>
              <span className="font-medium text-gray-700">Issue:</span>
              <span className="ml-2 text-gray-600">{article.issue}</span>
            </div>
          )}
          {article.pageNumbers && (
            <div>
              <span className="font-medium text-gray-700">Pages:</span>
              <span className="ml-2 text-gray-600">{article.pageNumbers}</span>
            </div>
          )}
          {article.doi && (
            <div>
              <span className="font-medium text-gray-700">DOI:</span>
              <a
                href={`https://doi.org/${article.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-blue-600 hover:text-blue-700"
              >
                {article.doi}
              </a>
            </div>
          )}
        </div>

        {/* Keywords */}
        {article.keywords.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Keywords</h3>
            <div className="flex flex-wrap gap-2">
              {article.keywords.map((keyword, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Abstract */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Abstract</h3>
          <p className="text-gray-700 leading-relaxed">{article.abstract}</p>
        </div>

        {/* Download Link */}
        {article.fileUrl && (
          <div className="pt-6 border-t border-gray-200">
            <a
              href={article.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Full Article (PDF)
            </a>
          </div>
        )}
      </div>

      {/* Citation Information */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">How to Cite</h3>
        <div className="bg-white p-4 rounded border font-mono text-sm text-gray-700">
          {article.authors.map(author => author.name).join(", ")} ({new Date(article.publishedAt).getFullYear()}). 
          {" "}{article.title}. <em>Cyan Science</em>
          {article.volume && `, ${article.volume}`}
          {article.issue && `(${article.issue})`}
          {article.pageNumbers && `, ${article.pageNumbers}`}
          {article.doi && `. https://doi.org/${article.doi}`}
        </div>
      </div>
    </div>
  );
}
