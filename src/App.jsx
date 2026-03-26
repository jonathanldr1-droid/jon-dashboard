import { useState, useEffect, useRef, useCallback } from "react";

// ─── Supabase Config ──────────────────────────────────────────────────────────
const SUPABASE_URL = "https://zagyhkvgbskfcemadmin.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphZ3loa3ZnYnNrZmNlbWFkbWluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MjgwODQsImV4cCI6MjA5MDEwNDA4NH0.4ErZDJeQUwr0tj-xkzSUgD9Z02Dst0HH-5pE0EH91EM";

const sbFetch = async (path, options = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
};

// Real-time subscription via Supabase Realtime websocket
const subscribeToTable = (table, callback) => {
  const wsUrl = `${SUPABASE_URL.replace("https://", "wss://")}/realtime/v1/websocket?apikey=${SUPABASE_ANON_KEY}&vsn=1.0.0`;
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    ws.send(JSON.stringify({ topic: "realtime:*", event: "phx_join", payload: {}, ref: "1" }));
    ws.send(JSON.stringify({
      topic: `realtime:public:${table}`,
      event: "phx_join",
      payload: { config: { broadcast: { self: false }, presence: { key: "" }, postgres_changes: [{ event: "*", schema: "public", table }] } },
      ref: "2"
    }));
  };

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.event === "postgres_changes" || (msg.payload && msg.payload.data && msg.payload.data.table === table)) {
      callback(msg);
    }
  };

  ws.onerror = () => {};
  return ws;
};

// ─── Theme ────────────────────────────────────────────────────────────────────
const T = {
  bg:        "#141420",
  bgCard:    "#1c1c2e",
  bgInput:   "#12121e",
  bgDeep:    "#0f0f1a",
  border:    "#2e2e4a",
  border2:   "#3a3a58",
  text:      "#f0f0ff",
  textSub:   "#b0b0d0",
  textMuted: "#7a7a9a",
  accent:    "#7c6cff",
  accentLt:  "#b8adff",
  green:     "#4ade80",
  orange:    "#fb923c",
  red:       "#f87171",
  blue:      "#60a5fa",
  cyan:      "#22d3ee",
};

