import { useState, useRef, useCallback, useEffect } from "react";

// ── API CLIENT ────────────────────────────────────────────────────────────────

const API_BASE = "https://getdressedwithwynn.onrender.com";

// Store your API_SECRET in a Vite environment variable.
// Create a file called .env.local in your frontend folder with:
//   VITE_API_SECRET=your-secret-here
const API_SECRET = import.meta.env.VITE_API_SECRET;

// The profile ID for Wynn — set this after creating the profile once in Supabase.
// See README for how to create the first profile.
const PROFILE_ID = import.meta.env.VITE_PROFILE_ID;

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_SECRET}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error ${res.status}`);
  }
  return res.json();
}

const api = {
  getProfile: () => apiFetch(`/api/profile/${PROFILE_ID}`),
  updateProfile: (data) => apiFetch(`/api/profile/${PROFILE_ID}`, { method: "PUT", body: JSON.stringify(data) }),
  getEvents: (month) => apiFetch(`/api/events/${PROFILE_ID}${month ? `?month=${month}` : ""}`),
  getTodayEvents: () => apiFetch(`/api/events/${PROFILE_ID}/today`),
  addEvent: (event) => apiFetch(`/api/events/${PROFILE_ID}`, { method: "POST", body: JSON.stringify(event) }),
  bulkAddEvents: (events) => apiFetch(`/api/events/${PROFILE_ID}/bulk`, { method: "POST", body: JSON.stringify({ events }) }),
  deleteEvent: (eventId) => apiFetch(`/api/events/${PROFILE_ID}/${eventId}`, { method: "DELETE" }),
  getRecommendation: () => apiFetch(`/api/recommendation/${PROFILE_ID}`),
  generateRecommendation: () => apiFetch(`/api/recommendation/${PROFILE_ID}/generate`, { method: "POST" }),
  uploadPdf: (file) => {
    const form = new FormData();
    form.append("file", file);
    return fetch(`${API_BASE}/api/upload/${PROFILE_ID}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${API_SECRET}` },
      body: form,
    }).then((r) => r.json());
  },
};

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const RESPONSIVE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  .app-shell { display: flex; min-height: 100vh; background: #f5f2ed; font-family: 'DM Sans', sans-serif; }
  .sidebar {
    width: 220px; background: #0f0f23; padding: 1.5rem 12px;
    display: flex; flex-direction: column; gap: 4px;
    position: sticky; top: 0; height: 100vh; flex-shrink: 0;
  }
  .main-content { flex: 1; padding: 1.75rem 2rem; overflow-y: auto; min-width: 0; }
  .top-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
  .outfit-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 0.75rem 0; }
  .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
  .cal-cell { min-height: 64px; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .bottom-nav { display: none; }
  @media (max-width: 700px) {
    .app-shell { flex-direction: column; padding-bottom: 64px; }
    .sidebar { display: none; }
    .main-content { padding: 1rem; }
    .top-grid { grid-template-columns: 1fr; }
    .outfit-grid { grid-template-columns: repeat(2, 1fr); }
    .cal-grid { gap: 1px; }
    .cal-cell { min-height: 44px; }
    .two-col { grid-template-columns: 1fr; }
    .bottom-nav {
      display: flex; position: fixed; bottom: 0; left: 0; right: 0;
      background: #0f0f23; border-top: 1px solid rgba(255,255,255,0.08);
      z-index: 100; padding: 0;
    }
    .bottom-nav-item {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 3px; padding: 10px 4px 8px;
      border: none; background: transparent; cursor: pointer;
      font-family: 'DM Sans', sans-serif; font-size: 10px;
      color: rgba(255,255,255,0.45); transition: color 0.15s;
    }
    .bottom-nav-item.active { color: #fff; }
    .bottom-nav-item .nav-icon { font-size: 20px; line-height: 1; }
    .page-title { font-size: 20px !important; }
  }
`;

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const today = new Date();
const todayStr = today.toISOString().split("T")[0];

const EVENT_COLORS = {
  spirit: { bg: "#EAF3DE", text: "#3B6D11", dot: "#639922", label: "Spirit Day" },
  sports: { bg: "#E6F1FB", text: "#0C447C", dot: "#378ADD", label: "Sports" },
  other:  { bg: "#FAEEDA", text: "#854F0B", dot: "#BA7517", label: "Other" },
};

