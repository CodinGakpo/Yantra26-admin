import { useEffect, useState } from "react";
import { getIssues } from "../api";
import { useNavigate } from "react-router-dom";
import { ListChecks, Search, Filter } from "lucide-react";

const IssueList = () => {
  const [issues, setIssues] = useState([]);
  const [statusCounts, setStatusCounts] = useState({
    pending: 0,
    in_progress: 0,
    rejected: 0,
    all: 0,
  });
  const [statusFilter, setStatusFilter] = useState("all");
  const [appealFilter, setAppealFilter] = useState("all");
  const [deactivatedFilter, setDeactivatedFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    getIssues(statusFilter, {
      appeal_status: appealFilter,
      deactivated: deactivatedFilter,
    })
      .then((data) => {
        if (!mounted) return;
        setIssues(data);
      })
      .catch((err) => {
        console.error(err);
        if (!mounted) return;
        setError("Failed to load issues");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [statusFilter, appealFilter, deactivatedFilter]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getIssues("pending", {
        appeal_status: appealFilter,
        deactivated: deactivatedFilter,
      }),
      getIssues("in_progress", {
        appeal_status: appealFilter,
        deactivated: deactivatedFilter,
      }),
      getIssues("rejected", {
        appeal_status: appealFilter,
        deactivated: deactivatedFilter,
      }),
    ])
      .then(([pendingIssues, inProgressIssues, rejectedIssues]) => {
        if (!mounted) return;
        const pending = pendingIssues.length;
        const in_progress = inProgressIssues.length;
        const rejected = rejectedIssues.length;
        setStatusCounts({
          pending,
          in_progress,
          rejected,
          all: pending + in_progress + rejected,
        });
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [appealFilter, deactivatedFilter]);

  const filteredIssues = issues.filter((issue) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      issue.tracking_id?.toLowerCase().includes(query) ||
      issue.issue_title?.toLowerCase().includes(query) ||
      issue.location?.toLowerCase().includes(query)
    );
  });

  const statusOptions = [
    { value: "all", label: "All Issues", count: statusCounts.all },
    { value: "pending", label: "Pending", count: statusCounts.pending },
    { value: "in_progress", label: "In Progress", count: statusCounts.in_progress },
    { value: "rejected", label: "Rejected", count: statusCounts.rejected },
  ];

  const getStatusStyle = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "resolved":
        return "bg-green-100 text-green-800 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <ListChecks className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Issue List</h1>
            <p className="text-gray-600 text-sm">View and manage all reported issues</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by tracking ID, title, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl
                       focus:ring-2 focus:ring-black focus:border-black
                       transition text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setStatusFilter(option.value)}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all border-2 ${
                  statusFilter === option.value
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                }`}
              >
                {option.label}
                <span className="ml-2 text-xs opacity-75">({option.count})</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={appealFilter}
              onChange={(e) => setAppealFilter(e.target.value)}
              className="px-3 py-2 border-2 border-gray-200 rounded-xl text-sm font-medium bg-white"
            >
              <option value="all">All Appeals</option>
              <option value="pending">Pending Appeals</option>
              <option value="accepted">Accepted Appeals</option>
              <option value="rejected">Rejected Appeals</option>
              <option value="not_appealed">Not Appealed</option>
            </select>

            <select
              value={deactivatedFilter}
              onChange={(e) => setDeactivatedFilter(e.target.value)}
              className="px-3 py-2 border-2 border-gray-200 rounded-xl text-sm font-medium bg-white"
            >
              <option value="all">All Reporters</option>
              <option value="true">Deactivated Reporters</option>
              <option value="false">Active Reporters</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border-2 border-gray-200 overflow-hidden flex flex-col">
        {/* Table Header */}
        <div className="grid grid-cols-5 gap-4 bg-gray-50 px-6 py-4 font-bold text-xs uppercase tracking-wide text-gray-700 border-b-2 border-gray-200">
          <div>Tracking ID</div>
          <div>Issue Title</div>
          <div>Issue Date</div>
          <div>Location</div>
          <div>Status</div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-12 w-12 border-4 border-gray-200 border-t-black rounded-full animate-spin mb-4" />
              <p className="text-gray-500 text-sm font-medium">Loading issues...</p>
            </div>
          )}

          {!loading && error && (
            <div className="px-6 py-12 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Filter className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-red-600 font-semibold">{error}</p>
            </div>
          )}

          {!loading && !error && filteredIssues.length === 0 && (
            <div className="px-6 py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ListChecks className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">
                {searchQuery ? "No issues match your search" : "No issues found"}
              </p>
            </div>
          )}

          {!loading &&
            !error &&
            filteredIssues.map((issue) => (
              <div
                key={issue.tracking_id}
                onClick={() => navigate(`/dashboard/issues/${issue.tracking_id}`)}
                className="grid grid-cols-5 gap-4 px-6 py-4 border-b border-gray-100 
                         hover:bg-gray-50 cursor-pointer transition-colors group"
              >
                <div className="font-mono text-sm font-semibold text-gray-900 group-hover:text-black">
                  {issue.tracking_id}
                </div>

                <div className="font-medium text-gray-900 group-hover:text-black">
                  {issue.issue_title}
                  <div className="mt-1 flex gap-2 flex-wrap">
                    {issue.appeal_status && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                        APPEAL: {issue.appeal_status.toUpperCase()}
                      </span>
                    )}
                    {typeof issue.trust_score_delta === "number" && issue.trust_score_delta !== 0 && (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          issue.trust_score_delta > 0
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : "bg-rose-100 text-rose-800 border-rose-200"
                        }`}
                      >
                        TRUST {issue.trust_score_delta > 0 ? "+" : ""}
                        {issue.trust_score_delta}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-gray-600 text-sm">
                  {new Date(issue.issue_date).toLocaleDateString()}
                </div>

                <div className="text-gray-700 text-sm">{issue.location}</div>

                <div>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getStatusStyle(
                      issue.status
                    )}`}
                  >
                    {issue.status.replace("_", " ").toUpperCase()}
                  </span>
                  {issue.user_deactivated_until && (
                    <div className="text-[11px] text-red-700 mt-1 font-medium">
                      Deactivated till {new Date(issue.user_deactivated_until).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>

        {/* Footer */}
        {!loading && !error && filteredIssues.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t-2 border-gray-200">
            <p className="text-sm text-gray-600">
              Showing <span className="font-bold text-gray-900">{filteredIssues.length}</span> of{" "}
              <span className="font-bold text-gray-900">{issues.length}</span> issues
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IssueList;
