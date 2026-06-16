import React, { useState, useMemo, useEffect } from "react";

// ── SUPABASE CONFIG ───────────────────────────────────────────────────────────
const SUPABASE_URL = "https://btfnwarqfbzmmodcghmz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0Zm53YXJxZmJ6bW1vZGNnaG16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NDk5ODgsImV4cCI6MjA5NzEyNTk4OH0.iuyeTL3BB2MYi1E5RrKC62MbuSS2MiUTcdYDa2hnT4c";

async function fetchPropiedades() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/propiedades?select=*&activa=eq.true&order=score.desc&limit=500`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  if (!res.ok) throw new Error("Error al cargar propiedades");
  return res.json();
}

async function updatePropiedad(id, campos) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/propiedades?id=eq.${id}`,
    {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(campos),
    }
  );
  return res.ok;
}

// ── LINK BUILDERS ─────────────────────────────────────────────────────────────
function buildLinks(p) {
  const dirEnc = encodeURIComponent((p.direccion || "") + ", Buenos Aires, Argentina");
  const dirSimple = encodeURIComponent(p.direccion || "");
  const lat = p.lat || -34.6037;
  const lng = p.lng || -58.3816;
  return {
    ciudad3d: `https://ciudad3d.buenosaires.gob.ar/#lat=${lat}&lng=${lng}&zoom=18`,
    agip: `https://declaraciones.agip.gob.ar/agip-tributos-web/pages/publico/consultaDeuda.jsf`,
    googleMaps: `https://www.google.com/maps/search/?api=1&query=${dirEnc}`,
    streetView: `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`,
    zonaprop: p.url || `https://www.zonaprop.com.ar/inmuebles-venta-capital-federal-dueno-directo.html`,
    boletinOficial: `https://boletinoficial.gob.ar/busquedaAvanzada/index?terminos=${dirSimple}&norma=edictos`,
  };
}

// ── SCORE ENGINE ──────────────────────────────────────────────────────────────
function getScoreColor(total) {
  if (total >= 80) return { bg: "#FF3B3B", text: "#fff", label: "Crítico" };
  if (total >= 55) return { bg: "#FF8C00", text: "#fff", label: "Alto" };
  if (total >= 30) return { bg: "#F5C518", text: "#1a1a2e", label: "Medio" };
  return { bg: "#4CAF50", text: "#fff", label: "Bajo" };
}

const SIGNAL_META = {
  duenio_directo: { label: "Dueño directo", icon: "👤" },
  urgencia_detectada: { label: "Urgencia detectada", icon: "⚡" },
};

const MOTIVOS_DESCARTE = [
  "Ya tiene obra en ejecución",
  "Ya fue vendido",
  "Precio fuera de rango",
  "No cumple superficie mínima",
  "Zonificación no apta",
  "Propietario no interesado",
  "Es departamento / unidad",
  "Otro",
];

const TIPOS = ["Todos", "casas", "todos", "ph", "locales"];
const TIPO_LABEL = { casas: "Casas", todos: "Varios", ph: "PH", locales: "Locales" };

// ── MODAL DESCARTE ────────────────────────────────────────────────────────────
function ModalDescarte({ prop, onConfirm, onCancel }) {
  const [motivo, setMotivo] = useState(MOTIVOS_DESCARTE[0]);
  const [nota, setNota] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000bb", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#07111e", border: "1px solid #ff3b3b", borderRadius: 12, padding: 24, width: "100%", maxWidth: 400 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>🗑️ Descartar propiedad</div>
        <div style={{ color: "#4a7fa8", fontSize: 12, marginBottom: 16 }}>{prop.direccion}</div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#3a6ea8", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Motivo</div>
          {MOTIVOS_DESCARTE.map(m => (
            <div key={m} onClick={() => setMotivo(m)} style={{ padding: "7px 10px", borderRadius: 6, marginBottom: 4, cursor: "pointer", background: motivo === m ? "#1e3a5f" : "#0a1f36", border: `1px solid ${motivo === m ? "#2563eb" : "#1e3a5f"}`, color: motivo === m ? "#60a5fa" : "#4a7fa8", fontSize: 12 }}>{m}</div>
          ))}
        </div>
        <textarea value={nota} onChange={e => setNota(e.target.value)} placeholder="Nota adicional (opcional)..."
          style={{ width: "100%", background: "#0d2240", border: "1px solid #1e3a5f", color: "#e0eaff", borderRadius: 7, padding: "8px 10px", fontSize: 12, outline: "none", boxSizing: "border-box", resize: "vertical", minHeight: 60, marginBottom: 14 }}/>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onCancel} style={{ flex: 1, background: "#0d2240", border: "1px solid #1e3a5f", color: "#7ab3ff", borderRadius: 7, padding: "10px", fontSize: 12, cursor: "pointer" }}>Cancelar</button>
          <button onClick={() => onConfirm(motivo, nota)} style={{ flex: 1, background: "#7a1a1a", border: "1px solid #ff3b3b", color: "#ff7070", borderRadius: 7, padding: "10px", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

// ── LINK BUTTON ───────────────────────────────────────────────────────────────
function LinkBtn({ href, icon, label, note, color = "#7ab3ff" }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
      <div style={{ background: "#0a1f36", border: `1px solid ${color}33`, borderRadius: 8, padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}
        onMouseOver={e => e.currentTarget.style.background = "#0d2a4a"}
        onMouseOut={e => e.currentTarget.style.background = "#0a1f36"}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ color, fontSize: 12, fontWeight: 600 }}>{label}</div>
          {note && <div style={{ color: "#3a6ea8", fontSize: 10, marginTop: 1 }}>{note}</div>}
        </div>
        <span style={{ color: "#3a6ea8", fontSize: 12 }}>↗</span>
      </div>
    </a>
  );
}

