import { useEffect, useState } from "react";
import { getActiveSensorAlerts, resolveSensorAlert } from "../api";
import { Siren, CheckCircle2, Clipboard, Check } from "lucide-react";

const ActiveSensorAlerts = () => {
  const [alerts, setAlerts] = useState([]);
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
        const data = await getActiveSensorAlerts();
        if (mounted) setAlerts(data);
      } catch (err) {
        if (mounted) setError("Failed to load active alerts");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadAlerts();

    return () => {
      mounted = false;
    };
  }, []);

  const resolveNow = async (id) => {
    setActioningId(id);
    try {
      await resolveSensorAlert(id);
      setAlerts((prev) => prev.filter((item) => item.alert_id !== id));
    } catch (err) {
      setError("Failed to resolve alert");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <Siren className="w-7 h-7 text-red-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Active Sensor Alerts</h1>
              <p className="text-red-100 text-sm">Triggered alerts requiring immediate action</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold text-white">{alerts.length}</p>
            <p className="text-xs text-red-100 uppercase tracking-wide">Active</p>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-sm border-2 border-red-200 overflow-hidden flex flex-col">
        <div className="grid grid-cols-6 gap-4 bg-red-50 px-6 py-4 font-bold text-xs uppercase tracking-wide text-red-900 border-b-2 border-red-200">
          <div>Sensor</div>
          <div>Hazard</div>
          <div>Department</div>
          <div>Location</div>
          <div>Triggered At</div>
          <div>Action</div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-12 w-12 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mb-4" />
              <p className="text-gray-500 text-sm font-medium">Loading active sensor alerts...</p>
            </div>
          )}

          {!loading && error && (
            <div className="px-6 py-12 text-center">
              <p className="text-red-600 font-semibold">{error}</p>
            </div>
          )}

          {!loading && !error && alerts.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-900 font-bold text-lg mb-1">No Active Sensor Alerts</p>
              <p className="text-gray-600 text-sm">All triggered alerts have been resolved</p>
            </div>
          )}

          {!loading &&
            !error &&
            alerts.map((item) => (
              <div key={item.alert_id} className="grid grid-cols-6 gap-4 px-6 py-4 border-b border-gray-100 hover:bg-red-50 transition-colors">
                <div className="font-mono text-sm font-semibold text-gray-900">{item.sensorId}</div>
                <div className="text-sm font-semibold text-red-700">{item.hazard}</div>
                <div className="text-sm text-gray-800">{item.department}</div>
                <div className="text-xs text-gray-600">
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
                <div className="text-xs text-gray-600">{new Date(item.timestamp).toLocaleString()}</div>
                <div>
                  <button
                    onClick={() => resolveNow(item.alert_id)}
                    disabled={actioningId === item.alert_id}
                    className="px-3 py-1 text-xs font-semibold rounded border border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-50 inline-flex items-center gap-1"
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

export default ActiveSensorAlerts;
