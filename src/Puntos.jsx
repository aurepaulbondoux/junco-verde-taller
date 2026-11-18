import { useState, useEffect, useRef, useMemo } from "react";
import { dbGet, dbSet } from "./supabase.js";
import {
  PUNTOS, POR_ID, GRUPOS, PALETA, POR_CLAVE_PALETA, espejarId, dibujarPunto, dibujarGrafico, margenes,
  codificar, decodificar, generar, leyendaDe, PLANTILLAS, construirPlantilla
} from "./puntosLib.js";

// ═══════════════════════ UTILIDADES ═══════════════════════
const T = {bg:"#faf7f2",bgCard:"#fff",bgMuted:"#f0ebe2",ink:"#1e1c18",inkMid:"#5a5750",inkLt:"#9a9690",border:"#ddd8cf",borderLt:"#eae5dc",green:"#3d5a3e",greenLt:"#e8f0e8",danger:"#b03a2e",dangerLt:"#fdf0ee",warn:"#916a00",warnLt:"#fef8e6",ok:"#2d6a4f",okLt:"#e8f5ee",info:"#2c5f8a",infoLt:"#eaf2f8",violet:"#5b3f7a",violetLt:"#f2eef8"};
const num = v => Number(v) || 0;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const norm = (x0, y0, x1, y1) => ({x0: Math.min(x0, x1), y0: Math.min(y0, y1), x1: Math.max(x0, x1), y1: Math.max(y0, y1)});
const crearGrilla = (ancho, alto) => { const g = []; for (let y = 0; y < alto; y++) g.push(new Array(ancho).fill(0)); return g; };
const copiarGrilla = g => g.map(f => f.slice());
const slug = t => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");

const celdasLinea = (x0, y0, x1, y1) => {
  const out = [];
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  while (true) {
    out.push([x0, y0]);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
  return out;
};
const celdasRect = (x0, y0, x1, y1) => {
  const r = norm(x0, y0, x1, y1);
  const out = [];
  for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) out.push([x, y]);
  return out;
};

const HERRAMIENTAS = [
  {id: "pincel", icono: "✏️", nombre: "Pincel", tecla: "B"},
  {id: "linea", icono: "╱", nombre: "Línea", tecla: "L"},
  {id: "rect", icono: "▭", nombre: "Rectángulo", tecla: "R"},
  {id: "balde", icono: "🪣", nombre: "Rellenar", tecla: "G"},
  {id: "gotero", icono: "💧", nombre: "Gotero", tecla: "I"},
  {id: "seleccion", icono: "⬚", nombre: "Selección", tecla: "S"},
  {id: "vista", icono: "✋", nombre: "Mover vista", tecla: "H"}
];

// ═══════════════════════ COMPONENTES CHICOS ═══════════════════════
function Boton({ children, onClick, activo, primario, peligro, disabled, small, title }) {
  let bg = "transparent", col = T.ink, bor = "1px solid " + T.border;
  if (activo) { bg = T.greenLt; col = T.green; bor = "1px solid " + T.green; }
  if (primario) { bg = T.green; col = "#fff"; bor = "none"; }
  if (peligro) { bg = T.danger; col = "#fff"; bor = "none"; }
  return (
    <button onClick={onClick} disabled={disabled} title={title} style={{padding: small ? "4px 10px" : "7px 14px", borderRadius: 2, border: bor, background: bg, color: col, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1, fontSize: small ? 11 : 12, fontWeight: 500, fontFamily: "inherit", whiteSpace: "nowrap"}}>{children}</button>
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

function Simbolo({ ids, size }) {
  const ref = useRef(null);
  const clave = ids.join(",");
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const s = size || 22;
    c.width = s * ids.length;
    c.height = s;
    const ctx = c.getContext("2d");
    ids.forEach((id, i) => { dibujarPunto(ctx, id, i * s, 0, s, s); });
    ctx.strokeStyle = "#b9b4a8";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, s * ids.length - 1, s - 1);
  }, [clave, size]);
  return <canvas ref={ref} style={{display: "block"}}/>;
}

function Miniatura({ g }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const grid = decodificar(g.celdas, g.ancho, g.alto);
    const cell = clamp(Math.floor(110 / Math.max(g.ancho, g.alto)), 4, 14);
    dibujarGrafico(c, grid, {cell: cell, modo: g.modo, numeros: false});
  }, [g]);
  return <canvas ref={ref} style={{maxWidth: "100%", maxHeight: 110, border: "1px solid " + T.border, borderRadius: 2, background: "#fff"}}/>;
}

export function TabsModo({ modo, onModo }) {
  const tabs = [{id: "color", l: "🎨 Colorwork"}, {id: "puntos", l: "🧶 Puntos"}];
  return (
    <div style={{display: "flex", gap: 4}}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onModo(t.id)} style={{padding: "6px 14px", borderRadius: 99, border: "1px solid " + (modo === t.id ? T.green : T.border), background: modo === t.id ? T.green : "transparent", color: modo === t.id ? "#fff" : T.inkMid, cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: modo === t.id ? 500 : 400}}>{t.l}</button>
      ))}
    </div>
  );
}

