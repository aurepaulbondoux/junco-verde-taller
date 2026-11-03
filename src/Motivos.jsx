import { useState, useEffect, useRef, useMemo } from "react";
import { dbGet, dbSet } from "./supabase.js";

// ═══════════════════════ CONSTANTES Y UTILIDADES ═══════════════════════
const T = {bg:"#faf7f2",bgCard:"#fff",bgMuted:"#f0ebe2",bgDeep:"#e6dfd4",ink:"#1e1c18",inkMid:"#5a5750",inkLt:"#9a9690",border:"#ddd8cf",borderLt:"#eae5dc",green:"#3d5a3e",greenLt:"#e8f0e8",tierra:"#8b6f47",danger:"#b03a2e",dangerLt:"#fdf0ee",warn:"#916a00",warnLt:"#fef8e6",ok:"#2d6a4f",okLt:"#e8f5ee",info:"#2c5f8a",infoLt:"#eaf2f8"};
const num = v => Number(v) || 0;
const GPP_DEF = 0.012; // gramos por punto si todavía no se calibró con una muestra
const MAX_COLORES = 12;
const PALETA_BASE = [
  {nombre: "Crudo", hex: "#EAE3D2"},
  {nombre: "Gris", hex: "#9A9A94"},
  {nombre: "Negro", hex: "#2B2B2B"},
  {nombre: "Verde junco", hex: "#3D5A3E"},
  {nombre: "Tierra", hex: "#8B6f47"},
  {nombre: "Rojo teja", hex: "#A9442F"},
  {nombre: "Azul", hex: "#2C5F8A"}
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
          const idx = g[y][x];
          ctx.fillStyle = oscuros[idx] || "#999";
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
function Boton({ children, onClick, activo, primario, peligro, disabled, small, style }) {
  let bg = "transparent", col = T.ink, bor = "1px solid " + T.border;
  if (activo) { bg = T.greenLt; col = T.green; bor = "1px solid " + T.green; }
  if (primario) { bg = T.green; col = "#fff"; bor = "none"; }
  if (peligro) { bg = T.danger; col = "#fff"; bor = "none"; }
  return (
    <button onClick={onClick} disabled={disabled} style={{padding:small?"4px 10px":"7px 14px",borderRadius:2,border:bor,background:bg,color:col,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.5:1,fontSize:small?11:12,fontWeight:500,fontFamily:"inherit",whiteSpace:"nowrap",...(style || {})}}>{children}</button>
  );
}
function Tarjeta({ children, titulo, style }) {
  return (
    <div style={{background:T.bgCard,border:"1px solid "+T.border,borderRadius:4,padding:"1rem 1.1rem",marginBottom:12,...(style || {})}}>
      {titulo ? <div style={{fontSize:11,color:T.inkMid,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10,fontWeight:500}}>{titulo}</div> : null}
      {children}
    </div>
  );
}
function Campo({ label, ...p }) {
  return (
    <div style={{marginBottom:10}}>
      {label ? <label style={{fontSize:11,color:T.inkMid,display:"block",marginBottom:4}}>{label}</label> : null}
      <input style={{width:"100%",padding:"7px 10px",border:"1px solid "+T.border,borderRadius:2,background:T.bgCard,color:T.ink,fontSize:13,boxSizing:"border-box",fontFamily:"inherit"}} {...p}/>
    </div>
  );
}

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
  return <canvas ref={ref} style={{maxWidth:"100%",maxHeight:110,border:"1px solid "+T.border,borderRadius:2,background:"#fff"}}/>;
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
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:16}}>
        <Boton onClick={volver}>← Volver</Boton>
        <div style={{flex:1,fontSize:18,fontWeight:300}}>Paleta del taller</div>
        {sucio ? <span style={{fontSize:11,color:T.warn}}>● sin guardar</span> : null}
        <span style={{fontSize:11,color:estado === "error" ? T.danger : T.inkLt}}>{estado === "saving" ? "☁ Guardando…" : (estado === "error" ? "⚠ Error al guardar" : "")}</span>
        <Boton primario onClick={guardar} disabled={!sucio}>Guardar paleta</Boton>
      </div>
      <div style={{fontSize:12,color:T.inkMid,marginBottom:14,maxWidth:640}}>
        Estos son los colores de lana que se usan para diseñar. Elegí el tono con el selector y, si querés, vinculá cada color con una lana de tu stock para comparar los gramos necesarios.
      </div>
      {lista.length === 0 ? <div style={{padding:"1.5rem",textAlign:"center",color:T.inkLt,fontSize:13}}>Todavía no hay colores.</div> : null}
      {lista.map(c => (
        <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",padding:"8px 10px",background:T.bgCard,border:"1px solid "+T.border,borderRadius:4,marginBottom:8}}>
          <input type="color" value={c.hex} onChange={e => cambiar(c.id, "hex", e.target.value)} style={{width:44,height:34,border:"1px solid "+T.border,borderRadius:2,padding:0,background:"none",cursor:"pointer"}}/>
          <input value={c.nombre} onChange={e => cambiar(c.id, "nombre", e.target.value)} placeholder="Nombre del color" style={{flex:1,minWidth:140,padding:"7px 10px",border:"1px solid "+T.border,borderRadius:2,fontSize:13,fontFamily:"inherit"}}/>
          <select value={c.lanaId === null || c.lanaId === undefined ? "" : String(c.lanaId)} onChange={e => cambiar(c.id, "lanaId", e.target.value === "" ? null : Number(e.target.value))} style={{minWidth:180,padding:"7px 10px",border:"1px solid "+T.border,borderRadius:2,fontSize:12,fontFamily:"inherit",background:T.bgCard}}>
            <option value="">— sin vincular a stock —</option>
            {lanas.map(l => <option key={l.id} value={String(l.id)}>{l.tipo}{l.color ? " · " + l.color : ""} ({l.stock.toLocaleString()}g)</option>)}
          </select>
          <Boton small onClick={() => quitar(c)}>✕</Boton>
        </div>
      ))}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}>
        <Boton onClick={agregar}>+ Agregar color</Boton>
        <Boton onClick={agregarBase}>+ Agregar colores base</Boton>
      </div>
    </div>
  );
}

