import { useEffect, useState } from "react";
import GoogleLoginButton from "./components/GoogleLoginButton";
import { api, setAuthHeader } from "./services/api";

const TOKEN_KEY = "auth_token";

export default function App() {
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const loadProfile = async () => {
    setLoading(true);
    setMessage("");
    try {
      const { data } = await api.get("/users/me");
      setUser(data.user);
    } catch (error) {
      setMessage(error?.response?.data?.message || "Failed to load profile");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedToken) {
      setAuthHeader(savedToken);
      loadProfile();
    }
  }, []);

  const handleAuthSuccess = ({ token, user: userFromServer, message: serverMessage }) => {
    localStorage.setItem(TOKEN_KEY, token);
    setAuthHeader(token);
    setUser(userFromServer);
    setMessage(serverMessage);
  };

  const handleError = (errorMessage) => {
    setMessage(errorMessage);
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      setMessage("Logout API failed, local logout still completed");
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      setAuthHeader(null);
      setUser(null);
      setMessage("Logged out");
    }
  };

  return (
    <main className="container">
      <h1>Google OAuth Login Demo</h1>
      <p className="subtitle">React + Node/Express + MongoDB + Google Identity Services</p>

      {!user ? (
        <section className="card">
          <h2>Sign in</h2>
          <GoogleLoginButton onAuthSuccess={handleAuthSuccess} onError={handleError} />
        </section>
      ) : (
        <section className="card">
          <h2>Protected User Profile</h2>
          {loading ? <p>Loading profile...</p> : null}
          <img src={user.picture} alt={user.name} width="64" height="64" />
          <p><strong>Name:</strong> {user.name}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Provider:</strong> {user.provider}</p>
          <button onClick={loadProfile}>Refresh Protected Route</button>
          <button onClick={handleLogout} className="secondary">Logout</button>
        </section>
      )}

      {message ? <p className="message">{message}</p> : null}
    </main>
  );
}