// ═══════════════════════ NUEVO GRÁFICO ═══════════════════════
function NuevoModal({ onCrear, onCerrar }) {
  const [nombre, setNombre] = useState("");
  const [modo, setModo] = useState("plano");
  const [plantilla, setPlantilla] = useState("");
  const [ancho, setAncho] = useState("16");
  const [alto, setAlto] = useState("12");
  const mob = window.innerWidth < 768;
  const pl = PLANTILLAS.find(p => p.id === plantilla);
  const crear = () => {
    const A = clamp(Math.round(num(ancho)) || 16, 4, 120);
    const Hh = clamp(Math.round(num(alto)) || 12, 4, 120);
    const grid = pl ? construirPlantilla(pl, A) : crearGrilla(A, Hh);
    onCrear({nombre: nombre.trim() || (pl ? pl.nombre : ""), modo: modo, grid: grid});
  };
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onCerrar(); }} style={{position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(30,28,24,0.5)", display: "flex", alignItems: mob ? "flex-end" : "center", justifyContent: "center", zIndex: 300}}>
      <div style={{background: T.bgCard, border: "1px solid " + T.border, borderRadius: mob ? "12px 12px 0 0" : 4, padding: "1.5rem", width: mob ? "100%" : 480, maxWidth: "100vw", maxHeight: "92vh", overflowY: "auto", fontFamily: "'Georgia',serif", color: T.ink}}>
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14}}>
          <h3 style={{margin: 0, fontSize: 17, fontWeight: 400}}>Nuevo gráfico de puntos</h3>
          <button onClick={onCerrar} style={{background: "none", border: "none", cursor: "pointer", fontSize: 22, color: T.inkLt}}>×</button>
        </div>
        <Campo label="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Trenza del puño"/>
        <div style={{fontSize: 11, color: T.inkMid, marginBottom: 6}}>Cómo se teje</div>
        <div style={{display: "flex", gap: 6, marginBottom: 12}}>
          <Boton small activo={modo === "plano"} onClick={() => setModo("plano")}>Plano (dos agujas)</Boton>
          <Boton small activo={modo === "redondo"} onClick={() => setModo("redondo")}>En redondo (circular)</Boton>
        </div>
        <div style={{fontSize: 11, color: T.inkMid, marginBottom: 6}}>Punto de partida</div>
        <div style={{display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12}}>
          <Boton small activo={plantilla === ""} onClick={() => setPlantilla("")}>En blanco</Boton>
          {PLANTILLAS.map(p => <Boton key={p.id} small activo={plantilla === p.id} onClick={() => { setPlantilla(p.id); setAncho(String(p.ancho)); }}>{p.nombre}</Boton>)}
        </div>
        <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10}}>
          <Campo label={pl ? "Ancho (se ajusta a múltiplo de " + pl.unidad + ")" : "Puntos (ancho)"} type="number" min="4" max="120" value={ancho} onChange={e => setAncho(e.target.value)}/>
          {pl ? <div/> : <Campo label="Vueltas (alto)" type="number" min="4" max="120" value={alto} onChange={e => setAlto(e.target.value)}/>}
        </div>
        <div style={{display: "flex", gap: 8, justifyContent: "flex-end"}}>
          <Boton onClick={onCerrar}>Cancelar</Boton>
          <Boton primario onClick={crear}>Crear y abrir</Boton>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════ PDF ═══════════════════════
async function construirPDFPuntos(d) {
  const mod = await import("jspdf");
  const JsPDF = mod.jsPDF || mod.default;
  const doc = new JsPDF({unit: "mm", format: "a4"});
  const W = 210, M = 14, PIE = 284, S = 6;
  const GRIS = [154, 150, 144];
  const GRIS2 = [90, 87, 80];
  let y = 0;
  const texto = (t, x, yy, tam, negrita, color, opciones) => {
    doc.setFont("helvetica", negrita ? "bold" : "normal");
    doc.setFontSize(tam);
    const c = color || [30, 28, 24];
    doc.setTextColor(c[0], c[1], c[2]);
    doc.text(String(t), x, yy, opciones || {});
  };
  const encabezado = titulo => {
    doc.setFillColor(61, 90, 62);
    doc.rect(0, 0, W, 18, "F");
    texto("JUNCO VERDE", M, 11.5, 15, true, [255, 255, 255]);
    texto(titulo, W - M, 11.5, 11, false, [255, 255, 255], {align: "right"});
    return 27;
  };
  const seccion = t => {
    y += 3;
    texto(t.toUpperCase(), M, y, 8.5, true, [61, 90, 62]);
    doc.setDrawColor(221, 216, 207);
    doc.line(M, y + 1.8, W - M, y + 1.8);
    y += 7;
  };
  const asegurar = (alto, titulo) => {
    if (y + alto > PIE - 6) { doc.addPage(); y = encabezado(titulo); }
  };
  const tit = "Gráfico de puntos";

  y = encabezado(tit);
  texto(d.nombre, M, y + 1, 17, true);
  y += 8;
  texto((d.modo === "redondo" ? "Tejido en redondo" : "Tejido plano (dos agujas)") + "  -  " + d.ancho + " puntos x " + d.alto + " vueltas", M, y, 10, false, GRIS2);
  y += 5;
  if (d.repH > 1 || d.repV > 1) { texto("Se repite " + d.repH + " veces a lo ancho y " + d.repV + " veces a lo alto", M, y, 10); y += 5; }
  if (d.prenda) { texto("Prenda: " + d.prenda, M, y, 10); y += 5; }
  const nota = d.modo === "redondo"
    ? "Fila 1 = la de abajo. Los puntos se numeran de derecha a izquierda. Todas las vueltas se leen de derecha a izquierda."
    : "Fila 1 = la de abajo. Los puntos se numeran de derecha a izquierda. Las filas del derecho (impares) se leen de derecha a izquierda y las del revés (pares), de izquierda a derecha.";
  const ln = doc.splitTextToSize(nota, W - 2 * M);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(GRIS2[0], GRIS2[1], GRIS2[2]);
  doc.text(ln, M, y);
  y += ln.length * 4 + 3;

  // gráfico (de abajo hacia arriba, en una o más páginas)
  const cellMm = Math.min(7, (W - 2 * M - 12) / d.ancho);
  const cellPx = Math.max(5, Math.floor(cellMm * S));
  const cellReal = cellPx / S;
  let hasta = d.alto;
  while (hasta > 0) {
    let disp = PIE - 8 - y;
    let filas = Math.floor((disp - 4) / cellReal);
    if (filas < 4) { doc.addPage(); y = encabezado(tit); disp = PIE - 8 - y; filas = Math.floor((disp - 4) / cellReal); }
    filas = Math.min(filas, hasta);
    const desde = hasta - filas;
    const cv = document.createElement("canvas");
    dibujarGrafico(cv, d.grid, {cell: cellPx, modo: d.modo, numeros: true, desde: desde, hasta: hasta});
    doc.addImage(cv.toDataURL("image/png"), "PNG", M, y, cv.width / S, cv.height / S);
    y += cv.height / S + 4;
    hasta = desde;
  }

  // leyenda
  asegurar(30, tit);
  seccion("Leyenda de símbolos");
  d.leyenda.forEach(item => {
    const lineas = doc.splitTextToSize(item.exp, W - M - (M + 50));
    const alto = Math.max(10, lineas.length * 4.2 + 6);
    asegurar(alto, tit);
    const cv = document.createElement("canvas");
    const cs = 40;
    cv.width = cs * item.ids.length;
    cv.height = cs;
    const ctx = cv.getContext("2d");
    item.ids.forEach((id, i) => { dibujarPunto(ctx, id, i * cs, 0, cs, cs); });
    ctx.strokeStyle = "#8d887c";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, cv.width - 2, cv.height - 2);
    doc.addImage(cv.toDataURL("image/png"), "PNG", M, y, 7 * item.ids.length, 7);
    texto(item.abrev + "  -  " + item.nombre, M + 50, y + 3.5, 10, true);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 58, 52);
    doc.text(lineas, M + 50, y + 8);
    y += alto;
  });

  // instrucciones escritas
  asegurar(30, tit);
  seccion("Instrucciones escritas");
  d.filas.forEach(f => {
    const lineas = doc.splitTextToSize(f.texto, W - M - (M + 34) - 16);
    const alto = lineas.length * 4.4 + 3;
    asegurar(alto, tit);
    texto(f.etiqueta, M, y + 3.5, 9, true);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 28, 24);
    doc.text(lineas, M + 34, y + 3.5);
    texto("(" + f.puntos + " pts)", W - M, y + 3.5, 8.5, false, GRIS, {align: "right"});
    y += alto;
  });
  if (d.notas) {
    const ln2 = doc.splitTextToSize("Notas: " + d.notas, W - 2 * M);
    asegurar(ln2.length * 5 + 8, tit);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 28, 24);
    doc.text(ln2, M, y);
  }

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    texto("Junco Verde", M, 291, 8, false, GRIS);
    texto("Página " + i + " de " + total, W - M, 291, 8, false, GRIS, {align: "right"});
  }
  return doc;
}

