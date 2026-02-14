import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import RequireAuth from "./RequireAuth";
import BackendGate from "./availability/BackendGate";
import IssueList from "./components/IssueList";
import UrgentIssues from "./components/UrgentIssues";
import Profile from "./components/Profile";
import IssueHistory from "./components/IssueHistory";
import AccountManagement from "./components/AccountManagement";
import AccountActivation from "./components/AccountActivation";
import AccountLogs from "./components/AccountLogs";
import IssueDetail from "./components/IssueDetail";
import SensorAlerts from "./components/SensorAlerts";
import ActiveSensorAlerts from "./components/ActiveSensorAlerts";

export default function App() {
  return (
    <BrowserRouter>
      <BackendGate>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Login />} />

          {/* Protected Dashboard */}
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          >
            {/* Dashboard home */}
            <Route index element={null} />

            {/* Sidebar-linked pages */}
            <Route path="issues" element={<IssueList />} />
            <Route path="urgent" element={<UrgentIssues />} />
            <Route path="profile" element={<Profile />} />
            <Route path="history" element={<IssueHistory />} />
            <Route path="sensor-alerts" element={<SensorAlerts />} />
            <Route path="sensor-alerts-active" element={<ActiveSensorAlerts />} />
            
            {/* Root-only pages */}
            <Route path="create" element={<AccountManagement />} />
            <Route path="activation" element={<AccountActivation />} />
            <Route path="logs" element={<AccountLogs />} />
            
            {/* Issue detail */}
            <Route path="issues/:trackingId" element={<IssueDetail />} />
          </Route>
        </Routes>
      </BackendGate>
    </BrowserRouter>
  );
}
