import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import "./App.css";

function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [apps, setApps] = useState([]);
  const [appName, setAppName] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchApps();
    }
  }, [session]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) alert(error.message);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  async function fetchApps() {
    const { data, error } = await supabase
      .from("apps")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setApps(data || []);
  }

  async function createApp(e) {
    e.preventDefault();

    if (!appName.trim()) return;

    const slug = appName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const starterSchema = {
      components: [
        {
          id: "text1",
          type: "text",
          props: {
            text: "Welcome to your first Mbito app",
          },
        },
      ],
      queries: [],
    };

    const { error } = await supabase.from("apps").insert({
      user_id: session.user.id,
      name: appName.trim(),
      slug,
      app_schema: starterSchema,
      published: false,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setAppName("");
    fetchApps();
  }

  if (session) {
    return (
      <div className="dashboard">
        <aside className="sidebar">
          <div>
            <h2>Mbito</h2>
            <p>Internal App Builder</p>
          </div>

          <button onClick={handleLogout}>Logout</button>
        </aside>

        <main className="main">
          <header className="main-header">
            <div>
              <h1>Apps</h1>
              <p>Logged in as {session.user.email}</p>
            </div>
          </header>

          <form className="new-app-card" onSubmit={createApp}>
            <h3>Create new app</h3>

            <div className="new-app-row">
              <input
                type="text"
                placeholder="Example: Customer Admin"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
              />

              <button type="submit">New App</button>
            </div>
          </form>

          <section className="apps-grid">
            {apps.length === 0 ? (
              <div className="empty-card">
                <h3>No apps yet</h3>
                <p>Create your first internal tool.</p>
              </div>
            ) : (
              apps.map((app) => (
                <div className="app-card" key={app.id}>
                  <h3>{app.name}</h3>
                  <p>/{app.slug}</p>
                  <span>{app.published ? "Published" : "Draft"}</span>
                </div>
              ))
            )}
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleLogin}>
        <h1>Mbito</h1>
        <p>Build internal tools from APIs and databases.</p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>
    </div>
  );
}

export default App;