// ── PROPERTY CARD ─────────────────────────────────────────────────────────────
function PropertyCard({ p, selected, onClick }) {
  const col = getScoreColor(p.score || 0);
  const isSel = selected?.id === p.id;
  const isDescartada = p.descartada;
  return (
    <div onClick={onClick} style={{
      background: isDescartada ? "#0a0808" : isSel ? "#0d2240" : "#091828",
      border: `1px solid ${isDescartada ? "#333" : isSel ? "#2563eb" : "#1e3a5f"}`,
      borderRadius: 10, padding: "12px 14px", cursor: "pointer",
      transition: "all 0.2s", marginBottom: 8, opacity: isDescartada ? 0.4 : 1,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" }}>
            {isDescartada && <span style={{ color: "#666", fontSize: 10, background: "#1a1a1a", borderRadius: 3, padding: "1px 5px" }}>DESCARTADA</span>}
            {p.urgencia_detectada && !isDescartada && <span style={{ color: "#f59e0b", fontSize: 10, background: "#1a1200", borderRadius: 3, padding: "1px 5px" }}>⚡ URGENTE</span>}
            <div style={{ color: isDescartada ? "#555" : "#e0eaff", fontSize: 13, fontWeight: 600 }}>{p.direccion || "Sin dirección"}</div>
          </div>
          <div style={{ color: "#4a7fa8", fontSize: 11 }}>
            {p.barrio} · {TIPO_LABEL[p.tipo] || p.tipo || "—"}
            {p.superficie_m2 ? ` · ${p.superficie_m2} m²` : ""}
            {p.precio_usd ? ` · USD ${p.precio_usd.toLocaleString()}` : ""}
          </div>
        </div>
        <div style={{ background: isDescartada ? "#333" : col.bg, color: isDescartada ? "#666" : col.text, borderRadius: 6, padding: "3px 8px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", marginLeft: 8 }}>
          {p.score || 0} <span style={{ fontSize: 9, fontWeight: 400 }}>{col.label}</span>
        </div>
      </div>
      {p.palabras_urgencia?.length > 0 && !isDescartada && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {p.palabras_urgencia.slice(0, 3).map(pal => (
            <span key={pal} style={{ background: "#1a1200", border: "1px solid #7a5a00", color: "#f59e0b", borderRadius: 4, padding: "1px 6px", fontSize: 10 }}>
              {pal}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── TAB ───────────────────────────────────────────────────────────────────────
function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: "none", border: "none", cursor: "pointer",
      color: active ? "#60a5fa" : "#3a6ea8",
      borderBottom: active ? "2px solid #2563eb" : "2px solid transparent",
      padding: "8px 10px", fontSize: 11, fontWeight: active ? 600 : 400,
      whiteSpace: "nowrap"
    }}>{label}</button>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [propiedades, setPropiedades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState("info");
  const [filterTipo, setFilterTipo] = useState("Todos");
  const [filterBarrio, setFilterBarrio] = useState("Todos");
  const [sortBy, setSortBy] = useState("score");
  const [search, setSearch] = useState("");
  const [mostrarDescartadas, setMostrarDescartadas] = useState(false);
  const [modalDescarte, setModalDescarte] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // Cargar propiedades de Supabase
  useEffect(() => {
    fetchPropiedades()
      .then(data => { setPropiedades(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const barrios = useMemo(() => {
    const set = new Set(propiedades.map(p => p.barrio).filter(Boolean));
    return ["Todos", ...Array.from(set).sort()];
  }, [propiedades]);

  const filtered = useMemo(() => {
    let list = [...propiedades];
    if (!mostrarDescartadas) list = list.filter(p => !p.descartada);
    if (filterTipo !== "Todos") list = list.filter(p => p.tipo === filterTipo);
    if (filterBarrio !== "Todos") list = list.filter(p => p.barrio === filterBarrio);
    if (search) list = list.filter(p =>
      (p.direccion || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.barrio || "").toLowerCase().includes(search.toLowerCase())
    );
    list.sort((a, b) => sortBy === "score" ? (b.score || 0) - (a.score || 0) : (b.precio_usd || 0) - (a.precio_usd || 0));
    return list;
  }, [propiedades, filterTipo, filterBarrio, search, sortBy, mostrarDescartadas]);

  const stats = useMemo(() => ({
    total: propiedades.filter(p => !p.descartada).length,
    urgentes: propiedades.filter(p => !p.descartada && p.urgencia_detectada).length,
    criticos: propiedades.filter(p => !p.descartada && (p.score || 0) >= 55).length,
    descartadas: propiedades.filter(p => p.descartada).length,
  }), [propiedades]);

  const confirmarDescarte = async (motivo, nota) => {
    if (!modalDescarte) return;
    setGuardando(true);
    const ok = await updatePropiedad(modalDescarte.id, {
      descartada: true,
      motivo_descarte: motivo + (nota ? ` — ${nota}` : ""),
    });
    if (ok) {
      setPropiedades(prev => prev.map(p => p.id === modalDescarte.id ? { ...p, descartada: true, motivo_descarte: motivo } : p));
      setSelected(null);
    }
    setModalDescarte(null);
    setGuardando(false);
  };

  const restaurar = async (id) => {
    setGuardando(true);
    const ok = await updatePropiedad(id, { descartada: false, motivo_descarte: null });
    if (ok) setPropiedades(prev => prev.map(p => p.id === id ? { ...p, descartada: false } : p));
    setGuardando(false);
  };

  const links = selected ? buildLinks(selected) : null;

  return (
    <div style={{ minHeight: "100vh", background: "#060f1a", fontFamily: "'Inter', -apple-system, sans-serif", color: "#e0eaff" }}>
      {modalDescarte && <ModalDescarte prop={modalDescarte} onConfirm={confirmarDescarte} onCancel={() => setModalDescarte(null)}/>}

      {/* HEADER */}
      <div style={{ borderBottom: "1px solid #0d2240", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#060f1a", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #1d4ed8, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🏙️</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>LoteFinder</div>
            <div style={{ fontSize: 10, color: "#3a6ea8" }}>CABA · DATOS EN TIEMPO REAL</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {[["🏠", stats.total, "Activas"],["⚡", stats.urgentes, "Urgentes"],["🔴", stats.criticos, "Score alto"],["🗑️", stats.descartadas, "Descartadas"]].map(([icon, val, label]) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{icon} {val}</div>
              <div style={{ fontSize: 9, color: "#3a6ea8" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 61px)" }}>
        {/* SIDEBAR */}
        <div style={{ width: 340, borderRight: "1px solid #0d2240", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid #0d2240", background: "#07111e" }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar dirección o barrio..."
              style={{ width: "100%", background: "#0d2240", border: "1px solid #1e3a5f", color: "#e0eaff", borderRadius: 7, padding: "7px 10px", fontSize: 12, outline: "none", boxSizing: "border-box", marginBottom: 8 }}/>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
                style={{ flex: 1, background: "#0d2240", border: "1px solid #1e3a5f", color: "#7ab3ff", borderRadius: 6, padding: "5px 6px", fontSize: 11, outline: "none" }}>
                {TIPOS.map(t => <option key={t} value={t}>{t === "Todos" ? "Todos los tipos" : TIPO_LABEL[t] || t}</option>)}
              </select>
              <select value={filterBarrio} onChange={e => setFilterBarrio(e.target.value)}
                style={{ flex: 1, background: "#0d2240", border: "1px solid #1e3a5f", color: "#7ab3ff", borderRadius: 6, padding: "5px 6px", fontSize: 11, outline: "none" }}>
                {barrios.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                style={{ flex: 1, background: "#0d2240", border: "1px solid #1e3a5f", color: "#7ab3ff", borderRadius: 6, padding: "5px 6px", fontSize: 11, outline: "none" }}>
                <option value="score">Ordenar: Score</option>
                <option value="precio">Ordenar: Precio</option>
              </select>
              <button onClick={() => { setLoading(true); fetchPropiedades().then(d => { setPropiedades(d); setLoading(false); }); }}
                style={{ background: "#0d2240", border: "1px solid #1e3a5f", color: "#7ab3ff", borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: "pointer" }}>
                🔄 Actualizar
              </button>
            </div>
            <div onClick={() => setMostrarDescartadas(v => !v)} style={{
              display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
              background: mostrarDescartadas ? "#1a0a0a" : "#0a1f36",
              border: `1px solid ${mostrarDescartadas ? "#7a1a1a" : "#1e3a5f"}`,
              borderRadius: 6, padding: "6px 10px"
            }}>
              <div style={{ width: 28, height: 16, borderRadius: 8, background: mostrarDescartadas ? "#ff3b3b" : "#1e3a5f", position: "relative" }}>
                <div style={{ position: "absolute", top: 2, left: mostrarDescartadas ? 14 : 2, width: 12, height: 12, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }}/>
              </div>
              <span style={{ color: mostrarDescartadas ? "#ff7070" : "#3a6ea8", fontSize: 11 }}>
                {mostrarDescartadas ? "Mostrando descartadas" : "Ocultar descartadas"}
              </span>
            </div>
          </div>

          <div style={{ padding: "7px 14px", background: "#07111e", borderBottom: "1px solid #0d2240" }}>
            <span style={{ color: "#3a6ea8", fontSize: 11 }}>
              {loading ? "Cargando..." : `${filtered.length} propiedades`}
            </span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
            {loading && (
              <div style={{ textAlign: "center", color: "#3a6ea8", padding: 40 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
                Cargando propiedades...
              </div>
            )}
            {error && (
              <div style={{ background: "#1a0808", border: "1px solid #ff3b3b", borderRadius: 8, padding: 12, color: "#ff7070", fontSize: 12 }}>
                ❌ Error: {error}
              </div>
            )}
            {!loading && !error && filtered.map(p => (
              <PropertyCard key={p.id} p={p} selected={selected} onClick={() => { setSelected(prev => prev?.id === p.id ? null : p); setActiveTab("info"); }}/>
            ))}
          </div>
        </div>

        {/* MAIN PANEL */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {selected ? (
            <div style={{ flex: 1, overflowY: "auto" }}>
              {/* Header */}
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #0d2240", background: selected.descartada ? "#0a0808" : "transparent" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    {selected.descartada && (
                      <div style={{ color: "#666", fontSize: 10, background: "#1a1a1a", borderRadius: 3, padding: "2px 7px", marginBottom: 6, display: "inline-block" }}>
                        🗑️ DESCARTADA · {selected.motivo_descarte}
                      </div>
                    )}
                    <a href={links.googleMaps} target="_blank" rel="noreferrer"
                      style={{ color: "#e0eaff", fontSize: 17, fontWeight: 700, textDecoration: "none", borderBottom: "1px dashed #2563eb", display: "block", marginBottom: 4 }}>
                      {selected.direccion} ↗
                    </a>
                    <div style={{ color: "#4a7fa8", fontSize: 12 }}>
                      {selected.barrio} · {TIPO_LABEL[selected.tipo] || selected.tipo}
                      {selected.superficie_m2 ? ` · ${selected.superficie_m2} m²` : ""}
                    </div>
                  </div>
                  <div style={{ background: getScoreColor(selected.score || 0).bg, color: getScoreColor(selected.score || 0).text, borderRadius: 8, padding: "6px 14px", textAlign: "center", minWidth: 60 }}>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{selected.score || 0}</div>
                    <div style={{ fontSize: 9 }}>Score</div>
                  </div>
                </div>

                {/* Botón descarte */}
                {selected.descartada ? (
                  <button onClick={() => restaurar(selected.id)} disabled={guardando}
                    style={{ background: "#0d2240", border: "1px solid #2563eb", color: "#60a5fa", borderRadius: 7, padding: "8px 16px", fontSize: 11, cursor: "pointer" }}>
                    ↩️ Restaurar propiedad
                  </button>
                ) : (
                  <button onClick={() => setModalDescarte(selected)} disabled={guardando}
                    style={{ background: "#1a0808", border: "1px solid #7a1a1a", color: "#ff7070", borderRadius: 7, padding: "8px 16px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                    🗑️ Marcar como descartada
                  </button>
                )}
              </div>

              {/* Tabs */}
              <div style={{ borderBottom: "1px solid #0d2240", paddingLeft: 8, display: "flex", overflowX: "auto" }}>
                <Tab label="📋 Información" active={activeTab === "info"} onClick={() => setActiveTab("info")}/>
                <Tab label="🔗 Links & Fuentes" active={activeTab === "links"} onClick={() => setActiveTab("links")}/>
              </div>

              <div style={{ padding: 16 }}>
                {activeTab === "info" && (
                  <div>
                    {/* Señales */}
                    {(selected.urgencia_detectada || selected.duenio_directo) && (
                      <div style={{ background: "#07111e", border: "1px solid #1e3a5f", borderRadius: 10, padding: 14, marginBottom: 14 }}>
                        <div style={{ color: "#3a6ea8", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Señales detectadas</div>
                        {selected.duenio_directo && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 16 }}>👤</span>
                            <span style={{ color: "#4ade80", fontSize: 12 }}>Dueño directo — sin inmobiliaria</span>
                          </div>
                        )}
                        {selected.urgencia_detectada && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 16 }}>⚡</span>
                            <span style={{ color: "#f59e0b", fontSize: 12 }}>Urgencia detectada en el aviso</span>
                          </div>
                        )}
                        {selected.palabras_urgencia?.length > 0 && (
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
                            {selected.palabras_urgencia.map(p => (
                              <span key={p} style={{ background: "#1a1200", border: "1px solid #7a5a00", color: "#f59e0b", borderRadius: 4, padding: "2px 8px", fontSize: 10 }}>{p}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Datos */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                      {[
                        ["💰 Precio", selected.precio_usd ? `USD ${selected.precio_usd.toLocaleString()}` : "—"],
                        ["📐 Superficie", selected.superficie_m2 ? `${selected.superficie_m2} m²` : "—"],
                        ["⏱️ En venta", selected.meses_publicado > 0 ? `${selected.meses_publicado} meses` : "Reciente"],
                        ["📅 Scrapeado", selected.fecha_scraping ? new Date(selected.fecha_scraping).toLocaleDateString("es-AR") : "—"],
                        ["🏘️ Barrio", selected.barrio || "—"],
                        ["🏠 Tipo", TIPO_LABEL[selected.tipo] || selected.tipo || "—"],
                      ].map(([label, val]) => (
                        <div key={label} style={{ background: "#07111e", border: "1px solid #1e3a5f", borderRadius: 8, padding: "8px 10px" }}>
                          <div style={{ color: "#3a6ea8", fontSize: 10, marginBottom: 3 }}>{label}</div>
                          <div style={{ color: "#e0eaff", fontSize: 12, fontWeight: 600 }}>{val}</div>
                        </div>
                      ))}
                    </div>

                    {/* Descripción */}
                    {selected.descripcion && (
                      <div style={{ background: "#07111e", border: "1px solid #1e3a5f", borderRadius: 10, padding: 14 }}>
                        <div style={{ color: "#3a6ea8", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Descripción del aviso</div>
                        <div style={{ color: "#a0c4e8", fontSize: 12, lineHeight: 1.6 }}>{selected.descripcion.slice(0, 400)}{selected.descripcion.length > 400 ? "..." : ""}</div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "links" && (
                  <div>
                    <div style={{ color: "#3a6ea8", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Fuentes externas</div>
                    <LinkBtn href={links.googleMaps} icon="🗺️" label="Google Maps" note={selected.direccion} color="#34d399"/>
                    <LinkBtn href={links.streetView} icon="📷" label="Street View — ver fachada" note="Estado visual actual del inmueble" color="#34d399"/>
                    <LinkBtn href={links.ciudad3d} icon="🏙️" label="Ciudad 3D — zonificación y permisos" note="Código Urbanístico 2025" color="#FF6B35"/>
                    <LinkBtn href={links.agip} icon="💸" label="AGIP — consultar deuda ABL" note="Ingresar número de partida" color="#7ab3ff"/>
                    {selected.url && <LinkBtn href={selected.url} icon="🔍" label="Ver aviso original en ZonaProp" note="Publicación del dueño directo" color="#60a5fa"/>}
                    <LinkBtn href={links.boletinOficial} icon="📜" label="Boletín Oficial — edictos" note="Buscar sucesiones por dirección" color="#a78bfa"/>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#1e3a5f" }}>
              {loading ? (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
                  <div style={{ fontSize: 14, color: "#2a5080" }}>Cargando propiedades de Supabase...</div>
                </div>
              ) : (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🏙️</div>
                  <div style={{ fontSize: 14, color: "#2a5080" }}>Seleccioná una propiedad para ver el análisis</div>
                  <div style={{ fontSize: 11, color: "#1e3a5f", marginTop: 6 }}>{stats.total} propiedades cargadas · {stats.urgentes} con urgencia detectada</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
