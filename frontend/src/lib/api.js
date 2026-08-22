import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
});

export const authConfig = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});
