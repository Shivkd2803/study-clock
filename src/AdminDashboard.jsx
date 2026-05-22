import { useState, useEffect } from "react";

const ADMIN_PASSWORD = "studyclock@admin2024";
const KEY_BGS = "lsc_admin_backgrounds";
const KEY_CLOCK = "lsc_admin_clock_designs";
const KEY_SETTINGS = "lsc_admin_settings";
const CATEGORIES = ["Rain","Nature","Underwater","Night","Winter","Lofi","Other"];

const s = {
  page: {
    minHeight:"100vh", background:"#0a0f0a", fontFamily:"'DM Sans',sans-serif",
    color:"#fff", overflowY:"auto",
  },
  card: {
    background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.09)",
    borderRadius:14, padding:"20px",
  },
  input: {
    width:"100%", padding:"10px 12px", boxSizing:"border-box",
    background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)",
    borderRadius:10, color:"#fff", fontSize:14, outline:"none",
    fontFamily:"'DM Sans',sans-serif", marginTop:6,
  },
  label: {
    display:"block", fontSize:11, color:"rgba(255,255,255,0.45)",
    fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase",
  },
  btn: (variant="primary") => ({
    padding:"10px 20px", borderRadius:10, border:"none", cursor:"pointer",
    fontSize:13, fontWeight:700, fontFamily:"'DM Sans',sans-serif",
    background: variant==="primary" ? "#f0ede8" : variant==="danger" ? "rgba(255,60,60,0.15)" : "rgba(255,255,255,0.07)",
    color: variant==="primary" ? "#0a0f0a" : variant==="danger" ? "#ff8888" : "rgba(255,255,255,0.6)",
    border: variant==="danger" ? "1px solid rgba(255,60,60,0.25)" : "none",
  }),
};

function get(key, fb) { try { return JSON.parse(localStorage.getItem(key)) ?? fb; } catch { return fb; } }
function put(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");

  const submit = () => {
    if (pw === ADMIN_PASSWORD) { onLogin(); }
    else { setErr("Wrong password."); setPw(""); }
  };

  return (
    <div style={{ ...s.page, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:380, padding:"0 20px" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:32, marginBottom:12 }}>🔐</div>
          <h1 style={{ color:"#f0ede8", fontSize:22, fontWeight:700, margin:"0 0 6px" }}>Admin Dashboard</h1>
          <p style={{ color:"rgba(255,255,255,0.35)", fontSize:13, margin:0 }}>Live Study Clock — Restricted Access</p>
        </div>
        <div style={s.card}>
          <label style={s.label}>Password</label>
          <div style={{ position:"relative" }}>
            <input
              type={show ? "text" : "password"}
              value={pw}
              onChange={e => { setPw(e.target.value); setErr(""); }}
              onKeyDown={e => e.key === "Enter" && submit()}
              placeholder="Enter password"
              autoFocus
              style={{ ...s.input, paddingRight:44 }}
            />
            <button onClick={() => setShow(v => !v)} style={{
              position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
              background:"none", border:"none", color:"rgba(255,255,255,0.4)", cursor:"pointer", fontSize:16, marginTop:3,
            }}>{show ? "🙈" : "👁"}</button>
          </div>
          {err && <p style={{ color:"#ff8888", fontSize:12, margin:"8px 0 0" }}>{err}</p>}
          <button onClick={submit} style={{ ...s.btn(), width:"100%", marginTop:16, padding:"12px" }}>
            ACCESS DASHBOARD
          </button>
        </div>
        <p style={{ textAlign:"center", color:"rgba(255,255,255,0.2)", fontSize:11, marginTop:16 }}>
          Not linked from the app — access via URL only
        </p>
      </div>
    </div>
  );
}

