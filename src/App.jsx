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
  const [selectedApp, setSelectedApp] = useState(null);
  const [saving, setSaving] = useState(false);

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
    if (session) fetchApps();
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

  function updateSelectedSchema(newSchema) {
    setSelectedApp({
      ...selectedApp,
      app_schema: newSchema,
    });
  }

  function addComponent(type) {
    const schema = selectedApp.app_schema || {
      components: [],
      queries: [],
    };

    const id = `${type}${Date.now()}`;

    let newComponent;

    if (type === "text") {
      newComponent = {
        id,
        type: "text",
        props: {
          text: "New text block",
        },
      };
    }

    if (type === "button") {
      newComponent = {
        id,
        type: "button",
        props: {
          label: "Click me",
        },
      };
    }

    if (type === "table") {
      newComponent = {
        id,
        type: "table",
        props: {
          data: [
            { id: 1, name: "Alice", role: "Admin" },
            { id: 2, name: "Bob", role: "Editor" },
          ],
        },
      };
    }

    if (type === "form") {
      newComponent = {
        id,
        type: "form",
        props: {
          fields: ["Name", "Email"],
        },
      };
    }

    const newSchema = {
      ...schema,
      components: [...(schema.components || []), newComponent],
    };

    updateSelectedSchema(newSchema);
  }

  async function saveApp() {
    setSaving(true);

    const { error } = await supabase
      .from("apps")
      .update({
        app_schema: selectedApp.app_schema,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedApp.id);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("App saved");
    fetchApps();
  }

  function renderComponent(component) {
    if (component.type === "text") {
      return (
        <div className="preview-text" key={component.id}>
          {component.props?.text}
        </div>
      );
    }

    if (component.type === "button") {
      return (
        <button className="preview-button" key={component.id}>
          {component.props?.label}
        </button>
      );
    }

    if (component.type === "table") {
      const rows = component.props?.data || [];

      return (
        <table className="preview-table" key={component.id}>
          <thead>
            <tr>
              {Object.keys(rows[0] || {}).map((key) => (
                <th key={key}>{key}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {Object.values(row).map((value, index) => (
                  <td key={index}>{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (component.type === "form") {
      return (
        <form className="preview-form" key={component.id}>
          {component.props?.fields?.map((field) => (
            <label key={field}>
              {field}
              <input type="text" placeholder={field} />
            </label>
          ))}

          <button type="button">Submit</button>
        </form>
      );
    }

    return (
      <div className="preview-unknown" key={component.id}>
        Unknown component: {component.type}
      </div>
    );
  }

  if (session && selectedApp) {
    const schema = selectedApp.app_schema || { components: [], queries: [] };

    return (
      <div className="builder-page">
        <aside className="builder-sidebar">
          <button onClick={() => setSelectedApp(null)}>← Back</button>

          <div>
            <h2>{selectedApp.name}</h2>
            <p>Builder</p>
          </div>

          <div className="builder-section">
            <h4>Components</h4>
            <button onClick={() => addComponent("text")}>Text</button>
            <button onClick={() => addComponent("button")}>Button</button>
            <button onClick={() => addComponent("table")}>Table</button>
            <button onClick={() => addComponent("form")}>Form</button>
          </div>
        </aside>

        <main className="builder-main">
          <header className="builder-header">
            <div>
              <h1>{selectedApp.name}</h1>
              <p>Draft app schema renderer</p>
            </div>

            <button onClick={saveApp} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </header>

          <section className="builder-canvas">
            <div className="preview-panel">
              {schema.components?.length ? (
                schema.components.map(renderComponent)
              ) : (
                <div className="empty-preview">No components yet.</div>
              )}
            </div>
          </section>
        </main>

        <aside className="builder-inspector">
          <h3>Inspector</h3>
          <p>Current app schema.</p>
          <pre>{JSON.stringify(schema, null, 2)}</pre>
        </aside>
      </div>
    );
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
                <button
                  className="app-card app-card-button"
                  key={app.id}
                  onClick={() => setSelectedApp(app)}
                >
                  <h3>{app.name}</h3>
                  <p>/{app.slug}</p>
                  <span>{app.published ? "Published" : "Draft"}</span>
                </button>
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