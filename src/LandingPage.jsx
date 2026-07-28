import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

// ponytail: hardcoded to localhost:4000, same as App.jsx's own API const —
// this file deliberately has no import from App.jsx (see sx() comment below).
const API = "http://localhost:4000";

// Converts a CSS declaration string into a React style object — same helper as App.jsx,
// duplicated locally so this page has no import-order dependency on App.
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

// The broadsheet CMYK plate treatment: one .paper span carrying the real text
// for assistive tech, three aria-hidden .plate repeats (C/M/Y) that multiply
// into a dark core with registration-drift fringes. .cmyk-head for headlines
// (multiplies onto the page), .cmyk-num for the KPI numerals (paints its own
// ground). Both defined in design.css.
const Plates = ({ text }) => (
  <>
    <span className="paper">{text}</span>
    <span className="plate plate-c" aria-hidden="true">{text}</span>
    <span className="plate plate-m" aria-hidden="true">{text}</span>
    <span className="plate plate-y" aria-hidden="true">{text}</span>
  </>
);

const PLAN_TAGLINES = {
  plus: "Core CRM for a small desk — pipeline, leads, contacts, calendar.",
  pro: "Everything in Plus, plus Reports and Studio for growing teams.",
  custom: "Bespoke limits, integrations and support — tell us what you need.",
};
const PLAN_MENU = [
  { key: "dashboard", label: "Dashboard" }, { key: "pipeline", label: "Pipeline" },
  { key: "leads", label: "Leads" }, { key: "contacts", label: "Contacts" },
  { key: "calendar", label: "Calendar" }, { key: "reports", label: "Reports" },
  { key: "studio", label: "Studio" },
];
const dollars = (cents) => "$" + Math.round(cents / 100).toLocaleString("en-US");

const HERO_LINES = ["Every deal, lead", "and report —", "one honest view."];
const KPIS = [
  { label: "Open pipeline", value: "$835k" }, { label: "Win rate", value: "34%" },
  { label: "Avg sales cycle", value: "42d" }, { label: "Quota attainment", value: "88%" },
];
const PREVIEW = [
  { stage: "Qualified", tagClass: "tag tag-accent", company: "Meridian Logistics", value: "$142k", tag: "Enterprise" },
  { stage: "Proposal", tagClass: "tag tag-accent", company: "Anargya Property", value: "$68k", tag: "Referral" },
  { stage: "Won", tagClass: "tag tag-accent-2", company: "Bluecrest Freight", value: "$210k", tag: "Renewal" },
];
const FEATURES = [
  { icon: "ph-kanban", title: "Pipeline", body: "Drag deals across New → Qualified → Proposal → Negotiation → Won. Stage totals update live." },
  { icon: "ph-magnet-straight", title: "Leads", body: "Captured from web, email and API, auto-scored hot/warm/cold, and routed to a rep." },
  { icon: "ph-blueprint", title: "Studio", body: "Add custom fields, automations and industry presets yourself — no migration, no developer." },
  { icon: "ph-chart-line-up", title: "Reports", body: "Weighted forecast, win rate, sales cycle and lost-reason breakdowns, always current." },
  { icon: "ph-users", title: "Contacts", body: "Every company and person tied back to their deals, notes and activity timeline." },
  { icon: "ph-calendar-dots", title: "Calendar", body: "Book calls and meetings, synced two-way with Google Calendar." },
];
const DEMO_ACCOUNTS = [
  { email: "amara@flowdesk.io", role: "Admin" },
  { email: "jonas@flowdesk.io", role: "Lead Sales" },
  { email: "lena@flowdesk.io", role: "Sales" },
];

