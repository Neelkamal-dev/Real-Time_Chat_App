import React from "react";
import { Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import { Toaster } from "react-hot-toast";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext.jsx";

const App = () => {
  const { authUser, isCheckingAuth } = useContext(AuthContext);

  if (isCheckingAuth && !authUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#130f26]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className='bg-[#f8f9fa] dark:bg-[url("./src/assets/bgImage.svg")] dark:bg-contain bg-cover min-h-screen text-slate-800 dark:text-white transition-colors duration-200'>
      <Toaster />
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
    </div>
  );
};

export default App;