// ─── Utilities ────────────────────────────────────────────────────────────────
const formatTime = (s) => {
  const h = Math.floor(s / 3600).toString().padStart(2, "0");
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${h}:${m}:${sec}`;
};

const todayStr = () => new Date().toLocaleDateString("en-US", {
  weekday: "long", month: "long", day: "numeric", year: "numeric"
});

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ─── Static Data ──────────────────────────────────────────────────────────────
const SPL_REFS = [
  { level: "60 dB",  label: "Normal conversation" },
  { level: "85 dB",  label: "Loud conversation" },
  { level: "94 dB",  label: "Church mix (soft)" },
  { level: "100 dB", label: "Church mix (typical)" },
  { level: "103 dB", label: "Concert safe limit (OSHA)" },
  { level: "110 dB", label: "Rock concert" },
  { level: "120 dB", label: "Pain threshold" },
  { level: "130 dB", label: "Jet engine (nearby)" },
];

const VW_SHORTCUTS = [
  { key: "X",           action: "Selection Tool" },
  { key: "U",           action: "2D Reshape Tool" },
  { key: "L",           action: "Line Tool" },
  { key: "R",           action: "Rectangle Tool" },
  { key: "O",           action: "Circle/Oval Tool" },
  { key: "T",           action: "Text Tool" },
  { key: "G",           action: "Toggle Grid Snap" },
  { key: "Cmd+D",       action: "Duplicate" },
  { key: "Cmd+Shift+D", action: "Duplicate Array" },
  { key: "Cmd+K",       action: "Connect/Combine" },
  { key: "Cmd+Shift+F", action: "Send to Front" },
  { key: "Cmd+Shift+B", action: "Send to Back" },
];

const PAPER_SIZES = [
  { name: "Letter",          dims: "8.5\" x 11\"" },
  { name: "11x17 (Tabloid)", dims: "11\" x 17\"" },
  { name: "Arch D",          dims: "24\" x 36\"" },
  { name: "Arch E",          dims: "36\" x 48\"" },
  { name: "A4",              dims: "210 x 297 mm" },
  { name: "A3",              dims: "297 x 420 mm" },
];

const SCALE_RATIOS = [
  { label: "1:10",            note: "Small spaces" },
  { label: "1:20",            note: "Typical room" },
  { label: "1:50",            note: "Auditorium" },
  { label: "1:100",           note: "Large venue" },
  { label: "3/32\" = 1'-0\"", note: "Arch scale" },
  { label: "1/8\" = 1'-0\"",  note: "Stage plots" },
  { label: "1/4\" = 1'-0\"",  note: "Detail views" },
];

const PP_QUICKTOPICS = [
  "Two-operator workflow setup", "Slide group organization",
  "Stage Display configuration", "MIDI trigger setup",
  "NDI / video output routing",  "Clock and timer overlays",
  "Hot key bindings",            "Reflow Editor tips",
  "ProPresenter + ATEM integration", "Importing from Planning Center",
];

const IT_QUICKTOPICS = [
  "VLAN setup for AV", "Dante network best practices",
  "PoE switch configuration", "Streaming via SRT/RTMP",
  "NDI workflow setup", "Wireless frequency coordination",
  "Fiber vs copper runs", "Firewall rules for AV gear",
];

const TABS = [
  { id: "home",     label: "Home",         icon: "⌂" },
  { id: "calendar", label: "Calendar",     icon: "◈" },
  { id: "tasks",    label: "Tasks",        icon: "◻" },
  { id: "tools",    label: "Tech Tools",   icon: "⚡" },
  { id: "pp",       label: "ProPresenter", icon: "▶" },
  { id: "it",       label: "IT & Network", icon: "⬡" },
  { id: "vw",       label: "Vectorworks",  icon: "⬢" },
  { id: "stage",    label: "Stage Notes",  icon: "♪" },
];

const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID";
const GOOGLE_SCOPES    = "https://www.googleapis.com/auth/calendar.readonly";

// ═══════════════════════════════════════════════════════════════════════════════
export default function ProductionDashboard() {
  const [activeTab, setActiveTab] = useState("home");
  const [syncStatus, setSyncStatus] = useState("connecting"); // connecting | live | error

  // ── Synced state ─────────────────────────────────────────────────────────
  const [tasks, setTasks]           = useState([]);
  const [stageNotes, setStageNotes] = useState([]);
  const [cableRuns, setCableRuns]   = useState([]);

  // ── Local state ──────────────────────────────────────────────────────────
  const [newTask, setNewTask]           = useState("");
  const [taskCategory, setTaskCategory] = useState("church");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [stageNote, setStageNote]       = useState("");

  // Calendar
  const [calToken, setCalToken]     = useState(null);
  const [calEvents, setCalEvents]   = useState([]);
  const [calLoading, setCalLoading] = useState(false);
  const [calError, setCalError]     = useState(null);

  // Timer
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerLabel, setTimerLabel]     = useState("");
  const [timerLog, setTimerLog]         = useState([]);
  const timerRef = useRef(null);

  // Power calc
  const [watts, setWatts] = useState("");
  const [volts, setVolts] = useState("");
  const [amps, setAmps]   = useState("");

  // Length
  const [feetIn,  setFeetIn]  = useState("");
  const [inchOut, setInchOut] = useState("");
  const [inchIn,  setInchIn]  = useState("");
  const [feetOut, setFeetOut] = useState("");

  // AI chats
  const [ppMessages, setPpMessages] = useState([
    { role: "assistant", content: "Hey Jon! I'm your ProPresenter assistant. I can help with your two-operator workflow, slide organization, Stage Display, MIDI triggers, NDI routing, and anything else ProPresenter-related. What do you need?" }
  ]);
  const [ppInput, setPpInput]   = useState("");
  const [ppLoading, setPpLoading] = useState(false);
  const ppEndRef = useRef(null);

  const [itMessages, setItMessages] = useState([
    { role: "assistant", content: "Hey Jon! I'm your IT and networking assistant. I know your network: 3x Netgear M4250-26G4F-POE+ switches and a Ubiquiti UniFi Express 7 as your gateway. Ask me anything." }
  ]);
  const [itInput, setItInput]     = useState("");
  const [itLoading, setItLoading] = useState(false);
  const itEndRef = useRef(null);

  // ── Load initial data from Supabase ──────────────────────────────────────
  useEffect(() => {
    const loadAll = async () => {
      try {
        const [t, n, c] = await Promise.all([
          sbFetch("/tasks?order=created_at.asc"),
          sbFetch("/stage_notes?order=created_at.asc"),
          sbFetch("/cable_runs?order=sort_order.asc"),
        ]);
        setTasks(t);
        setStageNotes(n);
        setCableRuns(c.length ? c : [{ id: uid(), label: "FOH to Stage", length: "", qty: 1, sort_order: 0 }]);
        setSyncStatus("live");
      } catch (e) {
        setSyncStatus("error");
      }
    };
    loadAll();
  }, []);

  // ── Real-time subscriptions ───────────────────────────────────────────────
  useEffect(() => {
    const reload = async (table, setter, order = "created_at.asc") => {
      try {
        const data = await sbFetch(`/${table}?order=${order}`);
        setter(data);
      } catch {}
    };

    const wsTasks  = subscribeToTable("tasks",       () => reload("tasks",       setTasks));
    const wsNotes  = subscribeToTable("stage_notes", () => reload("stage_notes", setStageNotes));
    const wsCables = subscribeToTable("cable_runs",  () => reload("cable_runs",  setCableRuns, "sort_order.asc"));

    return () => { wsTasks.close(); wsNotes.close(); wsCables.close(); };
  }, []);

  // ── Scroll AI chats ───────────────────────────────────────────────────────
  useEffect(() => { ppEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [ppMessages]);
  useEffect(() => { itEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [itMessages]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning]);

  const stopAndLog = () => {
    setTimerRunning(false);
    if (timerSeconds > 0) {
      setTimerLog(l => [...l, { label: timerLabel || "Task", time: timerSeconds, ts: new Date().toLocaleTimeString() }]);
    }
    setTimerSeconds(0);
    setTimerLabel("");
  };

  // ── Power Calc ────────────────────────────────────────────────────────────
  const calcPower = (field, val) => {
    const n = parseFloat(val);
    if (isNaN(n) || n === 0) return;
    if (field === "watts") {
      if (volts) setAmps((n / parseFloat(volts)).toFixed(3));
      else if (amps) setVolts((n / parseFloat(amps)).toFixed(2));
    } else if (field === "volts") {
      if (watts) setAmps((parseFloat(watts) / n).toFixed(3));
      else if (amps) setWatts((n * parseFloat(amps)).toFixed(2));
    } else if (field === "amps") {
      if (volts) setWatts((n * parseFloat(volts)).toFixed(2));
      else if (watts) setVolts((parseFloat(watts) / n).toFixed(2));
    }
  };

  // ── Length ────────────────────────────────────────────────────────────────
  const feetToInches = (v) => { setFeetIn(v); const f = parseFloat(v); setInchOut(!isNaN(f) ? (f * 12).toFixed(1) : ""); };
  const inchesToFeet = (v) => { setInchIn(v); const i = parseFloat(v); setFeetOut(!isNaN(i) ? (i / 12).toFixed(3) : ""); };

  // ── Cable Runs (synced) ───────────────────────────────────────────────────
  const totalCable = cableRuns.reduce((acc, r) => acc + (parseFloat(r.length) || 0) * (parseInt(r.qty) || 1), 0);

  const addRun = async () => {
    const newRun = { id: uid(), label: "", length: "", qty: 1, sort_order: cableRuns.length };
    setCableRuns(r => [...r, newRun]);
    try { await sbFetch("/cable_runs", { method: "POST", body: JSON.stringify(newRun) }); } catch {}
  };

  const updateRun = async (id, field, val) => {
    setCableRuns(r => r.map(x => x.id === id ? { ...x, [field]: val } : x));
    try {
      await sbFetch(`/cable_runs?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ [field]: val }) });
    } catch {}
  };

  const removeRun = async (id) => {
    setCableRuns(r => r.filter(x => x.id !== id));
    try { await sbFetch(`/cable_runs?id=eq.${id}`, { method: "DELETE" }); } catch {}
  };

  // ── Google Calendar ───────────────────────────────────────────────────────
  const handleCalConnect = () => {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: window.location.origin,
      response_type: "token",
      scope: GOOGLE_SCOPES,
      prompt: "consent",
    });
    window.open(`https://accounts.google.com/o/oauth2/v2/auth?${params}`, "_blank", "width=500,height=600");
  };

  const fetchEvents = useCallback(async (token) => {
    setCalLoading(true); setCalError(null);
    try {
      const now = new Date().toISOString();
      const end = new Date(Date.now() + 7 * 86400000).toISOString();
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&timeMax=${end}&singleEvents=true&orderBy=startTime&maxResults=20`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      setCalEvents(data.items || []);
    } catch (e) { setCalError(e.message); }
    setCalLoading(false);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("access_token")) {
      const params = new URLSearchParams(hash.replace("#", ""));
      const token = params.get("access_token");
      if (token) { setCalToken(token); fetchEvents(token); }
    }
  }, [fetchEvents]);

  // ── Tasks (synced) ────────────────────────────────────────────────────────
  const addTask = async () => {
    if (!newTask.trim()) return;
    const task = { id: uid(), text: newTask, done: false, priority: taskPriority, category: taskCategory };
    setTasks(t => [...t, task]);
    setNewTask("");
    try { await sbFetch("/tasks", { method: "POST", body: JSON.stringify(task) }); } catch {}
  };

  const toggleTask = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    setTasks(t => t.map(x => x.id === id ? { ...x, done: !x.done } : x));
    try { await sbFetch(`/tasks?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ done: !task.done }) }); } catch {}
  };

  const deleteTask = async (id) => {
    setTasks(t => t.filter(x => x.id !== id));
    try { await sbFetch(`/tasks?id=eq.${id}`, { method: "DELETE" }); } catch {}
  };

  const priorityColor = (p) => p === "high" ? T.red : p === "medium" ? T.orange : T.green;

  // ── Stage Notes (synced) ──────────────────────────────────────────────────
  const addStageNote = async () => {
    if (!stageNote.trim()) return;
    const note = { id: uid(), text: stageNote, ts: new Date().toLocaleTimeString() };
    setStageNotes(n => [...n, note]);
    setStageNote("");
    try { await sbFetch("/stage_notes", { method: "POST", body: JSON.stringify(note) }); } catch {}
  };

  const deleteNote = async (id) => {
    setStageNotes(n => n.filter(x => x.id !== id));
    try { await sbFetch(`/stage_notes?id=eq.${id}`, { method: "DELETE" }); } catch {}
  };

  // ── ProPresenter AI ───────────────────────────────────────────────────────
  const sendPpMessage = async (text) => {
    if (!text.trim() || ppLoading) return;
    const userMsg = { role: "user", content: text };
    setPpMessages(m => [...m, userMsg]);
    setPpInput("");
    setPpLoading(true);
    try {
      const history = [...ppMessages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are an expert ProPresenter 7 support assistant helping Jon Elder, Central Production Director at a large church in Richmond, Virginia. Jon uses ProPresenter with a two-operator workflow (recently invested in specialized training), Allen & Heath Avantis and dLive consoles, Blackmagic ATEM switching, and Sony FX cameras. Answer clearly and practically. Reference official ProPresenter docs at https://learn.renewedvision.com/propresenter when relevant. Use numbered steps for procedures. Never use em dashes.`,
          messages: history,
        }),
      });
      const data = await res.json();
      setPpMessages(m => [...m, { role: "assistant", content: data.content?.[0]?.text || "Something went wrong." }]);
    } catch (e) {
      setPpMessages(m => [...m, { role: "assistant", content: `Error: ${e.message}` }]);
    }
    setPpLoading(false);
  };

  // ── IT/Network AI ─────────────────────────────────────────────────────────
  const sendItMessage = async (text) => {
    if (!text.trim() || itLoading) return;
    const userMsg = { role: "user", content: text };
    setItMessages(m => [...m, userMsg]);
    setItInput("");
    setItLoading(true);
    try {
      const history = [...itMessages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are an expert IT and networking engineer for house of worship and live production, helping Jon Elder, Central Production Director at a large church in Richmond, Virginia.

Jon's environment: Allen & Heath dLive and Avantis (Dante), Blackmagic ATEM switchers, Sony FX cameras, ProPresenter 7, GrandMA3 and Hog 4 lighting, live streaming infrastructure.

Jon's network hardware:
- 3x Netgear M4250-26G4F-POE+ managed switches (AV-line, 24x PoE+ RJ45, 4x SFP uplinks, Dante/AES67 support, IGMP snooping, QoS)
- 1x Ubiquiti UniFi Express 7 (internet gateway, routing, DHCP)

Give advice specific to this hardware. Reference M4250 AV features and UXG-Express-7 capabilities and limitations. Be practical, use numbered steps, recommend specific models where helpful. Never use em dashes.`,
          messages: history,
        }),
      });
      const data = await res.json();
      setItMessages(m => [...m, { role: "assistant", content: data.content?.[0]?.text || "Something went wrong." }]);
    } catch (e) {
      setItMessages(m => [...m, { role: "assistant", content: `Error: ${e.message}` }]);
    }
    setItLoading(false);
  };

  // ── Style helpers ─────────────────────────────────────────────────────────
  const inputSt = {
    background: T.bgInput, border: `1px solid ${T.border}`, borderRadius: 4,
    color: T.text, padding: "9px 11px", fontSize: 13.5, outline: "none",
    width: "100%", boxSizing: "border-box", fontFamily: "inherit",
  };
  const selectSt = { ...inputSt, width: "auto", cursor: "pointer" };
  const btn = (bg = T.accent, size = 12) => ({
    background: bg, border: `1px solid ${bg === T.bgCard ? T.border2 : bg}`,
    color: T.text, padding: "8px 16px", borderRadius: 4, cursor: "pointer",
    fontSize: size, letterSpacing: 0.5, fontFamily: "inherit",
  });

  const syncDot = syncStatus === "live" ? T.green : syncStatus === "error" ? T.red : T.orange;
  const syncLabel = syncStatus === "live" ? "Live" : syncStatus === "error" ? "Offline" : "Connecting...";

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily: "'IBM Plex Mono', 'Fira Code', 'Courier New', monospace", background: T.bg, minHeight: "100vh", color: T.text, display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <header style={{ borderBottom: `1px solid ${T.border}`, padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", background: T.bgDeep }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 4, color: T.accentLt, textTransform: "uppercase", marginBottom: 3 }}>Production Director</div>
          <div style={{ fontSize: 20, fontWeight: "bold", color: "#ffffff", letterSpacing: 1 }}>JON ELDER</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: T.textSub }}>{todayStr()}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end", marginTop: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: syncDot }} />
            <span style={{ fontSize: 10, color: syncDot, letterSpacing: 1 }}>{syncLabel}</span>
            <span style={{ fontSize: 10, color: T.textMuted, marginLeft: 6 }}>{tasks.filter(t => !t.done).length} open tasks</span>
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav style={{ display: "flex", borderBottom: `1px solid ${T.border}`, background: T.bgDeep, overflowX: "auto" }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: "11px 14px", border: "none", background: "none", cursor: "pointer",
            color: activeTab === tab.id ? T.accentLt : T.textMuted,
            borderBottom: activeTab === tab.id ? `2px solid ${T.accent}` : "2px solid transparent",
            fontSize: 11, letterSpacing: 0.5, whiteSpace: "nowrap",
          }}>
            <span style={{ marginRight: 5 }}>{tab.icon}</span>{tab.label}
          </button>
        ))}
      </nav>

      {/* Main */}
      <main style={{ flex: 1, padding: "20px 16px", maxWidth: 920, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>

        {/* HOME */}
        {activeTab === "home" && (
          <div>
            <SectionTitle>Overview</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: 12, marginBottom: 28 }}>
              <StatCard label="Open Tasks"     value={tasks.filter(t => !t.done).length}                              accent={T.accentLt} />
              <StatCard label="Church Tasks"   value={tasks.filter(t => !t.done && t.category === "church").length}   accent={T.green} />
              <StatCard label="Personal Tasks" value={tasks.filter(t => !t.done && t.category === "personal").length} accent={T.orange} />
              <StatCard label="Completed"      value={tasks.filter(t => t.done).length}                               accent={T.blue} />
            </div>
            <SectionTitle>Open Tasks</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {tasks.filter(t => !t.done).slice(0, 6).map(t => (
                <div key={t.id} style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderLeft: `3px solid ${priorityColor(t.priority)}`, padding: "11px 14px", borderRadius: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: T.text }}>{t.text}</span>
                  <span style={{ fontSize: 10, color: T.textMuted, textTransform: "uppercase", letterSpacing: 1, marginLeft: 10 }}>{t.category}</span>
                </div>
              ))}
              {tasks.filter(t => !t.done).length === 0 && <Empty>All caught up. Good work.</Empty>}
            </div>
          </div>
        )}

        {/* CALENDAR */}
        {activeTab === "calendar" && (
          <div>
            <SectionTitle>Google Calendar</SectionTitle>
            {!calToken ? (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <div style={{ fontSize: 13, color: T.textSub, marginBottom: 8, lineHeight: 1.8 }}>Connect your Google account to sync events.</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 24 }}>Replace GOOGLE_CLIENT_ID in the code with your OAuth client ID from Google Cloud Console.</div>
                <button onClick={handleCalConnect} style={btn()}>Connect Google Calendar</button>
              </div>
            ) : calLoading ? <Empty>Loading events...</Empty>
            : calError ? <div style={{ color: T.red, padding: 16, fontSize: 13 }}>Error: {calError}</div>
            : (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <span style={{ fontSize: 12, color: T.textMuted }}>Next 7 days</span>
                  <button onClick={() => fetchEvents(calToken)} style={btn(T.bgCard, 11)}>Refresh</button>
                </div>
                {calEvents.length === 0 ? <Empty>No events found.</Empty> : calEvents.map(ev => {
                  const start = ev.start?.dateTime ? new Date(ev.start.dateTime) : new Date(ev.start?.date);
                  return (
                    <div key={ev.id} style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderLeft: `3px solid ${T.accent}`, padding: "12px 14px", borderRadius: 4, marginBottom: 8 }}>
                      <div style={{ fontSize: 14, color: T.text, marginBottom: 4 }}>{ev.summary}</div>
                      <div style={{ fontSize: 11, color: T.textMuted }}>
                        {start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        {ev.start?.dateTime && ` at ${start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TASKS */}
        {activeTab === "tasks" && (
          <div>
            <SectionTitle>Task Manager</SectionTitle>
            <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 6, padding: 16, marginBottom: 20 }}>
              <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === "Enter" && addTask()} placeholder="Add a task..." style={inputSt} />
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                <select value={taskCategory} onChange={e => setTaskCategory(e.target.value)} style={selectSt}>
                  <option value="church">Church</option>
                  <option value="personal">Personal</option>
                  <option value="freelance">Freelance</option>
                </select>
                <select value={taskPriority} onChange={e => setTaskPriority(e.target.value)} style={selectSt}>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <button onClick={addTask} style={btn()}>Add Task</button>
              </div>
            </div>
            {["church", "personal", "freelance"].map(cat => {
              const catTasks = tasks.filter(t => t.category === cat);
              if (catTasks.length === 0) return null;
              return (
                <div key={cat} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, letterSpacing: 3, color: T.accentLt, textTransform: "uppercase", marginBottom: 8 }}>{cat}</div>
                  {catTasks.map(t => (
                    <div key={t.id} style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderLeft: `3px solid ${priorityColor(t.priority)}`, padding: "11px 14px", borderRadius: 4, marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
                      <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} style={{ accentColor: T.accent, width: 15, height: 15, cursor: "pointer", flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13, textDecoration: t.done ? "line-through" : "none", color: t.done ? T.textMuted : T.text }}>{t.text}</span>
                      <button onClick={() => deleteTask(t.id)} style={{ background: "none", border: "none", color: T.textMuted, cursor: "pointer", fontSize: 20, padding: "0 4px", lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* TECH TOOLS */}
        {activeTab === "tools" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <ToolCard title="Task Timer" accent={T.green}>
              <input value={timerLabel} onChange={e => setTimerLabel(e.target.value)} placeholder="Label this task..." style={{ ...inputSt, marginBottom: 12 }} />
              <div style={{ fontSize: 44, fontWeight: "bold", letterSpacing: 6, color: timerRunning ? T.green : T.accentLt, textAlign: "center", marginBottom: 14, fontVariantNumeric: "tabular-nums" }}>
                {formatTime(timerSeconds)}
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <button onClick={() => setTimerRunning(r => !r)} style={btn(timerRunning ? T.bgCard : T.accent)}>{timerRunning ? "Pause" : "Start"}</button>
                <button onClick={stopAndLog} style={btn(T.bgCard)}>Stop + Log</button>
                <button onClick={() => { setTimerSeconds(0); setTimerRunning(false); }} style={btn(T.bgCard)}>Reset</button>
              </div>
              {timerLog.length > 0 && (
                <div style={{ marginTop: 14, borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
                  <Lbl>Session Log</Lbl>
                  {timerLog.slice(-5).reverse().map((l, i) => (
                    <div key={i} style={{ fontSize: 12, color: T.textSub, display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span>{l.label}</span>
                      <span style={{ color: T.accentLt }}>{formatTime(l.time)} @ {l.ts}</span>
                    </div>
                  ))}
                </div>
              )}
            </ToolCard>

            <ToolCard title="Watts / Volts / Amps" accent={T.orange}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[["Watts (W)", watts, "watts", setWatts], ["Volts (V)", volts, "volts", setVolts], ["Amps (A)", amps, "amps", setAmps]].map(([label, val, field, setter]) => (
                  <div key={field}>
                    <Lbl>{label}</Lbl>
                    <input value={val} onChange={e => setter(e.target.value)} onBlur={() => calcPower(field, val)} style={inputSt} placeholder="0.00" type="number" />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center" }}>
                <button onClick={() => { setWatts(""); setVolts(""); setAmps(""); }} style={btn(T.bgCard, 11)}>Clear</button>
                <span style={{ fontSize: 11, color: T.textMuted }}>Enter any 2 values, click out to solve the 3rd.</span>
              </div>
            </ToolCard>

            <ToolCard title="Feet / Inches Converter" accent={T.blue}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <Lbl>Feet to Inches</Lbl>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input value={feetIn} onChange={e => feetToInches(e.target.value)} style={{ ...inputSt, flex: 1 }} placeholder="ft" type="number" />
                    <span style={{ color: T.textMuted, fontSize: 12 }}>=</span>
                    <ResultBox color={T.accentLt}>{inchOut ? `${inchOut}"` : "--"}</ResultBox>
                  </div>
                </div>
                <div>
                  <Lbl>Inches to Feet</Lbl>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input value={inchIn} onChange={e => inchesToFeet(e.target.value)} style={{ ...inputSt, flex: 1 }} placeholder="in" type="number" />
                    <span style={{ color: T.textMuted, fontSize: 12 }}>=</span>
                    <ResultBox color={T.accentLt}>{feetOut ? `${feetOut}'` : "--"}</ResultBox>
                  </div>
                </div>
              </div>
            </ToolCard>

            <ToolCard title="Cable Run Calculator" accent={T.cyan}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 60px 30px", gap: 8, marginBottom: 6 }}>
                <Lbl>Label</Lbl><Lbl>Length (ft)</Lbl><Lbl>Qty</Lbl><span />
              </div>
              {cableRuns.map(r => (
                <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr 80px 60px 30px", gap: 8, marginBottom: 8, alignItems: "center" }}>
                  <input value={r.label} onChange={e => updateRun(r.id, "label", e.target.value)} placeholder="Run label" style={inputSt} />
                  <input value={r.length} onChange={e => updateRun(r.id, "length", e.target.value)} type="number" style={inputSt} />
                  <input value={r.qty} onChange={e => updateRun(r.id, "qty", e.target.value)} type="number" style={inputSt} />
                  <button onClick={() => removeRun(r.id)} style={{ background: "none", border: "none", color: T.textMuted, cursor: "pointer", fontSize: 20, lineHeight: 1 }}>×</button>
                </div>
              ))}
              <button onClick={addRun} style={{ ...btn(T.bgCard, 11), marginBottom: 12 }}>+ Add Run</button>
              <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: T.textSub }}>Total Cable Needed</span>
                <span style={{ fontSize: 22, fontWeight: "bold", color: T.cyan }}>{totalCable.toFixed(0)} ft</span>
              </div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>Add 10-15% for slack and cable dressing.</div>
            </ToolCard>

            <ToolCard title="SPL Reference" accent={T.red}>
              {SPL_REFS.map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.border}`, fontSize: 13 }}>
                  <span style={{ color: T.accentLt, fontWeight: "bold", minWidth: 70 }}>{r.level}</span>
                  <span style={{ color: T.textSub }}>{r.label}</span>
                </div>
              ))}
            </ToolCard>
          </div>
        )}

        {/* PROPRESENTER */}
        {activeTab === "pp" && (
          <div>
            <SectionTitle>ProPresenter Assistant</SectionTitle>
            <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 6, padding: "12px 14px", marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 8 }}>Quick topics:</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {PP_QUICKTOPICS.map((t, i) => (
                  <button key={i} onClick={() => sendPpMessage(t)} disabled={ppLoading}
                    style={{ background: T.bgDeep, border: `1px solid ${T.border2}`, color: T.textSub, padding: "5px 11px", borderRadius: 12, fontSize: 11, cursor: "pointer" }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <ChatWindow messages={ppMessages} loading={ppLoading} endRef={ppEndRef} accentColor={T.accentLt} />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input value={ppInput} onChange={e => setPpInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendPpMessage(ppInput)}
                placeholder="Ask a ProPresenter question..." style={{ ...inputSt, flex: 1 }} disabled={ppLoading} />
              <button onClick={() => sendPpMessage(ppInput)} style={btn(T.accent)} disabled={ppLoading}>
                {ppLoading ? "..." : "Send"}
              </button>
            </div>
          </div>
        )}

        {/* IT & NETWORK */}
        {activeTab === "it" && (
          <div>
            <SectionTitle>IT and Networking Assistant</SectionTitle>
            <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 6, padding: "12px 14px", marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Your network: 3x Netgear M4250-26G4F-POE+ / Ubiquiti UniFi Express 7</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {IT_QUICKTOPICS.map((t, i) => (
                  <button key={i} onClick={() => sendItMessage(t)} disabled={itLoading}
                    style={{ background: T.bgDeep, border: `1px solid ${T.border2}`, color: T.textSub, padding: "5px 11px", borderRadius: 12, fontSize: 11, cursor: "pointer" }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <ChatWindow messages={itMessages} loading={itLoading} endRef={itEndRef} accentColor={T.cyan} />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input value={itInput} onChange={e => setItInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendItMessage(itInput)}
                placeholder="Ask an IT or networking question..." style={{ ...inputSt, flex: 1 }} disabled={itLoading} />
              <button onClick={() => sendItMessage(itInput)} style={btn(T.accent)} disabled={itLoading}>
                {itLoading ? "..." : "Send"}
              </button>
            </div>
          </div>
        )}

        {/* VECTORWORKS */}
        {activeTab === "vw" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <ToolCard title="Keyboard Shortcuts" accent={T.accentLt}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {VW_SHORTCUTS.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${T.border}`, fontSize: 13 }}>
                    <span style={{ background: T.bgDeep, border: `1px solid ${T.border2}`, padding: "2px 8px", borderRadius: 3, fontWeight: "bold", color: T.accentLt, minWidth: 40, textAlign: "center", fontSize: 11 }}>{s.key}</span>
                    <span style={{ color: T.textSub }}>{s.action}</span>
                  </div>
                ))}
              </div>
            </ToolCard>
            <ToolCard title="Paper Sizes" accent={T.blue}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {PAPER_SIZES.map((p, i) => (
                  <div key={i} style={{ background: T.bgDeep, border: `1px solid ${T.border}`, borderRadius: 4, padding: "10px 12px" }}>
                    <div style={{ fontSize: 13, color: T.text }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: T.accent, marginTop: 3 }}>{p.dims}</div>
                  </div>
                ))}
              </div>
            </ToolCard>
            <ToolCard title="Scale Reference" accent={T.green}>
              {SCALE_RATIOS.map((s, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.border}`, fontSize: 13 }}>
                  <span style={{ color: T.accentLt, fontWeight: "bold" }}>{s.label}</span>
                  <span style={{ color: T.textMuted }}>{s.note}</span>
                </div>
              ))}
            </ToolCard>
            <ToolCard title="Scale Calculator" accent={T.orange}>
              <ScaleCalc inputSt={inputSt} />
            </ToolCard>
          </div>
        )}

        {/* STAGE NOTES */}
        {activeTab === "stage" && (
          <div>
            <SectionTitle>Stage Notes</SectionTitle>
            <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 6, padding: 16, marginBottom: 20 }}>
              <textarea
                value={stageNote} onChange={e => setStageNote(e.target.value)}
                placeholder="Quick stage note, mic placement, monitor mix note, patch change..."
                rows={4} style={{ ...inputSt, resize: "vertical", lineHeight: 1.7 }}
              />
              <button onClick={addStageNote} style={{ ...btn(), marginTop: 10 }}>Save Note</button>
            </div>
            {stageNotes.length === 0 ? <Empty>No notes yet.</Empty> : stageNotes.slice().reverse().map(n => (
              <div key={n.id} style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderLeft: `3px solid ${T.accent}`, padding: "12px 14px", borderRadius: 4, marginBottom: 8, display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", color: T.text }}>{n.text}</div>
                  <div style={{ fontSize: 10, color: T.textMuted, marginTop: 6 }}>{n.ts}</div>
                </div>
                <button onClick={() => deleteNote(n.id)} style={{ background: "none", border: "none", color: T.textMuted, cursor: "pointer", fontSize: 18, alignSelf: "flex-start", padding: "0 4px" }}>×</button>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}

// ─── Chat Window ──────────────────────────────────────────────────────────────
function ChatWindow({ messages, loading, endRef, accentColor }) {
  return (
    <div style={{ background: "#0f0f1a", border: "1px solid #2e2e4a", borderRadius: 6, padding: 14, height: 380, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
      {messages.map((m, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
          <div style={{
            maxWidth: "88%", padding: "10px 14px", borderRadius: 8,
            background: m.role === "user" ? "#252545" : "#1c1c2e",
            border: `1px solid ${m.role === "user" ? "#3a3a60" : "#2e2e4a"}`,
            fontSize: 13, lineHeight: 1.75, color: m.role === "user" ? "#d8d8ff" : "#ecebff",
            whiteSpace: "pre-wrap",
          }}>
            {m.role === "assistant" && (
              <div style={{ fontSize: 9, color: accentColor, letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>Assistant</div>
            )}
            {m.content}
          </div>
        </div>
      ))}
      {loading && (
        <div style={{ display: "flex" }}>
          <div style={{ background: "#1c1c2e", border: "1px solid #2e2e4a", padding: "10px 14px", borderRadius: 8, fontSize: 13, color: "#7a7a9a" }}>Thinking...</div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionTitle({ children }) {
  return <div style={{ fontSize: 10, letterSpacing: 4, color: T.accentLt, textTransform: "uppercase", marginBottom: 14 }}>{children}</div>;
}
function ToolCard({ title, children, accent }) {
  return (
    <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderTop: `2px solid ${accent || T.accent}`, borderRadius: 6, padding: 16 }}>
      <div style={{ fontSize: 10, letterSpacing: 3, color: accent || T.accentLt, textTransform: "uppercase", marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}
function StatCard({ label, value, accent }) {
  return (
    <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderLeft: `3px solid ${accent}`, borderRadius: 4, padding: "14px 16px" }}>
      <div style={{ fontSize: 30, fontWeight: "bold", color: accent }}>{value}</div>
      <div style={{ fontSize: 12, color: T.textSub, marginTop: 3 }}>{label}</div>
    </div>
  );
}
function Lbl({ children }) {
  return <div style={{ fontSize: 10, color: T.textMuted, letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>{children}</div>;
}
function ResultBox({ children, color }) {
  return (
    <div style={{ background: T.bgDeep, border: `1px solid ${T.border}`, padding: "9px 10px", borderRadius: 4, minWidth: 64, fontSize: 13.5, color: color || T.accentLt, textAlign: "center", whiteSpace: "nowrap" }}>
      {children}
    </div>
  );
}
function Empty({ children }) {
  return <div style={{ color: T.textMuted, fontSize: 13, textAlign: "center", padding: "24px 0" }}>{children}</div>;
}
function ScaleCalc({ inputSt }) {
  const [realFt, setRealFt] = useState("");
  const [scaleDenom, setScaleDenom] = useState("50");
  const result = parseFloat(realFt) && parseFloat(scaleDenom)
    ? ((parseFloat(realFt) * 12) / parseFloat(scaleDenom)).toFixed(3) : null;
  return (
    <div>
      <Lbl>Real dimension (feet)</Lbl>
      <input value={realFt} onChange={e => setRealFt(e.target.value)} style={{ ...inputSt, marginBottom: 10 }} placeholder="e.g. 60" type="number" />
      <Lbl>Scale denominator (1: )</Lbl>
      <input value={scaleDenom} onChange={e => setScaleDenom(e.target.value)} style={{ ...inputSt, marginBottom: 10 }} type="number" />
      {result && (
        <div style={{ marginTop: 8, padding: "10px 14px", background: T.bgDeep, border: `1px solid ${T.accent}`, borderRadius: 4, fontSize: 14, color: T.accentLt }}>
          Drawing length: <strong>{result}"</strong>
        </div>
      )}
    </div>
  );
}
