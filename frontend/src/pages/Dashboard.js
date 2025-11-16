import { useEffect, useState, useRef } from "react";
import { 
  fetchEmails, 
  getStoredEmails,
  formatEmailDate, 
  formatFullDate, 
  getEmailInitials 
} from "../services/emailService";
import { getUserEmailFromUrl, logout, storeUserEmail } from "../services/authService";

/**
 * Dashboard component. Fetches and displays the user's Gmail inbox using
 * the email service. Provides an enhanced UI with loading states, error handling,
 * pagination, search, and interactive email cards.
 */
export default function Dashboard() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const initialLoadDone = useRef(false);

  // Extract the email address from the URL query parameters
  const email = getUserEmailFromUrl();

  // Fetch emails on component mount
  useEffect(() => {
    const loadEmails = async () => {
      if (!email) {
        setError("No email address provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Store email for future use
        storeUserEmail(email);
        
        // Fetch fresh emails from IMAP first time
        await fetchEmails(email);
        
        // Then load from database with pagination
        await loadStoredEmails(1, "");
        initialLoadDone.current = true;
      } catch (error) {
        console.error("Failed to load emails:", error);
        setError(error.message || "Failed to load emails. Please try refreshing the page.");
      } finally {
        setLoading(false);
      }
    };
    
    loadEmails();
  }, [email]);

  // Load stored emails with pagination and search
  const loadStoredEmails = async (page = 1, search = "") => {
    try {
      setIsSearching(!!search);
      const result = await getStoredEmails(email, {
        page,
        limit: 10,
        search,
        sortBy: 'date',
        sortOrder: 'DESC'
      });
      
      setEmails(result.emails || []);
      setPagination(result.pagination || null);
      setCurrentPage(page);
    } catch (error) {
      console.error("Failed to load stored emails:", error);
      throw error;
    }
  };

  // Handle search with debounce
  useEffect(() => {
    // Only run search after initial load is complete
    if (email && initialLoadDone.current) {
      const timeoutId = setTimeout(() => {
        setLoading(true);
        loadStoredEmails(1, searchQuery)
          .finally(() => setLoading(false));
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery]);

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    setSearchQuery("");
    initialLoadDone.current = false;
    try {
      await fetchEmails(email);
      await loadStoredEmails(1, "");
      initialLoadDone.current = true;
    } catch (error) {
      setError(error.message || "Failed to refresh emails");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = async (newPage) => {
    setLoading(true);
    try {
      await loadStoredEmails(newPage, searchQuery);
    } catch (error) {
      setError(error.message || "Failed to load page");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
                <p className="text-sm text-gray-500">{email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <svg className="animate-spin h-12 w-12 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600 text-lg">Loading your emails...</p>
          </div>
        ) : error ? (
          <div className="card p-8 text-center max-w-md mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Emails</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <div>
            {/* Search Bar */}
            <div className="mb-6 flex items-center gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search emails by sender or subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 pl-12 pr-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <svg
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="px-4 py-3 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-xl transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </button>
            </div>

            {/* Email Count and Results Info */}
            <div className="mb-6 flex items-center justify-between">
              <p className="text-gray-600">
                {isSearching && searchQuery ? (
                  <>
                    Found <span className="font-semibold text-gray-900">{pagination?.totalCount || 0}</span> {pagination?.totalCount === 1 ? 'email' : 'emails'} matching "{searchQuery}"
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-gray-900">{pagination?.totalCount || 0}</span> {pagination?.totalCount === 1 ? 'email' : 'emails'} total
                  </>
                )}
              </p>
              {pagination && pagination.totalPages > 0 && (
                <p className="text-sm text-gray-500">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </p>
              )}
            </div>

            {/* Email List or Empty State */}
            {emails.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-50 rounded-full mb-4">
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">No Emails Found</h2>
                <p className="text-gray-600">
                  {searchQuery 
                    ? `No emails match "${searchQuery}". Try a different search term.`
                    : "Your inbox is empty or no emails were fetched."}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
            <div className="space-y-3">
              {emails.map((e, i) => (
                <div
                  key={i}
                  className="email-card"
                  style={{ animationDelay: `${i * 0.05}s` }}
                  onClick={() => setSelectedEmail(selectedEmail === i ? null : i)}
                >
                  <div className="flex items-start space-x-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                        {getEmailInitials(e.from)}
                      </div>
                    </div>

                    {/* Email Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {e.from}
                        </p>
                        <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                          {formatEmailDate(e.date)}
                        </span>
                      </div>
                      <p className="text-base font-medium text-gray-800 mb-1 truncate">
                        {e.subject || "(No Subject)"}
                      </p>
                      {selectedEmail === i && (
                        <div className="mt-3 pt-3 border-t border-gray-200 animate-fadeIn">
                          <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex items-start">
                              <span className="font-medium text-gray-700 min-w-[80px]">From:</span>
                              <span className="break-all">{e.from}</span>
                            </div>
                            <div className="flex items-start">
                              <span className="font-medium text-gray-700 min-w-[80px]">Date:</span>
                              <span>{formatFullDate(e.date)}</span>
                            </div>
                            <div className="flex items-start">
                              <span className="font-medium text-gray-700 min-w-[80px]">Subject:</span>
                              <span className="break-words">{e.subject || "(No Subject)"}</span>
                            </div>
                            {e.hasAttachments && (
                              <div className="flex items-start">
                                <span className="font-medium text-gray-700 min-w-[80px]">Attachments:</span>
                                <span className="flex items-center text-blue-600">
                                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                                  </svg>
                                  Has attachments
                                </span>
                              </div>
                            )}
                            {e.body && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <span className="font-medium text-gray-700 block mb-2">Message:</span>
                                <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                                  <p className="text-gray-700 whitespace-pre-wrap break-words">
                                    {e.body}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Expand Icon */}
                    <div className="flex-shrink-0">
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${selectedEmail === i ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}

            {/* Pagination Controls */}
            {emails.length > 0 && pagination && pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!pagination.hasPrevPage || loading}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Page Numbers */}
                <div className="flex items-center space-x-1">
                  {[...Array(pagination.totalPages)].map((_, idx) => {
                    const pageNum = idx + 1;
                    const isCurrentPage = pageNum === currentPage;
                    
                    // Show first page, last page, current page, and pages around current
                    const shouldShow =
                      pageNum === 1 ||
                      pageNum === pagination.totalPages ||
                      Math.abs(pageNum - currentPage) <= 1;

                    if (!shouldShow) {
                      // Show ellipsis
                      if (pageNum === 2 && currentPage > 3) {
                        return (
                          <span key={pageNum} className="px-2 text-gray-400">
                            ...
                          </span>
                        );
                      }
                      if (pageNum === pagination.totalPages - 1 && currentPage < pagination.totalPages - 2) {
                        return (
                          <span key={pageNum} className="px-2 text-gray-400">
                            ...
                          </span>
                        );
                      }
                      return null;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        disabled={loading}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isCurrentPage
                            ? "bg-blue-600 text-white"
                            : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                        } disabled:opacity-50`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!pagination.hasNextPage || loading}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}