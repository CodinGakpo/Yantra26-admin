import { useEffect, useState } from "react";
import { getActivityLogs } from "../api";
import {
  ScrollText,
  RefreshCw,
  AlertCircle,
  UserPlus,
  Trash2,
  Power,
  PowerOff,
  LogIn,
  LogOut,
  Filter,
} from "lucide-react";

const AccountLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  const loadLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getActivityLogs();
      setLogs(data);
    } catch (err) {
      setError("Failed to load activity logs: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const getActionIcon = (action) => {
    switch (action) {
      case "create":
        return <UserPlus className="w-4 h-4" />;
      case "delete":
        return <Trash2 className="w-4 h-4" />;
      case "activate":
        return <Power className="w-4 h-4" />;
      case "deactivate":
        return <PowerOff className="w-4 h-4" />;
      case "login":
        return <LogIn className="w-4 h-4" />;
      case "logout":
        return <LogOut className="w-4 h-4" />;
      default:
        return <ScrollText className="w-4 h-4" />;
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case "create":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "delete":
        return "bg-red-100 text-red-700 border-red-300";
      case "activate":
        return "bg-green-100 text-green-700 border-green-300";
      case "deactivate":
        return "bg-orange-100 text-orange-700 border-orange-300";
      case "login":
        return "bg-purple-100 text-purple-700 border-purple-300";
      case "logout":
        return "bg-gray-100 text-gray-700 border-gray-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const filteredLogs =
    filter === "all" ? logs : logs.filter((log) => log.action === filter);

  const actionTypes = [
    { value: "all", label: "All Actions", icon: Filter },
    { value: "create", label: "Created", icon: UserPlus },
    { value: "delete", label: "Deleted", icon: Trash2 },
    { value: "activate", label: "Activated", icon: Power },
    { value: "deactivate", label: "Deactivated", icon: PowerOff },
  ];

  return (
    <div className="h-full flex flex-col py-6 px-4">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <ScrollText className="w-6 h-6 text-gray-700" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Activity Logs</h1>
                <p className="text-gray-600 text-sm">Monitor all account-related actions</p>
              </div>
            </div>
            <button
              onClick={loadLogs}
              disabled={loading}
              className="px-5 py-3 bg-white hover:bg-gray-50 border-2 border-gray-200 rounded-xl 
                       font-semibold transition flex items-center gap-2 disabled:opacity-50 shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2 flex-wrap">
            {actionTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  onClick={() => setFilter(type.value)}
                  className={`px-4 py-2.5 rounded-xl font-semibold transition flex items-center gap-2 border-2 ${
                    filter === type.value
                      ? "bg-black text-white border-black shadow-md"
                      : "bg-white text-gray-700 hover:bg-gray-50 border-gray-200"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {type.label}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        {/* Logs Container */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 overflow-hidden flex flex-col">
          <div className="bg-gray-50 border-b-2 border-gray-200 px-6 py-4">
            <p className="text-sm font-bold text-gray-700">
              Showing {filteredLogs.length} of {logs.length} logs
            </p>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[calc(100vh-350px)]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="h-10 w-10 border-4 border-gray-300 border-t-black rounded-full animate-spin mb-3" />
                <p className="text-gray-500 font-medium">Loading logs...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ScrollText className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-900 font-bold text-lg mb-1">No Activity Logs</p>
                <p className="text-gray-600 text-sm">
                  {filter === "all" ? "No activity recorded yet" : `No ${filter} actions found`}
                </p>
              </div>
            ) : (
              <div className="divide-y-2 divide-gray-100">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="px-6 py-5 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div
                        className={`p-3 rounded-xl border-2 flex-shrink-0 ${getActionColor(
                          log.action
                        )}`}
                      >
                        {getActionIcon(log.action)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Action badge and timestamp */}
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className={`px-3 py-1 text-xs font-bold rounded-full border-2 ${getActionColor(
                              log.action
                            )}`}
                          >
                            {log.action_display.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500 font-medium">
                            {formatTimestamp(log.timestamp)}
                          </span>
                        </div>

                        {/* Main info */}
                        <div className="mb-2">
                          <p className="text-sm text-gray-900 font-semibold mb-1">
                            Performed by:{" "}
                            <span className="font-bold text-black">
                              {log.performed_by_userid}
                            </span>{" "}
                            <span className="text-gray-600 font-normal">
                              ({log.performed_by_name || "N/A"})
                            </span>
                          </p>

                          <p className="text-sm text-gray-700">
                            Target User:{" "}
                            <span className="font-bold text-gray-900">{log.target_user}</span>
                          </p>
                        </div>

                        {/* Additional details */}
                        {log.details && (
                          <p className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-2 mb-2">
                            {log.details}
                          </p>
                        )}

                        {/* IP Address */}
                        {log.ip_address && (
                          <p className="text-xs text-gray-500 font-mono">
                            IP: {log.ip_address}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountLogs;