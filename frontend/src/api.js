const ACCESS_KEY = "rm_access";
const REFRESH_KEY = "rm_refresh";

const API_BASE = import.meta.env.VITE_API_BASE;
const ENV = import.meta.env.VITE_ENV;
// In dev → use Vite proxy (/api)
// In prod → use absolute backend root
const API_V1 = ENV === "development" ? "/api" : `${API_BASE}/api`;

export function getAccess() {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefresh() {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens({ access, refresh }) {
  if (access) localStorage.setItem(ACCESS_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export async function refreshAccess() {
  const refresh = getRefresh();
  if (!refresh) throw new Error("no refresh token");

  const res = await fetch(`${API_BASE}/api/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (!res.ok) throw new Error("refresh failed");

  const data = await res.json();
  setTokens({ access: data.access, refresh: data.refresh || refresh });
  return data.access;
}

export async function fetchWithAuth(url, opts = {}) {
  const access = getAccess();
  const headers = new Headers(opts.headers || {});

  if (access) headers.set("Authorization", `Bearer ${access}`);
  headers.set("Content-Type", headers.get("Content-Type") || "application/json");

  let res = await fetch(url, { ...opts, headers });

  if (res.status === 401) {
    try {
      const newAccess = await refreshAccess();
      headers.set("Authorization", `Bearer ${newAccess}`);
      res = await fetch(url, { ...opts, headers });
    } catch (err) {
      clearTokens();
      throw err;
    }
  }

  return res;
}

export async function getCurrentUser() {
  const res = await fetchWithAuth(`${API_V1}/me/`, {
    method: "GET",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`getCurrentUser failed: ${res.status} ${text}`);
    err.status = res.status;
    throw err;
  }

  return res.json();
}

export async function getIssues(status = null, filters = {}) {
  const params = new URLSearchParams();
  if (status && status !== "all") params.set("status", status);
  if (filters.appeal_status && filters.appeal_status !== "all") {
    params.set("appeal_status", filters.appeal_status);
  }
  if (filters.deactivated && filters.deactivated !== "all") {
    params.set("deactivated", filters.deactivated);
  }
  const qs = params.toString() ? `?${params.toString()}` : "";

  const res = await fetchWithAuth(
    `${API_BASE}/restapi/issues/${qs}`,
    { method: "GET" }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`getIssues failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function getIssueDetail(trackingId) {
  const res = await fetchWithAuth(
    `${API_BASE}/restapi/issues/${trackingId}/`,
    { method: "GET" }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`getIssueDetail failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function getPresignedUpload(file) {
  const res = await fetchWithAuth(`${API_BASE}/api/presign-s3/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
    }),
  });

  if (!res.ok) throw new Error("Failed to get upload URL");
  return res.json(); 
}

export async function resolveIssue(trackingId, completionKey) {
  const res = await fetchWithAuth(
    `${API_BASE}/restapi/issues/${trackingId}/resolve/`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completion_key: completionKey }),
    }
  );

  if (!res.ok) throw new Error("Failed to resolve issue");
  return res.json();
}

export async function updateIssueStatus(trackingId, status) {
  const res = await fetchWithAuth(
    `${API_BASE}/restapi/issues/${trackingId}/status/`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`updateIssueStatus failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function decideIssueAppeal(trackingId, decision) {
  const res = await fetchWithAuth(
    `${API_BASE}/restapi/issues/${trackingId}/appeal/decision/`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`decideIssueAppeal failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function downloadIssuePDF(trackingId) {
  const token = localStorage.getItem(ACCESS_KEY);

  const response = await fetch(
    `${API_BASE}/restapi/issues/${trackingId}/pdf/`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to download PDF");
  }

  return response.blob();
}

export async function createAccount(payload) {
  const res = await fetchWithAuth(`${API_V1}/register/`, {
  method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`createAccount failed: ${res.status} ${text}`);
  }

  return res.json();
}
export async function listUsers() {
  const res = await fetchWithAuth(`${API_V1}/users/`, {
    method: "GET",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`listUsers failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function deleteUser(userid) {
  const res = await fetchWithAuth(`${API_V1}/users/${userid}/delete/`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const data = await res.json().catch(() => ({ error: text }));
    throw new Error(data.error || `deleteUser failed: ${res.status}`);
  }

  return res.json();
}
export async function toggleUserStatus(userid) {
  const res = await fetchWithAuth(`${API_V1}/users/${userid}/toggle-status/`, {
    method: "PATCH",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const data = await res.json().catch(() => ({ error: text }));
    throw new Error(data.error || `toggleUserStatus failed: ${res.status}`);
  }

  return res.json();
}

export async function getActivityLogs() {
  const res = await fetchWithAuth(`${API_V1}/activity-logs/`, {
    method: "GET",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`getActivityLogs failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function getSensorAlerts() {
  const res = await fetchWithAuth(`${API_BASE}/api/sensor-alerts/`, {
    method: "GET",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`getSensorAlerts failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function getActiveSensorAlerts() {
  const res = await fetchWithAuth(`${API_BASE}/api/sensor-alerts/active/`, {
    method: "GET",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`getActiveSensorAlerts failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function acknowledgeSensorAlert(reportId) {
  const res = await fetchWithAuth(`${API_BASE}/api/sensor-alerts/${reportId}/ack/`, {
    method: "PATCH",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`acknowledgeSensorAlert failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function resolveSensorAlert(reportId) {
  const res = await fetchWithAuth(`${API_BASE}/api/sensor-alerts/${reportId}/resolve/`, {
    method: "PATCH",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`resolveSensorAlert failed: ${res.status} ${text}`);
  }

  return res.json();
}
