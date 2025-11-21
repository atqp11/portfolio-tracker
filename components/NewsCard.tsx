interface NewsArticle {
  title: string;
  description?: string;
  url: string;
  source: string;
  publishedAt: string;
}

interface NewsCardProps {
  article: NewsArticle;
  className?: string;
}

export function NewsCard({ article, className = '' }: NewsCardProps) {
  return (
    <div className={`border-b border-gray-200 dark:border-gray-700 pb-3 last:border-b-0 ${className}`}>
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium hover:underline"
      >
        {article.title}
      </a>
      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
        {article.source} • {new Date(article.publishedAt).toLocaleDateString()}
      </div>
      {article.description && (
        <div className="text-sm text-gray-700 dark:text-gray-300 mt-2 line-clamp-2">
          {article.description}
        </div>
      )}
    </div>
  );
}

export default NewsCard;