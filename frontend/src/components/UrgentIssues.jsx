import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getIssues } from "../api";
import { AlertTriangle, Search, Flame } from "lucide-react";

const UrgentIssues = () => {
  const navigate = useNavigate();

  const [urgentIssues, setUrgentIssues] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    getIssues("escalated")
      .then((data) => {
        if (!mounted) return;
        setUrgentIssues(data);
      })
      .catch(() => {
        if (!mounted) return;
        setError("Failed to load urgent issues");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredIssues = urgentIssues.filter((issue) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      issue.tracking_id?.toLowerCase().includes(query) ||
      issue.issue_title?.toLowerCase().includes(query) ||
      issue.location?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header with Alert Design */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-2xl p-6 shadow-lg mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-8 h-8 text-red-600 animate-pulse" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-1">Urgent Issues</h1>
              <p className="text-red-100 text-sm">
                Critical issues requiring immediate attention
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-white">{urgentIssues.length}</div>
              <div className="text-xs text-red-100 uppercase tracking-wide">Escalated</div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search urgent issues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl
                     focus:ring-2 focus:ring-red-500 focus:border-red-500
                     transition text-sm"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border-2 border-red-200 overflow-hidden flex flex-col">
        {/* Table Header */}
        <div className="grid grid-cols-6 gap-4 bg-red-50 px-6 py-4 font-bold text-xs uppercase tracking-wide text-red-900 border-b-2 border-red-200">
          <div>Tracking ID</div>
          <div>Issue Title</div>
          <div>Issue Date</div>
          <div>Location</div>
          <div>Status</div>
          <div>Escalation Type</div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-12 w-12 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mb-4" />
              <p className="text-gray-500 text-sm font-medium">Loading urgent issues...</p>
            </div>
          )}

          {!loading && error && (
            <div className="px-6 py-12 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-red-600 font-semibold">{error}</p>
            </div>
          )}

          {!loading && !error && filteredIssues.length === 0 && (
            <div className="px-6 py-12 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-gray-900 font-bold text-lg mb-1">No Urgent Issues</p>
              <p className="text-gray-600 text-sm">
                {searchQuery ? "No urgent issues match your search" : "All escalated issues have been addressed"}
              </p>
            </div>
          )}

          {!loading &&
            !error &&
            filteredIssues.map((issue) => (
              <div
                key={issue.tracking_id}
                onClick={() => navigate(`/dashboard/issues/${issue.tracking_id}`)}
                className="grid grid-cols-6 gap-4 px-6 py-4 border-b border-gray-100 
                         hover:bg-red-50 cursor-pointer transition-colors group"
              >
                <div className="font-mono text-sm font-semibold text-gray-900 group-hover:text-red-900 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-red-500" />
                  {issue.tracking_id}
                </div>

                <div className="font-medium text-gray-900 group-hover:text-red-900">
                  {issue.issue_title}
                </div>

                <div className="text-gray-600 text-sm">
                  {new Date(issue.issue_date).toLocaleDateString()}
                </div>

                <div className="text-gray-700 text-sm">{issue.location}</div>

                <div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    ESCALATED
                  </span>
                </div>

                <div>
                  {issue.auto_escalated ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300">
                      AUTO-ESCALATED
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800 border border-gray-300">
                      MANUAL
                    </span>
                  )}
                </div>
              </div>
            ))}
        </div>

        {/* Footer */}
        {!loading && !error && filteredIssues.length > 0 && (
          <div className="px-6 py-4 bg-red-50 border-t-2 border-red-200">
            <p className="text-sm text-red-900">
              <span className="font-bold">{filteredIssues.length}</span> urgent {filteredIssues.length === 1 ? "issue" : "issues"} requiring immediate attention
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UrgentIssues;