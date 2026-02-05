import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";

// ВАЖНО: импортируй свой основной дизайн-экран
import Home from "./pages/Home.jsx"; // или как у тебя называется главная

import { AuthProvider, useAuth } from "./state/auth.jsx";

function Protected({ children }) {
  const { me, loading } = useAuth();

  if (loading) return <div style={{ padding: 24 }}>Ładowanie…</div>;
  if (!me) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* основной дизайн под защитой */}
        <Route
          path="/*"
          element={
            <Protected>
              <Home />
            </Protected>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
