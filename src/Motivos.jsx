import { useState, useEffect, useRef, useMemo } from "react";
import { dbGet, dbSet } from "./supabase.js";
import ImportarImagen from "./ImportarImagen.jsx";

// ═══════════════════════ CONSTANTES Y UTILIDADES ═══════════════════════
const T = {bg:"#faf7f2",bgCard:"#fff",bgMuted:"#f0ebe2",bgDeep:"#e6dfd4",ink:"#1e1c18",inkMid:"#5a5750",inkLt:"#9a9690",border:"#ddd8cf",borderLt:"#eae5dc",green:"#3d5a3e",greenLt:"#e8f0e8",tierra:"#8b6f47",danger:"#b03a2e",dangerLt:"#fdf0ee",warn:"#916a00",warnLt:"#fef8e6",ok:"#2d6a4f",okLt:"#e8f5ee",info:"#2c5f8a",infoLt:"#eaf2f8",violet:"#5b3f7a",violetLt:"#f2eef8"};
const num = v => Number(v) || 0;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const GPP_DEF = 0.012; // gramos por punto si todavía no se calibró con una muestra
const MAX_COLORES = 12;
const PALETA_BASE = [
  {nombre: "Crudo", hex: "#EAE3D2"},
  {nombre: "Gris", hex: "#9A9A94"},
  {nombre: "Negro", hex: "#2B2B2B"},
  {nombre: "Verde junco", hex: "#3D5A3E"},
  {nombre: "Tierra", hex: "#8B6F47"},
  {nombre: "Rojo teja", hex: "#A9442F"},
  {nombre: "Azul", hex: "#2C5F8A"}
];
const HERRAMIENTAS = [
  {id: "pincel", icono: "✏️", nombre: "Pincel", tecla: "B"},
  {id: "linea", icono: "╱", nombre: "Línea", tecla: "L"},
  {id: "rect", icono: "▭", nombre: "Rectángulo", tecla: "R"},
  {id: "elipse", icono: "◯", nombre: "Elipse", tecla: "E"},
  {id: "balde", icono: "🪣", nombre: "Rellenar", tecla: "G"},
  {id: "gotero", icono: "💧", nombre: "Gotero", tecla: "I"},
  {id: "seleccion", icono: "⬚", nombre: "Selección", tecla: "S"},
  {id: "vista", icono: "✋", nombre: "Mover vista", tecla: "H"}
];