// ── SHARED COMPONENTS ─────────────────────────────────────────────────────────

function Badge({ type, children }) {
  const c = EVENT_COLORS[type] || EVENT_COLORS.other;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 11, padding: "3px 9px", borderRadius: 6, fontWeight: 500,
      background: c.bg, color: c.text,
    }}>{children}</span>
  );
}

function WeatherIcon({ condition }) {
  const map = { "Partly Cloudy": "⛅", "Cloudy": "☁️", "Sunny": "☀️", "Rain": "🌧️", "Storm": "⛈️", "Snow": "❄️" };
  return <span style={{ fontSize: 36 }}>{map[condition] || "🌤️"}</span>;
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #f0ede8",
      borderRadius: 16, padding: "1.25rem", ...style,
    }}>{children}</div>
  );
}

function SectionTitle({ children, style = {} }) {
  return (
    <div style={{
      fontSize: 13, fontWeight: 600, textTransform: "uppercase",
      letterSpacing: "0.07em", color: "#8a8480", marginBottom: 12, ...style,
    }}>{children}</div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%",
      padding: "10px 14px", borderRadius: 8, border: "none", cursor: "pointer",
      background: active ? "#1a1a2e" : "transparent",
      color: active ? "#fff" : "rgba(255,255,255,0.55)",
      fontSize: 14, fontFamily: "'DM Sans', sans-serif",
      fontWeight: active ? 500 : 400, transition: "all 0.15s", textAlign: "left",
    }}>
      <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
      {label}
    </button>
  );
}

function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div style={{
      background: "#fff0f0", border: "1px solid #f5c1c1", color: "#a32d2d",
      borderRadius: 10, padding: "10px 16px", marginBottom: 14,
      fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center",
    }}>
      ⚠️ {message}
      <button onClick={onDismiss} style={{ background: "none", border: "none", cursor: "pointer", color: "#a32d2d", fontSize: 16 }}>✕</button>
    </div>
  );
}

// ── TODAY PAGE ────────────────────────────────────────────────────────────────

