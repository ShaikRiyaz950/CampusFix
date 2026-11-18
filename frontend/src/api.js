import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const TOKEN_KEY = "campusfix_token";
const USER_KEY = "campusfix_user";

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || "";
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveSession(token, user, rememberMe = true) {
  clearSession();
  const store = rememberMe ? localStorage : sessionStorage;
  store.setItem(TOKEN_KEY, token);
  store.setItem(USER_KEY, JSON.stringify(user));
}

export function updateStoredUser(user) {
  if (localStorage.getItem(TOKEN_KEY)) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else if (sessionStorage.getItem(TOKEN_KEY)) {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

let unauthorizedHandler = null;
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
});

API.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && getStoredToken()) {
      clearSession();
      unauthorizedHandler?.(error.response?.data?.error || "Session expired. Please sign in again.");
    }
    return Promise.reject(error);
  }
);

// Authentication & Profile
export const loginUser = (data) => API.post("/auth/login", data);
export const registerUser = (data) => API.post("/auth/register", data);
export const forgotPassword = (identifier) => API.post("/auth/forgot-password", { identifier });
export const getProfile = () => API.get("/auth/profile");
export const updateProfile = (data) => API.put("/auth/profile", data);

// Users & Notifications
export const getUsers = () => API.get("/users");
export const updateUserRole = (id, role) => API.patch(`/users/${id}/role`, { role });
export const getStaffList = () => API.get("/users/staff");
export const getNotifications = () => API.get("/notifications");
export const markAllNotificationsRead = () => API.patch("/notifications/read-all");

// Complaints CRUD & Workflow
export const getComplaints = (params = {}) => API.get("/complaints", { params });
export const getComplaint = (id) => API.get(`/complaints/${id}`);
export const createComplaint = (data) => API.post("/complaints", data);
export const updateComplaint = (id, data) => API.put(`/complaints/${id}`, data);
export const deleteComplaint = (id) => API.delete(`/complaints/${id}`);
export const patchComplaintStatus = (id, status, note = "") =>
  API.patch(`/complaints/${id}/status`, note ? { status, note } : { status });
export const patchComplaintPriority = (id, priority) =>
  API.patch(`/complaints/${id}/priority`, { priority });
export const assignComplaint = (id, assigned_to, note = "") =>
  API.patch(`/complaints/${id}/assign`, note ? { assigned_to, note } : { assigned_to });
export const getComplaintHistory = (id) => API.get(`/complaints/${id}/history`);
export const trackComplaintById = (trackingId) =>
  API.get(`/complaints/track/${encodeURIComponent(trackingId.trim())}`);
export const uploadComplaintImage = (id, file) => {
  const form = new FormData();
  form.append("image", file);
  return API.post(`/complaints/${id}/image`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
export const submitComplaintFeedback = (id, rating, comment = "") =>
  API.post(`/complaints/${id}/feedback`, { rating, comment });

// Dashboard & Analytics
export const getStats = () => API.get("/stats");
export const getDashboardStats = () => API.get("/dashboard/stats");
export const getDashboardCategories = () => API.get("/dashboard/categories");
export const getDashboardTrends = () => API.get("/dashboard/trends");

// AI Endpoints
export const getAiStatus = () => API.get("/ai/status");
export const classifyComplaintAI = (data) => API.post("/ai/classify", data);
export const summarizeComplaintAI = (id) => API.post(`/complaints/${id}/summarize`);

export const getExportCsvUrl = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.set(k, v);
  });
  const query = qs.toString();
  return `${API_BASE_URL}/complaints/export${query ? `?${query}` : ""}`;
};

export default API;
