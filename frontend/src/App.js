import { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Login from "./Login";
import CanvasCalendar from "./CanvasCalendar";

function TokenForm({ user, onSave, onCancel }) {
  const [canvasToken, setCanvasToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await setDoc(doc(db, "tokens", user.uid), { token: canvasToken });
      localStorage.removeItem("customEvents");
      await onSave();
    } catch (err) {
      setError("Failed to save token. Try again.");
      console.error("Token save error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-md mx-auto mt-20 bg-white p-8 rounded-2xl shadow-xl space-y-5"
    >
      <h3 className="text-2xl font-bold text-center text-gray-800">Enter Canvas API Token</h3>
      <input
        placeholder="Paste your token"
        value={canvasToken}
        onChange={(e) => setCanvasToken(e.target.value)}
        disabled={loading}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      <p className="text-sm text-gray-600 mt-2">
        🔐 <strong>How to get your Canvas API Token:</strong><br />
        1. Log in to your Canvas account.<br />
        2. Click on <em>Account</em> → <em>Settings</em>.<br />
        3. Scroll down to <em>Approved Integrations</em> and click <strong>+ New Access Token</strong>.<br />
        4. Give it a name and expiration, then click <em>Generate Token</em>.<br />
        5. Copy the token and paste it here.
      </p>

      <div className="flex justify-between gap-4">
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-semibold disabled:opacity-50 transition"
        >
          {loading ? "Saving..." : "Save Token"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 py-3 rounded-lg font-semibold disabled:opacity-50 transition"
        >
          Cancel
        </button>
      </div>

      {error && <div className="text-red-500 text-sm text-center">{error}</div>}
    </form>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [canvasToken, setCanvasToken] = useState("");
  const [showTokenForm, setShowTokenForm] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const forceToken = localStorage.getItem("forceToken");
    if (forceToken === "true") {
      setShowTokenForm(true);
      localStorage.removeItem("forceToken");
      return;
    }

    const tokenRef = doc(db, "tokens", user.uid);
    getDoc(tokenRef)
      .then((docSnap) => {
        if (docSnap.exists() && docSnap.data().token) {
          setCanvasToken(docSnap.data().token);
          setShowTokenForm(false);
        } else {
          setShowTokenForm(true);
        }
      })
      .catch(() => {
        setShowTokenForm(true);
      });
  }, [user]);

  if (authLoading) {
    return <div className="text-center mt-20 text-lg font-medium">Checking login status...</div>;
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  if (showTokenForm) {
    return (
      <TokenForm
        user={user}
        onSave={async () => {
          const tokenRef = doc(db, "tokens", user.uid);
          const docSnap = await getDoc(tokenRef);
          if (docSnap.exists() && docSnap.data().token) {
            setCanvasToken(docSnap.data().token);
            setShowTokenForm(false);
          }
        }}
        onCancel={() => setShowTokenForm(false)}
      />
    );
  }

  if (!canvasToken) {
    return <div className="text-center mt-20 text-lg font-medium">Loading your Canvas token...</div>;
  }

  return (
    <CanvasCalendar
      userToken={canvasToken}
      setShowTokenForm={setShowTokenForm}
    />
  );
}

export default App;
