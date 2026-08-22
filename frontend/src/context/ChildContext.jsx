import React, { createContext, useContext, useEffect, useState } from "react";
import { CHILD } from "../mock";
import { useAuth } from "./AuthContext";

const ChildContext = createContext(null);

const STORAGE_KEY = "autigaze_child_profile";
const EMPTY_CHILD = Object.fromEntries(
  Object.entries(CHILD).map(([key, value]) => [key, Array.isArray(value) ? [] : ""])
);

export const ChildProvider = ({ children }) => {
  const { user } = useAuth();
  const [child, setChild] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...EMPTY_CHILD, ...JSON.parse(saved) } : EMPTY_CHILD;
    } catch {
      return EMPTY_CHILD;
    }
  });

  useEffect(() => {
    if (user?.child) {
      setChild({ ...EMPTY_CHILD, ...user.child });
    }
  }, [user]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(child));
    } catch {
      /* ignore */
    }
  }, [child]);

  const updateChild = (updates) => setChild((prev) => ({ ...prev, ...updates }));

  return (
    <ChildContext.Provider value={{ child, updateChild }}>
      {children}
    </ChildContext.Provider>
  );
};

export const useChild = () => {
  const ctx = useContext(ChildContext);
  if (!ctx) throw new Error("useChild must be used within ChildProvider");
  return ctx;
};