// ═══════════════════════ EDITOR DE UN MOTIVO ═══════════════════════
function Editor({ motivo, paleta, lanas, prendas, mob, estado, onGuardar, onVolver }) {
  const [nombre, setNombre] = useState(motivo.nombre || "");
  const [prenda, setPrenda] = useState(motivo.prenda || "");
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
  const [activo, setActivo] = useState(0);
  const [simH, setSimH] = useState(false);
  const [simV, setSimV] = useState(false);
  const [zoom, setZoom] = useState(mob ? 12 : 16);
  const [tick, setTick] = useState(0);
  const [sucio, setSucio] = useState(false);
  const [aviso, setAviso] = useState("");

  const gridRef = useRef(null);
  if (gridRef.current === null) {
    gridRef.current = decodificar(motivo.celdas, motivo.ancho, motivo.alto, (motivo.colores || []).length || 1);
  }
  const histRef = useRef({pasado: [], futuro: []});
  const canvasRef = useRef(null);
  const previewRef = useRef(null);
  const pintando = useRef(false);
  const ultima = useRef([0, 0]);

  const hexDePid = pid => { const c = paleta.find(p => p.id === pid); return c ? c.hex : "#cccccc"; };
  const bump = () => { setTick(t => t + 1); setSucio(true); };
  const avisar = t => { setAviso(t); setTimeout(() => setAviso(""), 3000); };

  // ── dibujo de la grilla ──
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const g = gridRef.current;
    const H = g.length;
    const W = H ? g[0].length : 0;
    c.width = W * zoom;
    c.height = H * zoom;
    const ctx = c.getContext("2d");
    const hx = colores.map(hexDePid);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        ctx.fillStyle = hx[g[y][x]] || "#cccccc";
        ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
      }
    }
    for (let x = 0; x <= W; x++) {
      ctx.fillStyle = x % 10 === 0 ? "rgba(0,0,0,0.55)" : (x % 5 === 0 ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.12)");
      ctx.fillRect(x * zoom, 0, 1, H * zoom);
    }
    for (let y = 0; y <= H; y++) {
      ctx.fillStyle = y % 10 === 0 ? "rgba(0,0,0,0.55)" : (y % 5 === 0 ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.12)");
      ctx.fillRect(0, y * zoom, W * zoom, 1);
    }
  }, [tick, zoom, dims, colores, paleta]);

  // ── vista previa ──
  useEffect(() => {
    const c = previewRef.current;
    if (!c) return;
    const hexes = colores.map(hexDePid);
    const rH = Math.max(1, Math.min(8, Math.round(num(repH)) || 1));
    const rV = Math.max(1, Math.min(8, Math.round(num(repV)) || 1));
    const asp = (num(ptos10) > 0 && num(vueltas10) > 0) ? num(ptos10) / num(vueltas10) : 0.8;
    dibujarTejido(c, gridRef.current, hexes, rH, rV, asp, 640);
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
    const rH = Math.max(1, Math.min(8, Math.round(num(repH)) || 1));
    const rV = Math.max(1, Math.min(8, Math.round(num(repV)) || 1));
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
    aplicarGrilla(h.pasado.pop());
  };
  const rehacer = () => {
    const h = histRef.current;
    if (!h.futuro.length) return;
    h.pasado.push(copiarGrilla(gridRef.current));
    aplicarGrilla(h.futuro.pop());
  };

  // ── pintar ──
  const dibujarCelda = (x, y) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.fillStyle = hexDePid(colores[gridRef.current[y][x]]);
    ctx.fillRect(x * zoom + 1, y * zoom + 1, zoom - 1, zoom - 1);
  };
  const ponerCelda = (x, y, c) => {
    const g = gridRef.current;
    if (y < 0 || x < 0 || y >= g.length || x >= g[0].length) return;
    g[y][x] = c;
    dibujarCelda(x, y);
  };
  const pintarSim = (x, y, c) => {
    const g = gridRef.current;
    const W = g[0].length, H = g.length;
    ponerCelda(x, y, c);
    if (simH) ponerCelda(W - 1 - x, y, c);
    if (simV) ponerCelda(x, H - 1 - y, c);
    if (simH && simV) ponerCelda(W - 1 - x, H - 1 - y, c);
  };
  const rellenar = (x, y, nuevo) => {
    const g = gridRef.current;
    const objetivo = g[y][x];
    if (objetivo === nuevo) return;
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
  const celdaDe = e => {
    const r = canvasRef.current.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / zoom);
    const y = Math.floor((e.clientY - r.top) / zoom);
    return [Math.max(0, Math.min(dims.ancho - 1, x)), Math.max(0, Math.min(dims.alto - 1, y))];
  };
  const alBajar = e => {
    if (herr === "mover" || colores.length === 0) return;
    const p = celdaDe(e);
    const x = p[0], y = p[1];
    if (herr === "gotero") { setActivo(gridRef.current[y][x]); return; }
    if (herr === "balde") { guardarHistorial(); rellenar(x, y, activo); bump(); return; }
    guardarHistorial();
    pintando.current = true;
    ultima.current = [x, y];
    pintarSim(x, y, activo);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
  };
  const alMover = e => {
    if (!pintando.current) return;
    const p = celdaDe(e);
    const lx = ultima.current[0], ly = ultima.current[1];
    if (p[0] === lx && p[1] === ly) return;
    linea(lx, ly, p[0], p[1], (a, b) => pintarSim(a, b, activo));
    ultima.current = [p[0], p[1]];
  };
  const alSoltar = () => {
    if (!pintando.current) return;
    pintando.current = false;
    bump();
  };

  // ── acciones sobre el gráfico ──
  const voltearH = () => { guardarHistorial(); aplicarGrilla(copiarGrilla(gridRef.current).map(f => f.reverse())); };
  const voltearV = () => { guardarHistorial(); aplicarGrilla(copiarGrilla(gridRef.current).reverse()); };
  const limpiar = () => {
    if (!window.confirm("¿Rellenar todo el gráfico con el color de fondo?")) return;
    guardarHistorial();
    aplicarGrilla(crearGrilla(dims.ancho, dims.alto));
  };
  const aplicarTamano = () => {
    const A = Math.max(4, Math.min(120, Math.round(num(nuevoAncho)) || 4));
    const H = Math.max(4, Math.min(120, Math.round(num(nuevoAlto)) || 4));
    guardarHistorial();
    const vieja = gridRef.current;
    const g = crearGrilla(A, H);
    for (let y = 0; y < Math.min(H, vieja.length); y++) {
      for (let x = 0; x < Math.min(A, vieja[0].length); x++) g[y][x] = vieja[y][x];
    }
    setNuevoAncho(String(A));
    setNuevoAlto(String(H));
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
    const g = gridRef.current.map(f => f.map(v => (v === i ? 0 : (v > i ? v - 1 : v))));
    setColores(colores.filter((_, j) => j !== i));
    setActivo(Math.max(0, Math.min(activo, colores.length - 2)));
    aplicarGrilla(g);
  };

  // ── guardar y salir ──
  const guardar = () => {
    onGuardar({
      id: motivo.id,
      nombre: nombre.trim() || "Motivo sin nombre",
      prenda: prenda,
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

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:14}}>
        <Boton onClick={volver}>← Volver</Boton>
        <input value={nombre} onChange={e => { setNombre(e.target.value); setSucio(true); }} placeholder="Nombre del motivo" style={{flex:1,minWidth:160,padding:"8px 12px",border:"1px solid "+T.border,borderRadius:2,fontSize:15,fontFamily:"inherit"}}/>
        {sucio ? <span style={{fontSize:11,color:T.warn}}>● sin guardar</span> : null}
        <span style={{fontSize:11,color:estado === "error" ? T.danger : T.inkLt}}>{estado === "saving" ? "☁ Guardando…" : (estado === "error" ? "⚠ Error al guardar" : "")}</span>
        <Boton primario onClick={guardar}>Guardar motivo</Boton>
      </div>
      {aviso ? <div style={{background:T.infoLt,border:"1px solid "+T.info,borderRadius:2,padding:"7px 12px",marginBottom:10,fontSize:12,color:T.info}}>{aviso}</div> : null}

      <div style={{display:"grid",gridTemplateColumns:mob ? "1fr" : "minmax(0,1fr) 370px",gap:14,alignItems:"start"}}>
        {/* ── Izquierda: gráfico ── */}
        <div>
          <Tarjeta>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
              <Boton small activo={herr === "pincel"} onClick={() => setHerr("pincel")}>✏️ Pincel</Boton>
              <Boton small activo={herr === "balde"} onClick={() => setHerr("balde")}>🪣 Rellenar</Boton>
              <Boton small activo={herr === "gotero"} onClick={() => setHerr("gotero")}>💧 Gotero</Boton>
              <Boton small activo={herr === "mover"} onClick={() => setHerr("mover")}>✋ Mover</Boton>
              <span style={{width:8}}/>
              <Boton small activo={simH} onClick={() => setSimH(!simH)}>Simetría ↔</Boton>
              <Boton small activo={simV} onClick={() => setSimV(!simV)}>Simetría ↕</Boton>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
              <Boton small onClick={deshacer}>↶ Deshacer</Boton>
              <Boton small onClick={rehacer}>↷ Rehacer</Boton>
              <Boton small onClick={voltearH}>Voltear ↔</Boton>
              <Boton small onClick={voltearV}>Voltear ↕</Boton>
              <Boton small onClick={limpiar}>Limpiar</Boton>
              <Boton small onClick={() => descargar(canvasRef.current, (nombre || "motivo") + "_grafico")}>⬇ Gráfico</Boton>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,fontSize:11,color:T.inkMid}}>
              <span>Zoom</span>
              <input type="range" min="6" max="32" value={zoom} onChange={e => setZoom(Number(e.target.value))} style={{flex:1,maxWidth:200}}/>
              <span style={{display:"inline-flex",alignItems:"center",gap:6}}>Color activo <span style={{width:18,height:18,background:hSel,border:"1px solid rgba(0,0,0,0.3)",borderRadius:3,display:"inline-block"}}/></span>
            </div>
            {colores.length === 0 ? <div style={{padding:"1rem",fontSize:12,color:T.warn,background:T.warnLt,borderRadius:2,marginBottom:10}}>Agregá al menos un color (panel de la derecha) para empezar a dibujar.</div> : null}
            <div style={{overflow:"auto",maxHeight:mob ? "55vh" : "68vh",border:"1px solid "+T.border,background:"#fff"}}>
              <canvas ref={canvasRef} onPointerDown={alBajar} onPointerMove={alMover} onPointerUp={alSoltar} onPointerCancel={alSoltar}
                style={{display:"block",cursor:herr === "mover" ? "grab" : "crosshair",touchAction:herr === "mover" ? "auto" : "none"}}/>
            </div>
            <div style={{fontSize:10,color:T.inkLt,marginTop:6}}>Las líneas marcan cada 5 puntos; las más gruesas, cada 10. En el celular, usá ✋ Mover para desplazarte por un gráfico grande.</div>
          </Tarjeta>
        </div>

        {/* ── Derecha: paneles ── */}
        <div>
          <Tarjeta titulo="Colores del motivo">
            {colores.map((pid, i) => {
              const usados = colores.filter((x, j) => j !== i);
              const opciones = paleta.filter(p => !usados.includes(p.id));
              return (
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 7px",border:activo === i ? "2px solid " + T.green : "1px solid " + T.border,background:activo === i ? T.greenLt : T.bgCard,borderRadius:4,marginBottom:6}}>
                  <div onClick={() => setActivo(i)} title="Usar este color" style={{width:28,height:28,borderRadius:4,background:hexDePid(pid),border:"1px solid rgba(0,0,0,0.25)",cursor:"pointer",flexShrink:0}}/>
                  <select value={pid} onChange={e => cambiarColor(i, Number(e.target.value))} style={{flex:1,minWidth:0,padding:"5px 6px",border:"1px solid "+T.border,borderRadius:2,fontSize:12,fontFamily:"inherit",background:T.bgCard}}>
                    {opciones.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                  <span style={{fontSize:10,color:T.inkLt,whiteSpace:"nowrap"}}>{i === 0 ? "fondo · " : ""}{(conteo[i] || 0)} pts</span>
                  <button onClick={() => quitarColor(i)} disabled={colores.length <= 1} style={{border:"none",background:"none",cursor:"pointer",color:T.danger,fontSize:14,opacity:colores.length <= 1 ? 0.3 : 1}}>✕</button>
                </div>
              );
            })}
            <Boton small onClick={agregarColor}>+ Agregar color</Boton>
          </Tarjeta>

          <Tarjeta titulo="Tamaño y repetición">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8,alignItems:"end"}}>
              <Campo label="Puntos (ancho)" type="number" min="4" max="120" value={nuevoAncho} onChange={e => setNuevoAncho(e.target.value)}/>
              <Campo label="Vueltas (alto)" type="number" min="4" max="120" value={nuevoAlto} onChange={e => setNuevoAlto(e.target.value)}/>
              <div style={{marginBottom:10}}><Boton small onClick={aplicarTamano}>Aplicar</Boton></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <Campo label="Repeticiones ↔" type="number" min="1" max="8" value={repH} onChange={e => { setRepH(e.target.value); setSucio(true); }}/>
              <Campo label="Repeticiones ↕" type="number" min="1" max="8" value={repV} onChange={e => { setRepV(e.target.value); setSucio(true); }}/>
            </div>
            <div style={{marginBottom:6}}>
              <label style={{fontSize:11,color:T.inkMid,display:"block",marginBottom:4}}>Prenda asociada (opcional)</label>
              <select value={prenda} onChange={e => { setPrenda(e.target.value); setSucio(true); }} style={{width:"100%",padding:"7px 10px",border:"1px solid "+T.border,borderRadius:2,fontSize:13,fontFamily:"inherit",background:T.bgCard}}>
                <option value="">— ninguna —</option>
                {prendas.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </Tarjeta>

          <Tarjeta titulo="Vista previa del tejido">
            <div style={{background:"#fff",border:"1px solid "+T.border,borderRadius:2,padding:6,textAlign:"center"}}>
              <canvas ref={previewRef} style={{maxWidth:"100%",height:"auto"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginTop:8,flexWrap:"wrap"}}>
              <span style={{fontSize:11,color:T.inkMid}}>
                {calculo.pp > 0 && calculo.vv > 0
                  ? "Medida aprox.: " + (anchoCm * calculo.rH).toFixed(1) + " × " + (altoCm * calculo.rV).toFixed(1) + " cm"
                  : "Cargá tu tensión para ver la medida real"}
              </span>
              <Boton small onClick={() => descargar(previewRef.current, (nombre || "motivo") + "_vista_previa")}>⬇ Vista previa</Boton>
            </div>
            <div style={{fontSize:10,color:T.inkLt,marginTop:6}}>Es una simulación estilizada para evaluar colores y composición; el tejido real puede variar según la lana.</div>
          </Tarjeta>

          <Tarjeta titulo="Lana necesaria">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <Campo label="Puntos en 10 cm" type="number" min="0" placeholder="ej: 22" value={ptos10} onChange={e => { setPtos10(e.target.value); setSucio(true); }}/>
              <Campo label="Vueltas en 10 cm" type="number" min="0" placeholder="ej: 28" value={vueltas10} onChange={e => { setVueltas10(e.target.value); setSucio(true); }}/>
              <Campo label="Peso muestra 10×10 (g)" type="number" min="0" placeholder="ej: 11" value={pesoMuestra} onChange={e => { setPesoMuestra(e.target.value); setSucio(true); }}/>
              <Campo label="Factor colorwork" type="number" min="0" step="0.1" value={factor} onChange={e => { setFactor(e.target.value); setSucio(true); }}/>
            </div>
            {!calculo.calibrado ? (
              <div style={{background:T.warnLt,border:"1px solid "+T.warn,borderRadius:2,padding:"7px 10px",fontSize:11,color:T.warn,marginBottom:10}}>
                Estimación aproximada. Para afinarla: tejé una muestra de 10×10 cm con tu lana, contá puntos y vueltas, pesala y cargá los tres datos.
              </div>
            ) : (
              <div style={{fontSize:11,color:T.ok,marginBottom:10}}>✓ Calibrado con tu muestra ({(calculo.gpp * 100).toFixed(2)} g cada 100 puntos).</div>
            )}
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr>{["Color","Puntos","Gramos"].map(h => <th key={h} style={{textAlign:"left",padding:"5px 4px",borderBottom:"1px solid "+T.border,fontSize:10,color:T.inkLt,textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {calculo.filas.map(f => (
                  <tr key={f.i}>
                    <td style={{padding:"6px 4px",borderBottom:"1px solid "+T.borderLt}}>
                      <span style={{display:"inline-block",width:12,height:12,background:f.hex,border:"1px solid rgba(0,0,0,0.25)",borderRadius:2,marginRight:6,verticalAlign:"middle"}}/>
                      {f.nombre}
                      {f.stock !== null ? <div style={{fontSize:10,color:f.alcanza ? T.ok : T.danger}}>{f.lanaNombre}: {f.stock.toLocaleString()} g en stock {f.alcanza ? "✓" : "· no alcanza"}</div> : null}
                    </td>
                    <td style={{padding:"6px 4px",borderBottom:"1px solid "+T.borderLt}}>{f.total.toLocaleString()}</td>
                    <td style={{padding:"6px 4px",borderBottom:"1px solid "+T.borderLt,fontWeight:500}}>{Math.ceil(f.gramos)} g</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:10,fontSize:13}}>
              <span>Total</span><strong>{Math.ceil(calculo.totalG)} g</strong>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:T.inkMid,marginBottom:10}}>
              <span>Con 10% de margen</span><span>{Math.ceil(calculo.totalG * 1.1)} g</span>
            </div>
            <Campo label="Notas" value={notas} onChange={e => { setNotas(e.target.value); setSucio(true); }} placeholder="Ej: flecos en color 2, orillo en crudo…"/>
            <Boton small onClick={copiarResumen}>Copiar resumen</Boton>
          </Tarjeta>
        </div>
      </div>
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

  const guardarData = nuevo => {
    setData(nuevo);
    setEstado("saving");
    dbSet("motivos", nuevo).then(ok => setEstado(ok ? "ok" : "error"));
  };

  if (errorCarga) {
    return (
      <div style={{textAlign:"center",padding:"3rem 1rem"}}>
        <div style={{fontSize:36,marginBottom:10}}>⚠️</div>
        <div style={{fontSize:16,color:T.danger,marginBottom:8}}>No se pudieron cargar los motivos</div>
        <div style={{fontSize:13,color:T.inkMid,maxWidth:420,margin:"0 auto 16px"}}>Verificá que hayas creado la tabla <strong>motivos</strong> en Supabase (paso del SQL) y reintentá.</div>
        <Boton primario onClick={() => setIntento(intento + 1)}>Reintentar</Boton>
      </div>
    );
  }
  if (data === null) return <div style={{padding:"3rem",textAlign:"center",color:T.inkLt,fontSize:13}}>Cargando motivos…</div>;

  const nuevoMotivo = () => {
    let pal = data.paleta;
    if (pal.length === 0) {
      const base = Date.now();
      pal = PALETA_BASE.map((c, i) => ({id: base + i, nombre: c.nombre, hex: c.hex, lanaId: null}));
      guardarData({...data, paleta: pal});
    }
    setEditando({
      id: Date.now(), nombre: "", prenda: "", ancho: 20, alto: 20,
      celdas: codificar(crearGrilla(20, 20)),
      colores: pal.slice(0, 2).map(c => c.id),
      repH: 1, repV: 1, ptos10: "", vueltas10: "", pesoMuestra: "", factor: "1", notas: ""
    });
    setVista("editor");
  };
  const guardarMotivo = m => {
    const existe = data.motivos.some(x => x.id === m.id);
    const lista = existe ? data.motivos.map(x => x.id === m.id ? m : x) : data.motivos.concat([m]);
    guardarData({...data, motivos: lista});
  };
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
        onGuardar={guardarMotivo}
        onVolver={() => { setVista("lista"); setEditando(null); }}/>
    );
  }

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:20,paddingBottom:10,borderBottom:"1px solid "+T.borderLt,gap:10,flexWrap:"wrap"}}>
        <h2 style={{margin:0,fontSize:13,fontWeight:500,letterSpacing:"0.1em",textTransform:"uppercase",color:T.inkMid}}>Motivos y gráficos</h2>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontSize:11,color:estado === "error" ? T.danger : T.inkLt}}>{estado === "saving" ? "☁ Guardando…" : (estado === "error" ? "⚠ Error al guardar" : "")}</span>
          <Boton onClick={() => setVista("paleta")}>🎨 Paleta del taller ({data.paleta.length})</Boton>
          <Boton primario onClick={nuevoMotivo}>+ Nuevo motivo</Boton>
        </div>
      </div>

      {data.motivos.length === 0 ? (
        <div style={{textAlign:"center",padding:"3rem 1.5rem",color:T.inkLt}}>
          <div style={{fontSize:40,marginBottom:12,opacity:0.35}}>🎨</div>
          <div style={{fontSize:15,fontWeight:500,color:T.inkMid,marginBottom:6}}>Todavía no hay motivos</div>
          <div style={{fontSize:13,maxWidth:380,margin:"0 auto 18px"}}>Dibujá un gráfico, mirá cómo queda tejido y calculá cuánta lana lleva cada color.</div>
          <Boton primario onClick={nuevoMotivo}>+ Crear el primer motivo</Boton>
        </div>
      ) : null}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12}}>
        {data.motivos.map(m => (
          <div key={m.id} style={{background:T.bgCard,border:"1px solid "+T.border,borderRadius:4,padding:"1rem"}}>
            <div style={{height:116,display:"flex",alignItems:"center",justifyContent:"center",background:T.bg,borderRadius:2,marginBottom:10}}>
              <Miniatura motivo={m} paleta={data.paleta}/>
            </div>
            <div style={{fontSize:14,fontWeight:500,marginBottom:2}}>{m.nombre}</div>
            <div style={{fontSize:11,color:T.inkMid,marginBottom:10}}>
              {m.ancho}×{m.alto} pts · {(m.colores || []).length} colores{m.prenda ? " · " + m.prenda : ""}
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <Boton small primario onClick={() => { setEditando(m); setVista("editor"); }}>Abrir</Boton>
              <Boton small onClick={() => duplicar(m)}>Duplicar</Boton>
              <Boton small onClick={() => eliminar(m)}>✕</Boton>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
