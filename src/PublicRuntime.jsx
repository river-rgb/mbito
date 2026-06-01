import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import "./App.css";

function getSubdomainSlug() {
  const host = window.location.hostname;

  if (
    host === "mbito.org" ||
    host === "www.mbito.org" ||
    host.includes("localhost")
  ) {
    return null;
  }

  if (host.endsWith(".mbito.org")) {
    return host.replace(".mbito.org", "");
  }

  return null;
}

function PublicRuntime() {
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadApp() {
      const slug = getSubdomainSlug();

      if (!slug) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("apps")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .single();

      if (error || !data) {
        setApp(null);
        setLoading(false);
        return;
      }

      setApp(data);
      setLoading(false);
    }

    loadApp();
  }, []);

  if (loading) {
    return <div className="public-loading">Loading app...</div>;
  }

  if (!app) {
    return <div className="public-loading">App not found</div>;
  }

  const schema = app.app_schema || { components: [], queries: [] };

  return (
    <div className="public-runtime">
      <div className="public-canvas">
        {(schema.components || []).map((component) => {
          const layout = component.layout || {};

          const style = {
            left: layout.x ?? 40,
            top: layout.y ?? 40,
            width: layout.width ?? 240,
            height: layout.height ?? 100,
          };

          if (component.type === "text") {
            return (
              <div
                key={component.id}
                className="runtime-component runtime-text"
                style={style}
              >
                {component.props?.text}
              </div>
            );
          }

          if (component.type === "image") {
            return (
              <img
                key={component.id}
                className="runtime-component runtime-image"
                src={component.props?.src}
                alt={component.props?.alt || ""}
                style={style}
              />
            );
          }

          if (component.type === "button") {
            return (
              <button
                key={component.id}
                className="runtime-component runtime-button"
                style={style}
              >
                {component.props?.label}
              </button>
            );
          }

          if (component.type === "form") {
            return (
              <form
                key={component.id}
                className="runtime-component runtime-form"
                style={style}
              >
                {(component.props?.fields || []).map((field) => (
                  <label key={field}>
                    {field}
                    <input type="text" placeholder={field} />
                  </label>
                ))}

                <button type="button">Submit</button>
              </form>
            );
          }

          if (component.type === "table") {
            const rows = component.props?.data || [];

            return (
              <table
                key={component.id}
                className="runtime-component runtime-table"
                style={style}
              >
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

          return null;
        })}
      </div>
    </div>
  );
}

export default PublicRuntime;