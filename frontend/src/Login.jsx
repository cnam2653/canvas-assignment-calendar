import React, { useState } from "react";
import { auth } from "./firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from "firebase/auth";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    signInWithEmailAndPassword(auth, email, password)
      .then((res) => {
        setError("");
        setMessage("");
        onLogin(res.user);
      })
      .catch((err) => {
        setError(err.message);
        setMessage("");
      });
  };

  const handleRegister = (e) => {
    e.preventDefault();
    createUserWithEmailAndPassword(auth, email, password)
      .then((res) => {
        setError("");
        setMessage("");
        onLogin(res.user);
      })
      .catch((err) => {
        setError(err.message);
        setMessage("");
      });
  };

  const handleForgotPassword = () => {
    if (!email) {
      setError("Please enter your email before resetting password.");
      return;
    }

    sendPasswordResetEmail(auth, email)
      .then(() => {
        setError("");
        setMessage("Password reset email sent. Check your inbox.");
      })
      .catch((err) => {
        setError(err.message);
        setMessage("");
      });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-purple-200 px-4 py-10 space-y-6">
      {/* Login Form */}
      <form className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm space-y-5 transition-all duration-300">
        <h2 className="text-3xl font-extrabold text-center text-gray-800">Canvas Calendar</h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="flex gap-4 justify-between">
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
          >
            Login
          </button>
          <button
            onClick={handleRegister}
            className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 rounded-lg transition"
          >
            Register
          </button>
        </div>

        <button
          type="button"
          onClick={handleForgotPassword}
          className="text-sm text-blue-600 hover:underline block text-center mt-2"
        >
          Forgot Password?
        </button>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        {message && <p className="text-green-600 text-sm text-center">{message}</p>}
      </form>

      {/* About Section */}
      <div className="max-w-2xl w-full bg-white px-6 py-6 rounded-2xl shadow-lg border border-gray-200">
        <h3 className="text-2xl font-bold text-indigo-700 mb-3 text-center">About Canvas Assignment Calendar</h3>
        <p className="text-gray-800 text-base">
          This tool helps students visualize and manage their Canvas assignments by displaying them on an interactive calendar.
          You can also add, remove, and update personal events manually. This calendar app was created using React and Node.js, integrating Canvas API and Firebase authentication.
        </p>
        <p className="text-gray-800 text-base mt-2">
          Your data remains private and assignments are pulled using your personal Canvas API token, and custom events are stored locally in your browser. If you encounter issues, email chrisnam928@gmail.com.
        </p>
      </div>
    </div>
  );
}
