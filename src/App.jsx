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
  const [selectedQueryId, setSelectedQueryId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [queryResults, setQueryResults] = useState({});

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
          props: { text: "Welcome to your first Mbito app" },
          events: {},
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

  function addQuery() {
    const schema = selectedApp.app_schema || { components: [], queries: [] };

    const id = `query${Date.now()}`;

    const newQuery = {
      id,
      name: "New REST Query",
      type: "rest",
      method: "GET",
      url: "https://jsonplaceholder.typicode.com/users",
      headers: {},
      body: "",
    };

    updateSelectedSchema({
      ...schema,
      queries: [...(schema.queries || []), newQuery],
    });

    setSelectedQueryId(id);
    setSelectedComponentId(null);
  }

  function updateQuery(queryId, updates) {
    const schema = selectedApp.app_schema || { components: [], queries: [] };

    const newQueries = (schema.queries || []).map((query) =>
      query.id === queryId ? { ...query, ...updates } : query
    );

    updateSelectedSchema({
      ...schema,
      queries: newQueries,
    });
  }

  function deleteQuery(queryId) {
    const schema = selectedApp.app_schema || { components: [], queries: [] };

    const newQueries = (schema.queries || []).filter(
      (query) => query.id !== queryId
    );

    updateSelectedSchema({
      ...schema,
      queries: newQueries,
    });

    setSelectedQueryId(null);
  }

  async function runQuery(query) {
    try {
      if (!query.url) {
        alert("Query URL is required");
        return;
      }

      const options = {
        method: query.method || "GET",
        headers: query.headers || {},
      };

      if (query.method !== "GET" && query.body) {
        options.body = query.body;
      }

      const response = await fetch(query.url, options);
      const contentType = response.headers.get("content-type");

      let data;

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      const result = {
        ok: response.ok,
        status: response.status,
        data,
        ranAt: new Date().toISOString(),
      };

      setQueryResults((current) => ({
        ...current,
        [query.id]: result,
      }));

      return result;
    } catch (error) {
      const result = {
        ok: false,
        error: error.message,
        ranAt: new Date().toISOString(),
      };

      setQueryResults((current) => ({
        ...current,
        [query.id]: result,
      }));

      alert(`Query error: ${error.message}`);
      return result;
    }
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
        props: { text: "New text block" },
        events: {},
      };
    }

    if (type === "button") {
      newComponent = {
        id,
        type: "button",
        layout: { ...baseLayout, width: 180, height: 70 },
        props: { label: "Click me" },
        events: { onClick: `alert("Button clicked");` },
      };
    }

    if (type === "table") {
      newComponent = {
        id,
        type: "table",
        layout: { ...baseLayout, width: 420, height: 180 },
        props: {
          dataSource: "static",
          queryId: "",
          data: [
            { id: 1, name: "Alice", role: "Admin" },
            { id: 2, name: "Bob", role: "Editor" },
          ],
        },
        events: {},
      };
    }

    if (type === "form") {
      newComponent = {
        id,
        type: "form",
        layout: { ...baseLayout, width: 320, height: 260 },
        props: { fields: ["Name", "Email"] },
        events: {},
      };
    }

    if (type === "image") {
      newComponent = {
        id,
        type: "image",
        layout: { ...baseLayout, width: 320, height: 220 },
        props: {
          src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
          alt: "Image",
        },
        events: { onClick: `alert("Image clicked");` },
      };
    }

    const newSchema = {
      ...schema,
      components: [...(schema.components || []), newComponent],
    };

    updateSelectedSchema(newSchema);
    setSelectedComponentId(id);
    setSelectedQueryId(null);
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

  function updateComponentEvents(newEvents) {
    const schema = selectedApp.app_schema;

    const newComponents = schema.components.map((component) => {
      if (component.id !== selectedComponentId) return component;

      return {
        ...component,
        events: {
          ...(component.events || {}),
          ...newEvents,
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
      const schema = currentApp.app_schema || { components: [], queries: [] };

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

  async function runComponentScript(component, eventName) {
    const script = component.events?.[eventName];

    if (!script || !script.trim()) return;

    const schema = selectedApp.app_schema || { components: [], queries: [] };

    const queryApi = {};
    for (const query of schema.queries || []) {
      queryApi[query.id] = {
        data: queryResults[query.id]?.data,
        result: queryResults[query.id],
        run: () => runQuery(query),
      };
    }

    const url = {
      href: window.location.href,
      origin: window.location.origin,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      searchParams: Object.fromEntries(
        new URLSearchParams(window.location.search).entries()
      ),
    };

    const utils = {
      openUrl(targetUrl, options = {}) {
        const newTab = options.newTab ?? false;
        const forceReload = options.forceReload ?? false;

        if (newTab) {
          window.open(targetUrl, "_blank");
          return;
        }

        if (forceReload) {
          window.location.href = targetUrl;
          return;
        }

        window.location.assign(targetUrl);
      },
    };

    try {
      const runner = new Function(
        "component",
        "props",
        "layout",
        "app",
        "url",
        "utils",
        "queries",
        "alert",
        "console",
        `
        return (async () => {
          ${script}
        })();
        `
      );

      await runner(
        component,
        component.props || {},
        component.layout || {},
        selectedApp,
        url,
        utils,
        queryApi,
        alert,
        console
      );
    } catch (error) {
      alert(`Script error: ${error.message}`);
    }
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
      setSelectedQueryId(null);

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
      setSelectedQueryId(null);

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
          setSelectedQueryId(null);
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

  function getTableRows(component) {
    if (component.props?.dataSource === "query" && component.props?.queryId) {
      const result = queryResults[component.props.queryId];
      if (Array.isArray(result?.data)) return result.data;
      return [];
    }

    return component.props?.data || [];
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
        <button
          type="button"
          className="preview-button"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedComponentId(component.id);
            setSelectedQueryId(null);
            runComponentScript(component, "onClick");
          }}
        >
          {component.props?.label}
        </button>
      );
    }

    if (component.type === "table") {
      const rows = getTableRows(component);

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
            {rows.map((row, rowIndex) => (
              <tr key={row.id || rowIndex}>
                {Object.values(row).map((value, index) => (
                  <td key={index}>
                    {typeof value === "object"
                      ? JSON.stringify(value)
                      : String(value)}
                  </td>
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

    if (component.type === "image") {
      return componentWrapper(
        component,
        <img
          className="preview-image clickable-image"
          src={component.props?.src}
          alt={component.props?.alt || ""}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedComponentId(component.id);
            setSelectedQueryId(null);
            runComponentScript(component, "onClick");
          }}
        />
      );
    }

    return componentWrapper(
      component,
      <div className="preview-unknown">Unknown component: {component.type}</div>
    );
  }

  function renderQueryInspector(schema) {
    const query = (schema.queries || []).find((q) => q.id === selectedQueryId);
    if (!query) return null;

    const result = queryResults[query.id];

    return (
      <>
        <h3>Query</h3>

        <label className="inspector-field">
          Name
          <input
            value={query.name || ""}
            onChange={(e) => updateQuery(query.id, { name: e.target.value })}
          />
        </label>

        <label className="inspector-field">
          Method
          <select
            value={query.method || "GET"}
            onChange={(e) => updateQuery(query.id, { method: e.target.value })}
          >
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>PATCH</option>
            <option>DELETE</option>
          </select>
        </label>

        <label className="inspector-field">
          URL
          <input
            value={query.url || ""}
            onChange={(e) => updateQuery(query.id, { url: e.target.value })}
          />
        </label>

        {query.method !== "GET" && (
          <label className="inspector-field">
            Body
            <textarea
              value={query.body || ""}
              onChange={(e) => updateQuery(query.id, { body: e.target.value })}
            />
          </label>
        )}

        <button onClick={() => runQuery(query)}>Run Query</button>

        <button className="danger-button" onClick={() => deleteQuery(query.id)}>
          Delete Query
        </button>

        <h4>Result</h4>
        <pre>{result ? JSON.stringify(result, null, 2) : "No result yet"}</pre>
      </>
    );
  }

  function renderComponentInspector(schema) {
    const selectedComponent = schema.components?.find(
      (component) => component.id === selectedComponentId
    );

    if (!selectedComponent) {
      return (
        <>
          <h3>Inspector</h3>
          <p>Select a component or query.</p>
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
          <>
            <label className="inspector-field">
              Label
              <input
                value={selectedComponent.props?.label || ""}
                onChange={(e) =>
                  updateComponentProps({ label: e.target.value })
                }
              />
            </label>

            <label className="inspector-field">
              On Click Script
              <textarea
                value={selectedComponent.events?.onClick || ""}
                onChange={(e) =>
                  updateComponentEvents({ onClick: e.target.value })
                }
                placeholder='const result = await queries.query1.run();'
              />
            </label>
          </>
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
          <>
            <label className="inspector-field">
              Data Source
              <select
                value={selectedComponent.props?.dataSource || "static"}
                onChange={(e) =>
                  updateComponentProps({ dataSource: e.target.value })
                }
              >
                <option value="static">Static sample data</option>
                <option value="query">Query result</option>
              </select>
            </label>

            {selectedComponent.props?.dataSource === "query" && (
              <label className="inspector-field">
                Query
                <select
                  value={selectedComponent.props?.queryId || ""}
                  onChange={(e) =>
                    updateComponentProps({ queryId: e.target.value })
                  }
                >
                  <option value="">Select query</option>
                  {(schema.queries || []).map((query) => (
                    <option key={query.id} value={query.id}>
                      {query.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </>
        )}

        {selectedComponent.type === "image" && (
          <>
            <label className="inspector-field">
              Image URL
              <input
                value={selectedComponent.props?.src || ""}
                onChange={(e) => updateComponentProps({ src: e.target.value })}
              />
            </label>

            <label className="inspector-field">
              Alt text
              <input
                value={selectedComponent.props?.alt || ""}
                onChange={(e) => updateComponentProps({ alt: e.target.value })}
              />
            </label>

            <label className="inspector-field">
              On Click Script
              <textarea
                value={selectedComponent.events?.onClick || ""}
                onChange={(e) =>
                  updateComponentEvents({ onClick: e.target.value })
                }
                placeholder='const result = await queries.query1.run();'
              />
            </label>

            <div className="script-help">
              Available:
              <code>queries.queryId.run()</code>
              <code>props</code>
              <code>url</code>
              <code>utils.openUrl()</code>
            </div>
          </>
        )}

        <button className="danger-button" onClick={deleteSelectedComponent}>
          Delete component
        </button>
      </>
    );
  }

  function renderInspector(schema) {
    if (selectedQueryId) return renderQueryInspector(schema);
    return renderComponentInspector(schema);
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
            <button onClick={() => addComponent("image")}>Image</button>
          </div>

          <div className="builder-section">
            <h4>Queries</h4>
            <button onClick={addQuery}>New REST Query</button>

            {(schema.queries || []).map((query) => (
              <button
                key={query.id}
                onClick={() => {
                  setSelectedQueryId(query.id);
                  setSelectedComponentId(null);
                }}
              >
                {query.name || query.id}
              </button>
            ))}
          </div>
        </aside>

        <main className="builder-main">
          <header className="builder-header">
            <div>
              <h1>{selectedApp.name}</h1>
              <p>Drag, resize, script, and run REST queries</p>
            </div>

            <button onClick={saveApp} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </header>

          <section className="builder-canvas">
            <div
              className="preview-panel"
              onClick={() => {
                setSelectedComponentId(null);
                setSelectedQueryId(null);
              }}
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