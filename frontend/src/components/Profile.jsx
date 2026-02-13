import { useOutletContext } from "react-router-dom";
import { UserCircle, IdCard, Building2, Mail, Shield, User as UserIcon } from "lucide-react";

export default function Profile() {
  const { user } = useOutletContext();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-10 w-10 border-4 border-gray-300 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  const profileFields = [
    {
      icon: IdCard,
      label: "User ID",
      value: user.userId,
      color: "bg-blue-50 text-blue-600 border-blue-200",
    },
    {
      icon: UserIcon,
      label: "Full Name",
      value: user.fullName,
      color: "bg-green-50 text-green-600 border-green-200",
    },
    {
      icon: Mail,
      label: "Email Address",
      value: user.email,
      color: "bg-purple-50 text-purple-600 border-purple-200",
    },
    {
      icon: Building2,
      label: "Department",
      value: user.department,
      color: "bg-orange-50 text-orange-600 border-orange-200",
    },
  ];

  return (
    <div className="flex justify-center items-start min-h-full py-8 px-6">
      <div className="w-full max-w-4xl">
        {/* Profile Header Card */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 overflow-hidden mb-6">
          {/* Header Background */}
          <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 px-8 py-10 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
            </div>
            
            <div className="relative flex items-center gap-6">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-xl ring-4 ring-white/20">
                <UserCircle className="w-16 h-16 text-gray-400" />
              </div>

              {/* User Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-white">
                    {user.fullName || user.userId || "—"}
                  </h1>
                  {user.isRoot ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-400 text-yellow-900 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      ROOT ADMIN
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white">
                      ADMIN
                    </span>
                  )}
                </div>
                <p className="text-gray-300 text-lg">{user.department || "—"}</p>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <IdCard className="w-5 h-5" />
              Account Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profileFields.map((field, index) => {
                const Icon = field.icon;
                return (
                  <div
                    key={index}
                    className={`border-2 rounded-xl p-5 transition-all hover:shadow-md ${field.color}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-white/80 rounded-lg">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wide opacity-80">
                        {field.label}
                      </span>
                    </div>
                    <p className="text-gray-900 font-semibold text-lg break-words">
                      {field.value || "—"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Additional Info Card */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-blue-900 mb-1">Security Notice</h3>
              <p className="text-sm text-blue-800">
                Your account has {user.isRoot ? "full administrative" : "standard administrative"} privileges. 
                All actions are logged and monitored for security purposes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}