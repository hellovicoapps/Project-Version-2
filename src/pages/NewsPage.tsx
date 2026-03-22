import { useState, useEffect, useMemo } from "react";
import { 
  Search, 
  SortAsc, 
  SortDesc, 
  ChevronLeft, 
  ChevronRight, 
  Newspaper,
  Loader2,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { postService } from "../services/postService";
import { Post } from "../types";

const POSTS_PER_PAGE = 9;

export default function NewsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoading(true);
        const data = await postService.fetchPosts();
        setPosts(data);
        setError(null);
      } catch (err) {
        setError("Failed to load news posts. Please try again later.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadPosts();
  }, []);

  const filteredAndSortedPosts = useMemo(() => {
    let result = posts.filter(post => 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.body.toLowerCase().includes(searchQuery.toLowerCase())
    );

    result.sort((a, b) => {
      if (sortOrder === "asc") {
        return a.title.localeCompare(b.title);
      } else {
        return b.title.localeCompare(a.title);
      }
    });

    return result;
  }, [posts, searchQuery, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedPosts.length / POSTS_PER_PAGE);
  const paginatedPosts = filteredAndSortedPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  // Reset to first page when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-12 h-12 text-[var(--brand-primary)] animate-spin" />
        <p className="text-[var(--text-muted)] font-medium">Fetching latest news...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center px-4">
        <div className="p-4 bg-rose-500/10 rounded-full">
          <AlertCircle className="w-12 h-12 text-rose-500" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text-main)]">Oops! Something went wrong</h2>
        <p className="text-[var(--text-muted)] max-w-md">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-[var(--brand-primary)] text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-[var(--text-main)] flex items-center gap-3">
            <Newspaper className="w-10 h-10 text-[var(--brand-primary)]" />
            Latest News
          </h1>
          <p className="text-[var(--text-muted)] mt-2">
            Stay updated with the latest insights and announcements.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          {/* Search Bar */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)] group-focus-within:text-[var(--brand-primary)] transition-colors" />
            <input 
              type="text"
              placeholder="Search news..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-3 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all"
            />
          </div>

          {/* Sort Button */}
          <button 
            onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl hover:bg-[var(--bg-main)] transition-colors text-[var(--text-main)] font-medium"
          >
            {sortOrder === "asc" ? <SortAsc className="w-5 h-5" /> : <SortDesc className="w-5 h-5" />}
            <span>Sort {sortOrder === "asc" ? "A-Z" : "Z-A"}</span>
          </button>
        </div>
      </div>

      {/* Posts Grid */}
      {paginatedPosts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {paginatedPosts.map((post) => (
              <motion.div
                key={post.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl p-6 hover:shadow-2xl hover:shadow-[var(--brand-primary)]/5 transition-all duration-300 flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-xs font-bold rounded-full uppercase tracking-wider">
                    Post #{post.id}
                  </span>
                  <span className="text-[var(--text-muted)] text-xs font-medium">
                    User {post.userId}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-[var(--text-main)] mb-3 line-clamp-2 group-hover:text-[var(--brand-primary)] transition-colors">
                  {post.title}
                </h3>
                <p className="text-[var(--text-muted)] leading-relaxed line-clamp-4 flex-1">
                  {post.body}
                </p>
                <div className="mt-6 pt-6 border-t border-[var(--border-main)] flex items-center justify-between">
                  <button className="text-[var(--brand-primary)] font-semibold text-sm hover:underline">
                    Read More
                  </button>
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-[var(--bg-card)] bg-[var(--bg-main)] flex items-center justify-center text-[10px] font-bold">
                        {String.fromCharCode(64 + i)}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="p-6 bg-[var(--bg-card)] rounded-full">
            <Search className="w-12 h-12 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-xl font-bold text-[var(--text-main)]">No results found</h3>
          <p className="text-[var(--text-muted)]">
            We couldn't find any news matching "{searchQuery}".
          </p>
          <button 
            onClick={() => setSearchQuery("")}
            className="text-[var(--brand-primary)] font-semibold hover:underline"
          >
            Clear search
          </button>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-8">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-3 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--bg-main)] transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 px-4">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                if (totalPages <= 7) return true;
                return Math.abs(page - currentPage) <= 2 || page === 1 || page === totalPages;
              })
              .map((page, index, array) => (
                <div key={page} className="flex items-center gap-2">
                  {index > 0 && array[index - 1] !== page - 1 && (
                    <span className="text-[var(--text-muted)]">...</span>
                  )}
                  <button 
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-xl font-bold transition-all ${
                      currentPage === page 
                        ? "bg-[var(--brand-primary)] text-white shadow-lg shadow-[var(--brand-primary)]/20" 
                        : "bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)]"
                    }`}
                  >
                    {page}
                  </button>
                </div>
              ))}
          </div>

          <button 
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="p-3 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--bg-main)] transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
