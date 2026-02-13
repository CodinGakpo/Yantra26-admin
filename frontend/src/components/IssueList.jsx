import { useEffect, useState } from "react";
import { getIssues } from "../api";
import { useNavigate } from "react-router-dom";
import { ListChecks, Search, Filter } from "lucide-react";

const IssueList = () => {
  const [issues, setIssues] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    getIssues(statusFilter)
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
  }, [statusFilter]);

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
    { value: "all", label: "All Issues", count: issues.length },
    { value: "pending", label: "Pending", count: issues.filter(i => i.status === "pending").length },
    { value: "in_progress", label: "In Progress", count: issues.filter(i => i.status === "in_progress").length },
  ];

  const getStatusStyle = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "resolved":
        return "bg-green-100 text-green-800 border-green-200";
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
        <div className="flex flex-col sm:flex-row gap-3">
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

          {/* Status Filter */}
          <div className="flex gap-2">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setStatusFilter(option.value)}
                className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all border-2 ${
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