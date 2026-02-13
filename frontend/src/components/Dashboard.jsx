import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  ListChecks,
  AlertTriangle,
  User,
  History,
  UserPlus,
  UserCog,
  ScrollText,
  LogOut,
  ChevronRight,
} from "lucide-react";

import ScreenBlocker from "./ScreenBlocker";
import logoIcon from "../assets/logo-1.png";
import logoText from "../assets/logo-2.png";
import dashboardIllustration from "../assets/admin-dashboard.svg";

function DashboardHome({ isRoot }) {
  const navigate = useNavigate();

  const baseFeatures = [
    {
      icon: User,
      label: "View or update your profile",
      route: "profile",
      color: "bg-blue-50 text-blue-600",
    },
    {
      icon: ListChecks,
      label: "View & manage reported issues",
      route: "issues",
      color: "bg-green-50 text-green-600",
    },
    {
      icon: AlertTriangle,
      label: "Handle urgent problems immediately",
      route: "urgent",
      color: "bg-red-50 text-red-600",
    },
    {
      icon: History,
      label: "Track issue history & workflow",
      route: "history",
      color: "bg-purple-50 text-purple-600",
    },
  ];

  const rootFeatures = [
    {
      icon: UserPlus,
      label: "Create & delete user accounts",
      route: "create",
      color: "bg-indigo-50 text-indigo-600",
    },
    {
      icon: UserCog,
      label: "Activate & deactivate accounts",
      route: "activation",
      color: "bg-orange-50 text-orange-600",
    },
    {
      icon: ScrollText,
      label: "View account activity logs",
      route: "logs",
      color: "bg-gray-50 text-gray-600",
    },
  ];

  const features = isRoot ? [...baseFeatures, ...rootFeatures] : baseFeatures;

  return (
    <div className="h-full flex items-center justify-center px-6">
      <div className="w-full max-w-5xl">
        {/* Header with Illustration */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <img 
              src={dashboardIllustration} 
              alt="Admin Dashboard" 
              className="w-64 h-64 object-contain"
            />
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 text-lg">
            Welcome back! Choose a task below to get started
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((item, i) => {
            const Icon = item.icon;

            return (
              <div
                key={i}
                onClick={() => navigate(item.route)}
                className="group bg-white border-2 border-gray-200 rounded-2xl p-6 
                         hover:border-black hover:shadow-xl transition-all duration-200 
                         cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${item.color} transition-transform group-hover:scale-110`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-black">
                      {item.label}
                    </p>
                  </div>

                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-black group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarWidth, setSidebarWidth] = useState(280);
  const isResizingRef = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingRef.current) return;
      const minWidth = 220;
      const maxWidth = 400;
      const newWidth = Math.min(maxWidth, Math.max(minWidth, e.clientX));
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      isResizingRef.current = false;
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const [user, setUser] = useState({
    userId: "",
    fullName: "",
    email: "",
    department: "",
    isRoot: false,
  });
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    let mounted = true;
    import("../api")
      .then(({ getCurrentUser }) => {
        return getCurrentUser()
          .then((data) => {
            if (!mounted) return;
            setUser({
              userId: data.userid || "",
              fullName: data.full_name || data.userid || "",
              email: data.email || "",
              department: data.department || "",
              isRoot: data.is_root === 1 || data.is_root === true,
            });
          })
          .catch((err) => {
            console.error("Unable to fetch current user:", err);
          })
          .finally(() => {
            if (mounted) setLoadingUser(false);
          });
      })
      .catch((err) => {
        console.error("Failed to load api helper:", err);
        if (mounted) setLoadingUser(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const navItems = [
    { label: "Dashboard", to: "", icon: LayoutDashboard },
    { label: "Profile", to: "profile", icon: User },
    { label: "Issue List", to: "issues", icon: ListChecks },
    { label: "Urgent Issues", to: "urgent", icon: AlertTriangle },
    { label: "Issue History", to: "history", icon: History },
    ...(user.isRoot
      ? [
          { label: "Account Management", to: "create", icon: UserPlus },
          { label: "Account Activation", to: "activation", icon: UserCog },
          { label: "Activity Logs", to: "logs", icon: ScrollText },
        ]
      : []),
  ];

  const handleLogout = () => {
    localStorage.removeItem("rm_access");
    localStorage.removeItem("rm_refresh");
    navigate("/", { replace: true });
  };

  const activePage =
    navItems.find((item) => {
      if (item.to === "") {
        return location.pathname === "/dashboard";
      }
      return location.pathname.includes(item.to);
    })?.label || "Dashboard";

  return (
    <>
      <ScreenBlocker minWidth={1024} minHeight={700} allowBypass={false} />
      <div className="min-h-screen overflow-hidden bg-gray-50 flex">
        {/* SIDEBAR */}
        <aside
          className="bg-white border-r border-gray-200 flex flex-col shadow-sm"
          style={{ width: sidebarWidth }}
        >
          {/* Logo Section */}
          <div className="px-6 py-6 border-b border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <img src={logoIcon} alt="NagrikMitra" className="h-10 object-contain" />
              <img src={logoText} alt="NagrikMitra" className="h-7 object-contain" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-gray-900">
                {loadingUser ? "Loading..." : user.fullName || user.userId || "—"}
              </p>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                {loadingUser ? "" : user.department || "Admin"}
              </p>
              {user.isRoot && (
                <span className="inline-block px-2 py-0.5 bg-black text-white text-[10px] font-bold rounded uppercase tracking-wide mt-1">
                  Root Admin
                </span>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to === "" ? "/dashboard" : item.to}
                  className={({ isActive }) =>
                    [
                      "flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-all",
                      isActive
                        ? "bg-black text-white shadow-md"
                        : "text-gray-700 hover:bg-gray-100",
                    ].join(" ")
                  }
                  end
                >
                  {({ isActive }) => (
                    <>
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {isActive && <ChevronRight className="h-4 w-4" />}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Logout Button */}
          <div className="px-6 py-6 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold 
                       rounded-lg border-2 border-gray-200 text-gray-700 
                       hover:border-red-500 hover:text-red-600 hover:bg-red-50 
                       transition-all"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </aside>

        {/* Resize Handle */}
        <div
          className="w-1 cursor-col-resize bg-gray-200 hover:bg-gray-400 transition-colors"
          onMouseDown={() => {
            isResizingRef.current = true;
          }}
        />

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">{activePage}</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-gray-500">Signed in as</p>
                <p className="text-sm font-semibold text-gray-900">
                  {loadingUser ? "..." : user.userId}
                </p>
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 bg-gray-50 p-8 overflow-auto">
            <div className="h-full">
              {location.pathname === "/dashboard" ? (
                <DashboardHome isRoot={user.isRoot} />
              ) : (location.pathname.endsWith("/create") ||
                  location.pathname.endsWith("/activation") ||
                  location.pathname.endsWith("/logs")) &&
                !user.isRoot ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center bg-white rounded-2xl border-2 border-gray-200 p-12 max-w-md">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle className="w-8 h-8 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
                    <p className="text-gray-600">
                      You do not have permission to access this page. Root admin privileges required.
                    </p>
                  </div>
                </div>
              ) : (
                <Outlet context={{ user }} />
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

export default Dashboard;