// ═══════════════════════ EDITOR ═══════════════════════
function Editor({ grafico, prendas, mob, estado, onGuardar, onVolver }) {
  const [nombre, setNombre] = useState(grafico.nombre || "");
  const [etiquetas, setEtiquetas] = useState((grafico.etiquetas || []).join(", "));
  const [modo, setModo] = useState(grafico.modo || "plano");
  const [prenda, setPrenda] = useState(grafico.prenda || "");
  const [dims, setDims] = useState({ancho: grafico.ancho, alto: grafico.alto});
  const [nuevoAncho, setNuevoAncho] = useState(String(grafico.ancho));
  const [nuevoAlto, setNuevoAlto] = useState(String(grafico.alto));
  const [repH, setRepH] = useState(String(grafico.repH || 1));
  const [repV, setRepV] = useState(String(grafico.repV || 1));
  const [notas, setNotas] = useState(grafico.notas || "");
  const [herr, setHerr] = useState("pincel");
  const [activo, setActivo] = useState("p");
  const [simH, setSimH] = useState(false);
  const [zoom, setZoom] = useState(mob ? 24 : 30);
  const [numeros, setNumeros] = useState(true);
  const [sel, setSel] = useState(null);
  const [portap, setPortap] = useState(null);
  const [tick, setTick] = useState(0);
  const [sucio, setSucio] = useState(false);
  const [aviso, setAviso] = useState("");
  const [instr, setInstr] = useState({filas: [], avisos: []});
  const [pdf, setPdf] = useState(null);
  const [generando, setGenerando] = useState(false);

  const gridRef = useRef(null);
  if (gridRef.current === null) gridRef.current = decodificar(grafico.celdas, grafico.ancho, grafico.alto);
  const histRef = useRef({pasado: [], futuro: []});
  const canvasRef = useRef(null);
  const contRef = useRef(null);
  const coordRef = useRef(null);
  const trans = useRef(null);
  const kbRef = useRef(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const W = dims.ancho;
  const H = dims.alto;
  const kind = POR_CLAVE_PALETA[activo] || POR_CLAVE_PALETA.p;
  const bump = () => { setTick(t => t + 1); setSucio(true); setPdf(null); };
  const avisar = t => { setAviso(t); setTimeout(() => setAviso(""), 3500); };

  // ── dibujo ──
  const pintar = () => {
    const c = canvasRef.current;
    if (!c) return;
    const tr = trans.current;
    dibujarGrafico(c, gridRef.current, {
      cell: zoom, modo: modo, numeros: numeros,
      sel: tr && tr.tipo === "sel" ? norm(tr.x0, tr.y0, tr.x1, tr.y1) : sel,
      prev: tr && tr.lista ? {lista: tr.lista, id: kind.id} : null
    });
  };
  useEffect(() => { pintar(); }, [tick, zoom, dims, numeros, sel, modo]);

  useEffect(() => {
    const id = setTimeout(() => { setInstr(generar(gridRef.current, modo)); }, 200);
    return () => clearTimeout(id);
  }, [tick, modo]);

  const leyenda = useMemo(() => leyendaDe(gridRef.current), [tick]);

  useEffect(() => {
    const cont = contRef.current;
    if (!cont) return;
    const fn = e => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom(z => clamp(Math.round(z * (e.deltaY < 0 ? 1.12 : 0.89)), 10, 60));
      }
    };
    cont.addEventListener("wheel", fn, {passive: false});
    return () => cont.removeEventListener("wheel", fn);
  }, []);

  // ── historial ──
  const historial = () => {
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
    aplicarGrilla(h.pasado.pop());
  };
  const rehacer = () => {
    const h = histRef.current;
    if (!h.futuro.length) return;
    h.pasado.push(copiarGrilla(gridRef.current));
    setSel(null);
    aplicarGrilla(h.futuro.pop());
  };

  // ── pintar ──
  const poner = (x, y, id) => {
    const g = gridRef.current;
    if (y < 0 || x < 0 || y >= g.length || x >= g[0].length) return;
    g[y][x] = id;
  };
  const pintarPunto = (x, y) => {
    poner(x, y, kind.id);
    if (simH) poner(W - 1 - x, y, espejarId(kind.id));
  };
  const aplicarLista = lista => { lista.forEach(p => { pintarPunto(p[0], p[1]); }); };
  const colocarCable = (x, y, cab) => {
    if (x + cab.n > W) { avisar("La trenza no entra: necesita " + cab.n + " casilleros hacia la derecha."); return false; }
    const g = gridRef.current;
    for (let i = 0; i < cab.n; i++) g[y][x + i] = cab.base + i;
    if (simH) {
      const mx = W - x - cab.n;
      if (mx >= 0) for (let i = 0; i < cab.n; i++) g[y][mx + i] = espejarId(cab.base + (cab.n - 1 - i));
    }
    return true;
  };
  const rellenar = (x, y) => {
    const g = gridRef.current;
    const objetivo = g[y][x];
    if (objetivo === kind.id) return;
    const pila = [[x, y]];
    while (pila.length) {
      const p = pila.pop();
      const cx = p[0], cy = p[1];
      if (cy < 0 || cx < 0 || cy >= g.length || cx >= g[0].length) continue;
      if (g[cy][cx] !== objetivo) continue;
      g[cy][cx] = kind.id;
      pila.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
  };

  // ── selección ──
  const extraer = s => {
    const g = gridRef.current;
    const filas = [];
    for (let y = s.y0; y <= s.y1; y++) filas.push(g[y].slice(s.x0, s.x1 + 1));
    return filas;
  };
  const copiar = () => { if (sel) { setPortap(extraer(sel)); avisar("Copiado: " + (sel.x1 - sel.x0 + 1) + "×" + (sel.y1 - sel.y0 + 1) + " casilleros."); } };
  const borrarSel = () => {
    if (!sel) return;
    historial();
    for (let y = sel.y0; y <= sel.y1; y++) for (let x = sel.x0; x <= sel.x1; x++) gridRef.current[y][x] = 0;
    bump();
  };
  const cortar = () => { if (!sel) return; setPortap(extraer(sel)); borrarSel(); };
  const pegar = () => {
    if (!portap) { avisar("No hay nada copiado."); return; }
    historial();
    const ox = sel ? sel.x0 : 0, oy = sel ? sel.y0 : 0;
    portap.forEach((fila, j) => fila.forEach((v, i) => { poner(ox + i, oy + j, v); }));
    setSel({x0: ox, y0: oy, x1: Math.min(W - 1, ox + portap[0].length - 1), y1: Math.min(H - 1, oy + portap.length - 1)});
    bump();
  };
  const voltearSel = () => {
    if (!sel) return;
    historial();
    const celdas = extraer(sel).map(f => f.slice().reverse().map(espejarId));
    celdas.forEach((fila, j) => fila.forEach((v, i) => { poner(sel.x0 + i, sel.y0 + j, v); }));
    bump();
  };
  const selTodo = () => setSel({x0: 0, y0: 0, x1: W - 1, y1: H - 1});

  // ── acciones sobre todo el gráfico ──
  const voltearH = () => { historial(); setSel(null); aplicarGrilla(gridRef.current.map(f => f.slice().reverse().map(espejarId))); };
  const voltearV = () => { historial(); setSel(null); aplicarGrilla(gridRef.current.slice().reverse().map(f => f.slice())); };
  const limpiar = () => {
    if (!window.confirm("¿Dejar todo el gráfico en derecho?")) return;
    historial();
    setSel(null);
    aplicarGrilla(crearGrilla(W, H));
  };
  const aplicarTamano = () => {
    const A = clamp(Math.round(num(nuevoAncho)) || 4, 4, 120);
    const Hh = clamp(Math.round(num(nuevoAlto)) || 4, 4, 120);
    historial();
    setSel(null);
    const vieja = gridRef.current;
    const g = crearGrilla(A, Hh);
    // se conserva lo dibujado desde la esquina inferior izquierda hacia arriba
    for (let j = 0; j < Math.min(Hh, vieja.length); j++) {
      for (let x = 0; x < Math.min(A, vieja[0].length); x++) g[Hh - 1 - j][x] = vieja[vieja.length - 1 - j][x];
    }
    setNuevoAncho(String(A));
    setNuevoAlto(String(Hh));
    aplicarGrilla(g);
  };

  // ── puntero ──
  const celdaEn = e => {
    const r = canvasRef.current.getBoundingClientRect();
    const mg = margenes(numeros);
    return [clamp(Math.floor((e.clientX - r.left - mg.mL) / zoom), 0, W - 1), clamp(Math.floor((e.clientY - r.top - mg.mT) / zoom), 0, H - 1)];
  };
  const alBajar = e => {
    if (herr === "vista") return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const p = celdaEn(e);
    const x = p[0], y = p[1];
    try { canvasRef.current.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
    if (herr === "gotero") {
      const pk = POR_ID[gridRef.current[y][x]];
      if (pk) { const clave = pk.cable ? pk.cable.clave : pk.clave; if (POR_CLAVE_PALETA[clave]) setActivo(clave); }
      return;
    }
    if (herr === "seleccion") {
      trans.current = {tipo: "sel", x0: x, y0: y, x1: x, y1: y};
      setSel(null);
      pintar();
      return;
    }
    if (kind.cable && herr !== "pincel") { avisar("Las trenzas se colocan una a una con el pincel."); return; }
    if (herr === "pincel") {
      historial();
      if (kind.cable) { colocarCable(x, y, kind.cable); trans.current = null; bump(); return; }
      trans.current = {tipo: "pincel", ultima: [x, y]};
      pintarPunto(x, y);
      pintar();
      return;
    }
    if (herr === "balde") { historial(); rellenar(x, y); bump(); return; }
    if (herr === "linea" || herr === "rect") {
      trans.current = {tipo: herr, x0: x, y0: y, x1: x, y1: y, lista: herr === "linea" ? celdasLinea(x, y, x, y) : celdasRect(x, y, x, y)};
      pintar();
    }
  };
  const alMover = e => {
    const p = celdaEn(e);
    const x = p[0], y = p[1];
    if (coordRef.current) coordRef.current.textContent = "Punto " + (W - x) + " · Fila " + (H - y);
    const tr = trans.current;
    if (!tr) return;
    if (tr.tipo === "pincel") {
      if (x === tr.ultima[0] && y === tr.ultima[1]) return;
      celdasLinea(tr.ultima[0], tr.ultima[1], x, y).forEach(q => { pintarPunto(q[0], q[1]); });
      tr.ultima = [x, y];
      pintar();
      return;
    }
    tr.x1 = x;
    tr.y1 = y;
    if (tr.tipo === "linea") tr.lista = celdasLinea(tr.x0, tr.y0, x, y);
    if (tr.tipo === "rect") tr.lista = celdasRect(tr.x0, tr.y0, x, y);
    pintar();
  };
  const alSoltar = () => {
    const tr = trans.current;
    trans.current = null;
    if (!tr) return;
    if (tr.tipo === "pincel") { bump(); return; }
    if (tr.tipo === "sel") { setSel(norm(tr.x0, tr.y0, tr.x1, tr.y1)); return; }
    if (tr.tipo === "linea" || tr.tipo === "rect") {
      historial();
      aplicarLista(tr.lista);
      bump();
    }
  };

  // ── atajos de teclado ──
  kbRef.current = e => {
    const t = e.target;
    const tag = t && t.tagName ? t.tagName.toLowerCase() : "";
    if (tag === "input" || tag === "textarea" || tag === "select") return;
    const k = e.key;
    const ctrl = e.ctrlKey || e.metaKey;
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
    const mapa = {b: "pincel", l: "linea", r: "rect", g: "balde", i: "gotero", s: "seleccion", h: "vista"};
    if (mapa[k.toLowerCase()]) { setHerr(mapa[k.toLowerCase()]); return; }
    if (k === "Delete" || k === "Backspace") { if (sel) { e.preventDefault(); borrarSel(); } return; }
    if (k === "Escape") { trans.current = null; setSel(null); return; }
    if (k === "+" || k === "=") setZoom(z => clamp(z + 2, 10, 60));
    if (k === "-") setZoom(z => clamp(z - 2, 10, 60));
  };
  useEffect(() => {
    const down = e => { if (kbRef.current) kbRef.current(e); };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  // ── guardar, texto y PDF ──
  const guardar = () => {
    onGuardar({
      id: grafico.id,
      tecnica: "tejido",
      nombre: nombre.trim() || "Gráfico sin nombre",
      modo: modo,
      prenda: prenda,
      etiquetas: etiquetas.split(",").map(s => s.trim()).filter(Boolean),
      ancho: dims.ancho,
      alto: dims.alto,
      celdas: codificar(gridRef.current),
      repH: clamp(Math.round(num(repH)) || 1, 1, 50),
      repV: clamp(Math.round(num(repV)) || 1, 1, 50),
      notas: notas,
      actualizado: new Date().toISOString()
    });
    setSucio(false);
  };
  const volver = () => { if (sucio && !window.confirm("Hay cambios sin guardar. ¿Salir igual?")) return; onVolver(); };
  const textoInstrucciones = () => {
    let t = (nombre || "Gráfico") + " - " + (modo === "redondo" ? "tejido en redondo" : "tejido plano") + ", " + dims.ancho + " puntos x " + dims.alto + " vueltas\n\n";
    instr.filas.forEach(f => { t += f.etiqueta + ": " + f.texto + " (" + f.puntos + " pts)\n"; });
    if (leyenda.length) {
      t += "\nReferencias:\n";
      leyenda.forEach(l => { t += "- " + l.abrev + ": " + l.nombre + ". " + l.exp + "\n"; });
    }
    return t;
  };
  const copiarTexto = () => { if (navigator.clipboard) navigator.clipboard.writeText(textoInstrucciones()); avisar("Instrucciones copiadas."); };
  const generarPdf = async () => {
    setGenerando(true);
    try {
      const doc = await construirPDFPuntos({
        nombre: nombre || "Gráfico", modo: modo, ancho: dims.ancho, alto: dims.alto, grid: gridRef.current,
        repH: clamp(Math.round(num(repH)) || 1, 1, 50), repV: clamp(Math.round(num(repV)) || 1, 1, 50),
        prenda: prenda, notas: notas, filas: instr.filas, leyenda: leyenda
      });
      const blob = doc.output("blob");
      const nombreArchivo = "Puntos_" + slug(nombre || "grafico") + ".pdf";
      setPdf({blob: blob, file: new File([blob], nombreArchivo, {type: "application/pdf"}), nombre: nombreArchivo, kb: Math.round(blob.size / 1024)});
    } catch (e) {
      console.error("Error generando PDF:", e);
      avisar("No se pudo generar el PDF. Probá de nuevo.");
    }
    setGenerando(false);
  };
  const descargarPdf = () => {
    const url = URL.createObjectURL(pdf.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = pdf.nombre;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };
  const compartirPdf = async () => {
    try { await navigator.share({files: [pdf.file], title: nombre || "Gráfico de puntos"}); } catch (e) { /* cancelado */ }
  };
  const puedeCompartir = !!(pdf && typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({files: [pdf.file]}));
  const descargarPng = () => {
    const cv = document.createElement("canvas");
    dibujarGrafico(cv, gridRef.current, {cell: 40, modo: modo, numeros: true});
    const a = document.createElement("a");
    a.href = cv.toDataURL("image/png");
    a.download = "Puntos_" + slug(nombre || "grafico") + ".png";
    a.click();
  };

  const cursor = herr === "vista" ? "grab" : (herr === "gotero" ? "copy" : "crosshair");

  return (
    <div>
      <div style={{display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14}}>
        <Boton onClick={volver}>← Volver</Boton>
        <input value={nombre} onChange={e => { setNombre(e.target.value); setSucio(true); }} placeholder="Nombre del gráfico" style={{flex: 1, minWidth: 160, padding: "8px 12px", border: "1px solid " + T.border, borderRadius: 2, fontSize: 15, fontFamily: "inherit"}}/>
        {sucio ? <span style={{fontSize: 11, color: T.warn}}>● sin guardar</span> : null}
        <span style={{fontSize: 11, color: estado === "error" ? T.danger : T.inkLt}}>{estado === "saving" ? "☁ Guardando…" : (estado === "error" ? "⚠ Error al guardar" : "")}</span>
        <Boton primario onClick={guardar}>Guardar gráfico</Boton>
      </div>
      {aviso ? <div style={{background: T.infoLt, border: "1px solid " + T.info, borderRadius: 2, padding: "7px 12px", marginBottom: 10, fontSize: 12, color: T.info}}>{aviso}</div> : null}

      <div style={{display: "grid", gridTemplateColumns: mob ? "1fr" : "minmax(0,1fr) 390px", gap: 14, alignItems: "start"}}>
        {/* ── Izquierda ── */}
        <div>
          <Tarjeta style={{padding: "0.8rem"}}>
            <div style={{display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8}}>
              {HERRAMIENTAS.map(h => (
                <button key={h.id} onClick={() => setHerr(h.id)} title={h.nombre + " (" + h.tecla + ")"} style={{padding: "6px 10px", borderRadius: 4, border: "1px solid " + (herr === h.id ? T.green : T.border), background: herr === h.id ? T.green : T.bgCard, color: herr === h.id ? "#fff" : T.ink, cursor: "pointer", fontSize: 12, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap"}}>
                  <span>{h.icono}</span>{mob ? null : <span>{h.nombre}</span>}
                </button>
              ))}
            </div>

            <div style={{display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 8}}>
              <span style={{display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: T.inkMid}}>Punto activo <Simbolo ids={kind.ids} size={20}/> <strong>{kind.nombre}</strong></span>
              <Sep/>
              <Boton small activo={simH} onClick={() => setSimH(!simH)} title="Dibuja también el reflejo izquierda-derecha (con los puntos espejados)">Simetría ↔</Boton>
              {herr === "seleccion" || sel ? (
                <span style={{display: "inline-flex", gap: 5, flexWrap: "wrap", alignItems: "center", padding: "3px 6px", background: T.bg, borderRadius: 4}}>
                  <Boton small onClick={copiar} disabled={!sel}>Copiar</Boton>
                  <Boton small onClick={cortar} disabled={!sel}>Cortar</Boton>
                  <Boton small onClick={pegar} disabled={!portap}>Pegar</Boton>
                  <Boton small onClick={borrarSel} disabled={!sel}>Borrar</Boton>
                  <Boton small onClick={voltearSel} disabled={!sel}>Voltear ↔</Boton>
                  <Boton small onClick={selTodo}>Todo</Boton>
                </span>
              ) : null}
            </div>

            <div style={{display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center", marginBottom: 8}}>
              <Boton small onClick={deshacer} title="Ctrl+Z">↶ Deshacer</Boton>
              <Boton small onClick={rehacer} title="Ctrl+Y">↷ Rehacer</Boton>
              <Sep/>
              <Boton small onClick={voltearH}>Voltear ↔</Boton>
              <Boton small onClick={voltearV}>Voltear ↕</Boton>
              <Boton small onClick={limpiar}>Limpiar</Boton>
              <Sep/>
              <Boton small onClick={() => setZoom(z => clamp(z - 4, 10, 60))}>−</Boton>
              <input type="range" min="10" max="60" value={zoom} onChange={e => setZoom(Number(e.target.value))} style={{width: 90}}/>
              <Boton small onClick={() => setZoom(z => clamp(z + 4, 10, 60))}>+</Boton>
              <Boton small activo={numeros} onClick={() => setNumeros(!numeros)} title="Numeración de puntos y filas">123</Boton>
              <span ref={coordRef} style={{fontSize: 11, color: T.inkLt, marginLeft: "auto"}}></span>
            </div>

            <div ref={contRef} style={{overflow: "auto", maxHeight: mob ? "55vh" : "68vh", border: "1px solid " + T.border, background: "#f4f1ea"}}>
              <canvas ref={canvasRef} onPointerDown={alBajar} onPointerMove={alMover} onPointerUp={alSoltar} onPointerCancel={alSoltar}
                style={{display: "block", cursor: cursor, touchAction: herr === "vista" ? "auto" : "none"}}/>
            </div>
            <div style={{fontSize: 10, color: T.inkLt, marginTop: 6, lineHeight: 1.5}}>
              Fila 1 abajo; puntos numerados de derecha a izquierda. {modo === "redondo" ? "Todas las vueltas se leen de derecha a izquierda." : "Filas impares (derecho) a la derecha del gráfico, de derecha a izquierda; filas pares (revés) a la izquierda, de izquierda a derecha."}
              {" "}Atajos: B pincel · L línea · R rectángulo · G rellenar · I gotero · S selección · H mover vista · Ctrl+Z/Y/C/X/V · Ctrl+rueda para el zoom. En el celular usá ✋ para desplazarte.
            </div>
          </Tarjeta>

          <Tarjeta titulo={"Instrucciones escritas (" + instr.filas.length + " " + (modo === "redondo" ? "vueltas" : "filas") + ")"}>
            {instr.avisos.length > 0 ? (
              <div style={{background: T.warnLt, border: "1px solid " + T.warn, borderRadius: 2, padding: "8px 10px", marginBottom: 10, fontSize: 11, color: T.warn, lineHeight: 1.5}}>
                <strong>Para revisar:</strong>
                {instr.avisos.slice(0, 6).map((a, i) => <div key={i}>• {a}</div>)}
                {instr.avisos.length > 6 ? <div>… y {instr.avisos.length - 6} más.</div> : null}
              </div>
            ) : null}
            <div style={{maxHeight: 320, overflowY: "auto", border: "1px solid " + T.borderLt, borderRadius: 2}}>
              {instr.filas.map((f, i) => (
                <div key={f.n} style={{display: "flex", gap: 10, padding: "6px 10px", background: i % 2 === 0 ? T.bgCard : T.bg, fontSize: 12, borderBottom: "1px solid " + T.borderLt}}>
                  <strong style={{minWidth: 96, whiteSpace: "nowrap"}}>{f.etiqueta}</strong>
                  <span style={{flex: 1}}>{f.texto}</span>
                  <span style={{color: T.inkLt, whiteSpace: "nowrap"}}>{f.puntos} pts</span>
                </div>
              ))}
            </div>
            <div style={{display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10}}>
              <Boton small onClick={copiarTexto}>Copiar instrucciones</Boton>
            </div>
          </Tarjeta>
        </div>

        {/* ── Derecha ── */}
        <div>
          <Tarjeta titulo="Puntos">
            {GRUPOS.map(g => {
              const items = PALETA.filter(p => p.grupo === g);
              if (items.length === 0) return null;
              return (
                <div key={g} style={{marginBottom: 10}}>
                  <div style={{fontSize: 10, color: T.inkLt, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5}}>{g}</div>
                  <div style={{display: "flex", flexWrap: "wrap", gap: 5}}>
                    {items.map(p => {
                      const on = activo === p.clave;
                      return (
                        <button key={p.clave} onClick={() => { setActivo(p.clave); if (herr === "gotero" || herr === "vista" || herr === "seleccion") setHerr("pincel"); }} title={p.nombre}
                          style={{display: "flex", alignItems: "center", gap: 6, padding: "4px 8px 4px 4px", border: "1px solid " + (on ? T.green : T.border), background: on ? T.greenLt : T.bgCard, borderRadius: 4, cursor: "pointer", fontFamily: "inherit", fontSize: 11, color: T.ink, textAlign: "left"}}>
                          <Simbolo ids={p.ids} size={20}/>
                          <span>{p.nombre}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div style={{fontSize: 10, color: T.inkLt, lineHeight: 1.5}}>Las trenzas ocupan varios casilleros y se colocan con un clic del pincel. Usá "Sin punto" para alinear el gráfico cuando hay disminuciones.</div>
          </Tarjeta>

          <Tarjeta titulo="Datos del gráfico">
            <div style={{fontSize: 11, color: T.inkMid, marginBottom: 6}}>Cómo se teje</div>
            <div style={{display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap"}}>
              <Boton small activo={modo === "plano"} onClick={() => { setModo("plano"); setSucio(true); setPdf(null); }}>Plano</Boton>
              <Boton small activo={modo === "redondo"} onClick={() => { setModo("redondo"); setSucio(true); setPdf(null); }}>En redondo</Boton>
            </div>
            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end"}}>
              <Campo label="Puntos (ancho)" type="number" min="4" max="120" value={nuevoAncho} onChange={e => setNuevoAncho(e.target.value)}/>
              <Campo label="Filas (alto)" type="number" min="4" max="120" value={nuevoAlto} onChange={e => setNuevoAlto(e.target.value)}/>
              <div style={{marginBottom: 10}}><Boton small onClick={aplicarTamano}>Aplicar</Boton></div>
            </div>
            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8}}>
              <Campo label="Se repite ↔ (veces)" type="number" min="1" value={repH} onChange={e => { setRepH(e.target.value); setSucio(true); }}/>
              <Campo label="Se repite ↕ (veces)" type="number" min="1" value={repV} onChange={e => { setRepV(e.target.value); setSucio(true); }}/>
            </div>
            <Campo label="Etiquetas (separadas por coma)" value={etiquetas} onChange={e => { setEtiquetas(e.target.value); setSucio(true); }} placeholder="Ej: trenza, puño, calado"/>
            <div style={{marginBottom: 10}}>
              <label style={{fontSize: 11, color: T.inkMid, display: "block", marginBottom: 4}}>Prenda asociada (opcional)</label>
              <select value={prenda} onChange={e => { setPrenda(e.target.value); setSucio(true); }} style={{width: "100%", padding: "7px 10px", border: "1px solid " + T.border, borderRadius: 2, fontSize: 13, fontFamily: "inherit", background: T.bgCard}}>
                <option value="">— ninguna —</option>
                {prendas.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <Campo label="Notas" value={notas} onChange={e => { setNotas(e.target.value); setSucio(true); }} placeholder="Ej: tejer con agujas de 4 mm"/>
          </Tarjeta>

          <Tarjeta titulo="Leyenda">
            {leyenda.length === 0 ? <div style={{fontSize: 12, color: T.inkLt}}>Todavía no hay puntos en el gráfico.</div> : null}
            {leyenda.map(l => (
              <div key={l.abrev + l.nombre} style={{display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8}}>
                <div style={{flexShrink: 0}}><Simbolo ids={l.ids} size={20}/></div>
                <div style={{fontSize: 11, lineHeight: 1.45}}>
                  <strong>{l.abrev}</strong> · {l.nombre}
                  <div style={{color: T.inkMid}}>{l.exp}</div>
                </div>
              </div>
            ))}
          </Tarjeta>

          <Tarjeta titulo="Para la artesana">
            <div style={{fontSize: 12, color: T.inkMid, marginBottom: 10, lineHeight: 1.5}}>PDF con el gráfico numerado, la leyenda y las instrucciones fila por fila.</div>
            <div style={{display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center"}}>
              <Boton primario onClick={generarPdf} disabled={generando}>{generando ? "Generando…" : (pdf ? "Volver a generar" : "Generar PDF")}</Boton>
              {pdf ? <Boton onClick={descargarPdf}>⬇ Descargar</Boton> : null}
              {puedeCompartir ? <Boton onClick={compartirPdf}>Compartir</Boton> : null}
              <Boton onClick={descargarPng}>⬇ Gráfico (imagen)</Boton>
            </div>
            {pdf ? <div style={{fontSize: 11, color: T.ok, marginTop: 8}}>✓ PDF listo: {pdf.nombre} ({pdf.kb} KB)</div> : null}
          </Tarjeta>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════ PANTALLA PRINCIPAL ═══════════════════════
export default function Puntos({ prendas, mob, onModo }) {
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
    dbGet("puntos").then(d => {
      if (!vivo) return;
      if (d === undefined) { setErrorCarga(true); return; }
      setData({graficos: (d && d.graficos) || []});
    });
    return () => { vivo = false; };
  }, [intento]);

  const todasTags = useMemo(() => {
    const s = {};
    (data ? data.graficos : []).forEach(g => { (g.etiquetas || []).forEach(t => { s[t] = true; }); });
    return Object.keys(s).sort();
  }, [data]);

  const guardarData = nuevo => {
    setData(nuevo);
    setEstado("saving");
    dbSet("puntos", nuevo).then(ok => setEstado(ok ? "ok" : "error"));
  };

  const cabecera = (
    <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingBottom: 10, borderBottom: "1px solid " + T.borderLt, gap: 10, flexWrap: "wrap"}}>
      <div style={{display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap"}}>
        <h2 style={{margin: 0, fontSize: 13, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: T.inkMid}}>Puntos y calados</h2>
        {onModo ? <TabsModo modo="puntos" onModo={onModo}/> : null}
      </div>
      <div style={{display: "flex", gap: 8, alignItems: "center"}}>
        <span style={{fontSize: 11, color: estado === "error" ? T.danger : T.inkLt}}>{estado === "saving" ? "☁ Guardando…" : (estado === "error" ? "⚠ Error al guardar" : "")}</span>
        <Boton primario onClick={() => setNuevoAbierto(true)}>+ Nuevo gráfico</Boton>
      </div>
    </div>
  );

  if (errorCarga) {
    return (
      <div>
        {onModo ? <div style={{marginBottom: 16}}><TabsModo modo="puntos" onModo={onModo}/></div> : null}
        <div style={{textAlign: "center", padding: "3rem 1rem"}}>
          <div style={{fontSize: 36, marginBottom: 10}}>⚠️</div>
          <div style={{fontSize: 16, color: T.danger, marginBottom: 8}}>No se pudieron cargar los gráficos de puntos</div>
          <div style={{fontSize: 13, color: T.inkMid, maxWidth: 420, margin: "0 auto 16px"}}>Verificá que hayas creado la tabla <strong>puntos</strong> en Supabase (paso del SQL) y reintentá.</div>
          <Boton primario onClick={() => setIntento(intento + 1)}>Reintentar</Boton>
        </div>
      </div>
    );
  }
  if (data === null) return <div style={{padding: "3rem", textAlign: "center", color: T.inkLt, fontSize: 13}}>Cargando…</div>;

  const crear = r => {
    const grid = r.grid;
    setEditando({
      id: Date.now(), tecnica: "tejido", nombre: r.nombre, modo: r.modo, prenda: "", etiquetas: [],
      ancho: grid[0].length, alto: grid.length, celdas: codificar(grid), repH: 1, repV: 1, notas: ""
    });
    setNuevoAbierto(false);
    setVista("editor");
  };
  const guardarGrafico = g => {
    const existe = data.graficos.some(x => x.id === g.id);
    guardarData({graficos: existe ? data.graficos.map(x => x.id === g.id ? g : x) : data.graficos.concat([g])});
  };
  const duplicar = g => guardarData({graficos: data.graficos.concat([{...g, id: Date.now(), nombre: g.nombre + " (copia)", actualizado: new Date().toISOString()}])});
  const eliminar = g => {
    if (!window.confirm("¿Eliminar el gráfico \"" + g.nombre + "\"?")) return;
    guardarData({graficos: data.graficos.filter(x => x.id !== g.id)});
  };

  if (vista === "editor" && editando) {
    return (
      <Editor key={editando.id} grafico={editando} prendas={prendas || []} mob={mob} estado={estado}
        onGuardar={guardarGrafico} onVolver={() => { setVista("lista"); setEditando(null); }}/>
    );
  }

  const q = busqueda.trim().toLowerCase();
  const visibles = data.graficos
    .filter(g => (!filtroTag || (g.etiquetas || []).includes(filtroTag)) && (!q || [g.nombre, g.prenda, (g.etiquetas || []).join(" ")].join(" ").toLowerCase().includes(q)))
    .slice()
    .sort((a, b) => String(b.actualizado || "").localeCompare(String(a.actualizado || "")));

  return (
    <div>
      {cabecera}
      {data.graficos.length === 0 ? (
        <div style={{textAlign: "center", padding: "3rem 1.5rem", color: T.inkLt}}>
          <div style={{fontSize: 40, marginBottom: 12, opacity: 0.35}}>🧶</div>
          <div style={{fontSize: 15, fontWeight: 500, color: T.inkMid, marginBottom: 6}}>Todavía no hay gráficos de puntos</div>
          <div style={{fontSize: 13, maxWidth: 400, margin: "0 auto 18px"}}>Diseñá puntos con símbolos (derecho, revés, hebras, disminuciones, trenzas) y obtené las instrucciones escritas fila por fila.</div>
          <Boton primario onClick={() => setNuevoAbierto(true)}>+ Crear el primer gráfico</Boton>
        </div>
      ) : (
        <div style={{display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 14}}>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder={"Buscar entre " + data.graficos.length + " gráficos…"} style={{flex: 1, minWidth: 180, maxWidth: 320, padding: "8px 12px", border: "1px solid " + T.border, borderRadius: 2, fontSize: 13, fontFamily: "inherit"}}/>
          {todasTags.length > 0 ? <Boton small activo={filtroTag === ""} onClick={() => setFiltroTag("")}>Todos</Boton> : null}
          {todasTags.map(t => <Boton key={t} small activo={filtroTag === t} onClick={() => setFiltroTag(filtroTag === t ? "" : t)}>{t}</Boton>)}
        </div>
      )}
      {data.graficos.length > 0 && visibles.length === 0 ? <div style={{padding: "2rem", textAlign: "center", fontSize: 13, color: T.inkLt}}>Sin resultados.</div> : null}

      <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12}}>
        {visibles.map(g => (
          <div key={g.id} style={{background: T.bgCard, border: "1px solid " + T.border, borderRadius: 4, padding: "1rem"}}>
            <div style={{height: 116, display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, borderRadius: 2, marginBottom: 10}}>
              <Miniatura g={g}/>
            </div>
            <div style={{fontSize: 14, fontWeight: 500, marginBottom: 2}}>{g.nombre}</div>
            <div style={{fontSize: 11, color: T.inkMid, marginBottom: 6}}>
              {g.ancho}×{g.alto} · {g.modo === "redondo" ? "en redondo" : "plano"}{g.prenda ? " · " + g.prenda : ""}
            </div>
            {(g.etiquetas || []).length > 0 ? (
              <div style={{display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8}}>
                {g.etiquetas.map(t => <span key={t} onClick={() => setFiltroTag(t)} style={{fontSize: 10, padding: "1px 8px", borderRadius: 99, background: T.violetLt, color: T.violet, cursor: "pointer"}}>{t}</span>)}
              </div>
            ) : <div style={{height: 8}}/>}
            <div style={{display: "flex", gap: 6, flexWrap: "wrap"}}>
              <Boton small primario onClick={() => { setEditando(g); setVista("editor"); }}>Abrir</Boton>
              <Boton small onClick={() => duplicar(g)}>Duplicar</Boton>
              <Boton small onClick={() => eliminar(g)}>✕</Boton>
            </div>
          </div>
        ))}
      </div>

      {nuevoAbierto ? <NuevoModal onCrear={crear} onCerrar={() => setNuevoAbierto(false)}/> : null}
    </div>
  );
}
