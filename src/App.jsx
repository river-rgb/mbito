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
  const [selectedComponentId, setSelectedComponentId] = useState(null);
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
          layout: { x: 40, y: 40, width: 360, height: 90 },
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
    setSelectedApp((currentApp) => ({
      ...currentApp,
      app_schema: newSchema,
    }));
  }

  function addComponent(type) {
    const schema = selectedApp.app_schema || {
      components: [],
      queries: [],
    };

    const id = `${type}${Date.now()}`;
    const baseLayout = { x: 60, y: 60, width: 260, height: 100 };

    let newComponent;

    if (type === "text") {
      newComponent = {
        id,
        type: "text",
        layout: { ...baseLayout, width: 320, height: 90 },
        props: {
          text: "New text block",
        },
      };
    }

    if (type === "button") {
      newComponent = {
        id,
        type: "button",
        layout: { ...baseLayout, width: 180, height: 70 },
        props: {
          label: "Click me",
        },
      };
    }

    if (type === "table") {
      newComponent = {
        id,
        type: "table",
        layout: { ...baseLayout, width: 420, height: 180 },
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
        layout: { ...baseLayout, width: 320, height: 260 },
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
    setSelectedComponentId(id);
  }

  function updateComponentProps(newProps) {
    const schema = selectedApp.app_schema;

    const newComponents = schema.components.map((component) => {
      if (component.id !== selectedComponentId) return component;

      return {
        ...component,
        props: {
          ...component.props,
          ...newProps,
        },
      };
    });

    updateSelectedSchema({
      ...schema,
      components: newComponents,
    });
  }

  function updateComponentLayout(componentId, newLayout) {
    setSelectedApp((currentApp) => {
      const schema = currentApp.app_schema || {
        components: [],
        queries: [],
      };

      const newComponents = schema.components.map((component) => {
        if (component.id !== componentId) return component;

        return {
          ...component,
          layout: {
            ...(component.layout || {}),
            ...newLayout,
          },
        };
      });

      return {
        ...currentApp,
        app_schema: {
          ...schema,
          components: newComponents,
        },
      };
    });
  }

  function deleteSelectedComponent() {
    const schema = selectedApp.app_schema;

    const newComponents = schema.components.filter(
      (component) => component.id !== selectedComponentId
    );

    updateSelectedSchema({
      ...schema,
      components: newComponents,
    });

    setSelectedComponentId(null);
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

function componentWrapper(component, content) {
  const layout = component.layout || {
    x: 40,
    y: 40,
    width: 240,
    height: 100,
  };

  function startDrag(e) {
    e.preventDefault();
    e.stopPropagation();

    setSelectedComponentId(component.id);

    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = layout.x ?? 40;
    const startTop = layout.y ?? 40;

    function onMove(moveEvent) {
      updateComponentLayout(component.id, {
        x: startLeft + moveEvent.clientX - startX,
        y: startTop + moveEvent.clientY - startY,
      });
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function startResize(e) {
    e.preventDefault();
    e.stopPropagation();

    setSelectedComponentId(component.id);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = layout.width ?? 240;
    const startHeight = layout.height ?? 100;

    function onMove(moveEvent) {
      updateComponentLayout(component.id, {
        width: Math.max(80, startWidth + moveEvent.clientX - startX),
        height: Math.max(40, startHeight + moveEvent.clientY - startY),
      });
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <div
      className={
        selectedComponentId === component.id
          ? "component-shell selected"
          : "component-shell"
      }
      style={{
        position: "absolute",
        left: layout.x ?? 40,
        top: layout.y ?? 40,
        width: layout.width ?? 240,
        height: layout.height ?? 100,
      }}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedComponentId(component.id);
      }}
    >
      <div className="drag-handle" onMouseDown={startDrag}>
        Drag
      </div>

      <div className="component-content">{content}</div>

      <div className="resize-handle" onMouseDown={startResize} />
    </div>
  );
}
  function renderComponent(component) {
    if (component.type === "text") {
      return componentWrapper(
        component,
        <div className="preview-text">{component.props?.text}</div>
      );
    }

    if (component.type === "button") {
      return componentWrapper(
        component,
        <button type="button" className="preview-button">
          {component.props?.label}
        </button>
      );
    }

    if (component.type === "table") {
      const rows = component.props?.data || [];

      return componentWrapper(
        component,
        <table className="preview-table">
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
      return componentWrapper(
        component,
        <form className="preview-form">
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

    return componentWrapper(
      component,
      <div className="preview-unknown">Unknown component: {component.type}</div>
    );
  }

  function renderInspector(schema) {
    const selectedComponent = schema.components?.find(
      (component) => component.id === selectedComponentId
    );

    if (!selectedComponent) {
      return (
        <>
          <h3>Inspector</h3>
          <p>Select a component to edit its properties.</p>
          <pre>{JSON.stringify(schema, null, 2)}</pre>
        </>
      );
    }

    const layout = selectedComponent.layout || {};

    return (
      <>
        <h3>{selectedComponent.type}</h3>

        <div className="layout-grid">
          <label>
            X
            <input value={layout.x ?? 0} readOnly />
          </label>
          <label>
            Y
            <input value={layout.y ?? 0} readOnly />
          </label>
          <label>
            Width
            <input value={layout.width ?? ""} readOnly />
          </label>
          <label>
            Height
            <input value={layout.height ?? ""} readOnly />
          </label>
        </div>

        {selectedComponent.type === "text" && (
          <label className="inspector-field">
            Text
            <textarea
              value={selectedComponent.props?.text || ""}
              onChange={(e) => updateComponentProps({ text: e.target.value })}
            />
          </label>
        )}

        {selectedComponent.type === "button" && (
          <label className="inspector-field">
            Label
            <input
              value={selectedComponent.props?.label || ""}
              onChange={(e) => updateComponentProps({ label: e.target.value })}
            />
          </label>
        )}

        {selectedComponent.type === "form" && (
          <label className="inspector-field">
            Fields
            <textarea
              value={(selectedComponent.props?.fields || []).join(", ")}
              onChange={(e) =>
                updateComponentProps({
                  fields: e.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
        )}

        {selectedComponent.type === "table" && (
          <p>Sample table editing comes later.</p>
        )}

        <button className="danger-button" onClick={deleteSelectedComponent}>
          Delete component
        </button>
      </>
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
              <p>Drag and resize components freely</p>
            </div>

            <button onClick={saveApp} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </header>

          <section className="builder-canvas">
            <div
              className="preview-panel"
              onClick={() => setSelectedComponentId(null)}
            >
              {schema.components?.length ? (
                schema.components.map(renderComponent)
              ) : (
                <div className="empty-preview">No components yet.</div>
              )}
            </div>
          </section>
        </main>

        <aside className="builder-inspector" onClick={(e) => e.stopPropagation()}>
          {renderInspector(schema)}
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