function aRgb(hex) {
  let h = (hex || "#cccccc").replace("#", "");
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  const n = parseInt(h, 16);
  if (isNaN(n)) return [204, 204, 204];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mezclar(hex, destino, t) {
  const c = aRgb(hex);
  const r = c.map(v => Math.round(v + (destino - v) * t));
  return "rgb(" + r.join(",") + ")";
}

const crearGrilla = (ancho, alto) => {
  const g = [];
  for (let y = 0; y < alto; y++) g.push(new Array(ancho).fill(0));
  return g;
};
const copiarGrilla = g => g.map(f => f.slice());
const codificar = g => g.map(f => f.map(v => v.toString(36)).join(""));
const decodificar = (filas, ancho, alto, ncolores) => {
  const g = [];
  for (let y = 0; y < alto; y++) {
    const fila = (filas && filas[y]) || "";
    const r = [];
    for (let x = 0; x < ancho; x++) {
      const v = parseInt(fila[x], 36);
      r.push(isNaN(v) || v >= ncolores ? 0 : v);
    }
    g.push(r);
  }
  return g;
};
const norm = (x0, y0, x1, y1) => ({x0: Math.min(x0, x1), y0: Math.min(y0, y1), x1: Math.max(x0, x1), y1: Math.max(y0, y1)});

const linea = (x0, y0, x1, y1, fn) => {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  while (true) {
    fn(x0, y0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
};
const celdasLinea = (x0, y0, x1, y1) => { const out = []; linea(x0, y0, x1, y1, (a, b) => { out.push([a, b]); }); return out; };
const celdasRect = (x0, y0, x1, y1, lleno) => {
  const r = norm(x0, y0, x1, y1);
  const out = [];
  for (let y = r.y0; y <= r.y1; y++) {
    for (let x = r.x0; x <= r.x1; x++) {
      if (lleno || x === r.x0 || x === r.x1 || y === r.y0 || y === r.y1) out.push([x, y]);
    }
  }
  return out;
};
const celdasElipse = (x0, y0, x1, y1, lleno) => {
  const r = norm(x0, y0, x1, y1);
  const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2;
  const rx = (r.x1 - r.x0 + 1) / 2, ry = (r.y1 - r.y0 + 1) / 2;
  const out = [];
  for (let y = r.y0; y <= r.y1; y++) {
    for (let x = r.x0; x <= r.x1; x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      if (dx * dx + dy * dy > 1) continue;
      if (!lleno && rx > 1 && ry > 1) {
        const ix = (x - cx) / (rx - 1), iy = (y - cy) / (ry - 1);
        if (ix * ix + iy * iy < 1) continue;
      }
      out.push([x, y]);
    }
  }
  return out;
};
const rotarCW = celdas => {
  const h = celdas.length, w = celdas[0].length;
  const r = [];
  for (let j = 0; j < w; j++) {
    const fila = [];
    for (let i = 0; i < h; i++) fila.push(celdas[h - 1 - i][j]);
    r.push(fila);
  }
  return r;
};
const voltearFilas = celdas => celdas.map(f => f.slice().reverse());
const voltearCols = celdas => celdas.slice().reverse().map(f => f.slice());

// Vista previa: cada punto se dibuja como una "V" de tejido
function dibujarTejido(canvas, g, hexes, repH, repV, aspecto, maxAncho) {
  const H = g.length;
  const W = H ? g[0].length : 0;
  if (!W || !H) return;
  const totalW = W * repH;
  const cw = Math.max(3, Math.min(16, Math.floor(maxAncho / totalW)));
  const ch = Math.max(3, Math.round(cw * aspecto));
  canvas.width = totalW * cw;
  canvas.height = H * repV * ch;
  const ctx = canvas.getContext("2d");
  const oscuros = hexes.map(h => mezclar(h, 0, 0.38));
  const claros = hexes.map(h => mezclar(h, 255, 0.32));
  for (let vy = 0; vy < repV; vy++) {
    for (let y = 0; y < H; y++) {
      for (let vx = 0; vx < repH; vx++) {
        for (let x = 0; x < W; x++) {
          ctx.fillStyle = oscuros[g[y][x]] || "#999";
          ctx.fillRect((vx * W + x) * cw, (vy * H + y) * ch, cw, ch);
        }
      }
    }
  }
  ctx.lineCap = "round";
  for (let vy = 0; vy < repV; vy++) {
    for (let y = 0; y < H; y++) {
      for (let vx = 0; vx < repH; vx++) {
        for (let x = 0; x < W; x++) {
          const idx = g[y][x];
          const px = (vx * W + x) * cw;
          const py = (vy * H + y) * ch;
          if (cw < 6) {
            ctx.fillStyle = hexes[idx] || "#ccc";
            ctx.fillRect(px, py, cw, Math.max(1, ch - 1));
            continue;
          }
          ctx.strokeStyle = hexes[idx] || "#ccc";
          ctx.lineWidth = cw * 0.52;
          ctx.beginPath();
          ctx.moveTo(px + cw * 0.27, py + ch * 0.2);
          ctx.lineTo(px + cw * 0.5, py + ch * 0.82);
          ctx.moveTo(px + cw * 0.73, py + ch * 0.2);
          ctx.lineTo(px + cw * 0.5, py + ch * 0.82);
          ctx.stroke();
          if (cw >= 8) {
            ctx.strokeStyle = claros[idx] || "#fff";
            ctx.lineWidth = cw * 0.13;
            ctx.beginPath();
            ctx.moveTo(px + cw * 0.22, py + ch * 0.26);
            ctx.lineTo(px + cw * 0.4, py + ch * 0.68);
            ctx.moveTo(px + cw * 0.68, py + ch * 0.26);
            ctx.lineTo(px + cw * 0.52, py + ch * 0.68);
            ctx.stroke();
          }
        }
      }
    }
  }
}

const descargar = (canvas, nombre) => {
  if (!canvas) return;
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = nombre.replace(/[^a-zA-Z0-9_-]+/g, "_") + ".png";
  a.click();
};

// ═══════════════════════ COMPONENTES CHICOS ═══════════════════════
function Boton({ children, onClick, activo, primario, peligro, disabled, small, style, title }) {
  let bg = "transparent", col = T.ink, bor = "1px solid " + T.border;
  if (activo) { bg = T.greenLt; col = T.green; bor = "1px solid " + T.green; }
  if (primario) { bg = T.green; col = "#fff"; bor = "none"; }
  if (peligro) { bg = T.danger; col = "#fff"; bor = "none"; }
  return (
    <button onClick={onClick} disabled={disabled} title={title} style={{padding: small ? "4px 10px" : "7px 14px", borderRadius: 2, border: bor, background: bg, color: col, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1, fontSize: small ? 11 : 12, fontWeight: 500, fontFamily: "inherit", whiteSpace: "nowrap", ...(style || {})}}>{children}</button>
  );
}
function HerrBtn({ activo, onClick, titulo, children }) {
  return (
    <button onClick={onClick} title={titulo} style={{padding: "6px 10px", borderRadius: 4, border: "1px solid " + (activo ? T.green : T.border), background: activo ? T.green : T.bgCard, color: activo ? "#fff" : T.ink, cursor: "pointer", fontSize: 12, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap"}}>{children}</button>
  );
}
function Tarjeta({ children, titulo, style }) {
  return (
    <div style={{background: T.bgCard, border: "1px solid " + T.border, borderRadius: 4, padding: "1rem 1.1rem", marginBottom: 12, ...(style || {})}}>
      {titulo ? <div style={{fontSize: 11, color: T.inkMid, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10, fontWeight: 500}}>{titulo}</div> : null}
      {children}
    </div>
  );
}
function Campo({ label, ...p }) {
  return (
    <div style={{marginBottom: 10}}>
      {label ? <label style={{fontSize: 11, color: T.inkMid, display: "block", marginBottom: 4}}>{label}</label> : null}
      <input style={{width: "100%", padding: "7px 10px", border: "1px solid " + T.border, borderRadius: 2, background: T.bgCard, color: T.ink, fontSize: 13, boxSizing: "border-box", fontFamily: "inherit"}} {...p}/>
    </div>
  );
}
function Sep() { return <span style={{width: 1, height: 22, background: T.border, display: "inline-block", margin: "0 4px"}}/>; }

function Miniatura({ motivo, paleta }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const g = decodificar(motivo.celdas, motivo.ancho, motivo.alto, (motivo.colores || []).length || 1);
    const px = Math.max(2, Math.floor(110 / Math.max(motivo.ancho, motivo.alto)));
    c.width = motivo.ancho * px;
    c.height = motivo.alto * px;
    const ctx = c.getContext("2d");
    const hx = (motivo.colores || []).map(pid => { const p = paleta.find(q => q.id === pid); return p ? p.hex : "#ccc"; });
    for (let y = 0; y < motivo.alto; y++) {
      for (let x = 0; x < motivo.ancho; x++) {
        ctx.fillStyle = hx[g[y][x]] || "#ccc";
        ctx.fillRect(x * px, y * px, px, px);
      }
    }
  }, [motivo, paleta]);
  return <canvas ref={ref} style={{maxWidth: "100%", maxHeight: 110, border: "1px solid " + T.border, borderRadius: 2, background: "#fff"}}/>;
}

// ═══════════════════════ PALETA DEL TALLER ═══════════════════════
function PaletaTaller({ data, lanas, onGuardar, onVolver, estado }) {
  const [lista, setLista] = useState(data.paleta.map(c => ({...c})));
  const [sucio, setSucio] = useState(false);
  const cambiar = (id, k, v) => { setLista(lista.map(c => c.id === id ? {...c, [k]: v} : c)); setSucio(true); };
  const agregar = () => { setLista(lista.concat([{id: Date.now(), nombre: "Color nuevo", hex: "#888888", lanaId: null}])); setSucio(true); };
  const agregarBase = () => {
    const base = Date.now();
    const nuevos = PALETA_BASE
      .filter(b => !lista.some(c => c.nombre.toLowerCase() === b.nombre.toLowerCase()))
      .map((b, i) => ({id: base + i, nombre: b.nombre, hex: b.hex, lanaId: null}));
    setLista(lista.concat(nuevos));
    setSucio(true);
  };
  const quitar = c => {
    const usado = data.motivos.filter(m => (m.colores || []).includes(c.id)).length;
    if (usado > 0) { window.alert("\"" + c.nombre + "\" se usa en " + usado + " motivo(s). Sacalo de esos motivos antes de eliminarlo."); return; }
    if (!window.confirm("¿Eliminar el color \"" + c.nombre + "\"?")) return;
    setLista(lista.filter(x => x.id !== c.id));
    setSucio(true);
  };
  const guardar = () => { onGuardar(lista); setSucio(false); };
  const volver = () => { if (sucio && !window.confirm("Hay cambios sin guardar. ¿Salir igual?")) return; onVolver(); };
  return (
    <div>
      <div style={{display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16}}>
        <Boton onClick={volver}>← Volver</Boton>
        <div style={{flex: 1, fontSize: 18, fontWeight: 300}}>Paleta del taller</div>
        {sucio ? <span style={{fontSize: 11, color: T.warn}}>● sin guardar</span> : null}
        <span style={{fontSize: 11, color: estado === "error" ? T.danger : T.inkLt}}>{estado === "saving" ? "☁ Guardando…" : (estado === "error" ? "⚠ Error al guardar" : "")}</span>
        <Boton primario onClick={guardar} disabled={!sucio}>Guardar paleta</Boton>
      </div>
      <div style={{fontSize: 12, color: T.inkMid, marginBottom: 14, maxWidth: 640}}>
        Estos son los colores de lana que se usan para diseñar. Elegí el tono con el selector y, si querés, vinculá cada color con una lana de tu stock para comparar los gramos necesarios.
      </div>
      {lista.length === 0 ? <div style={{padding: "1.5rem", textAlign: "center", color: T.inkLt, fontSize: 13}}>Todavía no hay colores.</div> : null}
      {lista.map(c => (
        <div key={c.id} style={{display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "8px 10px", background: T.bgCard, border: "1px solid " + T.border, borderRadius: 4, marginBottom: 8}}>
          <input type="color" value={c.hex} onChange={e => cambiar(c.id, "hex", e.target.value)} style={{width: 44, height: 34, border: "1px solid " + T.border, borderRadius: 2, padding: 0, background: "none", cursor: "pointer"}}/>
          <input value={c.nombre} onChange={e => cambiar(c.id, "nombre", e.target.value)} placeholder="Nombre del color" style={{flex: 1, minWidth: 140, padding: "7px 10px", border: "1px solid " + T.border, borderRadius: 2, fontSize: 13, fontFamily: "inherit"}}/>
          <select value={c.lanaId === null || c.lanaId === undefined ? "" : String(c.lanaId)} onChange={e => cambiar(c.id, "lanaId", e.target.value === "" ? null : Number(e.target.value))} style={{minWidth: 180, padding: "7px 10px", border: "1px solid " + T.border, borderRadius: 2, fontSize: 12, fontFamily: "inherit", background: T.bgCard}}>
            <option value="">— sin vincular a stock —</option>
            {lanas.map(l => <option key={l.id} value={String(l.id)}>{l.tipo}{l.color ? " · " + l.color : ""} ({l.stock.toLocaleString()}g)</option>)}
          </select>
          <Boton small onClick={() => quitar(c)}>✕</Boton>
        </div>
      ))}
      <div style={{display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12}}>
        <Boton onClick={agregar}>+ Agregar color</Boton>
        <Boton onClick={agregarBase}>+ Agregar colores base</Boton>
      </div>
    </div>
  );
}

// ═══════════════════════ NUEVO MOTIVO ═══════════════════════
function NuevoMotivoModal({ onCrear, onCerrar }) {
  const [nombre, setNombre] = useState("");
  const [ancho, setAncho] = useState("20");
  const [alto, setAlto] = useState("20");
  const presets = [[10, 10], [20, 20], [30, 30], [40, 30], [60, 40], [80, 60]];
  const mob = window.innerWidth < 768;
  const crear = () => onCrear(nombre.trim(), clamp(Math.round(num(ancho)) || 20, 4, 120), clamp(Math.round(num(alto)) || 20, 4, 120));
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onCerrar(); }} style={{position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(30,28,24,0.5)", display: "flex", alignItems: mob ? "flex-end" : "center", justifyContent: "center", zIndex: 300}}>
      <div style={{background: T.bgCard, border: "1px solid " + T.border, borderRadius: mob ? "12px 12px 0 0" : 4, padding: "1.5rem", width: mob ? "100%" : 440, maxWidth: "100vw", fontFamily: "'Georgia',serif", color: T.ink}}>
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14}}>
          <h3 style={{margin: 0, fontSize: 17, fontWeight: 400}}>Nuevo motivo</h3>
          <button onClick={onCerrar} style={{background: "none", border: "none", cursor: "pointer", fontSize: 22, color: T.inkLt}}>×</button>
        </div>
        <Campo label="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Guarda de montañas"/>
        <div style={{fontSize: 11, color: T.inkMid, marginBottom: 6}}>Tamaño del gráfico (puntos × vueltas)</div>
        <div style={{display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10}}>
          {presets.map(p => <Boton key={p[0] + "x" + p[1]} small activo={num(ancho) === p[0] && num(alto) === p[1]} onClick={() => { setAncho(String(p[0])); setAlto(String(p[1])); }}>{p[0]}×{p[1]}</Boton>)}
        </div>
        <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10}}>
          <Campo label="Puntos (ancho)" type="number" min="4" max="120" value={ancho} onChange={e => setAncho(e.target.value)}/>
          <Campo label="Vueltas (alto)" type="number" min="4" max="120" value={alto} onChange={e => setAlto(e.target.value)}/>
        </div>
        <div style={{fontSize: 11, color: T.inkLt, marginBottom: 12}}>Después podés cambiar el tamaño, o importar una imagen como punto de partida.</div>
        <div style={{display: "flex", gap: 8, justifyContent: "flex-end"}}>
          <Boton onClick={onCerrar}>Cancelar</Boton>
          <Boton primario onClick={crear}>Crear y abrir</Boton>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════ EDITOR DE UN MOTIVO ═══════════════════════
