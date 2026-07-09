import React, { useState } from "react";
import assets from "../assets/assets";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext.jsx";

const LoginPage = () => {
  const [currState, setCurrState] = useState("Sign up");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [isDataSubmitted, setIsDataSubmitted] = useState(false);

  const { login } = useContext(AuthContext);

  const submitHandler = (e) => {
    e.preventDefault();
    if (currState === "Sign up" && !isDataSubmitted) {
      setIsDataSubmitted(true);
      return;
    }
    login(currState === "Sign up" ? "signup" : "login", { fullName, email, password, bio });
  };

  return (
    <div className="min-h-screen flex items-center justify-center gap-8 sm:justify-evenly max-sm:flex-col p-4 bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {/* left info */}
      <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-2 max-w-sm">
        <img src={assets.logo_big} alt="Logo" className="w-[min(28vw,210px)] filter dark:brightness-100 brightness-0" />
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-light">
          Experience premium real-time collaboration with smart suggestions, speech transcripts, and instant semantic search.
        </p>
      </div>

      {/* right form */}
      <form
        onSubmit={submitHandler}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 flex flex-col gap-5 rounded-2xl shadow-xl w-full max-w-sm text-slate-800 dark:text-white transition-all duration-200"
      >
        <h2 className="font-bold text-2xl flex justify-between items-center text-slate-900 dark:text-white">
          {currState}
          {isDataSubmitted && (
            <img
              onClick={() => setIsDataSubmitted(false)}
              src={assets.arrow_icon}
              alt="Back"
              className="w-5 cursor-pointer hover:opacity-80 transition-opacity filter dark:invert invert"
            />
          )}
        </h2>

        {currState === "Sign up" && !isDataSubmitted && (
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wider">Full Name</label>
            <input
              onChange={(e) => setFullName(e.target.value)}
              value={fullName}
              type="text"
              className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 dark:text-white"
              placeholder="Your full name"
              required
            />
          </div>
        )}

        {!isDataSubmitted && (
          <>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wider">Email Address</label>
              <input
                onChange={(e) => setEmail(e.target.value)}
                value={email}
                type="email"
                placeholder="you@example.com"
                required
                className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 dark:text-white"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wider">Password</label>
              <input
                onChange={(e) => setPassword(e.target.value)}
                value={password}
                type="password"
                placeholder="••••••••"
                required
                className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 dark:text-white"
              />
            </div>
          </>
        )}

        {currState === "Sign up" && isDataSubmitted && (
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wider">Short Bio</label>
            <textarea
              onChange={(e) => setBio(e.target.value)}
              value={bio}
              rows={4}
              className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 dark:text-white resize-none"
              placeholder="Tell others a bit about yourself..."
              required
            ></textarea>
          </div>
        )}

        <button
          type="submit"
          className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3.5 font-semibold transition-all shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-95 text-sm"
        >
          {currState === "Sign up" ? (isDataSubmitted ? "Create Account" : "Next") : "Login"}
        </button>

        <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
          <input type="checkbox" required className="accent-blue-600 w-4 h-4 rounded border-slate-300" />
          <p>I agree to the terms of use & privacy policy.</p>
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {currState === "Sign up" ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Already have an account?{" "}
              <span
                onClick={() => {
                  setCurrState("Login");
                  setIsDataSubmitted(false);
                }}
                className="font-semibold text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
              >
                Login here
              </span>
            </p>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              New to our platform?{" "}
              <span
                onClick={() => setCurrState("Sign up")}
                className="font-semibold text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
              >
                Click here
              </span>
            </p>
          )}
        </div>
      </form>
    </div>
  );
};

export default LoginPage;