// ─── BACKGROUNDS TAB ─────────────────────────────────────────────────────────
function BgTab() {
  const [bgs, setBgs] = useState(() => get(KEY_BGS, []));
  const [form, setForm] = useState({ name:"", desc:"", category:"Nature", thumbnail:"", video:"", audio:"", isLive:false });
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [delId, setDelId] = useState(null);

  const save = (list) => { put(KEY_BGS, list); setBgs(list); };
  const f = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  const resetForm = () => {
    setForm({ name:"", desc:"", category:"Nature", thumbnail:"", video:"", audio:"", isLive:false });
    setEditId(null); setShowForm(false);
  };

  const startEdit = (bg) => {
    setForm({ name:bg.name, desc:bg.desc||"", category:bg.category||"Nature", thumbnail:bg.thumbnail||"", video:bg.video||"", audio:bg.audio||"", isLive:!!bg.isLive });
    setEditId(bg.id); setShowForm(true);
    setTimeout(() => document.getElementById("bg-form")?.scrollIntoView({ behavior:"smooth" }), 100);
  };

  const submit = () => {
    if (!form.name || !form.video) return alert("Name and Video URL are required.");
    if (editId) {
      save(bgs.map(b => b.id === editId ? { ...form, id: editId } : b));
    } else {
      save([...bgs, { ...form, id: Date.now() }]);
    }
    resetForm();
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h2 style={{ color:"#f0ede8", fontSize:18, fontWeight:700, margin:"0 0 4px" }}>Backgrounds</h2>
          <p style={{ color:"rgba(255,255,255,0.35)", fontSize:12, margin:0 }}>{bgs.length} custom background{bgs.length !== 1 ? "s" : ""}</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} style={s.btn()}>+ Add New</button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div id="bg-form" style={{ ...s.card, marginBottom:20 }}>
          <h3 style={{ color:"#f0ede8", fontSize:15, fontWeight:700, margin:"0 0 18px" }}>
            {editId ? "Edit Background" : "Add New Background"}
          </h3>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
            <div style={{ marginBottom:14 }}>
              <label style={s.label}>Name *</label>
              <input style={s.input} value={form.name} onChange={e => f("name")(e.target.value)} placeholder="e.g. Forest Rain"/>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={s.label}>Description</label>
              <input style={s.input} value={form.desc} onChange={e => f("desc")(e.target.value)} placeholder="e.g. Rain in the forest"/>
            </div>
          </div>

          <div style={{ marginBottom:14 }}>
            <label style={s.label}>Thumbnail URL *</label>
            <input style={s.input} value={form.thumbnail} onChange={e => f("thumbnail")(e.target.value)} placeholder="/thumbnails/name.png or Cloudinary URL"/>
            <p style={{ fontSize:11, color:"rgba(255,255,255,0.3)", margin:"4px 0 0" }}>Local file in /public/thumbnails/ or Cloudinary URL</p>
          </div>

          <div style={{ marginBottom:14 }}>
            <label style={s.label}>Video URL *</label>
            <input style={s.input} value={form.video} onChange={e => f("video")(e.target.value)} placeholder="https://res.cloudinary.com/.../video.mp4"/>
          </div>

          <div style={{ marginBottom:14 }}>
            <label style={s.label}>Audio URL</label>
            <input style={s.input} value={form.audio} onChange={e => f("audio")(e.target.value)} placeholder="/audio/name.mp3 or Cloudinary URL (optional)"/>
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={{ ...s.label, marginBottom:8 }}>Category</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => f("category")(cat)} style={{
                  padding:"6px 14px", borderRadius:20, fontSize:12, cursor:"pointer",
                  fontFamily:"'DM Sans',sans-serif",
                  background: form.category === cat ? "rgba(240,237,232,0.15)" : "transparent",
                  border: `1px solid ${form.category === cat ? "#f0ede8" : "rgba(255,255,255,0.12)"}`,
                  color: form.category === cat ? "#f0ede8" : "rgba(255,255,255,0.4)",
                }}>{cat}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:20, display:"flex", alignItems:"center", gap:10 }}>
            <div onClick={() => f("isLive")(!form.isLive)} style={{
              width:42, height:24, borderRadius:12, cursor:"pointer", position:"relative",
              background: form.isLive ? "#f0ede8" : "rgba(255,255,255,0.12)", transition:"background 0.2s",
            }}>
              <div style={{
                position:"absolute", top:4, left: form.isLive ? 22 : 4, width:16, height:16,
                borderRadius:"50%", background: form.isLive ? "#0a0f0a" : "rgba(255,255,255,0.5)",
                transition:"left 0.2s",
              }}/>
            </div>
            <span style={{ fontSize:13, color:"rgba(255,255,255,0.6)" }}>Show LIVE badge</span>
          </div>

          {form.thumbnail && (
            <div style={{ marginBottom:16 }}>
              <p style={{ ...s.label, marginBottom:8 }}>Preview</p>
              <img src={form.thumbnail} alt="preview" style={{ width:120, height:80, objectFit:"cover", borderRadius:8, border:"1px solid rgba(255,255,255,0.1)" }} onError={e => e.target.style.display="none"}/>
            </div>
          )}

          <div style={{ display:"flex", gap:10 }}>
            <button onClick={submit} style={{ ...s.btn(), flex:1 }}>
              {editId ? "Save Changes" : "Add Background"}
            </button>
            <button onClick={resetForm} style={s.btn("secondary")}>Cancel</button>
          </div>
        </div>
      )}

      {/* List */}
      {bgs.length === 0 && !showForm ? (
        <div style={{ textAlign:"center", padding:"50px 20px", color:"rgba(255,255,255,0.25)" }}>
          <div style={{ fontSize:36, marginBottom:10 }}>🎬</div>
          <p style={{ margin:0, fontSize:13 }}>No custom backgrounds yet. Add your first one!</p>
        </div>
      ) : (
        <div style={{ display:"grid", gap:10 }}>
          {bgs.map((bg) => (
            <div key={bg.id} style={{ ...s.card, display:"flex", alignItems:"center", gap:14, padding:"12px 16px" }}>
              <div style={{ width:80, height:52, borderRadius:8, overflow:"hidden", flexShrink:0, background:"rgba(255,255,255,0.06)" }}>
                <img src={bg.thumbnail} alt={bg.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e => e.target.style.display="none"}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
                  <span style={{ color:"#f0ede8", fontSize:14, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{bg.name}</span>
                  {bg.isLive && <span style={{ background:"rgba(255,60,60,0.2)", color:"#ff8888", fontSize:10, fontWeight:700, padding:"2px 6px", borderRadius:5 }}>LIVE</span>}
                </div>
                <p style={{ color:"rgba(255,255,255,0.35)", fontSize:12, margin:0 }}>{bg.category}{bg.desc ? ` · ${bg.desc}` : ""}</p>
              </div>
              <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                <button onClick={() => startEdit(bg)} style={{ ...s.btn("secondary"), padding:"7px 14px", fontSize:12 }}>Edit</button>
                {delId === bg.id ? (
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={() => { save(bgs.filter(b => b.id !== bg.id)); setDelId(null); }} style={{ ...s.btn("danger"), padding:"7px 12px", fontSize:12 }}>Delete</button>
                    <button onClick={() => setDelId(null)} style={{ ...s.btn("secondary"), padding:"7px 10px", fontSize:12 }}>✕</button>
                  </div>
                ) : (
                  <button onClick={() => setDelId(bg.id)} style={{ ...s.btn("danger"), padding:"7px 12px", fontSize:12 }}>Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop:20, padding:14, background:"rgba(240,237,232,0.04)", border:"1px solid rgba(240,237,232,0.08)", borderRadius:10 }}>
        <p style={{ color:"rgba(255,255,255,0.35)", fontSize:12, margin:0, lineHeight:1.6 }}>
          <strong style={{ color:"rgba(255,255,255,0.5)" }}>How to use:</strong> After adding backgrounds here, go to the <strong>Export</strong> tab, copy the JSON, and paste it into your <code style={{ background:"rgba(255,255,255,0.08)", padding:"1px 4px", borderRadius:4 }}>useStore.js</code> backgrounds array to make them permanent.
        </p>
      </div>
    </div>
  );
}

// ─── CLOCK DESIGNS TAB ───────────────────────────────────────────────────────
function ClockTab() {
  const defaultDesigns = [
    { key:"normal", label:"Normal Clock", desc:"Default large text clock", enabled:true },
    { key:"flip",   label:"Flip Clock",   desc:"Split-flap flip animation", enabled:true },
  ];
  const [designs, setDesigns] = useState(() => get(KEY_CLOCK, defaultDesigns));

  const toggle = (key) => {
    const updated = designs.map(d => d.key === key ? { ...d, enabled: !d.enabled } : d);
    put(KEY_CLOCK, updated); setDesigns(updated);
  };

  return (
    <div>
      <h2 style={{ color:"#f0ede8", fontSize:18, fontWeight:700, margin:"0 0 4px" }}>Clock Designs</h2>
      <p style={{ color:"rgba(255,255,255,0.35)", fontSize:12, margin:"0 0 20px" }}>Enable or disable clock styles in fullscreen swipe mode</p>

      <div style={{ display:"grid", gap:12 }}>
        {designs.map(d => (
          <div key={d.key} style={{ ...s.card, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <p style={{ color:"#f0ede8", fontSize:14, fontWeight:600, margin:"0 0 3px" }}>{d.label}</p>
              <p style={{ color:"rgba(255,255,255,0.35)", fontSize:12, margin:0 }}>{d.desc}</p>
            </div>
            <div onClick={() => toggle(d.key)} style={{
              width:44, height:24, borderRadius:12, cursor:"pointer", position:"relative",
              background: d.enabled ? "#f0ede8" : "rgba(255,255,255,0.12)", transition:"background 0.2s", flexShrink:0,
            }}>
              <div style={{
                position:"absolute", top:4, left: d.enabled ? 24 : 4, width:16, height:16,
                borderRadius:"50%", background: d.enabled ? "#0a0f0a" : "rgba(255,255,255,0.5)",
                transition:"left 0.2s",
              }}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SETTINGS TAB ────────────────────────────────────────────────────────────
function SettingsTab() {
  const [cfg, setCfg] = useState(() => get(KEY_SETTINGS, { pomodoroMins:25, shortBreakMins:5, greeting:"Stay focused and keep growing." }));
  const [saved, setSaved] = useState(false);
  const f = k => v => setCfg(p => ({ ...p, [k]: v }));

  const save = () => {
    put(KEY_SETTINGS, cfg);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <h2 style={{ color:"#f0ede8", fontSize:18, fontWeight:700, margin:"0 0 4px" }}>App Settings</h2>
      <p style={{ color:"rgba(255,255,255,0.35)", fontSize:12, margin:"0 0 20px" }}>Global configuration stored to localStorage</p>

      <div style={{ ...s.card, marginBottom:14 }}>
        <h3 style={{ color:"rgba(255,255,255,0.5)", fontSize:11, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", margin:"0 0 16px" }}>Timer Durations</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
          <div style={{ marginBottom:14 }}>
            <label style={s.label}>Pomodoro (minutes)</label>
            <input type="number" style={s.input} value={cfg.pomodoroMins} onChange={e => f("pomodoroMins")(parseInt(e.target.value)||25)}/>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={s.label}>Short Break (minutes)</label>
            <input type="number" style={s.input} value={cfg.shortBreakMins} onChange={e => f("shortBreakMins")(parseInt(e.target.value)||5)}/>
          </div>
        </div>
      </div>

      <div style={{ ...s.card, marginBottom:20 }}>
        <h3 style={{ color:"rgba(255,255,255,0.5)", fontSize:11, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", margin:"0 0 16px" }}>UI Text</h3>
        <div style={{ marginBottom:14 }}>
          <label style={s.label}>Navbar Subtitle</label>
          <input style={s.input} value={cfg.greeting} onChange={e => f("greeting")(e.target.value)}/>
        </div>
      </div>

      <button onClick={save} style={{ ...s.btn(), padding:"11px 28px" }}>
        {saved ? "✓ Saved!" : "Save Settings"}
      </button>
    </div>
  );
}

// ─── EXPORT TAB ──────────────────────────────────────────────────────────────
function ExportTab() {
  const [copied, setCopied] = useState(null);

  const copy = (key, label) => {
    const data = localStorage.getItem(key) || "[]";
    navigator.clipboard.writeText(data).then(() => { setCopied(label); setTimeout(() => setCopied(null), 2000); });
  };

  const clear = (key, label) => {
    if (window.confirm(`Clear all ${label} data? This cannot be undone.`)) {
      localStorage.removeItem(key);
      alert(`${label} data cleared.`);
    }
  };

  const items = [
    { key:KEY_BGS,      label:"Custom Backgrounds" },
    { key:KEY_CLOCK,    label:"Clock Design Config" },
    { key:KEY_SETTINGS, label:"App Settings" },
  ];

  return (
    <div>
      <h2 style={{ color:"#f0ede8", fontSize:18, fontWeight:700, margin:"0 0 4px" }}>Export / Manage Data</h2>
      <p style={{ color:"rgba(255,255,255,0.35)", fontSize:12, margin:"0 0 20px" }}>Copy stored data as JSON or clear it</p>

      <div style={{ display:"grid", gap:12, marginBottom:20 }}>
        {items.map(item => {
          const raw = localStorage.getItem(item.key);
          return (
            <div key={item.key} style={{ ...s.card, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <p style={{ color:"#f0ede8", fontSize:14, fontWeight:600, margin:"0 0 3px" }}>{item.label}</p>
                <p style={{ color:"rgba(255,255,255,0.35)", fontSize:12, margin:0 }}>{raw ? "Data stored" : "No data"}</p>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => copy(item.key, item.label)} style={{ ...s.btn(copied === item.label ? "secondary" : "secondary"), padding:"7px 14px", fontSize:12 }}>
                  {copied === item.label ? "✓ Copied!" : "Copy JSON"}
                </button>
                {raw && <button onClick={() => clear(item.key, item.label)} style={{ ...s.btn("danger"), padding:"7px 12px", fontSize:12 }}>Clear</button>}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding:14, background:"rgba(255,200,80,0.06)", border:"1px solid rgba(255,200,80,0.15)", borderRadius:10 }}>
        <p style={{ color:"rgba(255,200,80,0.7)", fontSize:12, margin:0, lineHeight:1.7 }}>
          <strong>Note:</strong> Data is saved to this browser's localStorage. To make it permanent across all devices, copy the JSON and hardcode it into <code style={{ background:"rgba(255,255,255,0.08)", padding:"1px 4px", borderRadius:4 }}>useStore.js</code> or <code style={{ background:"rgba(255,255,255,0.08)", padding:"1px 4px", borderRadius:4 }}>App.jsx</code>.
        </p>
      </div>
    </div>
  );
}

// ─── DASHBOARD SHELL ─────────────────────────────────────────────────────────
const TABS = [
  { id:"backgrounds", label:"🎬 Backgrounds" },
  { id:"clocks",      label:"🕐 Clock Designs" },
  { id:"settings",    label:"⚙️ Settings" },
  { id:"export",      label:"📤 Export" },
];

function Dashboard({ onLogout }) {
  const [tab, setTab] = useState("backgrounds");

  return (
    <div style={{ ...s.page, display:"flex", flexDirection:"column" }}>

      {/* Header */}
      <div style={{
        background:"rgba(10,15,10,0.95)", borderBottom:"1px solid rgba(255,255,255,0.07)",
        padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between",
        position:"sticky", top:0, zIndex:100, flexShrink:0,
      }}>
        <div>
          <h1 style={{ color:"#f0ede8", fontSize:16, fontWeight:700, margin:0 }}>🕐 Live Study Clock</h1>
          <p style={{ color:"rgba(255,255,255,0.3)", fontSize:11, margin:0 }}>Admin Dashboard</p>
        </div>
        <button onClick={onLogout} style={{ ...s.btn("secondary"), padding:"7px 14px", fontSize:12 }}>
          Logout
        </button>
      </div>

      {/* Tab bar */}
      <div style={{
        display:"flex", gap:4, padding:"10px 24px",
        borderBottom:"1px solid rgba(255,255,255,0.06)",
        background:"rgba(10,15,10,0.8)", flexShrink:0,
        overflowX:"auto", WebkitOverflowScrolling:"touch",
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:"8px 16px", borderRadius:8, border:"none", cursor:"pointer",
            background: tab === t.id ? "rgba(240,237,232,0.12)" : "transparent",
            color: tab === t.id ? "#f0ede8" : "rgba(255,255,255,0.4)",
            fontSize:13, fontWeight: tab === t.id ? 600 : 400,
            fontFamily:"'DM Sans',sans-serif", whiteSpace:"nowrap",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:"auto", padding:"24px", WebkitOverflowScrolling:"touch" }}>
        <div style={{ maxWidth:760, margin:"0 auto" }}>
          {tab === "backgrounds" && <BgTab/>}
          {tab === "clocks"      && <ClockTab/>}
          {tab === "settings"    && <SettingsTab/>}
          {tab === "export"      && <ExportTab/>}
        </div>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("lsc_admin") === "1");
  const login  = () => { sessionStorage.setItem("lsc_admin","1"); setAuthed(true); };
  const logout = () => { sessionStorage.removeItem("lsc_admin");   setAuthed(false); };
  return authed ? <Dashboard onLogout={logout}/> : <Login onLogin={login}/>;
}