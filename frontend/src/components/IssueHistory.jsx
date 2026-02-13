import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getIssues } from "../api";
import { History, Search, CheckCircle2, Archive } from "lucide-react";

const IssueHistory = () => {
  const navigate = useNavigate();

  const [history, setHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    getIssues("resolved")
      .then((data) => {
        if (!mounted) return;
        setHistory(data);
      })
      .catch((err) => {
        console.error(err);
        if (!mounted) return;
        setError("Failed to load issue history");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredHistory = history.filter((issue) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      issue.tracking_id?.toLowerCase().includes(query) ||
      issue.issue_title?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <History className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Issue History</h1>
            <p className="text-gray-600 text-sm">Archive of resolved issues</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search resolved issues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl
                     focus:ring-2 focus:ring-purple-500 focus:border-purple-500
                     transition text-sm"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border-2 border-gray-200 overflow-hidden flex flex-col">
        {/* Table Header */}
        <div className="grid grid-cols-4 gap-4 bg-gray-50 px-6 py-4 font-bold text-xs uppercase tracking-wide text-gray-700 border-b-2 border-gray-200">
          <div>Issue ID</div>
          <div>Title</div>
          <div>Status</div>
          <div>Resolved Date</div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-12 w-12 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin mb-4" />
              <p className="text-gray-500 text-sm font-medium">Loading issue history...</p>
            </div>
          )}

          {!loading && error && (
            <div className="px-6 py-12 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <History className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-red-600 font-semibold">{error}</p>
            </div>
          )}

          {!loading && !error && filteredHistory.length === 0 && (
            <div className="px-6 py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Archive className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-900 font-bold text-lg mb-1">No Resolved Issues</p>
              <p className="text-gray-600 text-sm">
                {searchQuery ? "No resolved issues match your search" : "No issues have been resolved yet"}
              </p>
            </div>
          )}

          {!loading &&
            !error &&
            filteredHistory.map((item) => (
              <div
                key={item.tracking_id}
                onClick={() => navigate(`/dashboard/issues/${item.tracking_id}`)}
                className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-gray-100 
                         hover:bg-purple-50 cursor-pointer transition-colors group"
              >
                <div className="font-mono text-sm font-semibold text-gray-900 group-hover:text-purple-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  {item.tracking_id}
                </div>

                <div className="font-medium text-gray-900 group-hover:text-purple-900">
                  {item.issue_title}
                </div>

                <div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    RESOLVED
                  </span>
                </div>

                <div className="text-gray-600 text-sm">
                  {new Date(item.updated_at).toLocaleDateString()}
                </div>
              </div>
            ))}
        </div>

        {/* Footer */}
        {!loading && !error && filteredHistory.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t-2 border-gray-200">
            <p className="text-sm text-gray-600">
              <span className="font-bold text-gray-900">{filteredHistory.length}</span> resolved{" "}
              {filteredHistory.length === 1 ? "issue" : "issues"} in archive
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IssueHistory;