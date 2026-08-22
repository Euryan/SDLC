import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthContext = createContext(null);
const TOKEN_KEY = "autigaze_token";

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const authHeader = (t) => ({ headers: { Authorization: `Bearer ${t || token}` } });

  // Load current user when a token exists
  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get(`${API}/auth/me`, authHeader(token));
        setUser(res.data.user);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const register = async (name, email, password) => {
    const res = await axios.post(`${API}/auth/register`, { name, email, password });
    localStorage.setItem(TOKEN_KEY, res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const login = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    localStorage.setItem(TOKEN_KEY, res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const saveChildData = async (childData) => {
    const res = await axios.put(`${API}/users/child-data`, childData, authHeader());
    setUser(res.data.user);
    return res.data.user;
  };

  const saveAutismTest = async (testData) => {
    const res = await axios.put(`${API}/users/autism-test`, testData, authHeader());
    setUser(res.data.user);
    return res.data.user;
  };

  return (
    <AuthContext.Provider
      value={{ token, user, loading, register, login, logout, saveChildData, saveAutismTest }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
