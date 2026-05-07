import { useState, useRef, useCallback, useEffect } from "react";

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

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 700);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 700);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const today = new Date();

const INITIAL_PROFILE = {
  name: "Wynn",
  age: 6,
  school: "Lacy Elementary",
  favoriteColors: ["blue","green"],
  alexaEnabled: true,
  wakeTime: "7:00 AM",
  city: "Raleigh, NC"
};

const INITIAL_EVENTS = [
  { id: 1, date: "2026-05-07", type: "spirit", label: "Blue & Gold Friday", detail: "Wear school colors" },
  { id: 2, date: "2026-05-07", type: "sports", label: "Soccer Game", detail: "4:00 PM · Home · Wear uniform" },
  { id: 3, date: "2026-05-11", type: "spirit", label: "Pajama Day", detail: "Wear your favorite PJs" },
  { id: 4, date: "2026-05-13", type: "sports", label: "Soccer Practice", detail: "5:00 PM · Cleats required" },
  { id: 5, date: "2026-05-14", type: "spirit", label: "Dress-Up Day", detail: "Wear your Sunday best" },
  { id: 6, date: "2026-05-15", type: "spirit", label: "Crazy Hat Day", detail: "Wear your wackiest hat" },
  { id: 7, date: "2026-05-20", type: "sports", label: "Baseball Game", detail: "3:30 PM · Away game" },
];

const WEATHER_MOCK = { temp: 62, high: 68, low: 51, condition: "Partly Cloudy", rain: 20, wind: 12 };

const EVENT_COLORS = {
  spirit: { bg: "#EAF3DE", text: "#3B6D11", dot: "#639922", label: "Spirit Day" },
  sports: { bg: "#E6F1FB", text: "#0C447C", dot: "#378ADD", label: "Sports" },
  other:  { bg: "#FAEEDA", text: "#854F0B", dot: "#BA7517", label: "Other" },
};

function Badge({ type, children }) {
  const c = EVENT_COLORS[type] || EVENT_COLORS.other;
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:4,
      fontSize:11, padding:"3px 9px", borderRadius:6, fontWeight:500,
      background: c.bg, color: c.text
    }}>{children}</span>
  );
}

function WeatherIcon({ condition }) {
  const map = {
    "Partly Cloudy": "⛅", "Cloudy": "☁️", "Sunny": "☀️", "Rain": "🌧️", "Storm": "⛈️", "Snow": "❄️"
  };
  return <span style={{fontSize:36}}>{map[condition] || "🌤️"}</span>;
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display:"flex", alignItems:"center", gap:10, width:"100%",
      padding:"10px 14px", borderRadius:8, border:"none", cursor:"pointer",
      background: active ? "#1a1a2e" : "transparent",
      color: active ? "#fff" : "rgba(255,255,255,0.55)",
      fontSize:14, fontFamily:"'DM Sans', sans-serif", fontWeight: active ? 500 : 400,
      transition:"all 0.15s", textAlign:"left"
    }}>
      <span style={{fontSize:18, lineHeight:1}}>{icon}</span>
      {label}
    </button>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background:"#fff", border:"1px solid #f0ede8",
      borderRadius:16, padding:"1.25rem",
      ...style
    }}>{children}</div>
  );
}

function SectionTitle({ children, style={} }) {
  return (
    <div style={{
      fontSize:13, fontWeight:600, textTransform:"uppercase",
      letterSpacing:"0.07em", color:"#8a8480", marginBottom:12,
      ...style
    }}>{children}</div>
  );
}

// ── PAGES ────────────────────────────────────────────────────────────────────

