import { useEffect, useState } from "react";
import { listUsers, toggleUserStatus } from "../api";
import { Power, PowerOff, AlertCircle, RefreshCw, UserCog, CheckCircle2 } from "lucide-react";

const AccountActivation = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmModal, setConfirmModal] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("active");

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const userList = await listUsers();
      setUsers(userList);
    } catch (err) {
      setError("Failed to load users: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleStatus = async (user) => {
    setProcessing(true);
    setError("");
    try {
      await toggleUserStatus(user.userid);
      setConfirmModal(null);
      loadUsers();
    } catch (err) {
      setError(err.message || "Failed to update user status");
    } finally {
      setProcessing(false);
    }
  };

  const activeUsers = users.filter((u) => u.is_active);
  const inactiveUsers = users.filter((u) => !u.is_active);

  return (
    <div className="h-full flex flex-col py-6 px-4">
      <div className="max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <UserCog className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Account Activation</h1>
                <p className="text-gray-600 text-sm">Manage user access permissions</p>
              </div>
            </div>
            <button
              onClick={loadUsers}
              disabled={loading}
              className="px-5 py-3 bg-white hover:bg-gray-50 border-2 border-gray-200 rounded-xl 
                       font-semibold transition flex items-center gap-2 disabled:opacity-50 shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("active")}
              className={`px-6 py-3 rounded-xl font-semibold transition flex items-center gap-2 border-2 ${
                activeTab === "active"
                  ? "bg-black text-white border-black shadow-md"
                  : "bg-white text-gray-700 hover:bg-gray-50 border-gray-200"
              }`}
            >
              <Power className="w-5 h-5" />
              Active ({activeUsers.length})
            </button>
            <button
              onClick={() => setActiveTab("inactive")}
              className={`px-6 py-3 rounded-xl font-semibold transition flex items-center gap-2 border-2 ${
                activeTab === "inactive"
                  ? "bg-black text-white border-black shadow-md"
                  : "bg-white text-gray-700 hover:bg-gray-50 border-gray-200"
              }`}
            >
              <PowerOff className="w-5 h-5" />
              Inactive ({inactiveUsers.length})
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        {/* Content Area */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-8">
          {activeTab === "active" && (
            <div>
              <div className="flex items-start gap-3 mb-6 bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-green-900 text-sm font-medium">
                  Active accounts can log in and access the system. Click "Deactivate" to revoke access.
                </p>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="h-10 w-10 border-4 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Loading users...</p>
                </div>
              ) : activeUsers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Power className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">No active users found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeUsers.map((user) => (
                    <div
                      key={user.userid}
                      className="flex items-center justify-between p-5 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-bold text-lg text-gray-900">{user.userid}</p>
                          <span className="px-2.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-bold border border-green-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            ACTIVE
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 font-medium">{user.full_name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>

                      <button
                        onClick={() => setConfirmModal(user)}
                        className="px-5 py-3 bg-red-600 text-white rounded-xl
                                 hover:bg-red-700 transition flex items-center gap-2
                                 font-bold shadow-md hover:shadow-lg"
                      >
                        <PowerOff className="w-4 h-4" />
                        Deactivate
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "inactive" && (
            <div>
              <div className="flex items-start gap-3 mb-6 bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                <PowerOff className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <p className="text-orange-900 text-sm font-medium">
                  Inactive accounts cannot log in. Click "Activate" to restore system access.
                </p>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="h-10 w-10 border-4 border-gray-300 border-t-orange-600 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Loading users...</p>
                </div>
              ) : inactiveUsers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-gray-900 font-bold text-lg mb-1">All Users Active</p>
                  <p className="text-gray-600 text-sm">No inactive users found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {inactiveUsers.map((user) => (
                    <div
                      key={user.userid}
                      className="flex items-center justify-between p-5 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-bold text-lg text-gray-600">{user.userid}</p>
                          <span className="px-2.5 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full font-bold border border-gray-300 flex items-center gap-1">
                            <PowerOff className="w-3 h-3" />
                            INACTIVE
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 font-medium">{user.full_name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>

                      <button
                        onClick={() => setConfirmModal(user)}
                        className="px-5 py-3 bg-green-600 text-white rounded-xl
                                 hover:bg-green-700 transition flex items-center gap-2
                                 font-bold shadow-md hover:shadow-lg"
                      >
                        <Power className="w-4 h-4" />
                        Activate
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* CONFIRMATION MODAL */}
        {confirmModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
              <div className="flex items-center gap-4 mb-6">
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${
                    confirmModal.is_active ? "bg-red-100" : "bg-green-100"
                  }`}
                >
                  {confirmModal.is_active ? (
                    <PowerOff className="w-7 h-7 text-red-600" />
                  ) : (
                    <Power className="w-7 h-7 text-green-600" />
                  )}
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Confirm {confirmModal.is_active ? "Deactivation" : "Activation"}
                </h2>
              </div>

              <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 mb-6">
                <p className="font-bold text-gray-900 mb-1">{confirmModal.userid}</p>
                <p className="text-sm text-gray-700 font-medium">{confirmModal.full_name}</p>
                <p className="text-xs text-gray-500">{confirmModal.email}</p>
              </div>

              <p className="text-gray-700 mb-6 leading-relaxed">
                {confirmModal.is_active ? (
                  <>
                    <span className="text-red-600 font-bold">
                      This user will not be able to log in
                    </span>{" "}
                    until their account is reactivated.
                  </>
                ) : (
                  <>
                    <span className="text-green-600 font-bold">
                      This user will regain full system access
                    </span>{" "}
                    and be able to log in again.
                  </>
                )}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => handleToggleStatus(confirmModal)}
                  disabled={processing}
                  className={`flex-1 py-3 rounded-xl font-bold transition disabled:opacity-50 ${
                    confirmModal.is_active
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  {processing
                    ? "Processing..."
                    : confirmModal.is_active
                    ? "Deactivate Account"
                    : "Activate Account"}
                </button>
                <button
                  onClick={() => setConfirmModal(null)}
                  disabled={processing}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl
                           font-bold hover:bg-gray-300 transition disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountActivation;