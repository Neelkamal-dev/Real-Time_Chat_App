import React, { Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext.jsx";

// Bundle Chunk Lazy Loading
const HomePage = React.lazy(() => import("./pages/HomePage"));
const LoginPage = React.lazy(() => import("./pages/LoginPage"));
const ProfilePage = React.lazy(() => import("./pages/ProfilePage"));

const App = () => {
  const { authUser, isCheckingAuth } = useContext(AuthContext);

  if (isCheckingAuth && !authUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-zinc-950">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-zinc-950 min-h-screen text-slate-800 dark:text-zinc-100 transition-colors duration-200">
      <Toaster />
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-zinc-950">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
        </div>
      }>
        <Routes>
          <Route path="/" element={authUser ? <HomePage /> : <LoginPage />} />
          <Route
            path="/login"
            element={!authUser ? <LoginPage /> : <HomePage />}
          />
          <Route
            path="/profile"
            element={authUser ? <ProfilePage /> : <LoginPage />}
          />
        </Routes>
      </Suspense>
    </div>
  );
};

export default App;
