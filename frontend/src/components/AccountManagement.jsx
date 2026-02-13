import { useEffect, useState } from "react";
import { getCurrentUser, createAccount, listUsers, deleteUser } from "../api";
import { UserPlus, Trash2, AlertCircle, Download, Key, Sparkles } from "lucide-react";

const AccountManagement = () => {
  const [activeTab, setActiveTab] = useState("create");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formErrors, setFormErrors] = useState({});

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdCreds, setCreatedCreds] = useState(null);

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [formData, setFormData] = useState({
    userId: "",
    fullName: "",
    department: "",
    email: "",
    password: "",
  });

  const generateUserId = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const generatePassword = () => {
    const length = Math.floor(Math.random() * 5) + 8;
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%";
    let pwd = "";

    for (let i = 0; i < length; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return pwd;
  };

  useEffect(() => {
    let mounted = true;

    getCurrentUser()
      .then((user) => {
        if (!mounted) return;
        setFormData((prev) => ({
          ...prev,
          department: user.department,
        }));
      })
      .catch(() => {
        setError("Failed to load user info");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (activeTab === "delete") {
      loadUsers();
    }
  }, [activeTab]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const userList = await listUsers();
      setUsers(userList);
    } catch (err) {
      setError("Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (formData.userId.length === 6 && !formData.password) {
      setFormData((prev) => ({
        ...prev,
        password: generatePassword(),
      }));
    }
  }, [formData.userId]);

  const handleCreate = async () => {
    setError("");
    setFormErrors({});

    if (formData.userId.length !== 6) {
      setFormErrors({ userId: "User ID must be exactly 6 characters" });
      return;
    }

    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+$/;

    if (!emailRegex.test(formData.email)) {
      setFormErrors({ email: "Enter a valid email address" });
      return;
    }

    if (!formData.password) {
      setError("Password was not generated. Please generate User ID again.");
      return;
    }

    try {
      await createAccount({
        userid: formData.userId,
        full_name: formData.fullName,
        email: formData.email,
        password: formData.password,
      });

      setCreatedCreds({
        userid: formData.userId,
        password: formData.password,
      });

      setShowSuccessModal(true);

      setFormData((prev) => ({
        ...prev,
        userId: "",
        fullName: "",
        email: "",
        password: "",
      }));
    } catch (err) {
      setError(err.message || "Failed to create account");
    }
  };

  const handleDelete = async (userid) => {
    try {
      await deleteUser(userid);
      setDeleteConfirm(null);
      loadUsers();
    } catch (err) {
      setError(err.message || "Failed to delete user");
    }
  };

  const downloadCSV = () => {
    if (!createdCreds) return;

    const csvContent = `User ID,Password\n${createdCreds.userid},${createdCreds.password}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `account_credentials_${createdCreds.userid}.csv`
    );

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col py-6 px-4">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Account Management</h1>
              <p className="text-gray-600 text-sm">Create and delete administrative accounts</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("create")}
              className={`px-6 py-3 rounded-xl font-semibold transition flex items-center gap-2 border-2 ${
                activeTab === "create"
                  ? "bg-black text-white border-black shadow-md"
                  : "bg-white text-gray-700 hover:bg-gray-50 border-gray-200"
              }`}
            >
              <UserPlus className="w-5 h-5" />
              Create Account
            </button>
            <button
              onClick={() => setActiveTab("delete")}
              className={`px-6 py-3 rounded-xl font-semibold transition flex items-center gap-2 border-2 ${
                activeTab === "delete"
                  ? "bg-black text-white border-black shadow-md"
                  : "bg-white text-gray-700 hover:bg-gray-50 border-gray-200"
              }`}
            >
              <Trash2 className="w-5 h-5" />
              Delete Account
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        {/* CREATE TAB */}
        {activeTab === "create" && (
          <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-8">
            <div className="flex items-start gap-3 mb-6 bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-blue-900 text-sm font-medium">
                Create new administrative accounts for your department. User ID and password will be auto-generated.
              </p>
            </div>

            <div className="space-y-5">
              {/* User ID */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  User ID
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={formData.userId}
                    onChange={(e) =>
                      setFormData({ ...formData, userId: e.target.value.toUpperCase() })
                    }
                    placeholder="6 characters (e.g., TRA001)"
                    maxLength={6}
                    className={`flex-1 px-4 py-3 text-sm border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-black font-mono ${
                      formErrors.userId ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        userId: generateUserId(),
                        password: generatePassword(),
                      })
                    }
                    className="px-5 py-3 border-2 border-gray-300 rounded-xl font-semibold
                             hover:bg-gray-50 transition flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate
                  </button>
                </div>
                {formErrors.userId && (
                  <p className="text-red-500 text-xs mt-2 font-medium">{formErrors.userId}</p>
                )}
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="w-full px-4 py-3 text-sm border-2 border-gray-300 rounded-xl 
                           focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Enter full name"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Department
                </label>
                <input
                  type="text"
                  value={formData.department}
                  disabled
                  className="w-full px-4 py-3 text-sm border-2 border-gray-300 rounded-xl
                             bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className={`w-full px-4 py-3 text-sm border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-black ${
                    formErrors.email ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="email@example.com"
                />
                {formErrors.email && (
                  <p className="text-red-500 text-xs mt-2 font-medium">{formErrors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Initial Password
                </label>
                <input
                  type="text"
                  value={formData.password}
                  readOnly
                  placeholder="Auto-generated when User ID is created"
                  className="w-full px-4 py-3 text-sm border-2 border-gray-300 rounded-xl
                           bg-gray-100 text-gray-700 cursor-not-allowed font-mono"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Password is automatically generated and will be provided after account creation.
                </p>
              </div>

              <button
                onClick={handleCreate}
                className="w-full bg-black text-white px-6 py-4 rounded-xl
                         font-bold hover:bg-gray-800 transition shadow-lg hover:shadow-xl
                         flex items-center justify-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                Create Account
              </button>
            </div>
          </div>
        )}

        {/* DELETE TAB */}
        {activeTab === "delete" && (
          <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-8">
            <div className="flex items-start gap-3 mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-900 text-sm font-medium">
                Delete accounts from your department. Root users cannot be deleted. This action is permanent.
              </p>
            </div>

            {loadingUsers ? (
              <div className="text-center py-12">
                <div className="h-10 w-10 border-4 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserPlus className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">No users found in your department</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.userid}
                    className="flex items-center justify-between p-5 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition"
                  >
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 text-lg mb-1">{user.userid}</p>
                      <p className="text-sm text-gray-700 font-medium">{user.full_name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>

                    <button
                      onClick={() => setDeleteConfirm(user)}
                      className="px-5 py-3 bg-red-600 text-white rounded-xl
                               hover:bg-red-700 transition flex items-center gap-2
                               font-bold shadow-md hover:shadow-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUCCESS MODAL */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
              <div className="mx-auto mb-6 flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Account Created!
              </h2>
              <p className="text-gray-600 mb-6">
                The credentials have been generated successfully.
              </p>

              <button
                onClick={downloadCSV}
                className="w-full bg-black text-white py-4 rounded-xl font-bold 
                         hover:bg-gray-800 transition flex items-center justify-center gap-2 mb-3"
              >
                <Download className="w-5 h-5" />
                Download Credentials (CSV)
              </button>

              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setCreatedCreds(null);
                }}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-7 h-7 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Confirm Deletion
                </h2>
              </div>

              <p className="text-gray-700 mb-6 leading-relaxed">
                Are you sure you want to delete user{" "}
                <strong className="text-gray-900">{deleteConfirm.userid}</strong> (
                {deleteConfirm.full_name})? This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => handleDelete(deleteConfirm.userid)}
                  className="flex-1 bg-red-600 text-white py-3 rounded-xl
                           font-bold hover:bg-red-700 transition"
                >
                  Delete Account
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl
                           font-bold hover:bg-gray-300 transition"
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

export default AccountManagement;