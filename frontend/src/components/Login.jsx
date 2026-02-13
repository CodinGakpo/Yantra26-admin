import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logoIcon from "../assets/logo-1.png";
import logoText from "../assets/logo-2.png";
import adminIllustration from "../assets/admin-secure-access.svg";
import ScreenBlocker from "./ScreenBlocker";
import { log } from "@/utils/logger";
import { Lock, User, ArrowRight } from "lucide-react";

const MIN_WIDTH = 1024;

export default function Login() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const access = localStorage.getItem("rm_access");
    if (access) navigate("/dashboard", { replace: true });
  }, [navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/token/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userid: userId, password }),
      });

      const data = await res.json().catch(() => ({}));
      log("token endpoint response:", res.status, data);

      if (!res.ok) {
        const msg =
          data.detail ||
          data.non_field_errors?.[0] ||
          data.userid?.[0] ||
          data.password?.[0] ||
          JSON.stringify(data);
        setError(msg || "Login failed");
        setLoading(false);
        return;
      }

      if (data.access && data.refresh) {
        localStorage.setItem("rm_access", data.access);
        localStorage.setItem("rm_refresh", data.refresh);
        navigate("/dashboard", { replace: true });
        return;
      }

      if (data.refresh && !data.access) {
        log("Received only refresh; requesting access via /api/token/refresh/");

        const r = await fetch("/api/token/refresh/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh: data.refresh }),
        });

        const rdata = await r.json().catch(() => ({}));
        log("refresh response:", r.status, rdata);

        if (!r.ok || !rdata.access) {
          setError(rdata.detail || "Failed to obtain access token");
          setLoading(false);
          return;
        }

        localStorage.setItem("rm_access", rdata.access);
        localStorage.setItem("rm_refresh", rdata.refresh || data.refresh);
        navigate("/dashboard", { replace: true });
        return;
      }

      setError("Unexpected token response: " + JSON.stringify(data));
    } catch (err) {
      console.error(err);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ScreenBlocker minWidth={MIN_WIDTH} minHeight={700} allowBypass={false} />

      <div className="min-h-screen w-full flex overflow-hidden">
        {/* LEFT SIDE - Illustration & Branding */}
        <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          </div>

          <div className="relative z-10 flex flex-col justify-between p-12 w-full">
            {/* Illustration */}
            <div className="flex items-center justify-center flex-1 py-12">
              <img 
                src={adminIllustration} 
                alt="Secure Admin Access" 
                className="w-full max-w-md object-contain drop-shadow-2xl"
              />
            </div>

            {/* Bottom text */}
            <div className="space-y-2">
              <h2 className="text-white text-2xl font-bold">
                Administrator Portal
              </h2>
              <p className="text-gray-400 text-sm">
                Secure access to manage civic issues and administrative operations
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE - Login Form */}
        <div className="flex-1 flex flex-col items-center justify-center bg-white px-6 py-8 overflow-y-auto">
          <div className="w-full max-w-md">
            {/* Logo centered at top */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <img src={logoIcon} alt="NagrikMitra" className="h-14 object-contain" />
              <img src={logoText} alt="NagrikMitra" className="h-10 object-contain" />
            </div>

            {/* Mobile subtitle for smaller screens */}
            <div className="lg:hidden text-center mb-6">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                Administrator Portal
              </p>
            </div>

            {/* Heading */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome back
              </h1>
              <p className="text-gray-600 text-sm">
                Sign in to access your admin dashboard
              </p>
            </div>

            {/* Form */}
            <form onSubmit={submit} className="space-y-4">
              {/* User ID */}
              <div>
                <label 
                  htmlFor="userid" 
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  User ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="userid"
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 text-sm border-2 border-gray-200 rounded-xl
                             focus:ring-2 focus:ring-black focus:border-black
                             transition duration-200 text-gray-900 placeholder-gray-400
                             bg-gray-50 focus:bg-white"
                    placeholder="Enter your user ID"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label 
                  htmlFor="password" 
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 text-sm border-2 border-gray-200 rounded-xl
                             focus:ring-2 focus:ring-black focus:border-black
                             transition duration-200 text-gray-900 placeholder-gray-400
                             bg-gray-50 focus:bg-white"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 rounded-r-xl p-4">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white font-semibold text-base py-3 px-6 rounded-xl
                         hover:bg-gray-800 active:bg-gray-900 transition duration-200 
                         disabled:opacity-50 disabled:cursor-not-allowed
                         focus:outline-none focus:ring-4 focus:ring-gray-300
                         shadow-lg hover:shadow-xl flex items-center justify-center gap-3
                         group"
              >
                {loading ? (
                  <>
                    <svg 
                      className="animate-spin h-5 w-5" 
                      xmlns="http://www.w3.org/2000/svg" 
                      fill="none" 
                      viewBox="0 0 24 24"
                    >
                      <circle 
                        className="opacity-25" 
                        cx="12" 
                        cy="12" 
                        r="10" 
                        stroke="currentColor" 
                        strokeWidth="4"
                      />
                      <path 
                        className="opacity-75" 
                        fill="currentColor" 
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Security Notice */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <Lock className="h-3.5 w-3.5" />
                <span className="font-medium">
                  Secure Area • All access attempts are logged
                </span>
              </div>
            </div>

            {/* Version */}
            <p className="text-center text-gray-400 text-xs mt-4">
              NagrikMitra Admin System v1.0
            </p>
          </div>
        </div>
      </div>
    </>
  );
}