function Editor({ motivo, paleta, lanas, prendas, mob, estado, onGuardar, onVolver, onAgregarPaleta }) {
  const [nombre, setNombre] = useState(motivo.nombre || "");
  const [prenda, setPrenda] = useState(motivo.prenda || "");
  const [etiquetas, setEtiquetas] = useState((motivo.etiquetas || []).join(", "));
  const [colores, setColores] = useState(motivo.colores || []);
  const [dims, setDims] = useState({ancho: motivo.ancho, alto: motivo.alto});
  const [nuevoAncho, setNuevoAncho] = useState(String(motivo.ancho));
  const [nuevoAlto, setNuevoAlto] = useState(String(motivo.alto));
  const [repH, setRepH] = useState(String(motivo.repH || 1));
  const [repV, setRepV] = useState(String(motivo.repV || 1));
  const [ptos10, setPtos10] = useState(motivo.ptos10 || "");
  const [vueltas10, setVueltas10] = useState(motivo.vueltas10 || "");
  const [pesoMuestra, setPesoMuestra] = useState(motivo.pesoMuestra || "");
  const [factor, setFactor] = useState(motivo.factor || "1");
  const [notas, setNotas] = useState(motivo.notas || "");
  const [herr, setHerr] = useState("pincel");
  const [formaLlena, setFormaLlena] = useState(false);
  const [global, setGlobal] = useState(false);
  const [sinFondo, setSinFondo] = useState(true);
  const [activo, setActivo] = useState(0);
  const [simH, setSimH] = useState(false);
  const [simV, setSimV] = useState(false);
  const [zoom, setZoom] = useState(mob ? 12 : 16);
  const [proporcion, setProporcion] = useState(false);
  const [numeros, setNumeros] = useState(true);
  const [sel, setSel] = useState(null);
  const [flot, setFlot] = useState(null);
  const [portap, setPortap] = useState(null);
  const [tick, setTick] = useState(0);
  const [sucio, setSucio] = useState(false);
  const [aviso, setAviso] = useState("");
  const [importando, setImportando] = useState(false);

  const gridRef = useRef(null);
  if (gridRef.current === null) {
    gridRef.current = decodificar(motivo.celdas, motivo.ancho, motivo.alto, (motivo.colores || []).length || 1);
  }
  const histRef = useRef({pasado: [], futuro: []});
  const baseRef = useRef(null);
  const ovRef = useRef(null);
  const contRef = useRef(null);
  const previewRef = useRef(null);
  const coordRef = useRef(null);
  const trans = useRef(null);
  const ptrs = useRef(new Map());
  const pinch = useRef(null);
  const pan = useRef(null);
  const espacio = useRef(false);
  const anclaRef = useRef(null);
  const kbRef = useRef(null);
  const zoomRelRef = useRef(null);

  // ── geometría del lienzo ──
  const asp = (num(ptos10) > 0 && num(vueltas10) > 0) ? num(ptos10) / num(vueltas10) : 1;
  const cw = zoom;
  const ch = proporcion ? Math.max(3, Math.round(zoom * asp)) : zoom;
  const ML = numeros ? 30 : 0;
  const MT = numeros ? 18 : 0;
  const W = dims.ancho;
  const H = dims.alto;
  const cvW = ML + W * cw + 2;
  const cvH = MT + H * ch + 2;

  const hexDePid = pid => { const c = paleta.find(p => p.id === pid); return c ? c.hex : "#cccccc"; };
  const bump = () => { setTick(t => t + 1); setSucio(true); };
  const avisar = t => { setAviso(t); setTimeout(() => setAviso(""), 3000); };

  // ── dibujo de la grilla ──
  useEffect(() => {
    const c = baseRef.current;
    if (!c) return;
    c.width = cvW;
    c.height = cvH;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, cvW, cvH);
    const g = gridRef.current;
    const hx = colores.map(hexDePid);
    for (let y = 0; y < g.length; y++) {
      for (let x = 0; x < g[0].length; x++) {
        ctx.fillStyle = hx[g[y][x]] || "#cccccc";
        ctx.fillRect(ML + x * cw, MT + y * ch, cw, ch);
      }
    }
    for (let x = 0; x <= W; x++) {
      const n = W - x;
      ctx.fillStyle = n % 10 === 0 ? "rgba(0,0,0,0.6)" : (n % 5 === 0 ? "rgba(0,0,0,0.32)" : "rgba(0,0,0,0.12)");
      ctx.fillRect(ML + x * cw, MT, 1, H * ch + 1);
    }
    for (let y = 0; y <= H; y++) {
      const n = H - y;
      ctx.fillStyle = n % 10 === 0 ? "rgba(0,0,0,0.6)" : (n % 5 === 0 ? "rgba(0,0,0,0.32)" : "rgba(0,0,0,0.12)");
      ctx.fillRect(ML, MT + y * ch, W * cw + 1, 1);
    }
    if (numeros) {
      ctx.fillStyle = "#555";
      ctx.font = Math.max(8, Math.min(11, Math.floor(Math.min(cw, ch) * 0.75))) + "px Helvetica, Arial, sans-serif";
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      for (let x = 0; x < W; x++) {
        const n = W - x;
        if (n === 1 || n % 5 === 0 || cw >= 24) ctx.fillText(String(n), ML + x * cw + cw / 2, MT / 2);
      }
      ctx.textAlign = "right";
      for (let y = 0; y < H; y++) {
        const n = H - y;
        if (n === 1 || n % 5 === 0 || ch >= 16) ctx.fillText(String(n), ML - 4, MT + y * ch + ch / 2);
      }
    }
  }, [tick, zoom, dims, colores, paleta, proporcion, numeros, ptos10, vueltas10]);

  // ── capa superior: previsualización de formas, selección y pegado ──
  const conSimetria = lista => {
    const out = lista.slice();
    if (simH) lista.forEach(p => { out.push([W - 1 - p[0], p[1]]); });
    if (simV) lista.forEach(p => { out.push([p[0], H - 1 - p[1]]); });
    if (simH && simV) lista.forEach(p => { out.push([W - 1 - p[0], H - 1 - p[1]]); });
    return out;
  };
  const dibujarOverlay = () => {
    const c = ovRef.current;
    if (!c) return;
    if (c.width !== cvW) c.width = cvW;
    if (c.height !== cvH) c.height = cvH;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    const celdasLista = (lista, color, alpha) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      lista.forEach(p => { ctx.fillRect(ML + p[0] * cw, MT + p[1] * ch, cw, ch); });
      ctx.globalAlpha = 1;
    };
    const matriz = (celdas, ox, oy, alpha) => {
      ctx.globalAlpha = alpha;
      celdas.forEach((fila, j) => fila.forEach((v, i) => {
        if (sinFondo && v === 0) return;
        const x = ox + i, y = oy + j;
        if (x < 0 || y < 0 || x >= W || y >= H) return;
        ctx.fillStyle = hexDePid(colores[v]);
        ctx.fillRect(ML + x * cw, MT + y * ch, cw, ch);
      }));
      ctx.globalAlpha = 1;
    };
    const marco = r => {
      const x = ML + r.x0 * cw + 0.5, y = MT + r.y0 * ch + 0.5;
      const w = (r.x1 - r.x0 + 1) * cw, h = (r.y1 - r.y0 + 1) * ch;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = "#fff";
      ctx.strokeRect(x, y, w, h);
      ctx.lineDashOffset = 5;
      ctx.strokeStyle = "#000";
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
    };
    const tr = trans.current;
    if (tr && tr.lista) {
      celdasLista(conSimetria(tr.lista), hexDePid(colores[activo]), 0.7);
    } else if (tr && tr.tipo === "sel") {
      marco(norm(tr.x0, tr.y0, tr.x1, tr.y1));
    } else if (tr && tr.tipo === "mover") {
      const r = tr.sel;
      const cel = [];
      for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) cel.push([x, y]);
      celdasLista(cel, hexDePid(colores[0]), 0.9);
      matriz(tr.matriz, r.x0 + tr.dx, r.y0 + tr.dy, 0.95);
      marco({x0: r.x0 + tr.dx, y0: r.y0 + tr.dy, x1: r.x1 + tr.dx, y1: r.y1 + tr.dy});
    } else if (sel) {
      marco(sel);
    }
    if (flot) {
      matriz(flot.celdas, flot.x, flot.y, 0.95);
      marco({x0: flot.x, y0: flot.y, x1: flot.x + flot.celdas[0].length - 1, y1: flot.y + flot.celdas.length - 1});
    }
  };
  useEffect(() => { dibujarOverlay(); }, [sel, flot, zoom, dims, proporcion, numeros, activo, colores, paleta, tick, sinFondo, simH, simV, ptos10, vueltas10]);

  // ── vista previa del tejido ──
  useEffect(() => {
    const c = previewRef.current;
    if (!c) return;
    const hexes = colores.map(hexDePid);
    const rH = clamp(Math.round(num(repH)) || 1, 1, 8);
    const rV = clamp(Math.round(num(repV)) || 1, 1, 8);
    const a = (num(ptos10) > 0 && num(vueltas10) > 0) ? num(ptos10) / num(vueltas10) : 0.8;
    dibujarTejido(c, gridRef.current, hexes, rH, rV, a, 640);
  }, [tick, colores, paleta, repH, repV, ptos10, vueltas10, dims]);

  // ── conteo de puntos y gramos ──
  const conteo = useMemo(() => {
    const arr = new Array(colores.length).fill(0);
    gridRef.current.forEach(f => { f.forEach(v => { if (v < arr.length) arr[v]++; }); });
    return arr;
  }, [tick, colores.length]);

  const calculo = useMemo(() => {
    const pp = num(ptos10), vv = num(vueltas10), pm = num(pesoMuestra);
    const calibrado = pp > 0 && vv > 0 && pm > 0;
    const gpp = calibrado ? pm / (pp * vv) : GPP_DEF;
    const fac = num(factor) > 0 ? num(factor) : 1;
    const rH = clamp(Math.round(num(repH)) || 1, 1, 8);
    const rV = clamp(Math.round(num(repV)) || 1, 1, 8);
    const reps = rH * rV;
    const filas = colores.map((pid, i) => {
      const c = paleta.find(p => p.id === pid);
      const puntos = conteo[i] || 0;
      const total = puntos * reps;
      return {i: i, pid: pid, nombre: c ? c.nombre : "(color eliminado)", hex: c ? c.hex : "#ccc", lanaId: c ? c.lanaId : null, puntos: puntos, total: total, gramos: total * gpp * fac};
    });
    const porLana = {};
    filas.forEach(f => {
      if (f.lanaId !== null && f.lanaId !== undefined) {
        const k = String(f.lanaId);
        porLana[k] = (porLana[k] || 0) + f.gramos;
      }
    });
    filas.forEach(f => {
      const lana = (f.lanaId !== null && f.lanaId !== undefined) ? lanas.find(l => String(l.id) === String(f.lanaId)) : null;
      f.lanaNombre = lana ? lana.tipo + (lana.color ? " · " + lana.color : "") : "";
      f.stock = lana ? lana.stock : null;
      f.alcanza = lana ? lana.stock >= porLana[String(f.lanaId)] : null;
    });
    const totalG = filas.reduce((a, f) => a + f.gramos, 0);
    return {rH: rH, rV: rV, reps: reps, gpp: gpp, calibrado: calibrado, fac: fac, filas: filas, totalG: totalG, pp: pp, vv: vv};
  }, [colores, paleta, conteo, ptos10, vueltas10, pesoMuestra, factor, repH, repV, lanas]);

  // ── historial ──
  const guardarHistorial = () => {
    const h = histRef.current;
    h.pasado.push(copiarGrilla(gridRef.current));
    if (h.pasado.length > 60) h.pasado.shift();
    h.futuro = [];
  };
  const aplicarGrilla = g => {
    gridRef.current = g;
    setDims({ancho: g.length ? g[0].length : 0, alto: g.length});
    bump();
  };
  const deshacer = () => {
    const h = histRef.current;
    if (!h.pasado.length) return;
    h.futuro.push(copiarGrilla(gridRef.current));
    setSel(null);
    setFlot(null);
    aplicarGrilla(h.pasado.pop());
  };
  const rehacer = () => {
    const h = histRef.current;
    if (!h.futuro.length) return;
    h.pasado.push(copiarGrilla(gridRef.current));
    setSel(null);
    setFlot(null);
    aplicarGrilla(h.futuro.pop());
  };

  // ── pintar ──
  const dibujarCelda = (x, y) => {
    const c = baseRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.fillStyle = hexDePid(colores[gridRef.current[y][x]]);
    ctx.fillRect(ML + x * cw + 1, MT + y * ch + 1, cw - 1, ch - 1);
  };
  const ponerCelda = (x, y, c, dibujar) => {
    const g = gridRef.current;
    if (y < 0 || x < 0 || y >= g.length || x >= g[0].length) return;
    g[y][x] = c;
    if (dibujar) dibujarCelda(x, y);
  };
  const pintarSim = (x, y, c) => {
    ponerCelda(x, y, c, true);
    if (simH) ponerCelda(W - 1 - x, y, c, true);
    if (simV) ponerCelda(x, H - 1 - y, c, true);
    if (simH && simV) ponerCelda(W - 1 - x, H - 1 - y, c, true);
  };
  const aplicarLista = (lista, c) => { conSimetria(lista).forEach(p => { ponerCelda(p[0], p[1], c, false); }); };
  const calcForma = (tipo, x0, y0, x1, y1) => {
    if (tipo === "linea") return celdasLinea(x0, y0, x1, y1);
    if (tipo === "rect") return celdasRect(x0, y0, x1, y1, formaLlena);
    return celdasElipse(x0, y0, x1, y1, formaLlena);
  };
  const restringir = (tipo, x0, y0, x1, y1) => {
    const dx = x1 - x0, dy = y1 - y0;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (tipo === "linea") {
      if (ax > 2 * ay) return [x1, y0];
      if (ay > 2 * ax) return [x0, y1];
    }
    const m = Math.max(ax, ay);
    return [x0 + (dx < 0 ? -m : m), y0 + (dy < 0 ? -m : m)];
  };
  const rellenar = (x, y, nuevo) => {
    const g = gridRef.current;
    const objetivo = g[y][x];
    if (objetivo === nuevo) return;
    if (global) {
      g.forEach(f => { for (let i = 0; i < f.length; i++) { if (f[i] === objetivo) f[i] = nuevo; } });
      return;
    }
    const pila = [[x, y]];
    while (pila.length) {
      const p = pila.pop();
      const cx = p[0], cy = p[1];
      if (cy < 0 || cx < 0 || cy >= g.length || cx >= g[0].length) continue;
      if (g[cy][cx] !== objetivo) continue;
      g[cy][cx] = nuevo;
      pila.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
  };

  // ── selección, copiar y pegar ──
  const extraer = s => {
    const g = gridRef.current;
    const filas = [];
    for (let y = s.y0; y <= s.y1; y++) filas.push(g[y].slice(s.x0, s.x1 + 1));
    return filas;
  };
  const limpiarRegion = s => {
    const g = gridRef.current;
    for (let y = s.y0; y <= s.y1; y++) for (let x = s.x0; x <= s.x1; x++) g[y][x] = 0;
  };
  const estampar = (celdas, ox, oy, omitirFondo) => {
    const g = gridRef.current;
    celdas.forEach((fila, j) => fila.forEach((v, i) => {
      const x = ox + i, y = oy + j;
      if (x < 0 || y < 0 || y >= g.length || x >= g[0].length) return;
      if (omitirFondo && v === 0) return;
      g[y][x] = v;
    }));
  };
  const copiar = () => {
    if (!sel) return;
    setPortap({celdas: extraer(sel)});
    avisar("Copiado: " + (sel.x1 - sel.x0 + 1) + "×" + (sel.y1 - sel.y0 + 1) + " puntos.");
  };
  const cortar = () => {
    if (!sel) return;
    setPortap({celdas: extraer(sel)});
    guardarHistorial();
    limpiarRegion(sel);
    bump();
  };
  const borrarSel = () => {
    if (!sel) return;
    guardarHistorial();
    limpiarRegion(sel);
    bump();
  };
  const fijarFlot = () => {
    if (!flot) return;
    guardarHistorial();
    estampar(flot.celdas, flot.x, flot.y, sinFondo);
    const w = flot.celdas[0].length, h = flot.celdas.length;
    setSel({x0: clamp(flot.x, 0, W - 1), y0: clamp(flot.y, 0, H - 1), x1: clamp(flot.x + w - 1, 0, W - 1), y1: clamp(flot.y + h - 1, 0, H - 1)});
    setFlot(null);
    bump();
  };
  const pegar = () => {
    if (!portap) { avisar("No hay nada copiado."); return; }
    if (flot) fijarFlot();
    const cont = contRef.current;
    let x = sel ? sel.x0 : (cont ? Math.floor((cont.scrollLeft - ML) / cw) + 1 : 0);
    let y = sel ? sel.y0 : (cont ? Math.floor((cont.scrollTop - MT) / ch) + 1 : 0);
    x = clamp(x, 0, W - 1);
    y = clamp(y, 0, H - 1);
    setFlot({celdas: portap.celdas, x: x, y: y});
    setHerr("seleccion");
    setSel(null);
  };
  const voltearSel = horiz => {
    if (flot) { setFlot({...flot, celdas: horiz ? voltearFilas(flot.celdas) : voltearCols(flot.celdas)}); return; }
    if (!sel) return;
    guardarHistorial();
    const celdas = extraer(sel);
    estampar(horiz ? voltearFilas(celdas) : voltearCols(celdas), sel.x0, sel.y0, false);
    bump();
  };
  const rotarSel = () => {
    if (flot) { setFlot({...flot, celdas: rotarCW(flot.celdas)}); return; }
    if (!sel) return;
    guardarHistorial();
    const celdas = extraer(sel);
    limpiarRegion(sel);
    const rot = rotarCW(celdas);
    estampar(rot, sel.x0, sel.y0, false);
    setSel({x0: sel.x0, y0: sel.y0, x1: Math.min(W - 1, sel.x0 + rot[0].length - 1), y1: Math.min(H - 1, sel.y0 + rot.length - 1)});
    bump();
  };
  const selTodo = () => { setFlot(null); setSel({x0: 0, y0: 0, x1: W - 1, y1: H - 1}); };
  const moverSel = (dx, dy) => {
    if (!sel) return;
    guardarHistorial();
    const celdas = extraer(sel);
    limpiarRegion(sel);
    const ns = {x0: sel.x0 + dx, y0: sel.y0 + dy, x1: sel.x1 + dx, y1: sel.y1 + dy};
    estampar(celdas, ns.x0, ns.y0, sinFondo);
    setSel(ns);
    bump();
  };
  const desplazarTodo = (dx, dy) => {
    guardarHistorial();
    const g = gridRef.current;
    const n = crearGrilla(g[0].length, g.length);
    for (let y = 0; y < g.length; y++) {
      for (let x = 0; x < g[0].length; x++) n[(y + dy + g.length) % g.length][(x + dx + g[0].length) % g[0].length] = g[y][x];
    }
    aplicarGrilla(n);
  };
  const moverConFlechas = (dx, dy) => {
    if (flot) { setFlot({...flot, x: flot.x + dx, y: flot.y + dy}); return; }
    if (sel) { moverSel(dx, dy); return; }
    desplazarTodo(dx, dy);
  };

  // ── acciones sobre todo el gráfico ──
  const voltearH = () => { guardarHistorial(); setSel(null); setFlot(null); aplicarGrilla(voltearFilas(gridRef.current)); };
  const voltearV = () => { guardarHistorial(); setSel(null); setFlot(null); aplicarGrilla(voltearCols(gridRef.current)); };
  const rotarTodo = () => {
    guardarHistorial();
    setSel(null);
    setFlot(null);
    const g = rotarCW(gridRef.current);
    setNuevoAncho(String(g[0].length));
    setNuevoAlto(String(g.length));
    aplicarGrilla(g);
  };
  const limpiar = () => {
    if (!window.confirm("¿Rellenar todo el gráfico con el color de fondo?")) return;
    guardarHistorial();
    setSel(null);
    setFlot(null);
    aplicarGrilla(crearGrilla(W, H));
  };
  const aplicarTamano = () => {
    const A = clamp(Math.round(num(nuevoAncho)) || 4, 4, 120);
    const Hh = clamp(Math.round(num(nuevoAlto)) || 4, 4, 120);
    guardarHistorial();
    setSel(null);
    setFlot(null);
    const vieja = gridRef.current;
    const g = crearGrilla(A, Hh);
    for (let y = 0; y < Math.min(Hh, vieja.length); y++) {
      for (let x = 0; x < Math.min(A, vieja[0].length); x++) g[y][x] = vieja[y][x];
    }
    setNuevoAncho(String(A));
    setNuevoAlto(String(Hh));
    aplicarGrilla(g);
  };

  // ── colores del motivo ──
  const agregarColor = () => {
    if (colores.length >= MAX_COLORES) { avisar("Máximo " + MAX_COLORES + " colores por motivo."); return; }
    const libre = paleta.find(p => !colores.includes(p.id));
    if (!libre) { avisar("No quedan colores libres en la paleta. Agregá más en \"Paleta del taller\"."); return; }
    setColores(colores.concat([libre.id]));
    setSucio(true);
  };
  const cambiarColor = (i, pid) => { setColores(colores.map((c, j) => j === i ? pid : c)); setSucio(true); };
  const quitarColor = i => {
    if (colores.length <= 1) return;
    histRef.current = {pasado: [], futuro: []};
    setSel(null);
    setFlot(null);
    const g = gridRef.current.map(f => f.map(v => (v === i ? 0 : (v > i ? v - 1 : v))));
    setColores(colores.filter((_, j) => j !== i));
    setActivo(Math.max(0, Math.min(activo, colores.length - 2)));
    aplicarGrilla(g);
  };

  // ── zoom y desplazamiento ──
  const cambiarZoom = (nuevo, ancla) => {
    let z = clamp(Math.round(nuevo), 4, 48);
    if (z === zoom && nuevo !== zoom) z = clamp(nuevo > zoom ? zoom + 1 : zoom - 1, 4, 48);
    if (z === zoom) return;
    const cont = contRef.current;
    if (ancla && cont) {
      const rc = cont.getBoundingClientRect();
      const px = ancla.x - rc.left, py = ancla.y - rc.top;
      anclaRef.current = {cx: (cont.scrollLeft + px - ML) / cw, cy: (cont.scrollTop + py - MT) / ch, px: px, py: py};
    }
    setZoom(z);
  };
  zoomRelRef.current = (factor, ancla) => cambiarZoom(zoom * factor, ancla);
  useEffect(() => {
    const a = anclaRef.current;
    const cont = contRef.current;
    if (a && cont) {
      cont.scrollLeft = ML + a.cx * cw - a.px;
      cont.scrollTop = MT + a.cy * ch - a.py;
    }
    anclaRef.current = null;
  }, [zoom]);
  useEffect(() => {
    const cont = contRef.current;
    if (!cont) return;
    const fn = e => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        zoomRelRef.current(e.deltaY < 0 ? 1.12 : 0.89, {x: e.clientX, y: e.clientY});
      }
    };
    cont.addEventListener("wheel", fn, {passive: false});
    return () => cont.removeEventListener("wheel", fn);
  }, []);
  const ajustar = () => {
    const cont = contRef.current;
    if (!cont) return;
    cambiarZoom(Math.floor((cont.clientWidth - ML - 6) / W));
  };

  // ── puntero (mouse, lápiz y dedos) ──
  const celdaEn = e => {
    const r = ovRef.current.getBoundingClientRect();
    return [clamp(Math.floor((e.clientX - r.left - ML) / cw), 0, W - 1), clamp(Math.floor((e.clientY - r.top - MT) / ch), 0, H - 1)];
  };
  const capturar = e => { try { ovRef.current.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ } };
  const medirPunteros = () => {
    const p = Array.from(ptrs.current.values());
    return {d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), mx: (p[0].x + p[1].x) / 2, my: (p[0].y + p[1].y) / 2};
  };
  const abortarTrazo = () => {
    const tr = trans.current;
    if (tr && tr.tipo === "pincel") {
      const h = histRef.current;
      if (h.pasado.length) gridRef.current = h.pasado.pop();
      bump();
    }
    trans.current = null;
    dibujarOverlay();
  };
  const alBajar = e => {
    ptrs.current.set(e.pointerId, {x: e.clientX, y: e.clientY});
    if (ptrs.current.size === 2) {
      abortarTrazo();
      const m = medirPunteros();
      pinch.current = {d0: m.d, z0: zoom, mx: m.mx, my: m.my};
      return;
    }
    if (ptrs.current.size > 2) return;
    const cont = contRef.current;
    if (herr === "vista" || e.button === 1 || espacio.current) {
      pan.current = {sx: e.clientX, sy: e.clientY, l: cont.scrollLeft, t: cont.scrollTop};
      capturar(e);
      return;
    }
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (colores.length === 0) return;
    const p = celdaEn(e);
    const x = p[0], y = p[1];
    capturar(e);
    if (herr === "gotero") { setActivo(gridRef.current[y][x]); return; }
    if (herr === "balde") { guardarHistorial(); rellenar(x, y, activo); bump(); return; }
    if (herr === "pincel") {
      guardarHistorial();
      trans.current = {tipo: "pincel", ultima: [x, y]};
      pintarSim(x, y, activo);
      return;
    }
    if (herr === "linea" || herr === "rect" || herr === "elipse") {
      trans.current = {tipo: herr, x0: x, y0: y, x1: x, y1: y, lista: calcForma(herr, x, y, x, y)};
      dibujarOverlay();
      return;
    }
    if (herr === "seleccion") {
      if (flot) {
        const fw = flot.celdas[0].length, fh = flot.celdas.length;
        if (x >= flot.x && x < flot.x + fw && y >= flot.y && y < flot.y + fh) {
          trans.current = {tipo: "moverFlot", x0: x, y0: y, fx: flot.x, fy: flot.y};
          return;
        }
        fijarFlot();
      }
      if (sel && x >= sel.x0 && x <= sel.x1 && y >= sel.y0 && y <= sel.y1) {
        trans.current = {tipo: "mover", x0: x, y0: y, dx: 0, dy: 0, sel: sel, matriz: extraer(sel)};
        return;
      }
      trans.current = {tipo: "sel", x0: x, y0: y, x1: x, y1: y};
      setSel(null);
      dibujarOverlay();
    }
  };
  const alMover = e => {
    if (ptrs.current.has(e.pointerId)) ptrs.current.set(e.pointerId, {x: e.clientX, y: e.clientY});
    const cont = contRef.current;
    if (pinch.current && ptrs.current.size === 2) {
      const m = medirPunteros();
      const nz = clamp(Math.round(pinch.current.z0 * m.d / pinch.current.d0), 4, 48);
      if (nz !== zoom) cambiarZoom(nz, {x: m.mx, y: m.my});
      else { cont.scrollLeft -= m.mx - pinch.current.mx; cont.scrollTop -= m.my - pinch.current.my; }
      pinch.current.mx = m.mx;
      pinch.current.my = m.my;
      return;
    }
    if (pan.current) {
      cont.scrollLeft = pan.current.l - (e.clientX - pan.current.sx);
      cont.scrollTop = pan.current.t - (e.clientY - pan.current.sy);
      return;
    }
    const p = celdaEn(e);
    const x = p[0], y = p[1];
    if (coordRef.current) coordRef.current.textContent = "Punto " + (W - x) + " · Vuelta " + (H - y);
    const tr = trans.current;
    if (!tr) return;
    if (tr.tipo === "pincel") {
      if (x === tr.ultima[0] && y === tr.ultima[1]) return;
      linea(tr.ultima[0], tr.ultima[1], x, y, (a, b) => { pintarSim(a, b, activo); });
      tr.ultima = [x, y];
      return;
    }
    if (tr.tipo === "linea" || tr.tipo === "rect" || tr.tipo === "elipse") {
      let ex = x, ey = y;
      if (e.shiftKey) { const r = restringir(tr.tipo, tr.x0, tr.y0, x, y); ex = r[0]; ey = r[1]; }
      tr.x1 = ex;
      tr.y1 = ey;
      tr.lista = calcForma(tr.tipo, tr.x0, tr.y0, ex, ey);
      dibujarOverlay();
      return;
    }
    if (tr.tipo === "sel") { tr.x1 = x; tr.y1 = y; dibujarOverlay(); return; }
    if (tr.tipo === "mover") { tr.dx = x - tr.x0; tr.dy = y - tr.y0; dibujarOverlay(); return; }
    if (tr.tipo === "moverFlot" && flot) setFlot({...flot, x: tr.fx + (x - tr.x0), y: tr.fy + (y - tr.y0)});
  };
  const alSoltar = e => {
    ptrs.current.delete(e.pointerId);
    if (pinch.current) { if (ptrs.current.size < 2) pinch.current = null; return; }
    if (pan.current) { pan.current = null; return; }
    const tr = trans.current;
    trans.current = null;
    if (!tr) return;
    if (tr.tipo === "pincel") { bump(); return; }
    if (tr.tipo === "linea" || tr.tipo === "rect" || tr.tipo === "elipse") {
      guardarHistorial();
      aplicarLista(tr.lista, activo);
      bump();
      dibujarOverlay();
      return;
    }
    if (tr.tipo === "sel") { setSel(norm(tr.x0, tr.y0, tr.x1, tr.y1)); return; }
    if (tr.tipo === "mover") {
      if (tr.dx !== 0 || tr.dy !== 0) {
        guardarHistorial();
        limpiarRegion(tr.sel);
        estampar(tr.matriz, tr.sel.x0 + tr.dx, tr.sel.y0 + tr.dy, sinFondo);
        setSel({x0: tr.sel.x0 + tr.dx, y0: tr.sel.y0 + tr.dy, x1: tr.sel.x1 + tr.dx, y1: tr.sel.y1 + tr.dy});
        bump();
      } else {
        dibujarOverlay();
      }
    }
  };

  // ── atajos de teclado ──
  kbRef.current = e => {
    const t = e.target;
    const tag = t && t.tagName ? t.tagName.toLowerCase() : "";
    if (tag === "input" || tag === "textarea" || tag === "select") return;
    if (importando) return;
    const k = e.key;
    const ctrl = e.ctrlKey || e.metaKey;
    if (k === " ") { espacio.current = true; e.preventDefault(); return; }
    if (ctrl) {
      const kl = k.toLowerCase();
      if (kl === "z") { e.preventDefault(); if (e.shiftKey) rehacer(); else deshacer(); }
      else if (kl === "y") { e.preventDefault(); rehacer(); }
      else if (kl === "c") { e.preventDefault(); copiar(); }
      else if (kl === "x") { e.preventDefault(); cortar(); }
      else if (kl === "v") { e.preventDefault(); pegar(); }
      else if (kl === "a") { e.preventDefault(); selTodo(); }
      return;
    }
    const mapa = {b: "pincel", l: "linea", r: "rect", e: "elipse", g: "balde", i: "gotero", s: "seleccion", h: "vista"};
    if (mapa[k.toLowerCase()]) { setHerr(mapa[k.toLowerCase()]); return; }
    if (k >= "1" && k <= "9") { const i = Number(k) - 1; if (i < colores.length) setActivo(i); return; }
    if (k === "+" || k === "=") { cambiarZoom(zoom + 2); return; }
    if (k === "-") { cambiarZoom(zoom - 2); return; }
    if (k === "Delete" || k === "Backspace") { if (sel) { e.preventDefault(); borrarSel(); } return; }
    if (k === "Escape") { trans.current = null; setSel(null); setFlot(null); return; }
    if (k === "Enter") { if (flot) fijarFlot(); return; }
    if (k.indexOf("Arrow") === 0) {
      e.preventDefault();
      const d = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]}[k];
      moverConFlechas(d[0], d[1]);
    }
  };
  useEffect(() => {
    const down = e => { if (kbRef.current) kbRef.current(e); };
    const up = e => { if (e.key === " ") espacio.current = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  // ── importar imagen ──
  const abrirImportar = () => {
    const hayDibujo = gridRef.current.some(f => f.some(v => v !== 0));
    if (hayDibujo && !window.confirm("Importar una imagen reemplaza el gráfico actual. ¿Continuar?")) return;
    setImportando(true);
  };
  const aplicarImportacion = r => {
    histRef.current = {pasado: [], futuro: []};
    setSel(null);
    setFlot(null);
    setColores(r.coloresIds);
    setActivo(0);
    setNuevoAncho(String(r.ancho));
    setNuevoAlto(String(r.alto));
    aplicarGrilla(r.grid);
    setImportando(false);
    avisar("Imagen importada: " + r.ancho + "×" + r.alto + " puntos, " + r.coloresIds.length + " colores.");
  };

  // ── guardar y salir ──
  const guardar = () => {
    onGuardar({
      id: motivo.id,
      tipo: "colorwork",
      nombre: nombre.trim() || "Motivo sin nombre",
      prenda: prenda,
      etiquetas: etiquetas.split(",").map(s => s.trim()).filter(Boolean),
      ancho: dims.ancho,
      alto: dims.alto,
      celdas: codificar(gridRef.current),
      colores: colores,
      repH: calculo.rH,
      repV: calculo.rV,
      ptos10: ptos10, vueltas10: vueltas10, pesoMuestra: pesoMuestra, factor: factor,
      notas: notas,
      actualizado: new Date().toISOString()
    });
    setSucio(false);
  };
  const volver = () => { if (sucio && !window.confirm("Hay cambios sin guardar. ¿Salir igual?")) return; onVolver(); };
  const copiarResumen = () => {
    let t = "MOTIVO: " + (nombre || "sin nombre") + "\n";
    t += "Tamaño: " + dims.ancho + " puntos × " + dims.alto + " vueltas, repetido " + calculo.rH + "×" + calculo.rV + "\n";
    if (prenda) t += "Prenda: " + prenda + "\n";
    t += "\nLana por color:\n";
    calculo.filas.forEach(f => { t += "- " + f.nombre + ": " + f.total.toLocaleString() + " puntos → " + Math.ceil(f.gramos) + " g\n"; });
    t += "Total: " + Math.ceil(calculo.totalG) + " g (con 10% extra: " + Math.ceil(calculo.totalG * 1.1) + " g)";
    if (!calculo.calibrado) t += "\n(Estimación aproximada: falta calibrar con una muestra)";
    if (notas) t += "\nNotas: " + notas;
    if (navigator.clipboard) navigator.clipboard.writeText(t);
    avisar("Resumen copiado");
  };

  const anchoCm = calculo.pp > 0 ? dims.ancho / calculo.pp * 10 : 0;
  const altoCm = calculo.vv > 0 ? dims.alto / calculo.vv * 10 : 0;
  const hSel = colores.length ? hexDePid(colores[Math.min(activo, colores.length - 1)]) : "#ccc";
  const cursor = herr === "vista" ? "grab" : (herr === "gotero" ? "copy" : "crosshair");
  const mostrarSel = herr === "seleccion" || sel || flot;

  return (
    <div>
      <div style={{display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14}}>
        <Boton onClick={volver}>← Volver</Boton>
        <input value={nombre} onChange={e => { setNombre(e.target.value); setSucio(true); }} placeholder="Nombre del motivo" style={{flex: 1, minWidth: 160, padding: "8px 12px", border: "1px solid " + T.border, borderRadius: 2, fontSize: 15, fontFamily: "inherit"}}/>
        {sucio ? <span style={{fontSize: 11, color: T.warn}}>● sin guardar</span> : null}
        <span style={{fontSize: 11, color: estado === "error" ? T.danger : T.inkLt}}>{estado === "saving" ? "☁ Guardando…" : (estado === "error" ? "⚠ Error al guardar" : "")}</span>
        <Boton primario onClick={guardar}>Guardar motivo</Boton>
      </div>
      {aviso ? <div style={{background: T.infoLt, border: "1px solid " + T.info, borderRadius: 2, padding: "7px 12px", marginBottom: 10, fontSize: 12, color: T.info}}>{aviso}</div> : null}

      <div style={{display: "grid", gridTemplateColumns: mob ? "1fr" : "minmax(0,1fr) 370px", gap: 14, alignItems: "start"}}>
        {/* ── Izquierda: herramientas y gráfico ── */}
        <div>
          <Tarjeta style={{padding: "0.8rem"}}>
            <div style={{display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8}}>
              {HERRAMIENTAS.map(h => (
                <HerrBtn key={h.id} activo={herr === h.id} onClick={() => setHerr(h.id)} titulo={h.nombre + " (" + h.tecla + ")"}>
                  <span>{h.icono}</span>{mob ? null : <span>{h.nombre}</span>}
                </HerrBtn>
              ))}
            </div>

            <div style={{display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 8}}>
              {(herr === "rect" || herr === "elipse") ? <Boton small activo={formaLlena} onClick={() => setFormaLlena(!formaLlena)}>{formaLlena ? "■ Lleno" : "□ Solo borde"}</Boton> : null}
              {herr === "balde" ? <Boton small activo={global} onClick={() => setGlobal(!global)} title="Reemplaza todos los puntos de ese color">Todo el color</Boton> : null}
              <Boton small activo={simH} onClick={() => setSimH(!simH)} title="Dibuja también el reflejo izquierda-derecha">Simetría ↔</Boton>
              <Boton small activo={simV} onClick={() => setSimV(!simV)} title="Dibuja también el reflejo arriba-abajo">Simetría ↕</Boton>
              <span style={{display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: T.inkMid, marginLeft: 4}}>Color <span style={{width: 18, height: 18, background: hSel, border: "1px solid rgba(0,0,0,0.3)", borderRadius: 3, display: "inline-block"}}/></span>
            </div>

            {mostrarSel ? (
              <div style={{display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center", marginBottom: 8, padding: "6px 8px", background: T.bg, borderRadius: 4}}>
                <Boton small onClick={copiar} disabled={!sel}>Copiar</Boton>
                <Boton small onClick={cortar} disabled={!sel}>Cortar</Boton>
                <Boton small onClick={pegar} disabled={!portap}>Pegar</Boton>
                <Boton small onClick={borrarSel} disabled={!sel}>Borrar</Boton>
                <Boton small onClick={() => voltearSel(true)} disabled={!sel && !flot}>↔</Boton>
                <Boton small onClick={() => voltearSel(false)} disabled={!sel && !flot}>↕</Boton>
                <Boton small onClick={rotarSel} disabled={!sel && !flot}>⟳ 90°</Boton>
                <Boton small onClick={selTodo}>Todo</Boton>
                {flot ? <Boton small primario onClick={fijarFlot}>Fijar</Boton> : null}
                {flot ? <Boton small onClick={() => setFlot(null)}>Cancelar</Boton> : null}
                <label style={{display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: T.inkMid, cursor: "pointer"}}>
                  <input type="checkbox" checked={sinFondo} onChange={e => setSinFondo(e.target.checked)}/>Pegar sin fondo
                </label>
              </div>
            ) : null}

            <div style={{display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center", marginBottom: 8}}>
              <Boton small onClick={deshacer} title="Ctrl+Z">↶ Deshacer</Boton>
              <Boton small onClick={rehacer} title="Ctrl+Y">↷ Rehacer</Boton>
              <Sep/>
              <Boton small onClick={voltearH}>Voltear ↔</Boton>
              <Boton small onClick={voltearV}>Voltear ↕</Boton>
              <Boton small onClick={rotarTodo}>Rotar 90°</Boton>
              <Boton small onClick={limpiar}>Limpiar</Boton>
              <Sep/>
              <Boton small onClick={abrirImportar}>🖼 Importar imagen</Boton>
              <Boton small onClick={() => descargar(baseRef.current, (nombre || "motivo") + "_grafico")}>⬇ Gráfico</Boton>
            </div>

            <div style={{display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 10}}>
              <Boton small onClick={() => cambiarZoom(zoom - 2)}>−</Boton>
              <input type="range" min="4" max="48" value={zoom} onChange={e => cambiarZoom(Number(e.target.value))} style={{width: 110}}/>
              <Boton small onClick={() => cambiarZoom(zoom + 2)}>+</Boton>
              <Boton small onClick={ajustar}>Ajustar</Boton>
              <Sep/>
              <Boton small activo={numeros} onClick={() => setNumeros(!numeros)} title="Numeración de puntos y vueltas">123</Boton>
              <Boton small activo={proporcion} onClick={() => setProporcion(!proporcion)} title="Muestra cada punto con su proporción real (necesita puntos y vueltas en 10 cm)">Proporción real</Boton>
              <span ref={coordRef} style={{fontSize: 11, color: T.inkLt, marginLeft: "auto"}}></span>
            </div>

            {colores.length === 0 ? <div style={{padding: "0.8rem", fontSize: 12, color: T.warn, background: T.warnLt, borderRadius: 2, marginBottom: 10}}>Agregá al menos un color (panel de la derecha) para empezar a dibujar.</div> : null}

            <div ref={contRef} style={{overflow: "auto", maxHeight: mob ? "55vh" : "68vh", border: "1px solid " + T.border, background: "#f4f1ea", position: "relative"}}>
              <div style={{position: "relative", width: cvW, height: cvH}}>
                <canvas ref={baseRef} style={{position: "absolute", left: 0, top: 0}}/>
                <canvas ref={ovRef} onPointerDown={alBajar} onPointerMove={alMover} onPointerUp={alSoltar} onPointerCancel={alSoltar}
                  style={{position: "absolute", left: 0, top: 0, cursor: cursor, touchAction: "none"}}/>
              </div>
            </div>
            <div style={{fontSize: 10, color: T.inkLt, marginTop: 6, lineHeight: 1.5}}>
              Fila 1 abajo; puntos numerados de derecha a izquierda. Atajos: B pincel · L línea · R rectángulo · E elipse · G rellenar · I gotero · S selección · H mover vista · 1-9 color · Ctrl+Z/Y · Ctrl+C/X/V · espacio+arrastrar o ✋ para desplazarte · Ctrl+rueda o pellizco para el zoom · Shift para formas rectas.
            </div>
          </Tarjeta>
        </div>

        {/* ── Derecha: paneles ── */}
        <div>
          <Tarjeta titulo="Colores del motivo">
            {colores.map((pid, i) => {
              const usados = colores.filter((x, j) => j !== i);
              const opciones = paleta.filter(p => !usados.includes(p.id));
              return (
                <div key={i} style={{display: "flex", alignItems: "center", gap: 8, padding: "5px 7px", border: activo === i ? "2px solid " + T.green : "1px solid " + T.border, background: activo === i ? T.greenLt : T.bgCard, borderRadius: 4, marginBottom: 6}}>
                  <div onClick={() => setActivo(i)} title={"Usar este color (" + (i + 1) + ")"} style={{width: 28, height: 28, borderRadius: 4, background: hexDePid(pid), border: "1px solid rgba(0,0,0,0.25)", cursor: "pointer", flexShrink: 0}}/>
                  <select value={pid} onChange={e => cambiarColor(i, Number(e.target.value))} style={{flex: 1, minWidth: 0, padding: "5px 6px", border: "1px solid " + T.border, borderRadius: 2, fontSize: 12, fontFamily: "inherit", background: T.bgCard}}>
                    {opciones.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                  <span style={{fontSize: 10, color: T.inkLt, whiteSpace: "nowrap"}}>{i === 0 ? "fondo · " : ""}{(conteo[i] || 0)} pts</span>
                  <button onClick={() => quitarColor(i)} disabled={colores.length <= 1} style={{border: "none", background: "none", cursor: "pointer", color: T.danger, fontSize: 14, opacity: colores.length <= 1 ? 0.3 : 1}}>✕</button>
                </div>
              );
            })}
            <Boton small onClick={agregarColor}>+ Agregar color</Boton>
          </Tarjeta>

          <Tarjeta titulo="Tamaño, repetición y datos">
            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end"}}>
              <Campo label="Puntos (ancho)" type="number" min="4" max="120" value={nuevoAncho} onChange={e => setNuevoAncho(e.target.value)}/>
              <Campo label="Vueltas (alto)" type="number" min="4" max="120" value={nuevoAlto} onChange={e => setNuevoAlto(e.target.value)}/>
              <div style={{marginBottom: 10}}><Boton small onClick={aplicarTamano}>Aplicar</Boton></div>
            </div>
            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8}}>
              <Campo label="Repeticiones ↔" type="number" min="1" max="8" value={repH} onChange={e => { setRepH(e.target.value); setSucio(true); }}/>
              <Campo label="Repeticiones ↕" type="number" min="1" max="8" value={repV} onChange={e => { setRepV(e.target.value); setSucio(true); }}/>
            </div>
            <Campo label="Etiquetas (separadas por coma)" value={etiquetas} onChange={e => { setEtiquetas(e.target.value); setSucio(true); }} placeholder="Ej: guarda, kids, mar"/>
            <div style={{marginBottom: 6}}>
              <label style={{fontSize: 11, color: T.inkMid, display: "block", marginBottom: 4}}>Prenda asociada (opcional)</label>
              <select value={prenda} onChange={e => { setPrenda(e.target.value); setSucio(true); }} style={{width: "100%", padding: "7px 10px", border: "1px solid " + T.border, borderRadius: 2, fontSize: 13, fontFamily: "inherit", background: T.bgCard}}>
                <option value="">— ninguna —</option>
                {prendas.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </Tarjeta>

          <Tarjeta titulo="Vista previa del tejido">
            <div style={{background: "#fff", border: "1px solid " + T.border, borderRadius: 2, padding: 6, textAlign: "center"}}>
              <canvas ref={previewRef} style={{maxWidth: "100%", height: "auto"}}/>
            </div>
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap"}}>
              <span style={{fontSize: 11, color: T.inkMid}}>
                {calculo.pp > 0 && calculo.vv > 0
                  ? "Medida aprox.: " + (anchoCm * calculo.rH).toFixed(1) + " × " + (altoCm * calculo.rV).toFixed(1) + " cm"
                  : "Cargá tu tensión para ver la medida real"}
              </span>
              <Boton small onClick={() => descargar(previewRef.current, (nombre || "motivo") + "_vista_previa")}>⬇ Vista previa</Boton>
            </div>
            <div style={{fontSize: 10, color: T.inkLt, marginTop: 6}}>Es una simulación estilizada para evaluar colores y composición; el tejido real puede variar según la lana.</div>
          </Tarjeta>

          <Tarjeta titulo="Lana necesaria">
            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8}}>
              <Campo label="Puntos en 10 cm" type="number" min="0" placeholder="ej: 22" value={ptos10} onChange={e => { setPtos10(e.target.value); setSucio(true); }}/>
              <Campo label="Vueltas en 10 cm" type="number" min="0" placeholder="ej: 28" value={vueltas10} onChange={e => { setVueltas10(e.target.value); setSucio(true); }}/>
              <Campo label="Peso muestra 10×10 (g)" type="number" min="0" placeholder="ej: 11" value={pesoMuestra} onChange={e => { setPesoMuestra(e.target.value); setSucio(true); }}/>
              <Campo label="Factor colorwork" type="number" min="0" step="0.1" value={factor} onChange={e => { setFactor(e.target.value); setSucio(true); }}/>
            </div>
            {!calculo.calibrado ? (
              <div style={{background: T.warnLt, border: "1px solid " + T.warn, borderRadius: 2, padding: "7px 10px", fontSize: 11, color: T.warn, marginBottom: 10}}>
                Estimación aproximada. Para afinarla: tejé una muestra de 10×10 cm con tu lana, contá puntos y vueltas, pesala y cargá los tres datos.
              </div>
            ) : (
              <div style={{fontSize: 11, color: T.ok, marginBottom: 10}}>✓ Calibrado con tu muestra ({(calculo.gpp * 100).toFixed(2)} g cada 100 puntos).</div>
            )}
            <table style={{width: "100%", borderCollapse: "collapse", fontSize: 12}}>
              <thead>
                <tr>{["Color", "Puntos", "Gramos"].map(h => <th key={h} style={{textAlign: "left", padding: "5px 4px", borderBottom: "1px solid " + T.border, fontSize: 10, color: T.inkLt, textTransform: "uppercase", letterSpacing: "0.05em"}}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {calculo.filas.map(f => (
                  <tr key={f.i}>
                    <td style={{padding: "6px 4px", borderBottom: "1px solid " + T.borderLt}}>
                      <span style={{display: "inline-block", width: 12, height: 12, background: f.hex, border: "1px solid rgba(0,0,0,0.25)", borderRadius: 2, marginRight: 6, verticalAlign: "middle"}}/>
                      {f.nombre}
                      {f.stock !== null ? <div style={{fontSize: 10, color: f.alcanza ? T.ok : T.danger}}>{f.lanaNombre}: {f.stock.toLocaleString()} g en stock {f.alcanza ? "✓" : "· no alcanza"}</div> : null}
                    </td>
                    <td style={{padding: "6px 4px", borderBottom: "1px solid " + T.borderLt}}>{f.total.toLocaleString()}</td>
                    <td style={{padding: "6px 4px", borderBottom: "1px solid " + T.borderLt, fontWeight: 500}}>{Math.ceil(f.gramos)} g</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 13}}>
              <span>Total</span><strong>{Math.ceil(calculo.totalG)} g</strong>
            </div>
            <div style={{display: "flex", justifyContent: "space-between", fontSize: 11, color: T.inkMid, marginBottom: 10}}>
              <span>Con 10% de margen</span><span>{Math.ceil(calculo.totalG * 1.1)} g</span>
            </div>
            <Campo label="Notas" value={notas} onChange={e => { setNotas(e.target.value); setSucio(true); }} placeholder="Ej: flecos en color 2, orillo en crudo…"/>
            <Boton small onClick={copiarResumen}>Copiar resumen</Boton>
          </Tarjeta>
        </div>
      </div>

      {importando ? (
        <ImportarImagen paleta={paleta} aspecto={asp} onAgregarPaleta={onAgregarPaleta} onAplicar={aplicarImportacion} onCerrar={() => setImportando(false)}/>
      ) : null}
    </div>
  );
}

// ═══════════════════════ PANTALLA PRINCIPAL ═══════════════════════
export default function Motivos({ lanas, prendas, mob }) {
  const [data, setData] = useState(null);
  const [errorCarga, setErrorCarga] = useState(false);
  const [intento, setIntento] = useState(0);
  const [estado, setEstado] = useState("ok");
  const [vista, setVista] = useState("lista");
  const [editando, setEditando] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTag, setFiltroTag] = useState("");
  const [nuevoAbierto, setNuevoAbierto] = useState(false);

  useEffect(() => {
    let vivo = true;
    setErrorCarga(false);
    dbGet("motivos").then(d => {
      if (!vivo) return;
      if (d === undefined) { setErrorCarga(true); return; }
      setData({paleta: (d && d.paleta) || [], motivos: (d && d.motivos) || []});
    });
    return () => { vivo = false; };
  }, [intento]);

  const todasTags = useMemo(() => {
    const s = {};
    (data ? data.motivos : []).forEach(m => { (m.etiquetas || []).forEach(t => { s[t] = true; }); });
    return Object.keys(s).sort();
  }, [data]);

  const guardarData = nuevo => {
    setData(nuevo);
    setEstado("saving");
    dbSet("motivos", nuevo).then(ok => setEstado(ok ? "ok" : "error"));
  };

  if (errorCarga) {
    return (
      <div style={{textAlign: "center", padding: "3rem 1rem"}}>
        <div style={{fontSize: 36, marginBottom: 10}}>⚠️</div>
        <div style={{fontSize: 16, color: T.danger, marginBottom: 8}}>No se pudieron cargar los motivos</div>
        <div style={{fontSize: 13, color: T.inkMid, maxWidth: 420, margin: "0 auto 16px"}}>Verificá que hayas creado la tabla <strong>motivos</strong> en Supabase (paso del SQL) y reintentá.</div>
        <Boton primario onClick={() => setIntento(intento + 1)}>Reintentar</Boton>
      </div>
    );
  }
  if (data === null) return <div style={{padding: "3rem", textAlign: "center", color: T.inkLt, fontSize: 13}}>Cargando motivos…</div>;

  const crearMotivo = (nombre, ancho, alto) => {
    let pal = data.paleta;
    if (pal.length === 0) {
      const base = Date.now();
      pal = PALETA_BASE.map((c, i) => ({id: base + i, nombre: c.nombre, hex: c.hex, lanaId: null}));
      guardarData({...data, paleta: pal});
    }
    setEditando({
      id: Date.now(), tipo: "colorwork", nombre: nombre, prenda: "", etiquetas: [], ancho: ancho, alto: alto,
      celdas: codificar(crearGrilla(ancho, alto)),
      colores: pal.slice(0, 2).map(c => c.id),
      repH: 1, repV: 1, ptos10: "", vueltas10: "", pesoMuestra: "", factor: "1", notas: ""
    });
    setNuevoAbierto(false);
    setVista("editor");
  };
  const guardarMotivo = m => {
    const existe = data.motivos.some(x => x.id === m.id);
    const lista = existe ? data.motivos.map(x => x.id === m.id ? m : x) : data.motivos.concat([m]);
    guardarData({...data, motivos: lista});
  };
  const agregarAPaleta = nuevos => guardarData({...data, paleta: data.paleta.concat(nuevos)});
  const duplicar = m => {
    const copia = {...m, id: Date.now(), nombre: m.nombre + " (copia)", actualizado: new Date().toISOString()};
    guardarData({...data, motivos: data.motivos.concat([copia])});
  };
  const eliminar = m => {
    if (!window.confirm("¿Eliminar el motivo \"" + m.nombre + "\"?")) return;
    guardarData({...data, motivos: data.motivos.filter(x => x.id !== m.id)});
  };

  if (vista === "paleta") {
    return (
      <PaletaTaller data={data} lanas={lanas} estado={estado}
        onGuardar={lista => guardarData({...data, paleta: lista})}
        onVolver={() => setVista("lista")}/>
    );
  }
  if (vista === "editor" && editando) {
    return (
      <Editor key={editando.id} motivo={editando} paleta={data.paleta} lanas={lanas} prendas={prendas} mob={mob} estado={estado}
        onGuardar={guardarMotivo} onAgregarPaleta={agregarAPaleta}
        onVolver={() => { setVista("lista"); setEditando(null); }}/>
    );
  }

  const q = busqueda.trim().toLowerCase();
  const visibles = data.motivos
    .filter(m => (!filtroTag || (m.etiquetas || []).includes(filtroTag)) && (!q || [m.nombre, m.prenda, (m.etiquetas || []).join(" ")].join(" ").toLowerCase().includes(q)))
    .slice()
    .sort((a, b) => String(b.actualizado || "").localeCompare(String(a.actualizado || "")));

  return (
    <div>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20, paddingBottom: 10, borderBottom: "1px solid " + T.borderLt, gap: 10, flexWrap: "wrap"}}>
        <h2 style={{margin: 0, fontSize: 13, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: T.inkMid}}>Motivos y gráficos</h2>
        <div style={{display: "flex", gap: 8, alignItems: "center"}}>
          <span style={{fontSize: 11, color: estado === "error" ? T.danger : T.inkLt}}>{estado === "saving" ? "☁ Guardando…" : (estado === "error" ? "⚠ Error al guardar" : "")}</span>
          <Boton onClick={() => setVista("paleta")}>🎨 Paleta del taller ({data.paleta.length})</Boton>
          <Boton primario onClick={() => setNuevoAbierto(true)}>+ Nuevo motivo</Boton>
        </div>
      </div>

      {data.motivos.length === 0 ? (
        <div style={{textAlign: "center", padding: "3rem 1.5rem", color: T.inkLt}}>
          <div style={{fontSize: 40, marginBottom: 12, opacity: 0.35}}>🎨</div>
          <div style={{fontSize: 15, fontWeight: 500, color: T.inkMid, marginBottom: 6}}>Todavía no hay motivos</div>
          <div style={{fontSize: 13, maxWidth: 380, margin: "0 auto 18px"}}>Dibujá un gráfico, importá una imagen, mirá cómo queda tejido y calculá cuánta lana lleva cada color.</div>
          <Boton primario onClick={() => setNuevoAbierto(true)}>+ Crear el primer motivo</Boton>
        </div>
      ) : (
        <div style={{display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 14}}>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder={"Buscar entre " + data.motivos.length + " motivos…"} style={{flex: 1, minWidth: 180, maxWidth: 320, padding: "8px 12px", border: "1px solid " + T.border, borderRadius: 2, fontSize: 13, fontFamily: "inherit"}}/>
          {todasTags.length > 0 ? <Boton small activo={filtroTag === ""} onClick={() => setFiltroTag("")}>Todas</Boton> : null}
          {todasTags.map(t => <Boton key={t} small activo={filtroTag === t} onClick={() => setFiltroTag(filtroTag === t ? "" : t)}>{t}</Boton>)}
        </div>
      )}

      {data.motivos.length > 0 && visibles.length === 0 ? <div style={{padding: "2rem", textAlign: "center", fontSize: 13, color: T.inkLt}}>Sin resultados.</div> : null}

      <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12}}>
        {visibles.map(m => (
          <div key={m.id} style={{background: T.bgCard, border: "1px solid " + T.border, borderRadius: 4, padding: "1rem"}}>
            <div style={{height: 116, display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, borderRadius: 2, marginBottom: 10}}>
              <Miniatura motivo={m} paleta={data.paleta}/>
            </div>
            <div style={{fontSize: 14, fontWeight: 500, marginBottom: 2}}>{m.nombre}</div>
            <div style={{fontSize: 11, color: T.inkMid, marginBottom: 6}}>
              {m.ancho}×{m.alto} pts · {(m.colores || []).length} colores{m.prenda ? " · " + m.prenda : ""}
            </div>
            {(m.etiquetas || []).length > 0 ? (
              <div style={{display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8}}>
                {m.etiquetas.map(t => <span key={t} onClick={() => setFiltroTag(t)} style={{fontSize: 10, padding: "1px 8px", borderRadius: 99, background: T.violetLt, color: T.violet, cursor: "pointer"}}>{t}</span>)}
              </div>
            ) : <div style={{height: 8}}/>}
            <div style={{display: "flex", gap: 6, flexWrap: "wrap"}}>
              <Boton small primario onClick={() => { setEditando(m); setVista("editor"); }}>Abrir</Boton>
              <Boton small onClick={() => duplicar(m)}>Duplicar</Boton>
              <Boton small onClick={() => eliminar(m)}>✕</Boton>
            </div>
          </div>
        ))}
      </div>

      {nuevoAbierto ? <NuevoMotivoModal onCrear={crearMotivo} onCerrar={() => setNuevoAbierto(false)}/> : null}
    </div>
  );
}
