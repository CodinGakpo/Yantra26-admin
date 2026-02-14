import { useEffect, useMemo, useState } from "react";
import {
  getSensorAlerts,
  acknowledgeSensorAlert,
  resolveSensorAlert,
} from "../api";
import { BellRing, Search, CheckCircle2, ShieldAlert, Clipboard, Check } from "lucide-react";

const SensorAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actioningId, setActioningId] = useState(null);
  const [copiedAlertId, setCopiedAlertId] = useState(null);

  const truncateLocation = (location, maxLength = 42) => {
    if (!location) return "N/A";
    if (location.length <= maxLength) return location;
    return `${location.slice(0, maxLength)}...`;
  };

  const copyLocation = async (alertId, location) => {
    if (!location) return;
    await navigator.clipboard.writeText(location);
    setCopiedAlertId(alertId);
    setTimeout(() => setCopiedAlertId(null), 1500);
  };

  useEffect(() => {
    let mounted = true;

    const loadAlerts = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getSensorAlerts();
        if (mounted) setAlerts(data);
      } catch (err) {
        if (mounted) setError("Failed to load sensor alerts");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadAlerts();

    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return alerts;

    return alerts.filter((item) => {
      return (
        item.sensorId?.toLowerCase().includes(query) ||
        item.hazard?.toLowerCase().includes(query) ||
        item.department?.toLowerCase().includes(query)
      );
    });
  }, [alerts, searchQuery]);

  const onAcknowledge = async (id) => {
    setActioningId(id);
    try {
      await acknowledgeSensorAlert(id);
      setAlerts((prev) =>
        prev.map((item) =>
          item.alert_id === id
            ? { ...item, isAcknowledged: true, acknowledgedAt: new Date().toISOString() }
            : item
        )
      );
    } catch (err) {
      setError("Failed to acknowledge alert");
    } finally {
      setActioningId(null);
    }
  };

  const onResolve = async (id) => {
    setActioningId(id);
    try {
      await resolveSensorAlert(id);
      setAlerts((prev) =>
        prev.map((item) =>
          item.alert_id === id
            ? { ...item, isResolved: true, status: "CLEARED", resolvedAt: new Date().toISOString() }
            : item
        )
      );
    } catch (err) {
      setError("Failed to resolve alert");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
            <BellRing className="w-6 h-6 text-amber-700" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sensor Alerts</h1>
            <p className="text-gray-600 text-sm">All ingested sensor alerts with acknowledgment workflow</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by sensor, hazard, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition text-sm"
          />
        </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-sm border-2 border-gray-200 overflow-hidden flex flex-col">
        <div className="grid grid-cols-8 gap-4 bg-gray-50 px-6 py-4 font-bold text-xs uppercase tracking-wide text-gray-700 border-b-2 border-gray-200">
          <div>Sensor</div>
          <div>Hazard</div>
          <div>Department</div>
          <div>Status</div>
          <div>Location</div>
          <div>Resolved</div>
          <div>Timestamp</div>
          <div>Actions</div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-12 w-12 border-4 border-gray-200 border-t-amber-600 rounded-full animate-spin mb-4" />
              <p className="text-gray-500 text-sm font-medium">Loading sensor alerts...</p>
            </div>
          )}

          {!loading && error && (
            <div className="px-6 py-12 text-center">
              <p className="text-red-600 font-semibold">{error}</p>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="px-6 py-12 text-center">
              <ShieldAlert className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No sensor alerts found</p>
            </div>
          )}

          {!loading &&
            !error &&
            filtered.map((item) => (
              <div
                key={item.alert_id}
                className="grid grid-cols-8 gap-4 px-6 py-4 border-b border-gray-100 hover:bg-amber-50 transition-colors"
              >
                <div className="font-mono text-sm font-semibold text-gray-900">{item.sensorId}</div>
                <div className="text-sm text-gray-800">{item.hazard}</div>
                <div className="text-sm text-gray-700">{item.department}</div>
                <div>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                      item.status === "TRIGGERED"
                        ? "bg-red-100 text-red-800 border-red-200"
                        : "bg-green-100 text-green-800 border-green-200"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <div className="text-sm text-gray-700">
                  <button
                    onClick={() => copyLocation(item.alert_id, item.location)}
                    title={item.location || "No location"}
                    className="inline-flex items-center gap-2 max-w-full text-left hover:text-black transition-colors"
                  >
                    <span className="truncate inline-block max-w-[230px]">{truncateLocation(item.location)}</span>
                    {copiedAlertId === item.alert_id ? (
                      <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <Clipboard className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    )}
                  </button>
                </div>
                <div className="text-sm text-gray-700">{item.isResolved ? "Yes" : "No"}</div>
                <div className="text-xs text-gray-600">{new Date(item.timestamp).toLocaleString()}</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onAcknowledge(item.alert_id)}
                    disabled={item.isAcknowledged || actioningId === item.alert_id}
                    className="px-2 py-1 text-xs font-semibold rounded border border-gray-300 hover:border-gray-500 disabled:opacity-50"
                  >
                    Ack
                  </button>
                  <button
                    onClick={() => onResolve(item.alert_id)}
                    disabled={item.isResolved || actioningId === item.alert_id}
                    className="px-2 py-1 text-xs font-semibold rounded border border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-50 inline-flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3" /> Resolve
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default SensorAlerts;
