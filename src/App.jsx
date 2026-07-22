import { useEffect, useState } from 'react'
import CoolAlert from 'coolalertjs/dist/coolalert.js'

// Theme CoolAlert to the Flowdesk palette once, at load — literal hex (not var())
// since the library does its own color math (hover shades etc.) that can't
// resolve a CSS custom property. Values match Flowdesk-Design-System.md.
CoolAlert.initializeStyles({
  overlay: 'rgba(45, 43, 43, 0.5)',
  background: '#eae9e9',
  primary: '#0088b0',
  secondary: 'rgba(32, 30, 29, 0.08)',
  success: '#0088b0',
  warning: '#edbb00',
  info: '#0088b0',
  error: '#d6006c',
  question: '#d6006c',
  text: '#201e1d',
  title: '#201e1d',
  closeBtn: 'rgba(32, 30, 29, 0.6)',
})

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const TOKEN_KEY = 'flowdesk_token'
const VIEW_KEY = 'flowdesk_view'
let authToken = localStorage.getItem(TOKEN_KEY) || null
function setAuthToken(t) {
  authToken = t
  // Clearing the token (logout / expired session) also drops the remembered
  // screen, so the next login lands on the default (Dashboard) instead of
  // wherever the previous session happened to leave off.
  if (t) localStorage.setItem(TOKEN_KEY, t)
  else { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(VIEW_KEY) }
}
async function api(path, opts = {}) {
  const headers = { ...(opts.headers || {}) }
  if (authToken) headers.Authorization = `Bearer ${authToken}`
  const res = await fetch(API + path, { ...opts, headers })
  if (res.status === 401) {
    // token missing/expired/revoked — simplest correct reset is a full reload back to the login screen
    setAuthToken(null)
    window.location.reload()
    throw new Error('unauthenticated')
  }
  if (!res.ok) throw new Error(`${path} -> ${res.status}`)
  if (res.status === 204) return null
  return res.json()
}
const apiJSON = (path, method, body) =>
  api(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

// Converts a CSS declaration string ("color:red;font-size:12px") into a React style object.
function sx(str) {
  if (!str) return undefined
  const obj = {}
  for (const rule of str.split(';')) {
    const i = rule.indexOf(':')
    if (i === -1) continue
    const prop = rule.slice(0, i).trim()
    const val = rule.slice(i + 1).trim()
    if (!prop || !val) continue
    obj[prop.startsWith('--') ? prop : prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = val
  }
  return obj
}

const STAGE_DEFS = [
  { id: 'new', name: 'New' },
  { id: 'qualified', name: 'Qualified' },
  { id: 'proposal', name: 'Proposal' },
  { id: 'negotiation', name: 'Negotiation' },
  { id: 'won', name: 'Won' },
]
const STAGE_PROB = { new: 10, qualified: 30, proposal: 55, negotiation: 75, won: 100 }
const SCHED_ICONS = { Call: 'ph-phone-call', Meeting: 'ph-users-three', Email: 'ph-envelope-simple', Quote: 'ph-file-text' }
const STD_FIELDS = [
  { label: 'Company name', type: 'Text' },
  { label: 'Expected revenue', type: 'Currency' },
  { label: 'Priority', type: 'Selection' },
]
const FIELD_TYPE_ICON = { Text: 'ph-text-t', Number: 'ph-hash', Date: 'ph-calendar-blank', Selection: 'ph-list-dashes', Checkbox: 'ph-check-square', Currency: 'ph-currency-circle-dollar', Phone: 'ph-phone' }
const ACTION_ICON = { 'Send WhatsApp to Sales Manager': 'ph-whatsapp-logo', 'Assign to APAC team': 'ph-user-switch', 'Create high-priority activity': 'ph-flag-pennant', 'Send email to manager': 'ph-envelope-simple', 'Add to campaign': 'ph-megaphone' }
// Studio industry presets — the field *list* each one applies is product config,
// not user data, so it stays a frontend constant; applying one still writes
// through the real custom-fields API (see applyPreset).
const PRESETS = {
  logistik: { icon: 'ph-boat', label: 'Logistik', fields: [{ label: 'Container Type', type: 'Selection' }, { label: 'Origin Port', type: 'Text' }, { label: 'Destination Port', type: 'Text' }] },
  properti: { icon: 'ph-buildings', label: 'Properti', fields: [{ label: 'NPWP Number', type: 'Text' }, { label: 'Unit / Block', type: 'Text' }], stages: ['Booking Fee', 'BI Checking', 'Akad Kredit', 'Handover'] },
}
// Matches the seeded demo data's fixed "today" — this dataset is pinned to Tue Jul 21
// 2026, same as the backend. Swap for a real clock once this isn't demo data.
const TODAY = '2026-07-21'

const fmt = (n) => (n >= 1000000 ? '$' + (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : n >= 1000 ? '$' + Math.round(n / 1000) + 'k' : '$' + n)
const accentVar = (stage) => (stage === 'won' ? 'var(--color-accent-2)' : 'var(--color-accent)')
const avatarStyle = 'width:26px;height:26px;border-radius:50%;background:var(--color-neutral-200);color:var(--color-neutral-800);display:flex;align-items:center;justify-content:center;font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:11px;flex-shrink:0'

function decorate(d, owners) {
  const o = owners[d.owner] || { name: '—', initials: '?' }
  const st = STAGE_DEFS.find((s) => s.id === d.stage)
  const acc = accentVar(d.stage)
  return {
    ...d,
    valueFmt: fmt(d.value),
    ownerName: o.name,
    ownerInitials: o.initials,
    avatarStyle,
    stageName: st ? st.name : '',
    kickerStyle: `font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:${acc}`,
  }
}

function baseTimeline(d) {
  return [
    { icon: 'ph-plus-circle', text: 'Deal created from lead', time: 'Jul 8 · 2 weeks ago' },
    { icon: 'ph-phone-call', text: 'Discovery call with ' + d.contact, time: 'Jul 12 · 10:00' },
    { icon: 'ph-envelope-simple', text: 'Sent follow-up materials', time: 'Jul 15 · 16:20' },
    { icon: 'ph-clock-countdown', text: 'Next: ' + d.activity, time: d.date + ' · scheduled' },
  ]
}

// The seeded demo week's Monday — matches TODAY (Tue Jul 21 2026). Week navigation
// walks 7-day steps from this anchor.
const ANCHOR_MONDAY = '2026-07-20'
const addDaysISO = (iso, days) => {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmtDate = (iso) => { const [, m, d] = iso.split('-').map(Number); return `${MONTH_ABBR[m - 1]} ${d}` }

// Builds Calendar's weekDays view-model for the Mon–Fri starting at weekStartISO,
// always 5 columns (even with zero events that day) so navigating to an empty week
// doesn't collapse the grid. starts_at/ends_at are 'YYYY-MM-DD HH:MM:SS' strings —
// the API returns MySQL DATETIMEs as plain strings, no timezone conversion involved.
function buildWeekDays(events, weekStartISO) {
  const startHour = 8
  const rowH = 54
  const byDate = {}
  for (const ev of events) {
    const [datePart, startTime] = ev.starts_at.split(' ')
    const endTime = ev.ends_at.split(' ')[1]
    ;(byDate[datePart] ??= []).push({ id: ev.id, title: ev.title, startTime, endTime })
  }
  const toHours = (t) => { const [h, m] = t.split(':').map(Number); return h + m / 60 }
  const fmtT = (x) => { const h = Math.floor(x); const m = Math.round((x - h) * 60); return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m }
  return Array.from({ length: 5 }, (_, i) => {
    const datePart = addDaysISO(weekStartISO, i)
    const [y, m, d] = datePart.split('-').map(Number)
    const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
    const today = datePart === TODAY
    const events = (byDate[datePart] || []).map((ev) => {
      const s = toHours(ev.startTime)
      const e = toHours(ev.endTime)
      const hot = /legal|contract/i.test(ev.title)
      const bg = hot ? 'var(--color-accent-2-100)' : 'var(--color-accent-100)'
      const bd = hot ? 'var(--color-accent-2)' : 'var(--color-accent)'
      const tx = hot ? 'var(--color-accent-2-800)' : 'var(--color-accent-800)'
      return {
        id: ev.id, title: ev.title, time: `${fmtT(s)}–${fmtT(e)}`,
        style: `position:absolute;left:3px;right:3px;top:${(s - startHour) * rowH + 1}px;height:${(e - s) * rowH - 4}px;background:${bg};border-left:2px solid ${bd};border-radius:var(--radius-sm);padding:4px 7px;overflow:hidden;color:${tx};cursor:pointer`,
      }
    })
    return {
      datePart, dow, num: d,
      headStyle: `padding:var(--space-2) 0 var(--space-3);text-align:center;border-left:1px solid var(--color-divider);border-bottom:1px solid var(--color-text)`,
      numStyle: `font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:22px;margin-top:2px;color:${today ? 'var(--color-accent)' : 'var(--color-text)'}`,
      events,
    }
  })
}

const DEMO_ACCOUNTS = [
  { email: 'amara@flowdesk.io', role: 'Admin' },
  { email: 'jonas@flowdesk.io', role: 'Lead Sales' },
  { email: 'lena@flowdesk.io', role: 'Sales' },
  { email: 'devon@flowdesk.io', role: 'Sales' },
  { email: 'nadia@flowdesk.io', role: 'Sales' },
]

function LoginScreen({ email, password, error, loading, onEmail, onPassword, onSubmit }) {
  return (
    <div style={{ minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', color: 'var(--color-text)', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:34px;letter-spacing:-0.02em')}>Flowdesk</span>
        <span style={sx('font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:var(--color-neutral-600)')}>Sales CRM</span>
      </div>
      <p className="text-muted" style={{ margin: '6px 0 28px', fontSize: 14 }}>Sign in to your sales desk.</p>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit() }} className="card elev-md" style={{ width: 340, padding: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--color-neutral-700)', display: 'block', marginBottom: 4 }}>Email</label>
          <input className="input" type="email" value={email} onChange={(e) => onEmail(e.target.value)} placeholder="you@flowdesk.io" autoFocus style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--color-neutral-700)', display: 'block', marginBottom: 4 }}>Password</label>
          <input className="input" type="password" value={password} onChange={(e) => onPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%' }} />
        </div>
        {error && <div style={{ fontSize: 13, color: 'var(--color-accent-2)' }}>{error}</div>}
        <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: 4 }}>{loading ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <div className="text-muted" style={{ marginTop: 24, fontSize: 12, textAlign: 'center' }}>
        Demo accounts — password <strong style={{ color: 'var(--color-text)' }}>Flowdesk123!</strong> for all
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {DEMO_ACCOUNTS.map((a) => <span key={a.email}>{a.email} — {a.role}</span>)}
        </div>
      </div>
    </div>
  )
}

const INITIAL_STATE = {
  // auth — checked once on mount before anything else renders
  authChecked: false,
  currentUser: null,
  loginEmail: '',
  loginPassword: '',
  loginError: '',
  loginLoading: false,
  view: 'dashboard',
  googleConnected: false,
  googleSyncing: false,
  query: '',
  ownerFilter: 'all',
  draggedId: null,
  dragOverStage: null,
  selectedId: null,
  schedType: 'Call',
  schedDate: '',
  noteDraft: '',
  chartMode: 'bar',
  studioTab: 'fields',
  newFieldLabel: '',
  newFieldType: 'Text',
  newStage: '',
  ruleField: 'Expected revenue',
  ruleOp: '>',
  ruleValue: '',
  ruleAction: 'Send WhatsApp to Sales Manager',
  // Studio "Kanban Views" stage labels — cosmetic-only in the source design too
  // (not wired to deals' real stage FK there either), so it stays local state.
  customStages: ['New', 'Qualified', 'Proposal', 'Negotiation', 'Won'],
  // Report Designer toggles preview a static demo quotation; the schema has no
  // quotations table, so these stay UI-only (see Flowdesk-System-Design.md §6).
  reportOpts: { logo: true, tax: true, terms: true, signature: false },
  reportAccent: 'cyan',
  newDealOpen: false,
  editingDealId: null,
  newDealForm: { company: '', contact: '', email: '', value: '', owner: '', tag: '', stage: 'new', customValues: {} },
  // server-backed — populated by the initial fetch in useEffect below
  loaded: false,
  loadError: null,
  owners: {},
  deals: [],
  leads: [],
  customFields: [],
  autoRules: [],
  chatter: {},
  activitiesFeed: [],
  calendarEvents: [],
  calendarWeekOffset: 0,
  newEventOpen: false,
  newEventForm: { title: '', date: '', start: '09:00', end: '10:00' },
  eventDetailId: null,
}

export default function App() {
  const [state, setState] = useState(() => ({ ...INITIAL_STATE, view: localStorage.getItem(VIEW_KEY) || INITIAL_STATE.view }))
  const patch = (upd) => setState((s) => ({ ...s, ...(typeof upd === 'function' ? upd(s) : upd) }))

  // Remember the current screen across refreshes — cleared on logout (setAuthToken)
  // so a fresh login always lands on the default (Dashboard), not the last screen.
  useEffect(() => { localStorage.setItem(VIEW_KEY, state.view) }, [state.view])

  // Step 1: on mount, see if a saved token still checks out before rendering anything else.
  useEffect(() => {
    (async () => {
      if (!authToken) { patch({ authChecked: true }); return }
      try {
        const me = await api('/api/auth/me')
        patch({ currentUser: me, authChecked: true })
      } catch {
        patch({ authChecked: true }) // api() already cleared the bad token on a 401
      }
    })()
  }, [])

  // Step 2: once logged in, load the CRM data. Fires again after a fresh login (currentUser flips from null).
  useEffect(() => {
    if (!state.currentUser) return
    (async () => {
      try {
        const [owners, deals, leads, customFields, autoRules, chatter, activitiesFeed, calendarEvents, googleStatus] = await Promise.all([
          api('/api/owners'), api('/api/deals'), api('/api/leads'), api('/api/custom-fields'),
          api('/api/automation-rules'), api('/api/deal-notes'), api('/api/activities?limit=5'), api('/api/calendar-events'),
          api('/api/google/status'),
        ])
        patch({
          loaded: true, owners: Object.fromEntries(owners.map((o) => [o.id, o])),
          deals, leads, customFields, autoRules, chatter, activitiesFeed, calendarEvents,
          googleConnected: googleStatus.connected,
        })
        if (location.hash.includes('google=connected')) {
          notify('Google Calendar connected')
          history.replaceState(null, '', location.pathname)
        }
      } catch (err) {
        patch({ loadError: err.message })
      }
    })()
  }, [state.currentUser])

  const doLogin = async () => {
    patch({ loginLoading: true, loginError: '' })
    try {
      const res = await fetch(API + '/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: state.loginEmail, password: state.loginPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error === 'invalid_credentials' ? 'Email or password is wrong' : 'Login failed')
      setAuthToken(data.token)
      patch({ currentUser: data.user, loginLoading: false, loginPassword: '' })
    } catch (err) {
      patch({ loginError: err.message, loginLoading: false })
    }
  }
  const doLogout = () => {
    setAuthToken(null)
    window.location.reload()
  }

  // Thin wrapper so every existing notify(msg) call site stays untouched — only the
  // ~10 failure-path calls below pass an explicit 'error'/'warning' type.
  const notify = (msg, icon = 'success') => CoolAlert.show({ toast: true, icon, text: msg, position: 'bottom-center' })
  const confirmDialog = (title, text) => CoolAlert.show({ title, text, icon: 'warning', showCancelButton: true, draggable: true })

  const pushChatter = (id, icon, text) => {
    patch((s) => ({ chatter: { ...s.chatter, [id]: [{ icon, text, time: 'just now' }, ...(s.chatter[id] || [])] } }))
    apiJSON(`/api/deals/${id}/notes`, 'POST', { icon, text }).catch(() => notify('Note failed to save', 'error'))
  }
  const moveDeal = (id, stage) => {
    patch((s) => ({ deals: s.deals.map((d) => (d.id === id ? { ...d, stage } : d)), draggedId: null, dragOverStage: null }))
    apiJSON(`/api/deals/${id}`, 'PATCH', { stage }).catch(() => notify('Move failed to save — refresh to resync', 'error'))
  }
  const convertLead = async (lead) => {
    try {
      const deal = await apiJSON(`/api/leads/${lead.id}/convert`, 'POST')
      patch((s) => ({ deals: [deal, ...s.deals], leads: s.leads.filter((l) => l.id !== lead.id) }))
      notify(lead.name + ' converted to opportunity')
    } catch {
      notify('Convert failed', 'error')
    }
  }
  const scheduleActivity = () => {
    const id = state.selectedId
    if (id == null) return
    const t = state.schedType
    const when = state.schedDate || 'today'
    patch((s) => ({ deals: s.deals.map((d) => (d.id === id ? { ...d, activity: t } : d)) }))
    apiJSON(`/api/deals/${id}`, 'PATCH', { activity: t }).catch(() => {})
    pushChatter(id, SCHED_ICONS[t], t + ' scheduled for ' + when)
    notify(t + ' scheduled · added to calendar')
  }
  const addNote = () => {
    const id = state.selectedId
    const note = state.noteDraft.trim()
    if (id == null || !note) return
    pushChatter(id, 'ph-note', note)
    patch({ noteDraft: '' })
    notify('Note added to chatter')
  }
  const ecoAction = (icon, chat, toast) => {
    const id = state.selectedId
    if (id != null) pushChatter(id, icon, chat)
    notify(toast)
  }
  const applyPreset = async (key) => {
    const preset = PRESETS[key]
    if (!preset) return
    try {
      await Promise.all(state.customFields.map((f) => api(`/api/custom-fields/${f.id}`, { method: 'DELETE' })))
      const created = await Promise.all(preset.fields.map((f) => apiJSON('/api/custom-fields', 'POST', f)))
      patch({ customFields: created, ...(preset.stages ? { customStages: preset.stages } : {}) })
      notify(key === 'logistik' ? 'Logistics preset applied to Lead form' : 'Property preset applied — stages reshaped')
    } catch {
      notify('Failed to apply preset', 'error')
    }
  }
  const addCustomField = async () => {
    const label = state.newFieldLabel.trim()
    if (!label) return
    try {
      const field = await apiJSON('/api/custom-fields', 'POST', { label, type: state.newFieldType })
      patch((s) => ({ customFields: [...s.customFields, field], newFieldLabel: '' }))
      notify('Field "' + label + '" added to form')
    } catch {
      notify('Failed to add field', 'error')
    }
  }
  const removeCustomField = (id) => {
    patch((s) => ({ customFields: s.customFields.filter((x) => x.id !== id) }))
    api(`/api/custom-fields/${id}`, { method: 'DELETE' }).catch(() => notify('Failed to remove field', 'error'))
  }
  const addStage = () => {
    const n = state.newStage.trim()
    if (!n) return
    patch((s) => ({ customStages: [...s.customStages, n], newStage: '' }))
    notify('Stage "' + n + '" added')
  }
  const addRule = async () => {
    const s = state
    const icon = ACTION_ICON[s.ruleAction] || 'ph-flag-pennant'
    try {
      const rule = await apiJSON('/api/automation-rules', 'POST', { field: s.ruleField, op: s.ruleOp, value: s.ruleValue || '—', action: s.ruleAction, icon })
      patch((st) => ({ autoRules: [...st.autoRules, rule], ruleValue: '' }))
      notify('Automation rule created')
    } catch {
      notify('Failed to create rule', 'error')
    }
  }
  const toggleRule = (r) => {
    patch((s) => ({ autoRules: s.autoRules.map((x) => (x.id === r.id ? { ...x, enabled: !x.enabled } : x)) }))
    apiJSON(`/api/automation-rules/${r.id}`, 'PATCH', { enabled: !r.enabled }).catch(() => notify('Failed to save rule', 'error'))
  }
  const openNewDeal = (stage) => {
    const firstOwner = Object.keys(state.owners)[0] || ''
    patch({ view: 'pipeline', newDealOpen: true, editingDealId: null, newDealForm: { company: '', contact: '', email: '', value: '', owner: firstOwner, tag: '', stage: stage || 'new', customValues: {} } })
  }
  const openEditDeal = (deal) => {
    patch({
      newDealOpen: true, editingDealId: deal.id,
      newDealForm: { company: deal.company, contact: deal.contact || '', email: deal.email || '', value: String(deal.value), tag: deal.tag || '', owner: deal.owner, stage: deal.stage, customValues: deal.customValues || {} },
    })
  }
  const closeNewDeal = () => patch({ newDealOpen: false, editingDealId: null })
  const setNewDealField = (field, value) => patch((s) => ({ newDealForm: { ...s.newDealForm, [field]: value } }))
  const setDealCustomValue = (fieldId, value) => patch((s) => ({ newDealForm: { ...s.newDealForm, customValues: { ...s.newDealForm.customValues, [fieldId]: value } } }))
  const saveLeadCustomValue = async (leadId, fieldId, value) => {
    patch((s) => ({ leads: s.leads.map((l) => (l.id === leadId ? { ...l, customValues: { ...l.customValues, [fieldId]: value } } : l)) }))
    try {
      await apiJSON('/api/custom-field-values', 'POST', { entity: 'lead', record_id: leadId, values: { [fieldId]: value } })
    } catch {
      notify('Failed to save field', 'error')
    }
  }
  const submitDealForm = async () => {
    const f = state.newDealForm
    const editingId = state.editingDealId
    if (!f.company.trim() || !f.owner) { notify('Company and owner are required', 'warning'); return }
    try {
      const deal = editingId ? await apiJSON(`/api/deals/${editingId}`, 'PATCH', f) : await apiJSON('/api/deals', 'POST', f)
      patch((s) => ({
        deals: editingId ? s.deals.map((d) => (d.id === editingId ? deal : d)) : [deal, ...s.deals],
        newDealOpen: false, editingDealId: null,
      }))
      notify(editingId ? 'Deal updated' : f.company + ' added to pipeline')
    } catch {
      notify(editingId ? 'Failed to update deal' : 'Failed to create deal', 'error')
    }
  }
  const deleteDeal = async (deal) => {
    const result = await confirmDialog('Delete deal?', `Delete "${deal.company}"? This can't be undone.`)
    if (!result.isConfirmed) return
    try {
      await api(`/api/deals/${deal.id}`, { method: 'DELETE' })
      patch((s) => ({ deals: s.deals.filter((d) => d.id !== deal.id), selectedId: null }))
      notify(deal.company + ' deleted')
    } catch {
      notify("Couldn't delete — it's still referenced elsewhere (e.g. a converted lead)", 'error')
    }
  }
  const disqualifyLead = async (lead) => {
    const result = await confirmDialog('Disqualify lead?', `Disqualify "${lead.name}"?`)
    if (!result.isConfirmed) return
    try {
      await api(`/api/leads/${lead.id}/disqualify`, { method: 'POST' })
      patch((s) => ({ leads: s.leads.filter((l) => l.id !== lead.id) }))
      notify(lead.name + ' disqualified')
    } catch {
      notify('Failed to disqualify lead', 'error')
    }
  }
  const deleteRule = (rule) => {
    patch((s) => ({ autoRules: s.autoRules.filter((r) => r.id !== rule.id) }))
    api(`/api/automation-rules/${rule.id}`, { method: 'DELETE' }).catch(() => notify('Failed to delete rule', 'error'))
  }
  const changeWeek = (delta) => patch((s) => ({ calendarWeekOffset: s.calendarWeekOffset + delta }))
  const openNewEvent = (date, hour) => {
    const d = date || addDaysISO(ANCHOR_MONDAY, state.calendarWeekOffset * 7)
    const h = hour ?? 9
    const pad = (n) => String(n).padStart(2, '0')
    patch({ newEventOpen: true, newEventForm: { title: '', date: d, start: `${pad(h)}:00`, end: `${pad(h + 1)}:00` } })
  }
  const closeNewEvent = () => patch({ newEventOpen: false })
  const openEventDetail = (ev) => patch({ eventDetailId: ev.id })
  const closeEventDetail = () => patch({ eventDetailId: null })
  const deleteEvent = async () => {
    const id = state.eventDetailId
    if (!id) return
    const result = await confirmDialog('Delete event?', 'This can\'t be undone.')
    if (!result.isConfirmed) return
    try {
      await api(`/api/calendar-events/${id}`, { method: 'DELETE' })
      patch((s) => ({ calendarEvents: s.calendarEvents.filter((e) => e.id !== id), eventDetailId: null }))
      notify('Event deleted')
    } catch {
      notify('Failed to delete event', 'error')
    }
  }
  const setNewEventField = (field, value) => patch((s) => ({ newEventForm: { ...s.newEventForm, [field]: value } }))
  const submitNewEvent = async () => {
    const f = state.newEventForm
    if (!f.title.trim() || !f.date || !f.start || !f.end) { notify('Title, date, start and end are required', 'warning'); return }
    if (f.start >= f.end) { notify('End time must be after start time', 'warning'); return }
    try {
      const ev = await apiJSON('/api/calendar-events', 'POST', { title: f.title, starts_at: `${f.date} ${f.start}:00`, ends_at: `${f.date} ${f.end}:00` })
      patch((s) => ({ calendarEvents: [...s.calendarEvents, ev], newEventOpen: false }))
      notify(f.title + ' added to calendar')
    } catch {
      notify('Failed to add event', 'error')
    }
  }
  const connectGoogle = () => { window.location.href = `${API}/api/google/connect?token=${authToken}` }
  const syncGoogle = async () => {
    patch({ googleSyncing: true })
    try {
      const { imported } = await apiJSON('/api/google/sync', 'POST')
      const calendarEvents = await api('/api/calendar-events')
      patch({ calendarEvents, googleSyncing: false })
      notify(imported ? `Pulled ${imported} event(s) from Google` : 'Already up to date')
    } catch {
      patch({ googleSyncing: false })
      notify('Google sync failed', 'error')
    }
  }

  // ---- derived view (recomputed every render, mirrors the source's renderVals()) ----
  const S = state

  if (!S.authChecked) {
    return <div style={{ padding: 40, fontFamily: 'system-ui' }}>Loading…</div>
  }
  if (!S.currentUser) {
    return (
      <LoginScreen
        email={S.loginEmail} password={S.loginPassword} error={S.loginError} loading={S.loginLoading}
        onEmail={(v) => patch({ loginEmail: v })} onPassword={(v) => patch({ loginPassword: v })} onSubmit={doLogin}
      />
    )
  }
  if (S.loadError) {
    return <div style={{ padding: 40, fontFamily: 'system-ui' }}>Couldn't reach the API at {API} — {S.loadError}. Is the backend running (`docker-compose up`)?</div>
  }
  if (!S.loaded) {
    return <div style={{ padding: 40, fontFamily: 'system-ui' }}>Loading Flowdesk…</div>
  }

  const q = S.query.trim().toLowerCase()
  const match = (d) => (!q || d.company.toLowerCase().includes(q) || d.contact.toLowerCase().includes(q)) && (S.ownerFilter === 'all' || d.owner === S.ownerFilter)
  const editions = { pipeline: 'Pipeline Edition', leads: 'Intake Wire', dashboard: 'Desk Report', contacts: 'Directory', calendar: 'The Week Ahead', reports: 'Analysis', studio: 'Composing Room' }

  const columns = STAGE_DEFS.map((st) => {
    const acc = accentVar(st.id)
    const ds = S.deals.filter((d) => d.stage === st.id && match(d)).map((d) => {
      const dd = decorate(d, S.owners)
      const dragging = S.draggedId === d.id
      return {
        ...dd,
        onDragStart: (e) => { if (e && e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; patch({ draggedId: d.id }) },
        onDragEnd: () => patch({ draggedId: null, dragOverStage: null }),
        onClick: () => patch({ selectedId: d.id, schedType: 'Call', schedDate: '', noteDraft: '' }),
        dragStyle: `cursor:grab;${dragging ? 'opacity:0.4;outline:1px solid var(--color-accent);box-shadow:var(--shadow-md);' : ''}`,
      }
    })
    const total = S.deals.filter((d) => d.stage === st.id).reduce((a, d) => a + d.value, 0)
    const isOver = S.dragOverStage === st.id
    return {
      stageKey: st.id, name: st.name, deals: ds, count: ds.length, totalFmt: fmt(total),
      ruleStyle: `height:2px;width:32px;background:${acc};margin:6px 0 var(--space-3)`,
      dropStyle: `display:flex;flex-direction:column;gap:var(--space-2);min-height:80px;padding:var(--space-1);border-radius:var(--radius-md);transition:background .12s;${isOver ? 'background:var(--color-accent-100);' : ''}`,
      onDragOver: (e) => { e.preventDefault(); if (S.dragOverStage !== st.id) patch({ dragOverStage: st.id }) },
      onDrop: (e) => { e.preventDefault(); if (S.draggedId != null) moveDeal(S.draggedId, st.id) },
    }
  })

  const srcMap = { website: { icon: 'ph-globe', label: 'Website' }, email: { icon: 'ph-envelope-simple', label: 'Email-to-Lead' }, api: { icon: 'ph-plugs-connected', label: 'API' } }
  const tierOf = (s) => (s >= 75 ? { t: 'Hot', c: 'tag tag-accent-2', bar: 'var(--color-accent-2-500)' } : s >= 45 ? { t: 'Warm', c: 'tag tag-accent', bar: 'var(--color-accent-500)' } : { t: 'Cold', c: 'tag tag-neutral', bar: 'var(--color-neutral-400)' })
  const leads = S.leads.map((l) => {
    const o = S.owners[l.owner] || { name: '—', initials: '?' }
    const sm = srcMap[l.source]
    const tier = tierOf(l.score)
    return { ...l, sourceIcon: sm.icon, sourceLabel: sm.label, tier: tier.t, tierClass: tier.c, scoreBar: `height:100%;width:${l.score}%;background:${tier.bar};border-radius:var(--radius-sm)`, assignee: o.name, assigneeInitials: o.initials, avatarStyle, onConvert: () => convertLead(l) }
  })
  const channels = [
    { icon: 'ph-envelope-simple', figure: S.leads.filter((l) => l.source === 'email').length, label: 'Email-to-Lead', caption: 'Inbound email → new lead' },
    { icon: 'ph-globe', figure: S.leads.filter((l) => l.source === 'website').length, label: 'Website forms', caption: 'Contact form → CRM' },
    { icon: 'ph-plugs-connected', figure: S.leads.filter((l) => l.source === 'api').length, label: 'API intake', caption: 'External apps → CRM' },
    { icon: 'ph-target', figure: Math.round(S.leads.reduce((a, l) => a + l.score, 0) / (S.leads.length || 1)), label: 'Avg lead score', caption: 'Auto-routed to reps' },
  ]

  const openTotal = S.deals.filter((d) => d.stage !== 'won').reduce((a, d) => a + d.value, 0)
  const wonTotal = S.deals.filter((d) => d.stage === 'won').reduce((a, d) => a + d.value, 0)
  const avg = S.deals.length ? Math.round(S.deals.reduce((a, d) => a + d.value, 0) / S.deals.length) : 0
  const deltaStyle = (up) => `display:inline-flex;align-items:center;gap:4px;font-size:12px;margin-top:var(--space-2);color:${up ? 'var(--color-accent)' : 'var(--color-accent-2)'}`
  const metrics = [
    { kicker: 'Open pipeline', value: fmt(openTotal), delta: '+12.4%', sub: 'vs last month', deltaStyle: deltaStyle(true), deltaIcon: 'ph-trend-up' },
    { kicker: 'Won this month', value: fmt(wonTotal), delta: '+2 deals', sub: 'closed', deltaStyle: deltaStyle(true), deltaIcon: 'ph-trend-up' },
    { kicker: 'Win rate', value: '34%', delta: '+5 pts', sub: 'trailing 90d', deltaStyle: deltaStyle(true), deltaIcon: 'ph-trend-up' },
    { kicker: 'Avg deal size', value: fmt(avg), delta: '-3.1%', sub: 'vs last month', deltaStyle: deltaStyle(false), deltaIcon: 'ph-trend-down' },
  ]
  const maxStage = Math.max(...STAGE_DEFS.map((st) => S.deals.filter((d) => d.stage === st.id).reduce((a, d) => a + d.value, 0)), 1)
  const stageBars = STAGE_DEFS.map((st) => {
    const list = S.deals.filter((d) => d.stage === st.id)
    const val = list.reduce((a, d) => a + d.value, 0)
    const acc = st.id === 'won' ? 'var(--color-accent-2-500)' : 'var(--color-accent-500)'
    return { name: st.name, count: list.length, valueFmt: fmt(val), barStyle: `height:100%;width:${Math.max((val / maxStage) * 100, 3)}%;background:${acc};border-radius:var(--radius-sm)` }
  })

  const contacts = S.deals.filter(match).map((d) => {
    const o = S.owners[d.owner] || { name: '—', initials: '?' }
    const st = STAGE_DEFS.find((s) => s.id === d.stage)
    const initials = d.contact ? d.contact.split(' ').map((w) => w[0]).slice(0, 2).join('') : '?'
    return { ...d, initials, valueFmt: fmt(d.value), avatarStyle, stageName: st.name, tagClass: d.stage === 'won' ? 'tag tag-accent-2' : 'tag tag-accent', ownerName: o.name, ownerInitials: o.initials, onClick: () => patch({ selectedId: d.id, schedType: 'Call', schedDate: '', noteDraft: '' }) }
  })

  const startHour = 8
  const hours = Array.from({ length: 10 }, (_, i) => ({ label: (startHour + i < 10 ? '0' : '') + (startHour + i) + ':00' }))
  const weekStart = addDaysISO(ANCHOR_MONDAY, S.calendarWeekOffset * 7)
  const weekEnd = addDaysISO(weekStart, 4)
  const weekDays = buildWeekDays(S.calendarEvents, weekStart)
  const eventDetail = S.eventDetailId ? S.calendarEvents.find((e) => e.id === S.eventDetailId) || null : null

  const forecast = STAGE_DEFS.map((st) => {
    const list = S.deals.filter((d) => d.stage === st.id)
    const val = list.reduce((a, d) => a + d.value, 0)
    const prob = STAGE_PROB[st.id]
    const w = Math.round((val * prob) / 100)
    return { name: st.name, count: list.length, valueFmt: fmt(val), prob, weighted: w, weightedFmt: fmt(w) }
  })
  const forecastTotal = forecast.reduce((a, f) => a + f.weighted, 0)
  const kpis = [
    { label: 'Weighted forecast', value: fmt(forecastTotal), sub: 'this quarter' },
    { label: 'Win rate', value: '34%', sub: 'trailing 90d' },
    { label: 'Avg sales cycle', value: '42d', sub: 'lead → won' },
    { label: 'Quota attainment', value: '88%', sub: 'team, MTD' },
  ]
  const chartData0 = [{ m: 'Feb', v: 6 }, { m: 'Mar', v: 9 }, { m: 'Apr', v: 7 }, { m: 'May', v: 12 }, { m: 'Jun', v: 11 }, { m: 'Jul', v: 15 }]
  const maxV = Math.max(...chartData0.map((c) => c.v))
  const chartData = chartData0.map((c) => ({ ...c, barStyle: `width:100%;max-width:44px;height:${Math.max((c.v / maxV) * 130, 4)}px;background:var(--color-accent-500);border-radius:var(--radius-sm)` }))
  const linePoints = chartData0.map((c, i) => `${(i / (chartData0.length - 1)) * 300},${110 - (c.v / maxV) * 100}`).join(' ')
  const lost0 = [{ r: 'Price too high', pct: 34 }, { r: 'Lost to competitor', pct: 28 }, { r: 'No budget', pct: 22 }, { r: 'No decision', pct: 16 }]
  const lostReasons = lost0.map((r) => ({ ...r, barStyle: `height:100%;width:${r.pct}%;background:var(--color-accent-2-400);border-radius:var(--radius-sm)` }))
  const pivot = Object.values(S.owners).map((o) => {
    const cells = STAGE_DEFS.map((st) => { const n = S.deals.filter((d) => d.owner === o.id && d.stage === st.id).length; return { n, color: n ? 'inherit' : 'var(--color-neutral-400)' } })
    const total = S.deals.filter((d) => d.owner === o.id).length
    return { owner: o.name, cells, total }
  })

  const fIcon = FIELD_TYPE_ICON
  const inputTypeFor = (t) => (t === 'Number' || t === 'Currency' ? 'number' : t === 'Date' ? 'date' : 'text')
  const chipBtn = (active) => `display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:13px;padding:6px 11px;border-radius:var(--radius-md);border:1px solid ${active ? 'var(--color-accent)' : 'var(--color-divider)'};background:${active ? 'var(--color-accent)' : 'transparent'};color:${active ? 'var(--color-bg)' : 'var(--color-text)'}`
  const studioTabs = [
    { id: 'fields', label: 'Custom Fields', icon: 'ph-textbox' },
    { id: 'views', label: 'Kanban Views', icon: 'ph-kanban' },
    { id: 'automations', label: 'Automations', icon: 'ph-flow-arrow' },
    { id: 'reports', label: 'Report Designer', icon: 'ph-file-text' },
  ].map((t) => ({ ...t, active: S.studioTab === t.id, onClick: () => patch({ studioTab: t.id }) }))
  const formFields = [
    ...STD_FIELDS.map((f) => ({ label: f.label, type: f.type, icon: fIcon[f.type], locked: true, canRemove: false })),
    ...S.customFields.map((f) => ({ label: f.label, type: f.type, icon: fIcon[f.type] || 'ph-text-t', locked: false, canRemove: true, onRemove: () => removeCustomField(f.id) })),
  ]
  const palette = ['Text', 'Number', 'Date', 'Selection', 'Checkbox', 'Currency', 'Phone'].map((t) => ({ t, icon: fIcon[t], onClick: () => patch({ newFieldType: t }), style: chipBtn(S.newFieldType === t) }))
  const presetsView = Object.entries(PRESETS).map(([key, p]) => ({ key, icon: p.icon, label: p.label, onClick: () => applyPreset(key) }))
  const stagesView = S.customStages.map((name, i) => ({ name, i, last: i === S.customStages.length - 1, notLast: i !== S.customStages.length - 1, onRemove: () => patch((s) => ({ customStages: s.customStages.filter((_, j) => j !== i) })) }))
  const rulesView = S.autoRules.map((r) => ({
    ...r,
    toggleStyle: `display:inline-flex;align-items:center;cursor:pointer;font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:11px;padding:4px 11px;border-radius:999px;border:1px solid ${r.enabled ? 'var(--color-accent)' : 'var(--color-divider)'};background:${r.enabled ? 'var(--color-accent-100)' : 'transparent'};color:${r.enabled ? 'var(--color-accent-800)' : 'var(--color-neutral-600)'}`,
    statusLabel: r.enabled ? 'Active' : 'Paused',
    onToggle: () => toggleRule(r),
  }))
  const optList = [
    { key: 'logo', label: 'Company logo' }, { key: 'tax', label: 'Tax column' }, { key: 'terms', label: 'Terms & conditions' }, { key: 'signature', label: 'Signature block' },
  ].map((o) => ({
    ...o, check: S.reportOpts[o.key] ? 'ph-check-circle' : 'ph-circle',
    style: `display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer;padding:9px 12px;border:1px solid ${S.reportOpts[o.key] ? 'var(--color-accent)' : 'var(--color-divider)'};border-radius:var(--radius-md);font-size:14px;color:${S.reportOpts[o.key] ? 'var(--color-accent-800)' : 'var(--color-text)'};background:transparent`,
    onClick: () => patch((s) => ({ reportOpts: { ...s.reportOpts, [o.key]: !s.reportOpts[o.key] } })),
  }))
  const reportAccentVar = S.reportAccent === 'magenta' ? 'var(--color-accent-2)' : 'var(--color-accent)'

  let selectedDeal = null
  if (S.selectedId != null) {
    const raw = S.deals.find((d) => d.id === S.selectedId)
    if (raw) {
      const dd = decorate(raw, S.owners)
      const chat = S.chatter[S.selectedId] || []
      const tl = [...chat, ...baseTimeline(raw)].map((t) => ({ ...t, dotStyle: 'width:28px;height:28px;border-radius:50%;background:var(--color-accent-100);color:var(--color-accent-800);display:flex;align-items:center;justify-content:center;flex-shrink:0', lineStyle: 'width:2px;flex:1;background:var(--color-divider);min-height:12px' }))
      const schedTypes = ['Call', 'Meeting', 'Email', 'Quote'].map((t) => ({
        label: t, icon: SCHED_ICONS[t], onClick: () => patch({ schedType: t }),
        style: `display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:13px;padding:6px 11px;border-radius:var(--radius-md);border:1px solid ${S.schedType === t ? 'var(--color-accent)' : 'var(--color-divider)'};background:${S.schedType === t ? 'var(--color-accent)' : 'transparent'};color:${S.schedType === t ? 'var(--color-bg)' : 'var(--color-text)'}`,
      }))
      selectedDeal = {
        ...dd, timeline: tl, schedTypes, chatterCount: chat.length,
        ecosystem: [
          { icon: 'ph-file-text', label: 'Quotation', onClick: () => ecoAction('ph-file-text', 'Quotation created', 'Quotation created') },
          { icon: 'ph-signature', label: 'e-Sign', onClick: () => ecoAction('ph-signature', 'Contract sent for e-signature', 'Sent for e-signature') },
          { icon: 'ph-phone', label: 'Call', onClick: () => ecoAction('ph-phone', 'VoIP call logged', 'Calling ' + dd.contact + '…') },
          { icon: 'ph-whatsapp-logo', label: 'WhatsApp', onClick: () => ecoAction('ph-whatsapp-logo', 'WhatsApp message sent', 'WhatsApp opened') },
          { icon: 'ph-megaphone', label: 'Campaign', onClick: () => ecoAction('ph-megaphone', 'Added to drip campaign', 'Enrolled in marketing campaign') },
        ],
        onQuotation: () => ecoAction('ph-file-text', 'Quotation created', 'Quotation created'),
      }
    }
  }

  // Role-based UI gating — mirrors the backend's ROLE_PERMS. The server re-checks
  // every request regardless; this is convenience, not the security boundary.
  const role = S.currentUser.role
  const isAdminOrManager = role === 'admin' || role === 'lead_sales'
  const canWrite = true // ponytail: no read-only role anymore, analyst was retired

  const navItem = (id, name, icon) => ({ id, name, icon, current: S.view === id ? 'page' : undefined, onClick: (e) => { e.preventDefault(); patch({ view: id, selectedId: null }) } })
  const nav = [
    navItem('dashboard', 'Dashboard', 'ph-squares-four'), navItem('pipeline', 'Pipeline', 'ph-kanban'),
    navItem('leads', 'Leads', 'ph-magnet-straight'), navItem('contacts', 'Contacts', 'ph-users'),
    navItem('calendar', 'Calendar', 'ph-calendar-dots'), navItem('reports', 'Reports', 'ph-chart-line-up'),
    ...(isAdminOrManager ? [navItem('studio', 'Studio', 'ph-blueprint')] : []),
  ]
  const ownerOptions = [{ id: 'all', name: 'All owners' }, ...Object.values(S.owners).map((o) => ({ id: o.id, name: o.name }))]

  const isPipeline = S.view === 'pipeline', isLeads = S.view === 'leads', isDashboard = S.view === 'dashboard'
  const isContacts = S.view === 'contacts', isCalendar = S.view === 'calendar', isReports = S.view === 'reports', isStudio = S.view === 'studio'
  const studioIsFields = S.studioTab === 'fields', studioIsViews = S.studioTab === 'views', studioIsAutomations = S.studioTab === 'automations', studioIsReports = S.studioTab === 'reports'
  const chartIsBar = S.chartMode === 'bar', chartIsLine = S.chartMode === 'line'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', background: 'var(--color-bg)', color: 'var(--color-text)' }}>

      {/* MASTHEAD */}
      <header style={sx('flex-shrink:0;padding:var(--space-3) var(--space-6) 0')}>
        <div className="nav" style={sx('padding:0;gap:var(--space-6);align-items:baseline')}>
          <div style={sx('display:flex;align-items:baseline;gap:var(--space-2);margin-right:var(--space-2)')}>
            <span style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:26px;letter-spacing:-0.02em')}>Flowdesk</span>
            <span style={sx('font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:var(--color-neutral-600)')}>Sales CRM</span>
          </div>
          <nav style={sx('display:flex;align-items:baseline;gap:var(--space-4);flex-wrap:wrap')}>
            {nav.map((item) => (
              <a key={item.id} href="#" onClick={item.onClick} aria-current={item.current} style={sx('display:inline-flex;align-items:center;gap:6px;font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:15px')}>
                <i className={`ph-duotone ${item.icon}`} style={sx('font-size:18px')}></i>{item.name}
              </a>
            ))}
          </nav>
          <div style={sx('margin-left:auto;display:flex;align-items:center;gap:var(--space-3)')}>
            <div style={sx('position:relative')}>
              <i className="ph-duotone ph-magnifying-glass" style={sx('position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--color-neutral-600);font-size:16px;pointer-events:none')}></i>
              <input className="input" value={S.query} onChange={(e) => patch({ query: e.target.value })} placeholder="Search…" style={sx('padding-left:30px;width:min(180px,40vw);min-height:34px')} />
            </div>
            {canWrite && <button className="btn btn-primary" onClick={() => openNewDeal('new')}><i className="ph-duotone ph-plus" style={sx('font-size:16px')}></i>New deal</button>}
            <div title={`${S.currentUser.name} (${role}) — click to sign out`} onClick={doLogout} style={sx('width:32px;height:32px;border-radius:50%;background:var(--color-accent-100);color:var(--color-accent-800);display:flex;align-items:center;justify-content:center;font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:12px;cursor:pointer')}>{S.currentUser.initials}</div>
          </div>
        </div>
        <div style={sx('margin-top:var(--space-2);height:3px;background:var(--color-text)')}></div>
        <div style={sx('display:flex;justify-content:space-between;padding:5px 0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:var(--color-neutral-700)')}>
          <span>Sales Desk</span>
          <span>Tuesday · July 21 · 2026</span>
          <span>{editions[S.view]}</span>
        </div>
        <div style={sx('height:1px;background:var(--color-text)')}></div>
      </header>

      {/* CONTENT */}
      <div style={sx('flex:1;min-height:0;overflow:auto;padding:var(--space-6)')}>

        {isPipeline && (
          <>
            <div style={sx('display:flex;align-items:baseline;gap:var(--space-4);flex-wrap:wrap')}>
              <h1 style={{ margin: 0 }}>Pipeline</h1>
              <p className="text-muted" style={{ margin: 0, fontSize: 15 }}>Drag deals across stages to update status.</p>
              <div style={sx('margin-left:auto;display:flex;align-items:center;gap:var(--space-2)')}>
                <span style={sx('font-size:12px;color:var(--color-neutral-700)')}>Owner</span>
                <select className="input" value={S.ownerFilter} onChange={(e) => patch({ ownerFilter: e.target.value })} style={sx('width:auto;min-height:34px')}>
                  {ownerOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
            </div>
            <div style={sx('display:flex;gap:var(--space-8);margin-top:var(--space-6);align-items:flex-start;overflow-x:auto;padding-bottom:var(--space-4)')}>
              {columns.map((col) => (
                <div key={col.name} style={sx('width:288px;flex-shrink:0')}>
                  <div style={sx('display:flex;align-items:baseline;gap:var(--space-2)')}>
                    <h4 style={{ margin: 0 }}>{col.name}</h4>
                    <span style={sx('font-family:var(--font-heading);font-size:15px;color:var(--color-neutral-600)')}>{col.count}</span>
                    <span style={sx('margin-left:auto;font-size:12px;color:var(--color-neutral-700)')}>{col.totalFmt}</span>
                  </div>
                  <div style={sx(col.ruleStyle)}></div>
                  <div onDragOver={col.onDragOver} onDrop={col.onDrop} style={sx(col.dropStyle)}>
                    {col.deals.map((d) => (
                      <div key={d.id} className="card elev-sm" draggable onDragStart={d.onDragStart} onDragEnd={d.onDragEnd} onClick={d.onClick} style={sx(d.dragStyle)}>
                        <div style={sx('display:flex;align-items:baseline;justify-content:space-between;gap:var(--space-2)')}>
                          <span className="card-kicker" style={sx(d.kickerStyle)}>{d.tag}</span>
                          <span style={sx('font-size:11px;color:var(--color-neutral-600)')}>{d.date}</span>
                        </div>
                        <div>
                          <div className="card-title">{d.company}</div>
                          <div className="text-muted" style={{ fontSize: 13 }}>{d.contact}</div>
                        </div>
                        <div style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:24px;line-height:1;letter-spacing:-0.02em')}>{d.valueFmt}</div>
                        <div className="card-meta" style={{ justifyContent: 'space-between' }}>
                          <span style={sx('display:inline-flex;align-items:center;gap:6px')}><span style={sx(d.avatarStyle)}>{d.ownerInitials}</span>{d.ownerName}</span>
                          <span style={sx('display:inline-flex;align-items:center;gap:4px;color:var(--color-neutral-700)')}><i className="ph-duotone ph-clock" style={sx('font-size:14px')}></i>{d.activity}</span>
                        </div>
                      </div>
                    ))}
                    {canWrite && <button className="btn btn-ghost" onClick={() => openNewDeal(col.stageKey)} style={sx('justify-content:flex-start;padding:var(--space-1) var(--space-2)')}><i className="ph-duotone ph-plus" style={sx('font-size:15px')}></i>Add deal</button>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {isLeads && (
          <>
            <div style={sx('display:flex;align-items:baseline;gap:var(--space-4);flex-wrap:wrap')}>
              <h1 style={{ margin: 0 }}>Leads</h1>
              <p className="text-muted" style={{ margin: 0, fontSize: 15 }}>Captured automatically, scored, and routed to a rep.</p>
              <span style={sx('margin-left:auto;display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--color-accent);')}><i className="ph-duotone ph-lightning" style={sx('font-size:16px')}></i>Automation live</span>
            </div>

            <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--space-8);margin-top:var(--space-6)')}>
              {channels.map((ch, i) => (
                <div key={i}>
                  <i className={`ph-duotone ${ch.icon}`} style={sx('font-size:26px;color:var(--color-accent)')}></i>
                  <div style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:30px;line-height:1;margin-top:var(--space-2)')}>{ch.figure}</div>
                  <div style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:14px;margin-top:2px')}>{ch.label}</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>{ch.caption}</div>
                </div>
              ))}
            </div>

            <div style={sx('height:1px;background:var(--color-text);margin:var(--space-6) 0 0')}></div>
            <div style={{ overflowX: 'auto' }}>
              <div style={sx('display:grid;grid-template-columns:132px 1.7fr 1.2fr 1.5fr 108px;gap:var(--space-4);padding:var(--space-2) 0;min-width:760px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:var(--color-neutral-600);border-bottom:1px solid var(--color-divider)')}>
                <div>Source</div><div>Lead</div><div>Score</div><div>Auto-assignment</div><div></div>
              </div>
              <div style={{ minWidth: 760 }}>
              {leads.map((l) => (
                <div key={l.id} style={sx('display:grid;grid-template-columns:132px 1.7fr 1.2fr 1.5fr 108px;gap:var(--space-4);padding:var(--space-3) 0;border-bottom:1px solid var(--color-divider);align-items:center')}>
                  <div style={sx('display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--color-neutral-800)')}>
                    <i className={`ph-duotone ${l.sourceIcon}`} style={sx('font-size:18px;color:var(--color-accent)')}></i>{l.sourceLabel}
                  </div>
                  <div>
                    <div style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:15px')}>{l.name} <span className="text-muted" style={{ fontWeight: 400 }}>· {l.title}</span></div>
                    <div className="text-muted" style={{ fontSize: 12 }}>{l.company} · {l.country}</div>
                    {S.customFields.length > 0 && (
                      <div style={sx('display:flex;flex-wrap:wrap;gap:6px;margin-top:6px')}>
                        {S.customFields.map((f) => (
                          f.type === 'Checkbox' ? (
                            <label key={f.id} style={sx('display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--color-neutral-700)')}>
                              <input type="checkbox" defaultChecked={!!l.customValues[f.id]} onChange={(e) => saveLeadCustomValue(l.id, f.id, e.target.checked)} />
                              {f.label}
                            </label>
                          ) : (
                            <input key={f.id} className="input" type={inputTypeFor(f.type)} style={{ fontSize: 11, padding: '3px 6px', minHeight: 'auto', width: 96 }}
                              defaultValue={l.customValues[f.id] ?? ''} placeholder={f.label}
                              onBlur={(e) => e.target.value !== (l.customValues[f.id] ?? '') && saveLeadCustomValue(l.id, f.id, e.target.value)} />
                          )
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={sx('display:flex;align-items:baseline;gap:8px')}>
                      <span style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:19px')}>{l.score}</span>
                      <span className={l.tierClass}>{l.tier}</span>
                    </div>
                    <div style={sx('height:6px;width:100%;max-width:150px;background:var(--color-neutral-200);border-radius:var(--radius-sm);overflow:hidden;margin-top:5px')}><div style={sx(l.scoreBar)}></div></div>
                    <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>{l.breakdown}</div>
                  </div>
                  <div style={{ fontSize: 13 }}>
                    <div style={sx('display:inline-flex;align-items:center;gap:6px')}><span style={sx(l.avatarStyle)}>{l.assigneeInitials}</span>{l.assignee}</div>
                    <div className="text-muted" style={{ fontSize: 11, marginTop: 3 }}>Rule: {l.rule}</div>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    {canWrite && <button className="btn btn-secondary btn-icon" title="Disqualify" onClick={() => disqualifyLead(l)} style={{ width: 34, height: 34, color: 'var(--color-accent-2)' }}><i className="ph-duotone ph-x" style={sx('font-size:15px')}></i></button>}
                    {canWrite && <button className="btn btn-secondary" onClick={l.onConvert} style={{ fontSize: 13 }}>Convert<i className="ph-duotone ph-arrow-right" style={sx('font-size:15px')}></i></button>}
                  </div>
                </div>
              ))}
              </div>
            </div>
          </>
        )}

        {isDashboard && (
          <>
            <h1 style={{ margin: 0 }}>Dashboard</h1>
            <p className="text-muted" style={{ margin: '0 0 var(--space-6)', fontSize: 15 }}>Your sales performance at a glance.</p>
            <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:var(--space-8)')}>
              {metrics.map((m, i) => (
                <div key={i}>
                  <div style={sx('font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--color-accent);margin-bottom:var(--space-2)')}>{m.kicker}</div>
                  <div className="cmyk-num" style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:52px')}>
                    <span className="paper">{m.value}</span>
                    <span className="plate plate-c" aria-hidden="true">{m.value}</span>
                    <span className="plate plate-m" aria-hidden="true">{m.value}</span>
                    <span className="plate plate-y" aria-hidden="true">{m.value}</span>
                  </div>
                  <div style={sx(m.deltaStyle)}><i className={`ph-duotone ${m.deltaIcon}`} style={sx('font-size:15px')}></i>{m.delta} <span className="text-muted">· {m.sub}</span></div>
                </div>
              ))}
            </div>
            <div className="grid-2col grid-2col-16" style={{ marginTop: 'var(--space-8)' }}>
              <div>
                <div style={sx('display:flex;align-items:baseline;justify-content:space-between;margin-bottom:var(--space-4)')}>
                  <h3 style={{ margin: 0 }}>Pipeline by stage</h3>
                  <span style={sx('font-size:13px;color:var(--color-neutral-700)')}>{fmt(openTotal)} open</span>
                </div>
                <div style={sx('display:flex;flex-direction:column;gap:var(--space-4)')}>
                  {stageBars.map((s, i) => (
                    <div key={i}>
                      <div style={sx('display:flex;align-items:baseline;gap:var(--space-2);margin-bottom:6px;font-size:14px')}>
                        <span style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight)')}>{s.name}</span>
                        <span className="text-muted" style={{ fontSize: 12 }}>{s.count} deals</span>
                        <span style={sx('margin-left:auto;font-family:var(--font-heading);font-size:14px')}>{s.valueFmt}</span>
                      </div>
                      <div style={sx('height:10px;background:var(--color-neutral-200);border-radius:var(--radius-sm);overflow:hidden')}><div style={sx(s.barStyle)}></div></div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 style={{ margin: '0 0 var(--space-4)' }}>Upcoming activities</h3>
                <div style={sx('display:flex;flex-direction:column')}>
                  {S.activitiesFeed.map((a, i) => (
                    <div key={i} style={sx('display:flex;align-items:center;gap:var(--space-3);padding:var(--space-2) 0;border-bottom:1px solid var(--color-divider)')}>
                      <i className={`ph-duotone ${a.icon}`} style={sx('font-size:22px;color:var(--color-accent);flex-shrink:0')}></i>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:15px')}>{a.title}</div>
                        <div className="text-muted" style={{ fontSize: 12 }}>{a.company}</div>
                      </div>
                      <span style={sx('font-size:12px;color:var(--color-neutral-700);white-space:nowrap')}>{a.when}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {isContacts && (
          <>
            <h1 style={{ margin: 0 }}>Contacts</h1>
            <p className="text-muted" style={{ margin: '0 0 var(--space-6)', fontSize: 15 }}>Everyone in your active pipeline.</p>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', minWidth: 640 }}>
                <thead><tr><th>Contact</th><th>Company</th><th>Open value</th><th>Stage</th><th style={{ textAlign: 'right' }}>Owner</th></tr></thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr key={c.id} onClick={c.onClick} style={{ cursor: 'pointer' }}>
                      <td>
                        <div style={sx('display:flex;align-items:center;gap:var(--space-2)')}>
                          <span style={sx(c.avatarStyle)}>{c.initials}</span>
                          <div style={{ minWidth: 0 }}><div style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:14px')}>{c.contact}</div><div className="text-muted" style={{ fontSize: 12 }}>{c.email}</div></div>
                        </div>
                      </td>
                      <td>{c.company}</td>
                      <td style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight)')}>{c.valueFmt}</td>
                      <td><span className={c.tagClass}>{c.stageName}</span></td>
                      <td style={{ textAlign: 'right' }}><span style={sx(c.avatarStyle)} title={c.ownerName}>{c.ownerInitials}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {isCalendar && (
          <>
            <div style={sx('display:flex;align-items:baseline;gap:var(--space-4);flex-wrap:wrap')}>
              <h1 style={{ margin: 0 }}>Calendar</h1>
              <p className="text-muted" style={{ margin: 0, fontSize: 15 }}>{fmtDate(weekStart)}–{fmtDate(weekEnd)}</p>
              {S.googleConnected ? (
                <span style={sx('display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--color-accent)')}><i className="ph-duotone ph-google-logo" style={sx('font-size:16px')}></i>Synced with Google Calendar</span>
              ) : (
                <button className="btn btn-secondary" onClick={connectGoogle} style={{ fontSize: 12 }}><i className="ph-duotone ph-google-logo" style={sx('font-size:16px')}></i>Connect Google Calendar</button>
              )}
              <div style={sx('margin-left:auto;display:flex;gap:var(--space-2);align-items:center')}>
                {S.googleConnected && <button className="btn btn-secondary" onClick={syncGoogle} disabled={S.googleSyncing}><i className={`ph-duotone ${S.googleSyncing ? 'ph-spinner' : 'ph-arrows-clockwise'}`} style={sx('font-size:15px')}></i>{S.googleSyncing ? 'Syncing…' : 'Sync now'}</button>}
                {canWrite && <button className="btn btn-secondary" onClick={() => openNewEvent()}><i className="ph-duotone ph-plus" style={sx('font-size:15px')}></i>Add event</button>}
                <div style={sx('display:flex;gap:var(--space-1)')}>
                  <button className="btn btn-secondary btn-icon" onClick={() => changeWeek(-1)}><i className="ph-duotone ph-caret-left" style={sx('font-size:18px')}></i></button>
                  <button className="btn btn-secondary btn-icon" onClick={() => changeWeek(1)}><i className="ph-duotone ph-caret-right" style={sx('font-size:18px')}></i></button>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 'var(--space-6)', width: '100%' }}>
              <div style={sx('display:grid;grid-template-columns:52px repeat(5,1fr)')}>
                <div></div>
                {weekDays.map((day) => (
                  <div key={day.dow} style={sx(day.headStyle)}><div style={sx('font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:var(--color-neutral-600)')}>{day.dow}</div><div style={sx(day.numStyle)}>{day.num}</div></div>
                ))}
              </div>
              <div style={sx('display:grid;grid-template-columns:52px repeat(5,1fr)')}>
                <div style={sx('display:flex;flex-direction:column')}>
                  {hours.map((h, i) => <div key={i} style={{ height: 54, fontSize: 10, color: 'var(--color-neutral-600)', textAlign: 'right', padding: '4px 8px 0 0' }}>{h.label}</div>)}
                </div>
                {weekDays.map((day) => (
                  <div key={day.dow} style={sx('position:relative;border-left:1px solid var(--color-divider)')}>
                    {hours.map((h, i) => (
                      <div
                        key={i}
                        onClick={canWrite ? () => openNewEvent(day.datePart, startHour + i) : undefined}
                        style={{ height: 54, borderTop: '1px solid var(--color-divider)', cursor: canWrite ? 'pointer' : 'default' }}
                      ></div>
                    ))}
                    {day.events.map((ev, i) => (
                      <div key={i} onClick={() => openEventDetail(ev)} style={sx(ev.style)}><div style={{ fontFamily: 'var(--font-heading)', fontWeight: 'var(--font-heading-weight)', fontSize: 12, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</div><div style={{ fontSize: 10, opacity: 0.85 }}>{ev.time}</div></div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {isReports && (
          <>
            <div style={sx('display:flex;align-items:baseline;gap:var(--space-4);flex-wrap:wrap')}>
              <h1 style={{ margin: 0 }}>Reports</h1>
              <p className="text-muted" style={{ margin: 0, fontSize: 15 }}>Forecast, performance and analysis.</p>
            </div>

            <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--space-8);margin-top:var(--space-6)')}>
              {kpis.map((k, i) => (
                <div key={i}>
                  <div style={sx('font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--color-accent);margin-bottom:var(--space-2)')}>{k.label}</div>
                  <div style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:36px;line-height:1;letter-spacing:-0.02em')}>{k.value}</div>
                  <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>{k.sub}</div>
                </div>
              ))}
            </div>

            <div className="grid-2col grid-2col-15" style={{ marginTop: 'var(--space-8)', alignItems: 'start' }}>
              <div>
                <div style={sx('display:flex;align-items:baseline;justify-content:space-between;margin-bottom:var(--space-3)')}>
                  <h3 style={{ margin: 0 }}>Bookings trend</h3>
                  <div className="seg">
                    <label className="seg-opt"><input type="radio" name="chart" checked={chartIsBar} onChange={() => patch({ chartMode: 'bar' })} /><i className="ph-duotone ph-chart-bar" style={sx('font-size:15px')}></i>Bar</label>
                    <label className="seg-opt"><input type="radio" name="chart" checked={chartIsLine} onChange={() => patch({ chartMode: 'line' })} /><i className="ph-duotone ph-chart-line" style={sx('font-size:15px')}></i>Line</label>
                  </div>
                </div>
                {chartIsBar && (
                  <div style={sx('display:flex;align-items:flex-end;gap:var(--space-4);height:180px;padding-top:var(--space-2)')}>
                    {chartData.map((c, i) => (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                        <span style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:12px')}>{c.v}</span>
                        <div style={sx(c.barStyle)}></div>
                        <span className="text-muted" style={{ fontSize: 11 }}>{c.m}</span>
                      </div>
                    ))}
                  </div>
                )}
                {chartIsLine && (
                  <div style={{ height: 180, paddingTop: 'var(--space-2)' }}>
                    <svg viewBox="0 0 300 120" preserveAspectRatio="none" style={{ width: '100%', height: 150, overflow: 'visible' }}>
                      <polyline points={linePoints} fill="none" stroke="var(--color-accent)" strokeWidth="2" vectorEffect="non-scaling-stroke"></polyline>
                    </svg>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                      {chartData.map((c, i) => <span key={i} className="text-muted" style={{ fontSize: 11 }}>{c.m}</span>)}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h3 style={{ margin: '0 0 var(--space-3)' }}>Lost reasons</h3>
                <div style={sx('display:flex;flex-direction:column;gap:var(--space-3)')}>
                  {lostReasons.map((r, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}><span>{r.r}</span><span style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight)')}>{r.pct}%</span></div>
                      <div style={sx('height:8px;background:var(--color-neutral-200);border-radius:var(--radius-sm);overflow:hidden')}><div style={sx(r.barStyle)}></div></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <h3 style={{ margin: 'var(--space-8) 0 var(--space-2)' }}>Forecast by stage</h3>
            <p className="text-muted" style={{ margin: '0 0 var(--space-3)', fontSize: 13 }}>Weighted by close probability.</p>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', maxWidth: 760, minWidth: 560 }}>
                <thead><tr><th>Stage</th><th>Deals</th><th>Value</th><th>Probability</th><th style={{ textAlign: 'right' }}>Weighted forecast</th></tr></thead>
                <tbody>
                  {forecast.map((f, i) => (
                    <tr key={i}>
                      <td style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight)')}>{f.name}</td>
                      <td>{f.count}</td>
                      <td>{f.valueFmt}</td>
                      <td><span className="tag tag-accent">{f.prob}%</span></td>
                      <td style={sx('text-align:right;font-family:var(--font-heading);font-weight:var(--font-heading-weight)')}>{f.weightedFmt}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight)')}>Total</td>
                    <td></td><td></td><td></td>
                    <td style={sx('text-align:right;font-family:var(--font-heading);font-weight:var(--font-heading-weight);color:var(--color-accent)')}>{fmt(forecastTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 style={{ margin: 'var(--space-8) 0 var(--space-2)' }}>Pivot — owner × stage</h3>
            <p className="text-muted" style={{ margin: '0 0 var(--space-3)', fontSize: 13 }}>Deal count by rep and stage.</p>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', maxWidth: 760, minWidth: 560 }}>
                <thead><tr><th>Owner</th>{STAGE_DEFS.map((s) => <th key={s.id} style={{ textAlign: 'right' }}>{s.name}</th>)}<th style={{ textAlign: 'right' }}>Total</th></tr></thead>
                <tbody>
                  {pivot.map((row, i) => (
                    <tr key={i}>
                      <td style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight)')}>{row.owner}</td>
                      {row.cells.map((cell, j) => <td key={j} style={{ textAlign: 'right', color: cell.color }}>{cell.n}</td>)}
                      <td style={sx('text-align:right;font-family:var(--font-heading);font-weight:var(--font-heading-weight)')}>{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {isStudio && (
          <>
            <div style={sx('display:flex;align-items:baseline;gap:var(--space-4);flex-wrap:wrap')}>
              <h1 style={{ margin: 0 }}>Studio</h1>
              <p className="text-muted" style={{ margin: 0, fontSize: 15 }}>Reshape the CRM to your workflow — no code required.</p>
              <span style={sx('margin-left:auto;display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--color-accent)')}><i className="ph-duotone ph-blueprint" style={sx('font-size:16px')}></i>Drag-and-drop builder</span>
            </div>

            <div className="seg" style={{ marginTop: 'var(--space-4)' }}>
              {studioTabs.map((t) => (
                <label key={t.id} className="seg-opt"><input type="radio" name="studioTab" checked={t.active} onChange={t.onClick} /><i className={`ph-duotone ${t.icon}`} style={sx('font-size:15px')}></i>{t.label}</label>
              ))}
            </div>

            {studioIsFields && (
              <div className="grid-2col grid-2col-side300" style={{ marginTop: 'var(--space-6)', alignItems: 'start' }}>
                <div>
                  <h4 style={{ margin: '0 0 var(--space-1)' }}>Field types</h4>
                  <p className="text-muted" style={{ margin: '0 0 var(--space-3)', fontSize: 12 }}>Pick a type, name it, add it to the form.</p>
                  <div style={sx('display:flex;flex-wrap:wrap;gap:var(--space-1)')}>
                    {palette.map((p) => (
                      <button key={p.t} onClick={p.onClick} style={sx(p.style)}><i className={`ph-duotone ${p.icon}`} style={sx('font-size:15px')}></i>{p.t}</button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                    <input className="input" value={S.newFieldLabel} onChange={(e) => patch({ newFieldLabel: e.target.value })} placeholder="New field label…" style={{ minHeight: 34, flex: 1 }} />
                    <button className="btn btn-primary" onClick={addCustomField}><i className="ph-duotone ph-plus" style={sx('font-size:15px')}></i>Add</button>
                  </div>
                  <h4 style={{ margin: 'var(--space-6) 0 var(--space-1)' }}>Industry presets</h4>
                  <p className="text-muted" style={{ margin: '0 0 var(--space-3)', fontSize: 12 }}>One click reshapes the form for a vertical.</p>
                  <div style={sx('display:flex;flex-wrap:wrap;gap:var(--space-1)')}>
                    {presetsView.map((p) => (
                      <button key={p.key} className="btn btn-secondary" onClick={p.onClick}><i className={`ph-duotone ${p.icon}`} style={sx('font-size:16px')}></i>{p.label}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={sx('display:flex;align-items:baseline;gap:var(--space-2)')}><h4 style={{ margin: 0 }}>Lead form</h4><span className="text-muted" style={{ fontSize: 12 }}>live preview</span></div>
                  <div style={{ height: 2, width: 32, background: 'var(--color-accent)', margin: '6px 0 var(--space-4)' }}></div>
                  <div style={sx('display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)')}>
                    {formFields.map((f, i) => (
                      <div key={i} style={{ border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <i className={`ph-duotone ${f.icon}`} style={sx('font-size:15px;color:var(--color-accent)')}></i>
                          <span style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:13px')}>{f.label}</span>
                          <span className="text-muted" style={{ fontSize: 11 }}>· {f.type}</span>
                          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                            {f.locked && <i className="ph-duotone ph-lock-simple" style={sx('font-size:14px;color:var(--color-neutral-500)')}></i>}
                            {f.canRemove && <button onClick={f.onRemove} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-neutral-600)', display: 'flex', padding: 0 }}><i className="ph-duotone ph-x" style={sx('font-size:15px')}></i></button>}
                          </span>
                        </div>
                        <div style={{ height: 28, borderBottom: '1px solid var(--color-divider)', marginTop: 6 }}></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {studioIsViews && (
              <>
                <p className="text-muted" style={{ margin: 'var(--space-5) 0 var(--space-4)', fontSize: 14, maxWidth: 660 }}>Rename, remove or add pipeline stages. Property teams reshape this into an approval-gated flow — <span style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight)')}>Booking Fee → BI Checking → Akad Kredit → Handover</span>.</p>
                <div style={sx('display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-1)')}>
                  {stagesView.map((s) => (
                    <span key={s.i} style={{ display: 'contents' }}>
                      <span style={sx('display:inline-flex;align-items:center;gap:9px;padding:8px 13px;border:1px solid var(--color-divider);border-radius:var(--radius-md);font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:14px')}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-accent)' }}></span>{s.name}
                        <button onClick={s.onRemove} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-neutral-500)', display: 'flex', padding: 0 }}><i className="ph-duotone ph-x" style={sx('font-size:14px')}></i></button>
                      </span>
                      {s.notLast && <i className="ph-duotone ph-caret-right" style={sx('font-size:16px;color:var(--color-neutral-400);margin:0 2px')}></i>}
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-5)', maxWidth: 380 }}>
                  <input className="input" value={S.newStage} onChange={(e) => patch({ newStage: e.target.value })} placeholder="New stage name…" style={{ minHeight: 34, flex: 1 }} />
                  <button className="btn btn-primary" onClick={addStage}><i className="ph-duotone ph-plus" style={sx('font-size:15px')}></i>Add stage</button>
                </div>
              </>
            )}

            {studioIsAutomations && (
              <>
                <p className="text-muted" style={{ margin: 'var(--space-5) 0 var(--space-3)', fontSize: 14, maxWidth: 660 }}>If-this-then-that rules run automatically on every deal and lead — no code.</p>
                <div style={sx('display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-2)')}>
                  <span style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:15px')}>When</span>
                  <select className="input" value={S.ruleField} onChange={(e) => patch({ ruleField: e.target.value })} style={{ width: 'auto', minHeight: 34 }}>{['Expected revenue', 'Country', 'Lead score', 'Stage', 'Job title'].map((o) => <option key={o} value={o}>{o}</option>)}</select>
                  <select className="input" value={S.ruleOp} onChange={(e) => patch({ ruleOp: e.target.value })} style={{ width: 'auto', minHeight: 34 }}>{['>', '>=', 'is', 'contains'].map((o) => <option key={o} value={o}>{o}</option>)}</select>
                  <input className="input" value={S.ruleValue} onChange={(e) => patch({ ruleValue: e.target.value })} placeholder="value" style={{ width: 160, minHeight: 34 }} />
                  <span style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:15px')}>then</span>
                  <select className="input" value={S.ruleAction} onChange={(e) => patch({ ruleAction: e.target.value })} style={{ width: 'auto', minHeight: 34 }}>{Object.keys(ACTION_ICON).map((o) => <option key={o} value={o}>{o}</option>)}</select>
                  <button className="btn btn-primary" onClick={addRule}><i className="ph-duotone ph-plus" style={sx('font-size:15px')}></i>Add rule</button>
                </div>
                <div style={{ height: 1, background: 'var(--color-text)', margin: 'var(--space-4) 0 0' }}></div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {rulesView.map((r) => (
                    <div key={r.id} style={sx('display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) 0;border-bottom:1px solid var(--color-divider)')}>
                      <i className={`ph-duotone ${r.icon}`} style={sx('font-size:24px;color:var(--color-accent);flex-shrink:0')}></i>
                      <div style={{ flex: 1, minWidth: 0, fontSize: 14 }}>
                        <span className="text-muted">When </span><span style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight)')}>{r.field} {r.op} {r.value}</span><span className="text-muted"> then </span><span style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight)')}>{r.action}</span>
                      </div>
                      <button onClick={r.onToggle} style={sx(r.toggleStyle)}>{r.statusLabel}</button>
                      <button onClick={() => deleteRule(r)} title="Delete rule" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-neutral-500)', display: 'flex', padding: 0, marginLeft: 10 }}><i className="ph-duotone ph-trash" style={sx('font-size:16px')}></i></button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {studioIsReports && (
              <div className="grid-2col grid-2col-side280" style={{ marginTop: 'var(--space-6)', alignItems: 'start' }}>
                <div>
                  <h4 style={{ margin: '0 0 var(--space-3)' }}>Document blocks</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {optList.map((o) => (
                      <button key={o.key} onClick={o.onClick} style={sx(o.style)}>{o.label}<i className={`ph-duotone ${o.check}`} style={sx('font-size:18px;color:var(--color-accent)')}></i></button>
                    ))}
                  </div>
                  <h4 style={{ margin: 'var(--space-5) 0 var(--space-2)' }}>Accent</h4>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button onClick={() => patch({ reportAccent: 'cyan' })} title="Cyan" style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--color-accent)', border: '2px solid var(--color-text)', cursor: 'pointer' }}></button>
                    <button onClick={() => patch({ reportAccent: 'magenta' })} title="Magenta" style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--color-accent-2)', border: '2px solid var(--color-divider)', cursor: 'pointer' }}></button>
                  </div>
                </div>

                <div className="card" style={{ padding: 'var(--space-6)', boxShadow: 'var(--shadow-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
                    <div>
                      {S.reportOpts.logo && <div style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:24px;letter-spacing:-0.02em')}>Flowdesk</div>}
                      <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>Quotation · SO-4312</div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 12 }}>
                      <div style={{ height: 3, width: 64, marginLeft: 'auto', background: reportAccentVar }}></div>
                      <div style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:15px;margin-top:8px')}>Vertex Cloud</div>
                      <div className="text-muted">Jul 21, 2026</div>
                    </div>
                  </div>

                  <table className="table" style={{ marginTop: 'var(--space-5)' }}>
                    <thead>
                      <tr><th>Item</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Price</th>{S.reportOpts.tax && <th style={{ textAlign: 'right' }}>Tax</th>}<th style={{ textAlign: 'right' }}>Amount</th></tr>
                    </thead>
                    <tbody>
                      <tr><td>Platform license — annual</td><td style={{ textAlign: 'right' }}>1</td><td style={{ textAlign: 'right' }}>$72,000</td>{S.reportOpts.tax && <td style={{ textAlign: 'right' }}>11%</td>}<td style={{ textAlign: 'right' }}>$79,920</td></tr>
                      <tr><td>Onboarding & training</td><td style={{ textAlign: 'right' }}>1</td><td style={{ textAlign: 'right' }}>$8,000</td>{S.reportOpts.tax && <td style={{ textAlign: 'right' }}>11%</td>}<td style={{ textAlign: 'right' }}>$8,880</td></tr>
                    </tbody>
                  </table>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-4)' }}>
                      <span className="text-muted" style={{ fontSize: 13 }}>Total</span>
                      <span style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:26px;letter-spacing:-0.02em')}>$88,800</span>
                    </div>
                  </div>

                  {S.reportOpts.terms && (
                    <div style={{ marginTop: 'var(--space-5)' }}><div style={sx('font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--color-neutral-600);margin-bottom:4px')}>Terms &amp; conditions</div><p className="text-muted" style={{ margin: 0, fontSize: 12, maxWidth: 520 }}>Payment due within 30 days of acceptance. Prices valid for 14 days. Subject to master service agreement.</p></div>
                  )}
                  {S.reportOpts.signature && (
                    <div style={{ display: 'flex', gap: 'var(--space-8)', marginTop: 'var(--space-6)' }}>
                      <div style={{ flex: 1 }}><div style={{ height: 1, background: 'var(--color-text)' }}></div><div className="text-muted" style={{ fontSize: 12, marginTop: 5 }}>Authorised — Flowdesk</div></div>
                      <div style={{ flex: 1 }}><div style={{ height: 1, background: 'var(--color-text)' }}></div><div className="text-muted" style={{ fontSize: 12, marginTop: 5 }}>Accepted — Vertex Cloud</div></div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DEVELOPER TRACK */}
            <div style={{ height: 1, background: 'var(--color-text)', margin: 'var(--space-8) 0 var(--space-4)' }}></div>
            <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:var(--space-8)')}>
              <div>
                <i className="ph-duotone ph-code" style={sx('font-size:24px;color:var(--color-accent-2)')}></i>
                <div style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:16px;margin-top:var(--space-2)')}>Custom modules</div>
                <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>Extend or override core logic — Python on the back end, XML for the views.</p>
              </div>
              <div>
                <i className="ph-duotone ph-plugs-connected" style={sx('font-size:24px;color:var(--color-accent-2)')}></i>
                <div style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:16px;margin-top:var(--space-2)')}>Custom API</div>
                <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>XML-RPC / JSON-RPC endpoints to wire the CRM to in-house apps, IoT, or a local payment gateway.</p>
              </div>
              <div>
                <i className="ph-duotone ph-browsers" style={sx('font-size:24px;color:var(--color-accent-2)')}></i>
                <div style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:16px;margin-top:var(--space-2)')}>QWeb templating</div>
                <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>Rebuild the customer portal front end entirely with the QWeb template engine.</p>
              </div>
            </div>
          </>
        )}

      </div>

      {/* DEAL SLIDE-OVER */}
      {selectedDeal && (
        <div onClick={() => patch({ selectedId: null })} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'color-mix(in srgb, var(--color-neutral-900) 50%, transparent)', animation: 'fadeIn .16s ease' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 0, right: 0, height: '100%', width: 452, background: 'var(--color-surface)', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', animation: 'slideOver .24s cubic-bezier(.2,.7,.3,1)' }}>
            <div style={{ padding: 'var(--space-4) var(--space-4) var(--space-3)' }}>
              <div style={sx('display:flex;align-items:baseline;justify-content:space-between;gap:var(--space-2)')}>
                <span className="card-kicker" style={sx(selectedDeal.kickerStyle)}>{selectedDeal.tag}</span>
                <button className="btn btn-secondary btn-icon" onClick={() => patch({ selectedId: null })} style={{ width: 30, height: 30 }}><i className="ph-duotone ph-x" style={sx('font-size:16px')}></i></button>
              </div>
              <h2 style={{ margin: 'var(--space-1) 0 0' }}>{selectedDeal.company}</h2>
              <div className="text-muted" style={{ fontSize: 14 }}>{selectedDeal.contact}</div>
              <div style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:40px;line-height:1;letter-spacing:-0.02em;margin-top:var(--space-3)')}>{selectedDeal.valueFmt}</div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)', padding: '0 var(--space-4) var(--space-3)' }}>
              {selectedDeal.ecosystem.map((e, i) => (
                <button key={i} className="btn btn-secondary" onClick={e.onClick} style={{ fontSize: 12.5, padding: '6px 10px' }}><i className={`ph-duotone ${e.icon}`} style={sx('font-size:15px')}></i>{e.label}</button>
              ))}
            </div>
            <div style={{ height: 1, background: 'var(--color-divider)', margin: '0 var(--space-4)' }}></div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)' }}>
              <div style={sx('display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)')}>
                <div><div style={sx('font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--color-neutral-600);margin-bottom:4px')}>Stage</div><div style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:15px')}>{selectedDeal.stageName}</div></div>
                <div><div style={sx('font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--color-neutral-600);margin-bottom:4px')}>Expected close</div><div style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:15px')}>{selectedDeal.date}, 2026</div></div>
                <div><div style={sx('font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--color-neutral-600);margin-bottom:4px')}>Owner</div><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={sx(selectedDeal.avatarStyle)}>{selectedDeal.ownerInitials}</span><span style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:15px')}>{selectedDeal.ownerName}</span></div></div>
                <div><div style={sx('font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--color-neutral-600);margin-bottom:4px')}>Next step</div><div style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:15px')}>{selectedDeal.activity}</div></div>
              </div>

              <div style={{ marginTop: 'var(--space-6)' }}>
                <h4 style={{ margin: '0 0 var(--space-2)' }}>Schedule next activity</h4>
                <div style={sx('display:flex;flex-wrap:wrap;gap:var(--space-1)')}>
                  {selectedDeal.schedTypes.map((t) => (
                    <button key={t.label} onClick={t.onClick} style={sx(t.style)}><i className={`ph-duotone ${t.icon}`} style={sx('font-size:15px')}></i>{t.label}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                  <input className="input" type="date" value={S.schedDate} onChange={(e) => patch({ schedDate: e.target.value })} style={{ minHeight: 34, flex: 1 }} />
                  <button className="btn btn-primary" onClick={scheduleActivity}><i className="ph-duotone ph-calendar-plus" style={sx('font-size:15px')}></i>Schedule</button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: 'var(--space-6) 0 var(--space-2)' }}>
                <h4 style={{ margin: 0 }}>Chatter — activity &amp; notes</h4>
                <span className="text-muted" style={{ fontSize: 11 }}>{selectedDeal.chatterCount} entries</span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                <input className="input" value={S.noteDraft} onChange={(e) => patch({ noteDraft: e.target.value })} placeholder="Log an internal note…" style={{ minHeight: 34, flex: 1 }} />
                <button className="btn btn-secondary" onClick={addNote}><i className="ph-duotone ph-note-pencil" style={sx('font-size:15px')}></i>Log</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {selectedDeal.timeline.map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={sx(t.dotStyle)}><i className={`ph-duotone ${t.icon}`} style={sx('font-size:15px')}></i></span>
                      <div style={sx(t.lineStyle)}></div>
                    </div>
                    <div style={{ paddingBottom: 'var(--space-4)', flex: 1 }}>
                      <div style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:14px')}>{t.text}</div>
                      <div className="text-muted" style={{ fontSize: 12 }}>{t.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-2)', padding: 'var(--space-3) var(--space-4)', borderTop: '1px solid var(--color-divider)' }}>
              <button className="btn btn-primary btn-block" onClick={selectedDeal.onQuotation} style={{ marginTop: 0 }}><i className="ph-duotone ph-file-text" style={sx('font-size:16px')}></i>Create quotation</button>
              {canWrite && <button className="btn btn-secondary" onClick={() => openEditDeal(selectedDeal)}>Edit</button>}
              {isAdminOrManager && <button className="btn btn-secondary btn-icon" title="Delete deal" onClick={() => deleteDeal(selectedDeal)} style={{ color: 'var(--color-accent-2)' }}><i className="ph-duotone ph-trash" style={sx('font-size:16px')}></i></button>}
            </div>
          </div>
        </div>
      )}

      {/* NEW DEAL DIALOG */}
      {S.newDealOpen && (
        <div className="dialog-backdrop" onClick={closeNewDeal} style={{ zIndex: 50 }}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-title">{S.editingDealId ? 'Edit deal' : 'New deal'}</div>
            <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <input className="input" value={S.newDealForm.company} onChange={(e) => setNewDealField('company', e.target.value)} placeholder="Company *" />
              <input className="input" value={S.newDealForm.contact} onChange={(e) => setNewDealField('contact', e.target.value)} placeholder="Contact name" />
              <input className="input" type="email" value={S.newDealForm.email} onChange={(e) => setNewDealField('email', e.target.value)} placeholder="Contact email" />
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <input className="input" type="number" value={S.newDealForm.value} onChange={(e) => setNewDealField('value', e.target.value)} placeholder="Value ($)" style={{ flex: 1 }} />
                <input className="input" value={S.newDealForm.tag} onChange={(e) => setNewDealField('tag', e.target.value)} placeholder="Tag (e.g. Inbound)" style={{ flex: 1 }} />
              </div>
              <select className="input" value={S.newDealForm.owner} onChange={(e) => setNewDealField('owner', e.target.value)}>
                {Object.values(S.owners).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <select className="input" value={S.newDealForm.stage} onChange={(e) => setNewDealField('stage', e.target.value)}>
                {STAGE_DEFS.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
              </select>
              {S.customFields.map((f) => (
                f.type === 'Checkbox' ? (
                  <label key={f.id} style={sx('display:flex;align-items:center;gap:8px;font-size:14px')}>
                    <input type="checkbox" checked={!!S.newDealForm.customValues[f.id]} onChange={(e) => setDealCustomValue(f.id, e.target.checked)} />
                    {f.label}
                  </label>
                ) : (
                  <input key={f.id} className="input" type={inputTypeFor(f.type)} value={S.newDealForm.customValues[f.id] ?? ''} onChange={(e) => setDealCustomValue(f.id, e.target.value)} placeholder={f.label} />
                )
              ))}
            </div>
            <div className="dialog-actions">
              <button className="btn btn-secondary" onClick={closeNewDeal}>Cancel</button>
              <button className="btn btn-primary" onClick={submitDealForm}><i className={`ph-duotone ${S.editingDealId ? 'ph-check' : 'ph-plus'}`} style={sx('font-size:15px')}></i>{S.editingDealId ? 'Save changes' : 'Create deal'}</button>
            </div>
          </div>
        </div>
      )}

      {/* NEW EVENT DIALOG */}
      {S.newEventOpen && (
        <div className="dialog-backdrop" onClick={closeNewEvent} style={{ zIndex: 50 }}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-title">New event</div>
            <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <input className="input" value={S.newEventForm.title} onChange={(e) => setNewEventField('title', e.target.value)} placeholder="Event title *" />
              <input className="input" type="date" value={S.newEventForm.date} onChange={(e) => setNewEventField('date', e.target.value)} />
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <input className="input" type="time" value={S.newEventForm.start} onChange={(e) => setNewEventField('start', e.target.value)} style={{ flex: 1 }} />
                <input className="input" type="time" value={S.newEventForm.end} onChange={(e) => setNewEventField('end', e.target.value)} style={{ flex: 1 }} />
              </div>
            </div>
            <div className="dialog-actions">
              <button className="btn btn-secondary" onClick={closeNewEvent}>Cancel</button>
              <button className="btn btn-primary" onClick={submitNewEvent}><i className="ph-duotone ph-plus" style={sx('font-size:15px')}></i>Add event</button>
            </div>
          </div>
        </div>
      )}

      {/* EVENT DETAIL DIALOG */}
      {eventDetail && (
        <div className="dialog-backdrop" onClick={closeEventDetail} style={{ zIndex: 50 }}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-title">{eventDetail.title}</div>
            <div className="dialog-body">
              {(() => {
                const [datePart, startTime] = eventDetail.starts_at.split(' ')
                const endTime = eventDetail.ends_at.split(' ')[1]
                const [y, m, d] = datePart.split('-').map(Number)
                const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
                return <span>{dow}, {fmtDate(datePart)} · {startTime.slice(0, 5)}–{endTime.slice(0, 5)}</span>
              })()}
            </div>
            <div className="dialog-actions">
              <button className="btn btn-secondary" onClick={closeEventDetail}>Close</button>
              {canWrite && <button className="btn btn-secondary" onClick={deleteEvent} style={{ color: 'var(--color-accent-2)' }}><i className="ph-duotone ph-trash" style={sx('font-size:15px')}></i>Delete</button>}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
