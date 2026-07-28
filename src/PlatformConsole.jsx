import { useEffect, useState } from "react";

// Same CSS-string → style-object helper as App.jsx / LandingPage.jsx, kept local
// so this file has no import-order dependency on App.
function sx(str) {
  if (!str) return undefined;
  const obj = {};
  for (const rule of str.split(";")) {
    const i = rule.indexOf(":");
    if (i === -1) continue;
    const prop = rule.slice(0, i).trim();
    const val = rule.slice(i + 1).trim();
    if (!prop || !val) continue;
    obj[prop.startsWith("--") ? prop : prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = val;
  }
  return obj;
}

const money = (cents) => "$" + (cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 });
const STATUS_TAG = { active: "tag tag-accent", trial: "tag tag-neutral", suspended: "tag tag-accent-2" };

// Cross-tenant admin surface for the platform super user. Every fetch here hits
// /api/platform/* (requirePlatform on the backend); a company admin never reaches
// this component because App renders it only when currentUser.isPlatform.
export default function PlatformConsole({ api, user, onLogout, notify }) {
  const [orgs, setOrgs] = useState(null);
  const [plans, setPlans] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    const [o, p, inv] = await Promise.all([
      api("/api/platform/orgs"), api("/api/platform/plans"), api("/api/platform/invoices"),
    ]);
    setOrgs(o); setPlans(p); setInvoices(inv);
  };
  useEffect(() => { load().catch(() => setOrgs([])); }, []);

  const patchOrg = async (id, body, msg) => {
    setBusyId(id);
    try {
      await api(`/api/platform/orgs/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      await load();
      notify(msg);
    } catch {
      notify("Update failed", "error");
    } finally {
      setBusyId(null);
    }
  };

  const rule = (h) => <div style={sx(`height:${h}px;background:var(--color-text)`)} />;
  const th = sx("text-align:left;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:var(--color-neutral-600);padding:var(--space-2);border-bottom:1px solid var(--color-divider)");
  const td = sx("padding:var(--space-3) var(--space-2);border-bottom:1px solid var(--color-divider);font-size:14px;vertical-align:middle");

  const revenue = invoices.filter((i) => i.status === "paid").reduce((a, i) => a + i.amount_cents, 0);

  return (
    <div style={sx("min-height:100vh;background:var(--color-bg);color:var(--color-text)")}>
      <div style={sx("max-width:1360px;margin:0 auto;padding:var(--space-4) var(--space-8) var(--space-8)")}>

        {/* masthead */}
        <div style={sx("display:flex;align-items:baseline;gap:var(--space-3)")}>
          <span style={sx("font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:24px;letter-spacing:-0.02em")}>Flowdesk</span>
          <span style={sx("font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:var(--color-accent-2)")}>Platform Console</span>
          <div style={sx("margin-left:auto;display:flex;align-items:center;gap:var(--space-3)")}>
            <span className="text-muted" style={sx("font-size:13px")}>{user.name}</span>
            <button className="btn btn-secondary" onClick={onLogout}>Sign out</button>
          </div>
        </div>
        <div style={sx("margin-top:var(--space-3);height:3px;background:var(--color-text)")} />
        <div style={sx("display:flex;justify-content:space-between;padding:6px 0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:var(--color-neutral-700)")}>
          <span>Every tenant, one desk</span>
          <span>Super user</span>
          <span>{orgs ? `${orgs.length} companies` : "…"}</span>
        </div>
        {rule(1)}

        {/* KPI strip */}
        <div style={sx("display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-6);padding:var(--space-6) 0")}>
          {[
            { label: "Companies", value: orgs ? String(orgs.length) : "—" },
            { label: "Active subscriptions", value: orgs ? String(orgs.filter((o) => o.status !== "suspended").length) : "—" },
            { label: "Collected revenue", value: money(revenue) },
          ].map((k) => (
            <div key={k.label}>
              <div style={sx("font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:38px")}>{k.value}</div>
              <div className="text-muted" style={sx("font-size:12px;margin-top:4px")}>{k.label}</div>
            </div>
          ))}
        </div>
        {rule(1)}

        {/* companies table */}
        <h2 style={sx("margin:var(--space-6) 0 var(--space-3)")}>Companies</h2>
        {!orgs ? (
          <div className="text-muted" style={sx("font-size:13px")}>Loading…</div>
        ) : (
          <div style={sx("overflow-x:auto")}>
            <table style={sx("width:100%;border-collapse:collapse;min-width:820px")}>
              <thead>
                <tr>
                  <th style={th}>Company</th><th style={th}>Country</th><th style={th}>Plan</th>
                  <th style={th}>Billing</th><th style={th}>Seats</th><th style={th}>Status</th><th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((o) => (
                  <tr key={o.id} style={busyId === o.id ? sx("opacity:0.5") : undefined}>
                    <td style={td}>
                      <div style={sx("font-family:var(--font-heading);font-weight:var(--font-heading-weight)")}>{o.name}</div>
                      <div className="text-muted" style={sx("font-size:12px")}>{o.industry || "—"}</div>
                    </td>
                    <td style={td}>{o.country || "—"}</td>
                    <td style={td}>
                      <select className="input" value={o.plan_key || ""} disabled={busyId === o.id}
                        onChange={(e) => patchOrg(o.id, { plan_key: e.target.value }, `${o.name} → ${e.target.value}`)}
                        style={sx("min-height:34px;font-size:13px")}>
                        {plans.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
                      </select>
                    </td>
                    <td style={td}><span className="text-muted" style={sx("font-size:13px;text-transform:capitalize")}>{o.billing_cycle || "—"}</span></td>
                    <td style={td}>{o.seats}</td>
                    <td style={td}><span className={STATUS_TAG[o.status] || "tag tag-neutral"} style={sx("text-transform:capitalize")}>{o.status}</span></td>
                    <td style={td}>
                      {o.status === "suspended" ? (
                        <button className="btn btn-secondary" disabled={busyId === o.id}
                          onClick={() => patchOrg(o.id, { status: "active" }, `${o.name} reactivated`)} style={sx("font-size:13px")}>
                          <i className="ph-duotone ph-play-circle" style={sx("font-size:15px")}></i>Reactivate
                        </button>
                      ) : (
                        <button className="btn btn-secondary" disabled={busyId === o.id}
                          onClick={() => patchOrg(o.id, { status: "suspended" }, `${o.name} suspended`)}
                          style={sx("font-size:13px;color:var(--color-accent-2)")}>
                          <i className="ph-duotone ph-pause-circle" style={sx("font-size:15px")}></i>Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* invoices */}
        <h2 style={sx("margin:var(--space-8) 0 var(--space-3)")}>Invoices</h2>
        {invoices.length === 0 ? (
          <div className="text-muted" style={sx("font-size:13px")}>No invoices yet.</div>
        ) : (
          <div style={sx("overflow-x:auto")}>
            <table style={sx("width:100%;border-collapse:collapse;min-width:560px")}>
              <thead><tr><th style={th}>Company</th><th style={th}>Amount</th><th style={th}>Status</th><th style={th}>Issued</th></tr></thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i.id}>
                    <td style={td}>{i.org}</td>
                    <td style={td}>{money(i.amount_cents)}</td>
                    <td style={td}><span className={i.status === "paid" ? "tag tag-accent" : "tag tag-neutral"} style={sx("text-transform:capitalize")}>{i.status}</span></td>
                    <td style={td}><span className="text-muted" style={sx("font-size:13px")}>{i.issued_at}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
