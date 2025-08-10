import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Link } from "react-router-dom";

export default function JournalPage() {
  const articles = useQuery(api.articles.getPublishedArticles, { limit: 100 });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-8 text-center">Published Articles</h1>

      {articles === undefined && (
        <div className="text-center">Loading articles...</div>
      )}

      {articles && articles.length === 0 && (
        <div className="text-center text-gray-500">
          No articles have been published yet.
        </div>
      )}

      {articles && articles.length > 0 && (
        <div className="space-y-8">
          {articles.map((article) => (
            <div key={article._id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <h2 className="text-2xl font-semibold text-blue-700 mb-2">
                <Link to={`/article/${article.slug}`} className="hover:underline">
                  {article.title}
                </Link>
              </h2>
              <div className="text-sm text-gray-600 mb-4">
                <p>
                  Published on: {new Date(article.publishedAt).toLocaleDateString()}
                </p>
                <p>
                  Authors: {article.authors.map(a => a.name).join(", ")}
                </p>
              </div>
              <p className="text-gray-700 mb-4 line-clamp-3">
                {article.abstract}
              </p>
              <div className="flex justify-end">
                <Link to={`/article/${article.slug}`} className="text-blue-600 hover:text-blue-800 font-medium">
                  Read More &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