export default function LandingPage({ onGetStarted }) {
  const reduceMotion = useReducedMotion();
  const [plans, setPlans] = useState(null);
  const [cycle, setCycle] = useState("monthly");
  const yearly = cycle === "yearly";

  useEffect(() => {
    fetch(API + "/api/plans").then((r) => r.json()).then(setPlans).catch(() => setPlans([]));
  }, []);

  const reveal = { duration: reduceMotion ? 0.01 : 0.45, ease: [0.16, 1, 0.3, 1] };
  const fadeUp = { hidden: { opacity: 0, y: reduceMotion ? 0 : 16 }, show: { opacity: 1, y: 0 } };
  const stagger = { hidden: {}, show: { transition: { staggerChildren: reduceMotion ? 0 : 0.07 } } };

  const rule = (h) => <div style={sx(`height:${h}px;background:var(--color-text)`)} />;

  return (
    <div style={sx("width:100%;background:var(--color-bg);color:var(--color-text)")}>
      <style>{`.land{max-width:1360px;margin:0 auto;padding-left:var(--space-8);padding-right:var(--space-8)}
        .land a{color:inherit}
        @media(max-width:900px){.land{padding-left:var(--space-4);padding-right:var(--space-4)}
          .hero-grid{grid-template-columns:1fr !important}
          .feat-grid{grid-template-columns:1fr !important}
          .kpi-grid{grid-template-columns:1fr 1fr !important}
          .price-grid{grid-template-columns:1fr !important}}`}</style>

      {/* MASTHEAD */}
      <div className="land" style={sx("padding-top:var(--space-4)")}>
        <div style={sx("display:flex;align-items:baseline;gap:var(--space-3)")}>
          <span style={sx("font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:24px;letter-spacing:-0.02em")}>Flowdesk</span>
          <span style={sx("font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:var(--color-neutral-600)")}>Sales CRM</span>
          <nav style={sx("margin-left:auto;display:flex;align-items:baseline;gap:var(--space-4)")}>
            <a href="#features" style={sx("font-size:14px")}>Features</a>
            <a href="#pricing" style={sx("font-size:14px")}>Pricing</a>
            <a href="#accounts" style={sx("font-size:14px")}>Demo</a>
            <button className="btn btn-secondary" onClick={onGetStarted}>Sign in</button>
          </nav>
        </div>
        <div style={sx("margin-top:var(--space-3);height:3px;background:var(--color-text)")} />
        <div style={sx("display:flex;justify-content:space-between;padding:6px 0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:var(--color-neutral-700)")}>
          <span>The Sales Desk</span>
          <span>One flat board · Est. 2026</span>
          <span>{yearly ? "Annual Edition" : "Monthly Edition"}</span>
        </div>
        {rule(1)}
      </div>

      {/* HERO */}
      <div className="land" style={sx("padding-top:var(--space-8)")}>
        <div className="hero-grid" style={sx("display:grid;grid-template-columns:1.5fr 1fr;gap:var(--space-8);align-items:start")}>
          <motion.div initial="hidden" animate="show" variants={stagger}>
            <motion.span variants={fadeUp} transition={reveal} className="card-kicker" style={sx("font-size:12px")}>
              The sales desk, on one flat board
            </motion.span>
            <motion.h1 variants={fadeUp} transition={reveal} style={sx("margin:var(--space-3) 0;font-size:62px;line-height:1.05;max-width:13ch")}>
              {HERO_LINES.map((line) => (
                <span key={line} className="cmyk-head" style={sx("display:block;position:relative")}>
                  <Plates text={line} />
                </span>
              ))}
            </motion.h1>
            <motion.p variants={fadeUp} transition={reveal} className="text-muted" style={sx("font-size:18px;max-width:50ch;line-height:1.5")}>
              Flowdesk is a sales CRM built around a single pipeline board: drag deals through stages, score and route leads automatically, and reshape forms yourself in Studio — no developer required.
            </motion.p>
            <motion.div variants={fadeUp} transition={reveal} style={sx("display:flex;align-items:center;gap:var(--space-4);margin-top:var(--space-4)")}>
              <button className="btn btn-primary" onClick={onGetStarted}>
                <i className="ph-duotone ph-arrow-right" style={sx("font-size:16px")}></i>Sign in
              </button>
              <a href="#accounts" style={sx("font-size:14px;color:var(--color-neutral-700)")}>See demo accounts ↓</a>
            </motion.div>
          </motion.div>

          {/* pipeline clipping */}
          <motion.div
            className="card elev-lg"
            style={sx("padding:var(--space-4);gap:var(--space-3)")}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...reveal, delay: reduceMotion ? 0 : 0.15 }}
          >
            <div style={sx("display:flex;justify-content:space-between;align-items:baseline")}>
              <span className="card-kicker">Pipeline</span>
              <span style={sx("font-size:11px;color:var(--color-neutral-600)")}>Owner: All</span>
            </div>
            {PREVIEW.map((d, i) => (
              <motion.div
                key={d.company} className="card elev-sm" style={sx("padding:var(--space-2) var(--space-3);gap:4px")}
                initial={{ opacity: 0, x: reduceMotion ? 0 : 12 }} animate={{ opacity: 1, x: 0 }}
                transition={{ ...reveal, delay: reduceMotion ? 0 : 0.3 + i * 0.08 }}
              >
                <div style={sx("display:flex;justify-content:space-between;align-items:baseline")}>
                  <span className={d.tagClass}>{d.stage}</span>
                  <span style={sx("font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:19px")}>{d.value}</span>
                </div>
                <div style={sx("font-size:14px")}>{d.company}</div>
                <div className="text-muted" style={sx("font-size:12px")}>{d.tag}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* KPI STRIP — plate numerals */}
      <div className="land" style={sx("padding-top:var(--space-8)")}>
        <div style={sx("height:1px;background:var(--color-text);margin-bottom:var(--space-6)")} />
        <motion.div className="kpi-grid" style={sx("display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-6)")}
          initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }} variants={stagger}>
          {KPIS.map((k) => (
            <motion.div key={k.label} variants={fadeUp} transition={reveal}>
              <div className="cmyk-num" style={sx("font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:46px")}>
                <Plates text={k.value} />
              </div>
              <div className="text-muted" style={sx("font-size:12px;margin-top:var(--space-2)")}>{k.label} · demo desk</div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* FEATURES — editorial index */}
      <div className="land" id="features" style={sx("padding-top:var(--space-8)")}>
        <h2 style={sx("margin-bottom:var(--space-2)")}>Everything a sales desk needs</h2>
        <p className="text-muted" style={sx("max-width:56ch;margin-bottom:var(--space-6)")}>Seven screens, one login. Nothing to configure before your first deal.</p>
        <motion.div className="feat-grid" style={sx("display:grid;grid-template-columns:1fr 1fr;gap:var(--space-8)")}
          initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={stagger}>
          {FEATURES.map((f) => (
            <motion.div key={f.title} variants={fadeUp} transition={reveal}
              style={sx("display:flex;gap:var(--space-3);align-items:flex-start;border-top:1px solid var(--color-divider);padding-top:var(--space-3)")}>
              <i className={`ph-duotone ${f.icon}`} style={sx("font-size:28px;color:var(--color-accent);flex-shrink:0")}></i>
              <div>
                <div style={sx("font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:20px")}>{f.title}</div>
                <p className="text-muted" style={sx("margin:4px 0 0;font-size:14px;line-height:1.5;max-width:44ch")}>{f.body}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* PRICING */}
      <div className="land" id="pricing" style={sx("padding-top:var(--space-8)")}>
        <div style={sx("display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:var(--space-4);margin-bottom:var(--space-8)")}>
          <div>
            <h2 style={sx("margin-bottom:var(--space-2)")}>Plans for every desk size</h2>
            <p className="text-muted" style={sx("max-width:52ch;margin:0")}>Plus covers the core CRM. Pro unlocks Reports and Studio. Custom is whatever your team actually needs.</p>
          </div>
          <div className="seg" role="tablist" style={sx("margin-bottom:var(--space-2)")}>
            <label className="seg-opt"><input type="radio" name="cycle" checked={!yearly} onChange={() => setCycle("monthly")} />Monthly</label>
            <label className="seg-opt"><input type="radio" name="cycle" checked={yearly} onChange={() => setCycle("yearly")} />Yearly · save 20%</label>
          </div>
        </div>

        {!plans ? (
          <div className="text-muted" style={sx("font-size:13px")}>Loading plans…</div>
        ) : (
          <motion.div className="price-grid" style={sx("display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-6);align-items:start")}
            initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }} variants={stagger}>
            {plans.map((p) => {
              const priced = p.price_monthly_cents != null;
              const featured = p.key === "pro";
              // yearly is shown as the per-month price when billed annually
              const perMonthCents = priced ? (yearly ? p.price_yearly_cents / 12 : p.price_monthly_cents) : null;
              const price = priced ? dollars(perMonthCents) : "Contact us";
              const was = priced && yearly ? dollars(p.price_monthly_cents) : null;
              const per = priced ? (yearly ? "/mo, billed annually" : "/mo per seat") : "";
              return (
                <motion.div key={p.key} variants={fadeUp} transition={reveal}
                  className={`card ${featured ? "elev-lg" : "elev-md"}`}
                  style={sx(`position:relative;padding:var(--space-6);gap:var(--space-3);background:var(--color-surface);border:${featured ? "2px solid var(--color-accent)" : "1px solid var(--color-divider)"}`)}>
                  {featured && (
                    <span className="tag tag-accent" style={sx("position:absolute;top:-12px;left:var(--space-4);display:inline-flex;align-items:center;gap:4px;box-shadow:var(--shadow-sm)")}>
                      <i className="ph-duotone ph-star" style={sx("font-size:13px")}></i>Most popular
                    </span>
                  )}
                  <div>
                    <div style={sx("display:flex;align-items:center;gap:8px")}>
                      <span style={sx("font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:21px")}>{p.name}</span>
                      {priced && yearly && <span className="tag tag-accent-2" style={sx("font-size:10px")}>Save 20%</span>}
                    </div>
                    <p className="text-muted" style={sx("font-size:13px;margin:4px 0 0")}>{PLAN_TAGLINES[p.key]}</p>
                  </div>
                  <div style={sx("display:flex;align-items:baseline;gap:6px;min-height:44px")}>
                    <AnimatePresence mode="wait">
                      <motion.span key={cycle + p.key}
                        initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
                        transition={{ duration: reduceMotion ? 0.01 : 0.16 }}
                        style={sx(`font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:${priced ? "34px" : "24px"};color:${featured ? "var(--color-accent-800)" : "var(--color-text)"}`)}>
                        {price}
                      </motion.span>
                    </AnimatePresence>
                    {was && <span className="text-muted" style={sx("font-size:15px;text-decoration:line-through")}>{was}</span>}
                    <span className="text-muted" style={sx("font-size:13px")}>{per}</span>
                  </div>
                  <button className={`btn ${featured ? "btn-primary" : "btn-secondary"} btn-block`} onClick={onGetStarted}>
                    {p.key === "custom" ? "Talk to us" : `Get ${p.name}`}
                  </button>
                  <div style={sx("display:flex;flex-direction:column;gap:8px;margin-top:var(--space-1)")}>
                    {PLAN_MENU.map((m) => {
                      const inc = !!p.features?.[m.key];
                      return (
                        <div key={m.key} style={sx(`display:flex;align-items:center;gap:8px;font-size:13px;${inc ? "" : "opacity:0.4"}`)}>
                          <i className={`ph-duotone ${inc ? "ph-check-circle" : "ph-x-circle"}`} style={sx(`font-size:16px;color:${inc ? "var(--color-accent)" : "var(--color-neutral-500)"}`)}></i>
                          {m.label}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* CTA + DEMO ACCOUNTS */}
      <div className="land" id="accounts" style={sx("padding-top:var(--space-8)")}>
        <div style={sx("height:3px;background:var(--color-text)")} />
        <div style={sx("display:flex;flex-wrap:wrap;gap:var(--space-6);align-items:center;justify-content:space-between;padding:var(--space-6) 0")}>
          <div>
            <h3 style={{ margin: "0 0 6px" }}>Try it with a demo account</h3>
            <p className="text-muted" style={sx("margin:0;font-size:13px")}>Password <strong style={{ color: "var(--color-text)" }}>Flowdesk123!</strong> for all accounts.</p>
            <div style={sx("margin-top:var(--space-3);display:flex;flex-direction:column;gap:2px")}>
              {DEMO_ACCOUNTS.map((a) => (
                <span key={a.email} className="text-muted" style={sx("font-size:13px")}>{a.email} — {a.role}</span>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" onClick={onGetStarted} style={sx("flex-shrink:0")}>
            <i className="ph-duotone ph-arrow-right" style={sx("font-size:16px")}></i>Sign in
          </button>
        </div>
        <div style={sx("height:1px;background:var(--color-text)")} />
        <div style={sx("padding:var(--space-4) 0 var(--space-8)")}>
          <span className="text-muted" style={sx("font-size:12px")}>Flowdesk — Sales CRM</span>
        </div>
      </div>
    </div>
  );
}