function TodayPage({ profile, events, recommendation, onGenerate, loading }) {
  const todayStr = today.toISOString().split("T")[0];
  const todayEvents = events.filter(e => e.date === todayStr);

  return (
    <div style={{display:"flex", flexDirection:"column", gap:16}}>

      {/* Top row */}
      <div className="top-grid">

        {/* Weather */}
        <Card>
          <SectionTitle>☁️ Weather</SectionTitle>
          <div style={{display:"flex", alignItems:"center", gap:12}}>
            <WeatherIcon condition={WEATHER_MOCK.condition} />
            <div>
              <div style={{fontSize:32, fontWeight:700, color:"#1a1a2e", lineHeight:1}}>{WEATHER_MOCK.temp}°</div>
              <div style={{fontSize:12, color:"#8a8480", marginTop:2}}>{WEATHER_MOCK.condition}</div>
              <div style={{fontSize:12, color:"#8a8480"}}>H:{WEATHER_MOCK.high}° L:{WEATHER_MOCK.low}°</div>
            </div>
          </div>
          <div style={{display:"flex", gap:6, marginTop:10, flexWrap:"wrap"}}>
            <Badge type="other">💧 {WEATHER_MOCK.rain}% rain</Badge>
            <Badge type="other">🌬 {WEATHER_MOCK.wind} mph</Badge>
          </div>
        </Card>

        {/* School events */}
        <Card>
          <SectionTitle>🏫 School</SectionTitle>
          {todayEvents.filter(e=>e.type==="spirit").length === 0
            ? <div style={{color:"#8a8480", fontSize:14}}>No special events today</div>
            : todayEvents.filter(e=>e.type==="spirit").map(e => (
              <div key={e.id} style={{marginBottom:8}}>
                <Badge type="spirit">Spirit Day</Badge>
                <div style={{fontWeight:600, fontSize:14, color:"#1a1a2e", marginTop:4}}>{e.label}</div>
                <div style={{fontSize:12, color:"#8a8480"}}>{e.detail}</div>
              </div>
            ))
          }
        </Card>

        {/* Sports */}
        <Card>
          <SectionTitle>⚽ Sports</SectionTitle>
          {todayEvents.filter(e=>e.type==="sports").length === 0
            ? <div style={{color:"#8a8480", fontSize:14}}>No sports today</div>
            : todayEvents.filter(e=>e.type==="sports").map(e => (
              <div key={e.id} style={{marginBottom:8}}>
                <Badge type="sports">Game Day</Badge>
                <div style={{fontWeight:600, fontSize:14, color:"#1a1a2e", marginTop:4}}>{e.label}</div>
                <div style={{fontSize:12, color:"#8a8480"}}>{e.detail}</div>
              </div>
            ))
          }
        </Card>
      </div>

      {/* Recommendation */}
      <Card style={{border: recommendation ? "1.5px solid #c8e6d0" : "1px solid #f0ede8"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16}}>
          <div>
            <SectionTitle style={{marginBottom:4}}>✨ Today's recommendation</SectionTitle>
            <div style={{fontSize:11, color:"#b0aca8"}}>
              {recommendation ? `Generated for ${profile.name} · ${today.toLocaleDateString("en-US",{weekday:"long", month:"long", day:"numeric"})}` : "Not yet generated"}
            </div>
          </div>
          <button onClick={onGenerate} disabled={loading} style={{
            padding:"8px 16px", borderRadius:8, border:"none",
            background: loading ? "#e8e5e0" : "#1a1a2e",
            color: loading ? "#8a8480" : "#fff",
            fontSize:13, fontWeight:500, cursor: loading ? "default" : "pointer",
            fontFamily:"'DM Sans', sans-serif", display:"flex", alignItems:"center", gap:6
          }}>
            {loading ? "⏳ Generating..." : "🔄 Generate"}
          </button>
        </div>

        {!recommendation && !loading && (
          <div style={{
            background:"#faf9f7", border:"1.5px dashed #e0ddd8",
            borderRadius:12, padding:"2rem", textAlign:"center", color:"#8a8480", fontSize:14
          }}>
            Click "Generate" to create today's outfit recommendation for {profile.name}
          </div>
        )}

        {loading && (
          <div style={{
            background:"#faf9f7", borderRadius:12, padding:"2rem",
            textAlign:"center", color:"#8a8480", fontSize:14
          }}>
            <div style={{fontSize:28, marginBottom:8}}>🧠</div>
            Thinking through weather, school events, and sports...
          </div>
        )}

        {recommendation && !loading && (
          <div>
            <div className="outfit-grid">
              {recommendation.outfit.map((item, i) => (
                <div key={i} style={{
                  background:"#faf9f7", borderRadius:10, padding:"12px 8px",
                  textAlign:"center", fontSize:12, color:"#4a4743"
                }}>
                  <div style={{fontSize:24, marginBottom:4}}>{item.icon}</div>
                  {item.label}
                </div>
              ))}
            </div>
            <div style={{
              background:"#f4faf6", border:"1px solid #c8e6d0",
              borderRadius:10, padding:"12px 14px", fontSize:13,
              color:"#2d5a3d", lineHeight:1.65, marginBottom:14
            }}>
              {recommendation.reasoning}
            </div>
            <div style={{
              background:"#f0f4ff", border:"1px solid #c5d3f5",
              borderRadius:10, padding:"12px 14px", display:"flex",
              alignItems:"flex-start", gap:12
            }}>
              <div style={{
                width:34, height:34, borderRadius:"50%",
                background:"#1a5fb4", display:"flex",
                alignItems:"center", justifyContent:"center",
                fontSize:18, flexShrink:0
              }}>🔵</div>
              <div>
                <div style={{fontSize:11, fontWeight:600, color:"#1a5fb4",
                  textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4}}>
                  Alexa will say
                </div>
                <div style={{fontSize:13, color:"#1a2e5a", lineHeight:1.6, fontStyle:"italic"}}>
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

function CalendarPage({ events, onAddEvent, onDeleteEvent }) {
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date:"", type:"spirit", label:"", detail:"" });

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
  const cells = Array(firstDay).fill(null).concat(Array.from({length:daysInMonth},(_,i)=>i+1));
  while(cells.length % 7 !== 0) cells.push(null);

  const dateStr = (d) => `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const eventsOn = (d) => events.filter(e => e.date === dateStr(d));
  const todayStr = today.toISOString().split("T")[0];

  const prevMonth = () => { if(viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1); };
  const nextMonth = () => { if(viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1); };

  const handleAdd = () => {
    if(!form.date||!form.label) return;
    onAddEvent({ ...form, id: Date.now() });
    setForm({ date:"", type:"spirit", label:"", detail:"" });
    setShowForm(false);
  };

  return (
    <div style={{display:"flex", flexDirection:"column", gap:16}}>
      <Card>
        {/* Header */}
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16}}>
          <div style={{display:"flex", alignItems:"center", gap:10}}>
            <button onClick={prevMonth} style={{border:"1px solid #e8e5e0", background:"#fff", borderRadius:8, padding:"4px 10px", cursor:"pointer", fontSize:16}}>‹</button>
            <div style={{fontWeight:700, fontSize:18, color:"#1a1a2e", minWidth:160, textAlign:"center"}}>{MONTHS[viewMonth]} {viewYear}</div>
            <button onClick={nextMonth} style={{border:"1px solid #e8e5e0", background:"#fff", borderRadius:8, padding:"4px 10px", cursor:"pointer", fontSize:16}}>›</button>
          </div>
          <button onClick={()=>setShowForm(f=>!f)} style={{
            padding:"8px 14px", borderRadius:8, border:"none",
            background:"#1a1a2e", color:"#fff", fontSize:13, fontWeight:500,
            cursor:"pointer", fontFamily:"'DM Sans', sans-serif"
          }}>+ Add Event</button>
        </div>

        {/* Add form */}
        {showForm && (
          <div style={{
            background:"#faf9f7", border:"1px solid #e8e5e0",
            borderRadius:12, padding:"1rem", marginBottom:16,
            display:"grid", gridTemplateColumns:"1fr 1fr", gap:10
          }}>
            <div>
              <label style={{fontSize:12, color:"#8a8480", display:"block", marginBottom:4}}>Date</label>
              <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}
                style={{width:"100%", padding:"8px 10px", borderRadius:8, border:"1px solid #e0ddd8", fontSize:13, fontFamily:"'DM Sans', sans-serif"}} />
            </div>
            <div>
              <label style={{fontSize:12, color:"#8a8480", display:"block", marginBottom:4}}>Type</label>
              <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}
                style={{width:"100%", padding:"8px 10px", borderRadius:8, border:"1px solid #e0ddd8", fontSize:13, fontFamily:"'DM Sans', sans-serif", background:"#fff"}}>
                <option value="spirit">Spirit Day</option>
                <option value="sports">Sports</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label style={{fontSize:12, color:"#8a8480", display:"block", marginBottom:4}}>Event name</label>
              <input value={form.label} onChange={e=>setForm(f=>({...f,label:e.target.value}))}
                placeholder="e.g. Pajama Day"
                style={{width:"100%", padding:"8px 10px", borderRadius:8, border:"1px solid #e0ddd8", fontSize:13, fontFamily:"'DM Sans', sans-serif"}} />
            </div>
            <div>
              <label style={{fontSize:12, color:"#8a8480", display:"block", marginBottom:4}}>Details</label>
              <input value={form.detail} onChange={e=>setForm(f=>({...f,detail:e.target.value}))}
                placeholder="e.g. Wear your PJs"
                style={{width:"100%", padding:"8px 10px", borderRadius:8, border:"1px solid #e0ddd8", fontSize:13, fontFamily:"'DM Sans', sans-serif"}} />
            </div>
            <div style={{gridColumn:"1/-1", display:"flex", gap:8, justifyContent:"flex-end"}}>
              <button onClick={()=>setShowForm(false)} style={{padding:"8px 14px", borderRadius:8, border:"1px solid #e0ddd8", background:"#fff", fontSize:13, cursor:"pointer", fontFamily:"'DM Sans', sans-serif"}}>Cancel</button>
              <button onClick={handleAdd} style={{padding:"8px 14px", borderRadius:8, border:"none", background:"#1a1a2e", color:"#fff", fontSize:13, cursor:"pointer", fontFamily:"'DM Sans', sans-serif"}}>Save event</button>
            </div>
          </div>
        )}

        {/* Day headers */}
        <div className="cal-grid" style={{marginBottom:2}}>
          {DAYS.map(d=><div key={d} style={{textAlign:"center", fontSize:12, fontWeight:600, color:"#8a8480", padding:"4px 0"}}>{d}</div>)}
        </div>

        {/* Cells */}
        <div className="cal-grid">
          {cells.map((d,i) => {
            if(!d) return <div key={i} />;
            const ds = dateStr(d);
            const evs = eventsOn(d);
            const isToday = ds === todayStr;
            return (
              <div key={i} className="cal-cell" style={{
                padding:"4px 6px", borderRadius:8,
                background: isToday ? "#f0f4ff" : "#faf9f7",
                border: isToday ? "1.5px solid #c5d3f5" : "1px solid transparent",
              }}>
                <div style={{fontSize:12, fontWeight: isToday ? 700 : 400, color: isToday ? "#1a5fb4" : "#4a4743", marginBottom:3}}>
                  {d}
                </div>
                {evs.map(e=>(
                  <div key={e.id} style={{
                    fontSize:10, padding:"2px 5px", borderRadius:4,
                    background: EVENT_COLORS[e.type]?.bg || "#f0ede8",
                    color: EVENT_COLORS[e.type]?.text || "#4a4743",
                    marginBottom:2, fontWeight:500,
                    cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center"
                  }}
                    title={e.detail}
                  >
                    <span style={{overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:56}}>{e.label}</span>
                    <span onClick={()=>onDeleteEvent(e.id)} style={{marginLeft:2, opacity:0.5, fontSize:9}}>✕</span>
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

function UploadPage({ events, onEventsImported }) {
  const [files, setFiles] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [parsedPreview, setParsedPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const handleFiles = useCallback((incoming) => {
    const arr = Array.from(incoming);
    setFiles(arr);
    setParsedPreview(null);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const simulateParse = () => {
    setParsing(true);
    setParsedPreview(null);
    setTimeout(()=>{
      setParsedPreview([
        { date:"2026-05-21", type:"spirit", label:"Twin Day", detail:"Dress like your BFF" },
        { date:"2026-05-22", type:"spirit", label:"Retro Day", detail:"70s/80s themed attire" },
        { date:"2026-05-28", type:"sports", label:"Track Meet", detail:"9:00 AM · Wear athletic gear" },
      ]);
      setParsing(false);
    }, 2000);
  };

  const handleImport = () => {
    if(parsedPreview) onEventsImported(parsedPreview);
    setFiles([]);
    setParsedPreview(null);
  };

  return (
    <div style={{display:"flex", flexDirection:"column", gap:16}}>
      <Card>
        <SectionTitle>📄 Upload school calendar or schedule</SectionTitle>
        <p style={{fontSize:13, color:"#8a8480", marginBottom:16, lineHeight:1.6}}>
          Upload a PDF or image of the school spirit day calendar or sports schedule. The agent will extract the dates and events automatically.
        </p>

        <div
          onDragOver={e=>{e.preventDefault();setDragOver(true);}}
          onDragLeave={()=>setDragOver(false)}
          onDrop={handleDrop}
          onClick={()=>fileRef.current.click()}
          style={{
            border:`2px dashed ${dragOver?"#378ADD":"#d4d0cb"}`,
            borderRadius:12, padding:"2.5rem",
            textAlign:"center", cursor:"pointer",
            background: dragOver ? "#f0f7ff" : "#faf9f7",
            transition:"all 0.15s"
          }}>
          <div style={{fontSize:40, marginBottom:8}}>📂</div>
          <div style={{fontWeight:600, color:"#1a1a2e", fontSize:14, marginBottom:4}}>
            Drop files here or click to browse
          </div>
          <div style={{fontSize:12, color:"#8a8480"}}>PDF, JPG, PNG · Max 10MB</div>
          <input ref={fileRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png"
            style={{display:"none"}} onChange={e=>handleFiles(e.target.files)} />
        </div>

        {files.length > 0 && (
          <div style={{marginTop:14}}>
            {files.map((f,i)=>(
              <div key={i} style={{
                display:"flex", alignItems:"center", gap:10,
                padding:"8px 12px", background:"#faf9f7",
                borderRadius:8, marginBottom:6, fontSize:13
              }}>
                <span style={{fontSize:18}}>📄</span>
                <span style={{flex:1, color:"#4a4743"}}>{f.name}</span>
                <span style={{color:"#8a8480", fontSize:12}}>{(f.size/1024).toFixed(0)} KB</span>
              </div>
            ))}
            <button onClick={simulateParse} disabled={parsing} style={{
              marginTop:10, width:"100%", padding:"10px",
              borderRadius:8, border:"none",
              background: parsing ? "#e8e5e0" : "#1a1a2e",
              color: parsing ? "#8a8480" : "#fff",
              fontSize:13, fontWeight:500, cursor: parsing ? "default" : "pointer",
              fontFamily:"'DM Sans', sans-serif"
            }}>
              {parsing ? "⏳ Parsing with AI..." : "🔍 Extract events with AI"}
            </button>
          </div>
        )}
      </Card>

      {parsedPreview && (
        <Card style={{border:"1.5px solid #c8e6d0"}}>
          <SectionTitle>✅ Extracted events — review before importing</SectionTitle>
          <div style={{display:"flex", flexDirection:"column", gap:8, marginBottom:14}}>
            {parsedPreview.map((e,i)=>(
              <div key={i} style={{
                display:"flex", alignItems:"center", gap:12,
                padding:"10px 12px", background:"#faf9f7", borderRadius:10
              }}>
                <div style={{
                  width:8, height:8, borderRadius:"50%", flexShrink:0,
                  background: EVENT_COLORS[e.type]?.dot || "#BA7517"
                }} />
                <div style={{flex:1}}>
                  <div style={{fontWeight:600, fontSize:13, color:"#1a1a2e"}}>{e.label}</div>
                  <div style={{fontSize:12, color:"#8a8480"}}>{e.date} · {e.detail}</div>
                </div>
                <Badge type={e.type}>{EVENT_COLORS[e.type]?.label || "Event"}</Badge>
              </div>
            ))}
          </div>
          <button onClick={handleImport} style={{
            width:"100%", padding:"10px",
            borderRadius:8, border:"none",
            background:"#2d8a4e", color:"#fff",
            fontSize:13, fontWeight:500, cursor:"pointer",
            fontFamily:"'DM Sans', sans-serif"
          }}>
            ✅ Import {parsedPreview.length} events to calendar
          </button>
        </Card>
      )}
    </div>
  );
}

function ProfilePage({ profile, onSave }) {
  const [form, setForm] = useState({...profile});
  const [saved, setSaved] = useState(false);

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSave = () => {
    onSave(form);
    setSaved(true);
    setTimeout(()=>setSaved(false), 2000);
  };

  const colorOptions = ["blue","green","red","yellow","orange","purple","black","white","gray","navy","pink"];

  const toggleColor = (c) => {
    set("favoriteColors", form.favoriteColors.includes(c)
      ? form.favoriteColors.filter(x=>x!==c)
      : [...form.favoriteColors, c]);
  };

  return (
    <div style={{display:"flex", flexDirection:"column", gap:16}}>
      <Card>
        <SectionTitle>👤 Child profile</SectionTitle>
        <div className="two-col" style={{marginBottom:16}}>
          {[
            ["Name", "name", "text", "e.g. Liam"],
            ["Age", "age", "number", "10"],
            ["School", "school", "text", "e.g. Raleigh Elementary"],
            ["City", "city", "text", "e.g. Raleigh, NC"],
          ].map(([label,key,type,placeholder])=>(
            <div key={key}>
              <label style={{fontSize:12, color:"#8a8480", display:"block", marginBottom:4}}>{label}</label>
              <input type={type} value={form[key]} onChange={e=>set(key, type==="number"?Number(e.target.value):e.target.value)}
                placeholder={placeholder}
                style={{width:"100%", padding:"9px 12px", borderRadius:8, border:"1px solid #e0ddd8",
                  fontSize:14, fontFamily:"'DM Sans', sans-serif", boxSizing:"border-box"}} />
            </div>
          ))}
        </div>

        <div style={{marginBottom:16}}>
          <label style={{fontSize:12, color:"#8a8480", display:"block", marginBottom:8}}>Favorite colors (used in recommendations)</label>
          <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
            {colorOptions.map(c=>{
              const sel = form.favoriteColors.includes(c);
              return (
                <button key={c} onClick={()=>toggleColor(c)} style={{
                  padding:"5px 12px", borderRadius:20, cursor:"pointer",
                  fontSize:12, fontFamily:"'DM Sans', sans-serif", fontWeight:500,
                  border: sel ? "2px solid #1a1a2e" : "1px solid #e0ddd8",
                  background: sel ? "#1a1a2e" : "#faf9f7",
                  color: sel ? "#fff" : "#4a4743"
                }}>{c}</button>
              );
            })}
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle>🔵 Alexa integration</SectionTitle>
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16}}>
          <div>
            <div style={{fontWeight:600, fontSize:14, color:"#1a1a2e"}}>Alexa morning briefing</div>
            <div style={{fontSize:13, color:"#8a8480", marginTop:2}}>Read outfit recommendation on Amazon Echo</div>
          </div>
          <button onClick={()=>set("alexaEnabled",!form.alexaEnabled)} style={{
            width:44, height:24, borderRadius:12, border:"none",
            background: form.alexaEnabled ? "#2d8a4e" : "#d4d0cb",
            position:"relative", cursor:"pointer", transition:"background 0.2s"
          }}>
            <div style={{
              position:"absolute", top:2, left: form.alexaEnabled ? 22 : 2,
              width:20, height:20, borderRadius:"50%",
              background:"#fff", transition:"left 0.2s",
              boxShadow:"0 1px 3px rgba(0,0,0,0.15)"
            }} />
          </button>
        </div>

        <div>
          <label style={{fontSize:12, color:"#8a8480", display:"block", marginBottom:4}}>Morning wake time</label>
          <select value={form.wakeTime} onChange={e=>set("wakeTime",e.target.value)} style={{
            padding:"9px 12px", borderRadius:8, border:"1px solid #e0ddd8",
            fontSize:14, fontFamily:"'DM Sans', sans-serif", background:"#fff"
          }}>
            {["6:00 AM","6:30 AM","7:00 AM","7:15 AM","7:30 AM","8:00 AM"].map(t=>(
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <div style={{fontSize:12, color:"#8a8480", marginTop:6}}>
            The agent generates and queues the recommendation before this time each morning.
          </div>
        </div>
      </Card>

      <button onClick={handleSave} style={{
        padding:"12px", borderRadius:10, border:"none",
        background: saved ? "#2d8a4e" : "#1a1a2e",
        color:"#fff", fontSize:14, fontWeight:500,
        cursor:"pointer", fontFamily:"'DM Sans', sans-serif",
        transition:"background 0.3s"
      }}>
        {saved ? "✅ Saved!" : "Save profile"}
      </button>
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState("today");
  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importBanner, setImportBanner] = useState(null);

  const todayStr = today.toISOString().split("T")[0];
  const todayEvents = events.filter(e => e.date === todayStr);

  const generateRecommendation = async () => {
    setLoading(true);
    setRecommendation(null);

    const spiritEvents = todayEvents.filter(e=>e.type==="spirit");
    const sportsEvents = todayEvents.filter(e=>e.type==="sports");

    const prompt = `You are a helpful morning outfit assistant for a ${profile.age}-year-old child named ${profile.name} who goes to ${profile.school}.

Today's context:
- Weather: ${WEATHER_MOCK.temp}°F, ${WEATHER_MOCK.condition}, High ${WEATHER_MOCK.high}°F Low ${WEATHER_MOCK.low}°F, ${WEATHER_MOCK.rain}% chance of rain, ${WEATHER_MOCK.wind} mph wind
- School spirit events today: ${spiritEvents.length>0 ? spiritEvents.map(e=>`${e.label} (${e.detail})`).join(", ") : "None"}
- Sports today: ${sportsEvents.length>0 ? sportsEvents.map(e=>`${e.label} - ${e.detail}`).join(", ") : "None"}
- ${profile.name}'s favorite colors: ${profile.favoriteColors.join(", ")}

Respond ONLY with a JSON object (no markdown, no backticks) with this exact structure:
{
  "outfit": [
    {"icon": "emoji", "label": "short item name"},
    {"icon": "emoji", "label": "short item name"},
    {"icon": "emoji", "label": "short item name"},
    {"icon": "emoji", "label": "short item name"}
  ],
  "reasoning": "2-3 sentence explanation of why these items, connecting weather, events, and sports",
  "alexaScript": "A friendly, conversational 2-3 sentence Alexa briefing for a child. Mention the weather, any special school event, and sports if applicable."
}`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1000,
          messages:[{role:"user", content:prompt}]
        })
      });
      const data = await res.json();
      const text = data.content?.find(b=>b.type==="text")?.text || "";
      const clean = text.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean);
      setRecommendation(parsed);
    } catch(e) {
      setRecommendation({
        outfit:[
          {icon:"👕", label:"Blue school spirit tee"},
          {icon:"🩳", label:"Athletic shorts"},
          {icon:"👟", label:"Sneakers"},
          {icon:"🧥", label:"Light jacket"}
        ],
        reasoning:`It's Blue & Gold Friday so ${profile.name} should wear school colors. At 62°F it's mild but cool in the morning, so a light jacket for the walk in is smart. Soccer is at 4 PM — athletic shorts make it easy to change into the uniform.`,
        alexaScript:`Good morning ${profile.name}! Today is Blue and Gold Spirit Day, so put on something blue or gold. It'll be around 62 degrees this morning — grab a light jacket. You've got soccer at 4, so wear athletic shorts so you can change into your uniform easily. Have a great day!`
      });
    }
    setLoading(false);
  };

  const addEvent = (event) => setEvents(e=>[...e, event]);
  const deleteEvent = (id) => setEvents(e=>e.filter(x=>x.id!==id));
  const importEvents = (newEvents) => {
    setEvents(e=>[...e, ...newEvents.map(ev=>({...ev, id:Date.now()+Math.random()}))]);
    setImportBanner(`${newEvents.length} events imported!`);
    setTimeout(()=>setImportBanner(null), 3000);
    setPage("calendar");
  };

  const NAV = [
    { id:"today", icon:"☀️", label:"Today" },
    { id:"calendar", icon:"📅", label:"Calendar" },
    { id:"upload", icon:"📤", label:"Upload" },
    { id:"profile", icon:"⚙️", label:"Settings" },
  ];

  const todayEventCount = events.filter(e=>e.date===todayStr).length;

  return (
    <>
      <style>{RESPONSIVE_CSS}</style>
      <div className="app-shell">

        {/* Sidebar — desktop only */}
        <div className="sidebar">
          <div style={{padding:"0 4px 1.5rem"}}>
            <div style={{fontSize:18, fontWeight:700, color:"#fff", lineHeight:1.2}}>👕 Morning</div>
            <div style={{fontSize:18, fontWeight:700, color:"rgba(255,255,255,0.4)", lineHeight:1.2}}>Outfit</div>
            <div style={{fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:6, letterSpacing:"0.05em", textTransform:"uppercase"}}>
              {profile.name}'s dashboard
            </div>
          </div>

          {NAV.map(n=>(
            <NavItem key={n.id} icon={n.icon} label={n.label}
              active={page===n.id} onClick={()=>setPage(n.id)} />
          ))}

          <div style={{flex:1}} />

          <div style={{padding:"12px", background:"rgba(255,255,255,0.06)", borderRadius:10}}>
            <div style={{fontSize:11, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:6}}>Today</div>
            <div style={{fontSize:13, color:"rgba(255,255,255,0.8)"}}>
              {today.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}
            </div>
            <div style={{fontSize:12, color:"rgba(255,255,255,0.4)", marginTop:2}}>
              {WEATHER_MOCK.temp}° · {todayEventCount} event{todayEventCount!==1?"s":""}
            </div>
            {profile.alexaEnabled && (
              <div style={{
                marginTop:8, fontSize:11, color:"rgba(100,180,255,0.9)",
                background:"rgba(100,180,255,0.1)", borderRadius:6,
                padding:"4px 8px", display:"inline-block"
              }}>
                🔵 Alexa on · {profile.wakeTime}
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="main-content">
          {importBanner && (
            <div style={{
              background:"#2d8a4e", color:"#fff", borderRadius:10,
              padding:"10px 16px", marginBottom:14, fontSize:13, fontWeight:500
            }}>
              ✅ {importBanner}
            </div>
          )}

          <div style={{marginBottom:20}}>
            <h1 className="page-title" style={{fontSize:24, fontWeight:700, color:"#1a1a2e", marginBottom:2}}>
              {page==="today" && `Good morning, ${profile.name}! ☀️`}
              {page==="calendar" && "Event calendar 📅"}
              {page==="upload" && "Upload schedule 📤"}
              {page==="profile" && "Settings ⚙️"}
            </h1>
            <div style={{fontSize:13, color:"#8a8480"}}>
              {today.toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
            </div>
          </div>

          {page==="today" && <TodayPage profile={profile} events={events} recommendation={recommendation} onGenerate={generateRecommendation} loading={loading} />}
          {page==="calendar" && <CalendarPage events={events} onAddEvent={addEvent} onDeleteEvent={deleteEvent} />}
          {page==="upload" && <UploadPage events={events} onEventsImported={importEvents} />}
          {page==="profile" && <ProfilePage profile={profile} onSave={setProfile} />}
        </div>

        {/* Bottom nav — mobile only */}
        <nav className="bottom-nav">
          {NAV.map(n=>(
            <button key={n.id} className={`bottom-nav-item${page===n.id?" active":""}`} onClick={()=>setPage(n.id)}>
              <span className="nav-icon">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>

      </div>
    </>
  );
}