function TodayPage({ profile, events, weather, recommendation, onGenerate, loading }) {
  const todayEvents = events.filter((e) => e.date === todayStr);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="top-grid">

        {/* Weather — live from backend */}
        <Card>
          <SectionTitle>☁️ Weather</SectionTitle>
          {weather ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <WeatherIcon condition={weather.condition} />
                <div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: "#1a1a2e", lineHeight: 1 }}>{weather.temp}°</div>
                  <div style={{ fontSize: 12, color: "#8a8480", marginTop: 2 }}>{weather.condition}</div>
                  <div style={{ fontSize: 12, color: "#8a8480" }}>H:{weather.high}° L:{weather.low}°</div>
                  {weather.city && (
                    <div style={{ fontSize: 11, color: "#b0aca8", marginTop: 2 }}>📍 {weather.city}{weather.country ? `, ${weather.country}` : ""}</div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                <Badge type="other">💧 {weather.rain}% rain</Badge>
                <Badge type="other">🌬 {weather.wind} mph</Badge>
              </div>
            </>
          ) : (
            <div style={{ color: "#8a8480", fontSize: 14 }}>Loading weather...</div>
          )}
        </Card>

        {/* School events */}
        <Card>
          <SectionTitle>🏫 School</SectionTitle>
          {todayEvents.filter((e) => e.type === "spirit").length === 0
            ? <div style={{ color: "#8a8480", fontSize: 14 }}>No special events today</div>
            : todayEvents.filter((e) => e.type === "spirit").map((e) => (
              <div key={e.id} style={{ marginBottom: 8 }}>
                <Badge type="spirit">Spirit Day</Badge>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#1a1a2e", marginTop: 4 }}>{e.label}</div>
                <div style={{ fontSize: 12, color: "#8a8480" }}>{e.detail}</div>
              </div>
            ))
          }
        </Card>

        {/* Sports */}
        <Card>
          <SectionTitle>⚽ Sports</SectionTitle>
          {todayEvents.filter((e) => e.type === "sports").length === 0
            ? <div style={{ color: "#8a8480", fontSize: 14 }}>No sports today</div>
            : todayEvents.filter((e) => e.type === "sports").map((e) => (
              <div key={e.id} style={{ marginBottom: 8 }}>
                <Badge type="sports">Game Day</Badge>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#1a1a2e", marginTop: 4 }}>{e.label}</div>
                <div style={{ fontSize: 12, color: "#8a8480" }}>{e.detail}</div>
              </div>
            ))
          }
        </Card>
      </div>

      {/* Recommendation */}
      <Card style={{ border: recommendation ? "1.5px solid #c8e6d0" : "1px solid #f0ede8" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <SectionTitle style={{ marginBottom: 4 }}>✨ Today's recommendation</SectionTitle>
            <div style={{ fontSize: 11, color: "#b0aca8" }}>
              {recommendation
                ? `Generated for ${profile?.name} · ${today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`
                : "Not yet generated"}
            </div>
          </div>
          <button onClick={onGenerate} disabled={loading} style={{
            padding: "8px 16px", borderRadius: 8, border: "none",
            background: loading ? "#e8e5e0" : "#1a1a2e",
            color: loading ? "#8a8480" : "#fff",
            fontSize: 13, fontWeight: 500, cursor: loading ? "default" : "pointer",
            fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 6,
          }}>
            {loading ? "⏳ Generating..." : "🔄 Generate"}
          </button>
        </div>

        {!recommendation && !loading && (
          <div style={{
            background: "#faf9f7", border: "1.5px dashed #e0ddd8",
            borderRadius: 12, padding: "2rem", textAlign: "center", color: "#8a8480", fontSize: 14,
          }}>
            Click "Generate" to create today's outfit recommendation for {profile?.name}
          </div>
        )}

        {loading && (
          <div style={{ background: "#faf9f7", borderRadius: 12, padding: "2rem", textAlign: "center", color: "#8a8480", fontSize: 14 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🧠</div>
            Thinking through weather, school events, and sports...
          </div>
        )}

        {recommendation && !loading && (
          <div>
            <div className="outfit-grid">
              {recommendation.outfit.map((item, i) => (
                <div key={i} style={{
                  background: "#faf9f7", borderRadius: 10, padding: "12px 8px",
                  textAlign: "center", fontSize: 12, color: "#4a4743",
                }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{item.icon}</div>
                  <div style={{ fontWeight: 500 }}>{item.label}</div>
                  {item.note && <div style={{ fontSize: 11, color: "#8a8480", marginTop: 2 }}>{item.note}</div>}
                </div>
              ))}
            </div>
            <div style={{
              background: "#f4faf6", border: "1px solid #c8e6d0",
              borderRadius: 10, padding: "12px 14px", fontSize: 13,
              color: "#2d5a3d", lineHeight: 1.65, marginBottom: 14,
            }}>
              {recommendation.reasoning}
            </div>
            <div style={{
              background: "#f0f4ff", border: "1px solid #c5d3f5",
              borderRadius: 10, padding: "12px 14px",
              display: "flex", alignItems: "flex-start", gap: 12,
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%", background: "#1a5fb4",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, flexShrink: 0,
              }}>🔵</div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#1a5fb4", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                  Alexa will say
                </div>
                <div style={{ fontSize: 13, color: "#1a2e5a", lineHeight: 1.6, fontStyle: "italic" }}>
                  "{recommendation.alexaScript}"
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── CALENDAR PAGE ─────────────────────────────────────────────────────────────

function CalendarPage({ events, onAddEvent, onDeleteEvent }) {
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: "", type: "spirit", label: "", detail: "" });
  const [saving, setSaving] = useState(false);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
  while (cells.length % 7 !== 0) cells.push(null);

  const dateStr = (d) => `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const eventsOn = (d) => events.filter((e) => e.date === dateStr(d));

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); } else setViewMonth((m) => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); } else setViewMonth((m) => m + 1); };

  const handleAdd = async () => {
    if (!form.date || !form.label) return;
    setSaving(true);
    await onAddEvent(form);
    setForm({ date: "", type: "spirit", label: "", detail: "" });
    setShowForm(false);
    setSaving(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={prevMonth} style={{ border: "1px solid #e8e5e0", background: "#fff", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 16 }}>‹</button>
            <div style={{ fontWeight: 700, fontSize: 18, color: "#1a1a2e", minWidth: 160, textAlign: "center" }}>{MONTHS[viewMonth]} {viewYear}</div>
            <button onClick={nextMonth} style={{ border: "1px solid #e8e5e0", background: "#fff", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 16 }}>›</button>
          </div>
          <button onClick={() => setShowForm((f) => !f)} style={{
            padding: "8px 14px", borderRadius: 8, border: "none",
            background: "#1a1a2e", color: "#fff", fontSize: 13, fontWeight: 500,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          }}>+ Add Event</button>
        </div>

        {showForm && (
          <div style={{
            background: "#faf9f7", border: "1px solid #e8e5e0",
            borderRadius: 12, padding: "1rem", marginBottom: 16,
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
          }}>
            {[["Date", "date", "date", ""], ["Type", "type", "select", ""], ["Event name", "label", "text", "e.g. Pajama Day"], ["Details", "detail", "text", "e.g. Wear your PJs"]].map(([label, key, type]) => (
              <div key={key}>
                <label style={{ fontSize: 12, color: "#8a8480", display: "block", marginBottom: 4 }}>{label}</label>
                {type === "select" ? (
                  <select value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e0ddd8", fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: "#fff" }}>
                    <option value="spirit">Spirit Day</option>
                    <option value="sports">Sports</option>
                    <option value="other">Other</option>
                  </select>
                ) : (
                  <input type={type} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e0ddd8", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }} />
                )}
              </div>
            ))}
            <div style={{ gridColumn: "1/-1", display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowForm(false)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e0ddd8", background: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
              <button onClick={handleAdd} disabled={saving} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#1a1a2e", color: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                {saving ? "Saving..." : "Save event"}
              </button>
            </div>
          </div>
        )}

        <div className="cal-grid" style={{ marginBottom: 2 }}>
          {DAYS.map((d) => <div key={d} style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: "#8a8480", padding: "4px 0" }}>{d}</div>)}
        </div>
        <div className="cal-grid">
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const ds = dateStr(d);
            const evs = eventsOn(d);
            const isToday = ds === todayStr;
            return (
              <div key={i} className="cal-cell" style={{
                padding: "4px 6px", borderRadius: 8,
                background: isToday ? "#f0f4ff" : "#faf9f7",
                border: isToday ? "1.5px solid #c5d3f5" : "1px solid transparent",
              }}>
                <div style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, color: isToday ? "#1a5fb4" : "#4a4743", marginBottom: 3 }}>{d}</div>
                {evs.map((e) => (
                  <div key={e.id} style={{
                    fontSize: 10, padding: "2px 5px", borderRadius: 4,
                    background: EVENT_COLORS[e.type]?.bg || "#f0ede8",
                    color: EVENT_COLORS[e.type]?.text || "#4a4743",
                    marginBottom: 2, fontWeight: 500,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }} title={e.detail}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 56 }}>{e.label}</span>
                    <span onClick={() => onDeleteEvent(e.id)} style={{ marginLeft: 2, opacity: 0.5, fontSize: 9, cursor: "pointer" }}>✕</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ── UPLOAD PAGE ───────────────────────────────────────────────────────────────

function UploadPage({ onEventsImported }) {
  const [files, setFiles] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [parsedPreview, setParsedPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef();

  const handleFiles = useCallback((incoming) => {
    setFiles(Array.from(incoming));
    setParsedPreview(null);
    setError(null);
  }, []);

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); };

  const handleParse = async () => {
    if (!files[0]) return;
    setParsing(true);
    setError(null);
    try {
      const result = await api.uploadPdf(files[0]);
      if (result.error) throw new Error(result.error);
      setParsedPreview(result.events);
    } catch (err) {
      setError(err.message);
    }
    setParsing(false);
  };

  const handleImport = async () => {
    if (!parsedPreview) return;
    await onEventsImported(parsedPreview);
    setFiles([]);
    setParsedPreview(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <SectionTitle>📄 Upload school calendar or schedule</SectionTitle>
        <p style={{ fontSize: 13, color: "#8a8480", marginBottom: 16, lineHeight: 1.6 }}>
          Upload a PDF of the school spirit day calendar or sports schedule. The agent will extract events automatically.
        </p>
        {error && <div style={{ background: "#fff0f0", border: "1px solid #f5c1c1", color: "#a32d2d", borderRadius: 8, padding: "10px 12px", fontSize: 13, marginBottom: 12 }}>⚠️ {error}</div>}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current.click()}
          style={{
            border: `2px dashed ${dragOver ? "#378ADD" : "#d4d0cb"}`,
            borderRadius: 12, padding: "2.5rem", textAlign: "center", cursor: "pointer",
            background: dragOver ? "#f0f7ff" : "#faf9f7", transition: "all 0.15s",
          }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📂</div>
          <div style={{ fontWeight: 600, color: "#1a1a2e", fontSize: 14, marginBottom: 4 }}>Drop files here or click to browse</div>
          <div style={{ fontSize: 12, color: "#8a8480" }}>PDF only · Max 10MB</div>
          <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />
        </div>

        {files.length > 0 && (
          <div style={{ marginTop: 14 }}>
            {files.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#faf9f7", borderRadius: 8, marginBottom: 6, fontSize: 13 }}>
                <span style={{ fontSize: 18 }}>📄</span>
                <span style={{ flex: 1, color: "#4a4743" }}>{f.name}</span>
                <span style={{ color: "#8a8480", fontSize: 12 }}>{(f.size / 1024).toFixed(0)} KB</span>
              </div>
            ))}
            <button onClick={handleParse} disabled={parsing} style={{
              marginTop: 10, width: "100%", padding: "10px", borderRadius: 8, border: "none",
              background: parsing ? "#e8e5e0" : "#1a1a2e", color: parsing ? "#8a8480" : "#fff",
              fontSize: 13, fontWeight: 500, cursor: parsing ? "default" : "pointer", fontFamily: "'DM Sans', sans-serif",
            }}>
              {parsing ? "⏳ Parsing with AI..." : "🔍 Extract events with AI"}
            </button>
          </div>
        )}
      </Card>

      {parsedPreview && (
        <Card style={{ border: "1.5px solid #c8e6d0" }}>
          <SectionTitle>✅ Extracted events — review before importing</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {parsedPreview.map((e, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "#faf9f7", borderRadius: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: EVENT_COLORS[e.type]?.dot || "#BA7517" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#1a1a2e" }}>{e.label}</div>
                  <div style={{ fontSize: 12, color: "#8a8480" }}>{e.date} · {e.detail}</div>
                </div>
                <Badge type={e.type}>{EVENT_COLORS[e.type]?.label || "Event"}</Badge>
              </div>
            ))}
          </div>
          <button onClick={handleImport} style={{
            width: "100%", padding: "10px", borderRadius: 8, border: "none",
            background: "#2d8a4e", color: "#fff", fontSize: 13, fontWeight: 500,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          }}>
            ✅ Import {parsedPreview.length} events to calendar
          </button>
        </Card>
      )}
    </div>
  );
}

// ── PROFILE / SETTINGS PAGE ───────────────────────────────────────────────────

function ProfilePage({ profile, onSave }) {
  const [form, setForm] = useState({ ...profile });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm({ ...profile }); }, [profile]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const colorOptions = ["blue", "green", "red", "yellow", "orange", "purple", "black", "white", "gray", "navy", "pink"];

  const toggleColor = (c) => {
    const curr = form.favorite_colors || [];
    set("favorite_colors", curr.includes(c) ? curr.filter((x) => x !== c) : [...curr, c]);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!profile) return <div style={{ color: "#8a8480", fontSize: 14 }}>Loading profile...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <SectionTitle>👤 Child profile</SectionTitle>
        <div className="two-col" style={{ marginBottom: 16 }}>
          {[["Name", "name", "text", "e.g. Wynn"], ["Age", "age", "number", "10"], ["School", "school", "text", "e.g. Raleigh Elementary"], ["City", "city", "text", "e.g. Raleigh"]].map(([label, key, type, placeholder]) => (
            <div key={key}>
              <label style={{ fontSize: 12, color: "#8a8480", display: "block", marginBottom: 4 }}>{label}</label>
              <input type={type} value={form[key] || ""} onChange={(e) => set(key, type === "number" ? Number(e.target.value) : e.target.value)}
                placeholder={placeholder}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e0ddd8", fontSize: 14, fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" }} />
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: "#8a8480", display: "block", marginBottom: 4 }}>Parsing notes</label>
          <textarea
            value={form.parsing_notes || ""}
            onChange={(e) => set("parsing_notes", e.target.value)}
            placeholder={`Help the AI filter uploaded schedules. Examples:\n- Wynn plays for the Red Sox in the 5-6 year old division\n- Only include Red Sox games, ignore all other teams\n- Wynn plays soccer for the Blue Thunder team`}
            rows={5}
            style={{
              width: "100%", padding: "9px 12px", borderRadius: 8,
              border: "1px solid #e0ddd8", fontSize: 13,
              fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box",
              resize: "vertical", lineHeight: 1.6, color: "#4a4743"
            }}
          />
          <div style={{ fontSize: 11, color: "#b0aca8", marginTop: 4 }}>
            These notes are sent to the AI every time you upload a PDF to help it filter and contextualize events correctly.
          </div>
        </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {colorOptions.map((c) => {
              const sel = (form.favorite_colors || []).includes(c);
              return (
                <button key={c} onClick={() => toggleColor(c)} style={{
                  padding: "5px 12px", borderRadius: 20, cursor: "pointer",
                  fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                  border: sel ? "2px solid #1a1a2e" : "1px solid #e0ddd8",
                  background: sel ? "#1a1a2e" : "#faf9f7", color: sel ? "#fff" : "#4a4743",
                }}>{c}</button>
              );
            })}
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle>🔵 Alexa integration</SectionTitle>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#1a1a2e" }}>Alexa morning briefing</div>
            <div style={{ fontSize: 13, color: "#8a8480", marginTop: 2 }}>Read outfit recommendation on Amazon Echo</div>
          </div>
          <button onClick={() => set("alexa_enabled", !form.alexa_enabled)} style={{
            width: 44, height: 24, borderRadius: 12, border: "none",
            background: form.alexa_enabled ? "#2d8a4e" : "#d4d0cb",
            position: "relative", cursor: "pointer", transition: "background 0.2s",
          }}>
            <div style={{
              position: "absolute", top: 2, left: form.alexa_enabled ? 22 : 2,
              width: 20, height: 20, borderRadius: "50%", background: "#fff",
              transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
            }} />
          </button>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#8a8480", display: "block", marginBottom: 4 }}>Morning wake time</label>
          <select value={form.wake_time || "7:00 AM"} onChange={(e) => set("wake_time", e.target.value)} style={{
            padding: "9px 12px", borderRadius: 8, border: "1px solid #e0ddd8",
            fontSize: 14, fontFamily: "'DM Sans', sans-serif", background: "#fff",
          }}>
            {["6:00 AM", "6:30 AM", "7:00 AM", "7:15 AM", "7:30 AM", "8:00 AM"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </Card>

      <button onClick={handleSave} disabled={saving} style={{
        padding: "12px", borderRadius: 10, border: "none",
        background: saved ? "#2d8a4e" : "#1a1a2e", color: "#fff",
        fontSize: 14, fontWeight: 500, cursor: "pointer",
        fontFamily: "'DM Sans', sans-serif", transition: "background 0.3s",
      }}>
        {saving ? "Saving..." : saved ? "✅ Saved!" : "Save profile"}
      </button>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState("today");
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [weather, setWeather] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [appLoading, setAppLoading] = useState(true);
  const [error, setError] = useState(null);
  const [importBanner, setImportBanner] = useState(null);

  // Load everything on mount
  useEffect(() => {
    async function init() {
      setAppLoading(true);
      try {
        const [prof, evts, rec] = await Promise.allSettled([
          api.getProfile(),
          api.getEvents(),
          api.getRecommendation(),
        ]);

        if (prof.status === "fulfilled") setProfile(prof.value);
        if (evts.status === "fulfilled") setEvents(evts.value);
        if (rec.status === "fulfilled") {
          setRecommendation(rec.value.data);
          setWeather(rec.value.weather);
        }
      } catch (err) {
        setError("Could not connect to the backend. Check your API secret and Render deployment.");
      }
      setAppLoading(false);
    }
    init();
  }, []);

  const generateRecommendation = async () => {
    setLoading(true);
    setRecommendation(null);
    try {
      const result = await api.generateRecommendation();
      setRecommendation(result.recommendation);
      setWeather(result.weather);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const addEvent = async (event) => {
    try {
      const saved = await api.addEvent(event);
      setEvents((e) => [...e, saved]);
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteEvent = async (id) => {
    try {
      await api.deleteEvent(id);
      setEvents((e) => e.filter((x) => x.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const importEvents = async (newEvents) => {
    try {
      const result = await api.bulkAddEvents(newEvents);
      setEvents((e) => [...e, ...result.events]);
      setImportBanner(`${result.imported} events imported!`);
      setTimeout(() => setImportBanner(null), 3000);
      setPage("calendar");
    } catch (err) {
      setError(err.message);
    }
  };

  const saveProfile = async (data) => {
    try {
      const updated = await api.updateProfile(data);
      setProfile(updated);
    } catch (err) {
      setError(err.message);
    }
  };

  const NAV = [
    { id: "today", icon: "☀️", label: "Today" },
    { id: "calendar", icon: "📅", label: "Calendar" },
    { id: "upload", icon: "📤", label: "Upload" },
    { id: "profile", icon: "⚙️", label: "Settings" },
  ];

  const todayEventCount = events.filter((e) => e.date === todayStr).length;

  if (appLoading) {
    return (
      <>
        <style>{RESPONSIVE_CSS}</style>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f5f2ed", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 40 }}>👕</div>
          <div style={{ fontSize: 16, color: "#8a8480", fontFamily: "'DM Sans', sans-serif" }}>Loading Get Dressed With Wynn...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{RESPONSIVE_CSS}</style>
      <div className="app-shell">

        {/* Sidebar — desktop only */}
        <div className="sidebar">
          <div style={{ padding: "0 4px 1.5rem" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>👕 Get Dressed</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.4)", lineHeight: 1.2 }}>With Wynn</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              {profile?.name}'s dashboard
            </div>
          </div>

          {NAV.map((n) => <NavItem key={n.id} icon={n.icon} label={n.label} active={page === n.id} onClick={() => setPage(n.id)} />)}

          <div style={{ flex: 1 }} />

          <div style={{ padding: "12px", background: "rgba(255,255,255,0.06)", borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Today</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>
              {today.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
              {weather ? `${weather.temp}°` : "--°"} · {todayEventCount} event{todayEventCount !== 1 ? "s" : ""}
            </div>
            {profile?.alexa_enabled && (
              <div style={{ marginTop: 8, fontSize: 11, color: "rgba(100,180,255,0.9)", background: "rgba(100,180,255,0.1)", borderRadius: 6, padding: "4px 8px", display: "inline-block" }}>
                🔵 Alexa on · {profile.wake_time}
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="main-content">
          <ErrorBanner message={error} onDismiss={() => setError(null)} />

          {importBanner && (
            <div style={{ background: "#2d8a4e", color: "#fff", borderRadius: 10, padding: "10px 16px", marginBottom: 14, fontSize: 13, fontWeight: 500 }}>
              ✅ {importBanner}
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <h1 className="page-title" style={{ fontSize: 24, fontWeight: 700, color: "#1a1a2e", marginBottom: 2 }}>
              {page === "today" && `Good morning, ${profile?.name || "Wynn"}! ☀️`}
              {page === "calendar" && "Event calendar 📅"}
              {page === "upload" && "Upload schedule 📤"}
              {page === "profile" && "Settings ⚙️"}
            </h1>
            <div style={{ fontSize: 13, color: "#8a8480" }}>
              {today.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </div>
          </div>

          {page === "today" && <TodayPage profile={profile} events={events} weather={weather} recommendation={recommendation} onGenerate={generateRecommendation} loading={loading} />}
          {page === "calendar" && <CalendarPage events={events} onAddEvent={addEvent} onDeleteEvent={deleteEvent} />}
          {page === "upload" && <UploadPage onEventsImported={importEvents} />}
          {page === "profile" && <ProfilePage profile={profile} onSave={saveProfile} />}
        </div>

        {/* Bottom nav — mobile only */}
        <nav className="bottom-nav">
          {NAV.map((n) => (
            <button key={n.id} className={`bottom-nav-item${page === n.id ? " active" : ""}`} onClick={() => setPage(n.id)}>
              <span className="nav-icon">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}
