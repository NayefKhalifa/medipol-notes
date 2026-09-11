import React, { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { auth } from "./firebase";

const ALLOWED_DOMAIN = "std.medipol.edu.tr";

export default function Login({ onClose }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (mode === "signup" && !email.toLowerCase().endsWith("@" + ALLOWED_DOMAIN)) {
      setError("Please use your official school email to sign up.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(cred.user);
        setVerificationSent(true);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        onClose();
      }
    } catch (err) {
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div
        className="bg-[#F6F1E4] border border-[#D8CFB8] rounded-sm p-7 max-w-sm w-full relative"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <button onClick={onClose} className="absolute top-3 right-3 text-[#6B6250] hover:text-[#1B2A4A] text-lg">✕</button>
        <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "'Source Serif 4', serif" }}>
          {mode === "signup" ? "Create account" : "Sign in"}
        </h2>
        <p className="text-[13px] text-[#6B6250] mb-5">
          {mode === "signup" ? "Use your official school email" : "Welcome back"}
        </p>

        {verificationSent ? (
          <div className="text-center py-4">
            <p className="text-[15px] font-semibold mb-2">Check your inbox</p>
            <p className="text-[13px] text-[#6B6250] mb-4">
              We sent a verification link to {email}. Click it, then come back and sign in.
            </p>
            <button
              onClick={onClose}
              className="text-[13px] font-semibold px-4 py-2 rounded-sm bg-[#1B2A4A] text-[#F6F1E4]"
            >
              Got it
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input type="email" required placeholder="you@school.edu.tr" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-white border border-[#C9BE9F] rounded-sm px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]" />
            <input type="password" required minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-white border border-[#C9BE9F] rounded-sm px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]" />
            {error && <p className="text-[13px] text-[#B8342A]">{error}</p>}
            <button type="submit" disabled={loading} className="mt-1 bg-[#1B2A4A] text-[#F6F1E4] font-semibold text-sm px-4 py-2.5 rounded-sm hover:bg-[#25396A] transition-colors disabled:opacity-60">
              {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>
        )}

        {!verificationSent && (
          <button onClick={() => { setError(""); setMode(mode === "signup" ? "signin" : "signup"); }} className="mt-4 text-[13px] text-[#1B2A4A] underline">
            {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
          </button>
        )}
      </div>
    </div>
  );
}