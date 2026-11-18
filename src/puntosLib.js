// Biblioteca de puntos para tejido a dos agujas y circular:
// símbolos, textos de las instrucciones en español y generador de instrucciones escritas.

const TINTA = "#1e1c18";

function trazo(c, x1, y1, x2, y2) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
const grosor = (w, h) => Math.max(1.3, Math.min(w, h) * 0.11);
function punto(c, cx, cy, r) { c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill(); }
function aro(c, cx, cy, r, lw) { c.lineWidth = lw; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke(); }

// ═══════════════════════ SÍMBOLOS ═══════════════════════
const DIB = {
  k: function () {},
  p: function (c, x, y, w, h) { punto(c, x + w / 2, y + h / 2, Math.max(1.5, Math.min(w, h) * 0.12)); },
  nada: function (c, x, y, w, h) { c.fillStyle = "#cfcac0"; c.fillRect(x, y, w, h); },
  yo: function (c, x, y, w, h) { aro(c, x + w / 2, y + h / 2, Math.min(w, h) * 0.26, grosor(w, h)); },
  m1: function (c, x, y, w, h) {
    c.lineWidth = grosor(w, h);
    trazo(c, x + w * 0.5, y + h * 0.25, x + w * 0.5, y + h * 0.75);
    trazo(c, x + w * 0.25, y + h * 0.5, x + w * 0.75, y + h * 0.5);
  },
  ktbl: function (c, x, y, w, h) {
    aro(c, x + w / 2, y + h * 0.45, Math.min(w, h) * 0.24, grosor(w, h));
    trazo(c, x + w * 0.55, y + h * 0.62, x + w * 0.78, y + h * 0.86);
  },
  ptbl: function (c, x, y, w, h) {
    DIB.ktbl(c, x, y, w, h);
    punto(c, x + w / 2, y + h * 0.45, Math.max(1, Math.min(w, h) * 0.07));
  },
  k2tog: function (c, x, y, w, h) { c.lineWidth = grosor(w, h); trazo(c, x + w * 0.2, y + h * 0.82, x + w * 0.8, y + h * 0.18); },
  ssk: function (c, x, y, w, h) { c.lineWidth = grosor(w, h); trazo(c, x + w * 0.2, y + h * 0.18, x + w * 0.8, y + h * 0.82); },
  p2tog: function (c, x, y, w, h) { DIB.k2tog(c, x, y, w, h); punto(c, x + w * 0.72, y + h * 0.78, Math.max(1.2, Math.min(w, h) * 0.08)); },
  cdd: function (c, x, y, w, h) {
    c.lineWidth = grosor(w, h);
    trazo(c, x + w * 0.2, y + h * 0.82, x + w * 0.5, y + h * 0.2);
    trazo(c, x + w * 0.5, y + h * 0.2, x + w * 0.8, y + h * 0.82);
  },
  k3tog: function (c, x, y, w, h) {
    c.lineWidth = grosor(w, h);
    trazo(c, x + w * 0.12, y + h * 0.82, x + w * 0.62, y + h * 0.18);
    trazo(c, x + w * 0.38, y + h * 0.82, x + w * 0.88, y + h * 0.18);
  },
  sl1: function (c, x, y, w, h) {
    c.lineWidth = grosor(w, h);
    trazo(c, x + w * 0.2, y + h * 0.2, x + w * 0.5, y + h * 0.8);
    trazo(c, x + w * 0.5, y + h * 0.8, x + w * 0.8, y + h * 0.2);
  }
};

// Cada casillero de una trenza dibuja un tramo de la cruz; juntos forman el símbolo completo
function dibCable(dir, n, i) {
  return function (c, x, y, w, h) {
    const lw = grosor(w, h);
    const a0 = i / n, a1 = (i + 1) / n;
    const barra = function () { c.beginPath(); c.moveTo(x, y + h * (1 - a0)); c.lineTo(x + w, y + h * (1 - a1)); c.stroke(); };
    const contra = function () { c.beginPath(); c.moveTo(x, y + h * a0); c.lineTo(x + w, y + h * a1); c.stroke(); };
    c.lineWidth = Math.max(1, lw * 0.55);
    if (dir === "D") contra(); else barra();
    c.lineWidth = lw * 1.4;
    if (dir === "D") barra(); else contra();
  };
}

// ═══════════════════════ BIBLIOTECA ═══════════════════════
const BASE = [
  {id: 0, clave: "k", grupo: "Básicos", nombre: "Derecho", abrev: "der", rs: "der", ws: "rev", exp: "Tejer el punto al derecho. En una fila del revés se teje al revés.", consume: 1, produce: 1, comb: true, dib: DIB.k},
  {id: 1, clave: "p", grupo: "Básicos", nombre: "Revés", abrev: "rev", rs: "rev", ws: "der", exp: "Tejer el punto al revés. En una fila del revés se teje al derecho.", consume: 1, produce: 1, comb: true, dib: DIB.p},
  {id: 2, clave: "nada", grupo: "Básicos", nombre: "Sin punto", abrev: "-", rs: "", ws: "", exp: "Casillero vacío: no hay punto. Sirve para alinear el gráfico cuando hay aumentos o disminuciones; se salta al tejer.", consume: 0, produce: 0, comb: false, dib: DIB.nada},
  {id: 3, clave: "yo", grupo: "Aumentos", nombre: "Hebra", abrev: "hebra", rs: "hebra", ws: "hebra", exp: "Pasar el hilo por encima de la aguja derecha para formar un punto nuevo (ojalillo).", consume: 0, produce: 1, comb: false, dib: DIB.yo},
  {id: 12, clave: "m1", grupo: "Aumentos", nombre: "Aumento torcido", abrev: "aum", rs: "aum", ws: "aum rev", exp: "Levantar el hilo que une dos puntos y tejerlo retorcido (al derecho en filas del derecho, al revés en filas del revés).", consume: 0, produce: 1, comb: false, dib: DIB.m1},
  {id: 4, clave: "ktbl", grupo: "Retorcidos", nombre: "Derecho retorcido", abrev: "der ret", rs: "der ret", ws: "rev ret", exp: "Tejer el punto al derecho por la hebra de atrás. En fila del revés: al revés por atrás.", consume: 1, produce: 1, comb: true, dib: DIB.ktbl},
  {id: 5, clave: "ptbl", grupo: "Retorcidos", nombre: "Revés retorcido", abrev: "rev ret", rs: "rev ret", ws: "der ret", exp: "Tejer el punto al revés por la hebra de atrás. En fila del revés: al derecho por atrás.", consume: 1, produce: 1, comb: true, dib: DIB.ptbl},
  {id: 6, clave: "k2tog", grupo: "Disminuciones", nombre: "2 juntos al derecho", abrev: "2 j der", rs: "2 j der", ws: "2 j rev", exp: "Tejer 2 puntos juntos al derecho (inclina a la derecha). En fila del revés: 2 puntos juntos al revés.", consume: 2, produce: 1, comb: false, dib: DIB.k2tog},
  {id: 7, clave: "ssk", grupo: "Disminuciones", nombre: "Disminución a la izquierda", abrev: "dis izq", rs: "dis izq", ws: "2 j rev ret", exp: "Deslizar 2 puntos de a uno como para tejer al derecho, devolverlos a la aguja izquierda y tejerlos juntos por detrás (inclina a la izquierda). En fila del revés: 2 puntos juntos al revés por detrás.", consume: 2, produce: 1, comb: false, dib: DIB.ssk},
  {id: 8, clave: "p2tog", grupo: "Disminuciones", nombre: "2 juntos al revés", abrev: "2 j rev", rs: "2 j rev", ws: "2 j der", exp: "Tejer 2 puntos juntos al revés. En fila del revés: 2 puntos juntos al derecho.", consume: 2, produce: 1, comb: false, dib: DIB.p2tog},
  {id: 9, clave: "cdd", grupo: "Disminuciones", nombre: "Disminución doble central", abrev: "dis dob", rs: "dis dob", ws: null, exp: "Deslizar 2 puntos juntos como para tejerlos juntos, tejer 1 al derecho y pasar los 2 deslizados por encima: 3 puntos pasan a 1, con el central arriba. Solo en filas del derecho.", consume: 3, produce: 1, comb: false, dib: DIB.cdd},
  {id: 10, clave: "k3tog", grupo: "Disminuciones", nombre: "3 juntos al derecho", abrev: "3 j der", rs: "3 j der", ws: "3 j rev", exp: "Tejer 3 puntos juntos al derecho. En fila del revés: 3 puntos juntos al revés.", consume: 3, produce: 1, comb: false, dib: DIB.k3tog},
  {id: 11, clave: "sl1", grupo: "Otros", nombre: "Punto deslizado", abrev: "desl", rs: "desl", ws: "desl", exp: "Pasar 1 punto de una aguja a la otra sin tejerlo (con el hilo detrás en filas del derecho y delante en filas del revés).", consume: 1, produce: 1, comb: false, dib: DIB.sl1}
];

const CABLES = [
  {clave: "t11d", nombre: "Trenza 1/1 derecha", abrev: "T1/1 D", n: 2, dir: "D", base: 20, txt: "pasar 1 punto a la aguja auxiliar y dejarlo detrás, tejer 1 al derecho, tejer 1 al derecho del auxiliar"},
  {clave: "t11i", nombre: "Trenza 1/1 izquierda", abrev: "T1/1 I", n: 2, dir: "I", base: 22, txt: "pasar 1 punto a la aguja auxiliar y dejarlo delante, tejer 1 al derecho, tejer 1 al derecho del auxiliar"},
  {clave: "t21d", nombre: "Trenza 2/1 derecha", abrev: "T2/1 D", n: 3, dir: "D", base: 24, txt: "pasar 1 punto al auxiliar y dejarlo detrás, tejer 2 al derecho, tejer 1 al derecho del auxiliar"},
  {clave: "t21i", nombre: "Trenza 2/1 izquierda", abrev: "T2/1 I", n: 3, dir: "I", base: 27, txt: "pasar 2 puntos al auxiliar y dejarlos delante, tejer 1 al derecho, tejer 2 al derecho del auxiliar"},
  {clave: "t22d", nombre: "Trenza 2/2 derecha", abrev: "T2/2 D", n: 4, dir: "D", base: 30, txt: "pasar 2 puntos al auxiliar y dejarlos detrás, tejer 2 al derecho, tejer 2 al derecho del auxiliar"},
  {clave: "t22i", nombre: "Trenza 2/2 izquierda", abrev: "T2/2 I", n: 4, dir: "I", base: 34, txt: "pasar 2 puntos al auxiliar y dejarlos delante, tejer 2 al derecho, tejer 2 al derecho del auxiliar"},
  {clave: "t33d", nombre: "Trenza 3/3 derecha", abrev: "T3/3 D", n: 6, dir: "D", base: 38, txt: "pasar 3 puntos al auxiliar y dejarlos detrás, tejer 3 al derecho, tejer 3 al derecho del auxiliar"},
  {clave: "t33i", nombre: "Trenza 3/3 izquierda", abrev: "T3/3 I", n: 6, dir: "I", base: 44, txt: "pasar 3 puntos al auxiliar y dejarlos delante, tejer 3 al derecho, tejer 3 al derecho del auxiliar"}
];
const PAR_CABLE = {t11d: "t11i", t11i: "t11d", t21d: "t21i", t21i: "t21d", t22d: "t22i", t22i: "t22d", t33d: "t33i", t33i: "t33d"};

export const PUNTOS = BASE.slice();
CABLES.forEach(cab => {
  for (let i = 0; i < cab.n; i++) {
    PUNTOS.push({
      id: cab.base + i, clave: cab.clave + "_" + i, grupo: "Trenzas", nombre: cab.nombre, abrev: cab.abrev,
      rs: cab.abrev, ws: null, exp: "", consume: 1, produce: 1, comb: false, cable: cab, dib: dibCable(cab.dir, cab.n, i)
    });
  }
});
export const POR_ID = {};
export const POR_CLAVE = {};
PUNTOS.forEach(p => { POR_ID[p.id] = p; POR_CLAVE[p.clave] = p; });

// Elementos de la paleta de edición: un punto, o una trenza completa (que ocupa varios casilleros)
export const GRUPOS = ["Básicos", "Aumentos", "Retorcidos", "Disminuciones", "Trenzas", "Otros"];
export const PALETA = BASE.map(p => ({clave: p.clave, nombre: p.nombre, grupo: p.grupo, ids: [p.id], id: p.id, cable: null}))
  .concat(CABLES.map(cab => ({clave: cab.clave, nombre: cab.nombre, grupo: "Trenzas", ids: Array.from({length: cab.n}, (_, i) => cab.base + i), id: cab.base, cable: cab})));
export const POR_CLAVE_PALETA = {};
PALETA.forEach(p => { POR_CLAVE_PALETA[p.clave] = p; });

// Punto espejado (para simetría y para voltear el gráfico)
export function espejarId(id) {
  const p = POR_ID[id];
  if (!p) return id;
  if (p.cable) {
    const otra = CABLES.find(c => c.clave === PAR_CABLE[p.cable.clave]);
    return otra ? otra.base + (p.cable.n - 1 - (id - p.cable.base)) : id;
  }
  if (p.clave === "k2tog") return 7;
  if (p.clave === "ssk") return 6;
  return id;
}

// ═══════════════════════ DIBUJO ═══════════════════════
export function dibujarPunto(ctx, id, x, y, w, h) {
  const p = POR_ID[id] || POR_ID[0];
  if (p.clave !== "nada") { ctx.fillStyle = "#fff"; ctx.fillRect(x, y, w, h); }
  ctx.strokeStyle = TINTA;
  ctx.fillStyle = TINTA;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  p.dib(ctx, x, y, w, h);
}

export function margenes(numeros) {
  return numeros ? {mL: 32, mR: 32, mT: 18} : {mL: 0, mR: 0, mT: 0};
}

// o: { cell, modo, numeros, desde, hasta, sel, prev: {lista, id} }
export function dibujarGrafico(canvas, grid, o) {
  const H = grid.length;
  const W = H ? grid[0].length : 0;
  const c = o.cell;
  const mg = margenes(o.numeros);
  const d0 = o.desde || 0;
  const d1 = o.hasta === undefined ? H : o.hasta;
  canvas.width = mg.mL + W * c + mg.mR + 1;
  canvas.height = mg.mT + (d1 - d0) * c + 1;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = d0; y < d1; y++) {
    for (let x = 0; x < W; x++) dibujarPunto(ctx, grid[y][x], mg.mL + x * c, mg.mT + (y - d0) * c, c, c);
  }
  if (o.prev) {
    ctx.globalAlpha = 0.6;
    o.prev.lista.forEach(p => {
      if (p[1] >= d0 && p[1] < d1 && p[0] >= 0 && p[0] < W) dibujarPunto(ctx, o.prev.id, mg.mL + p[0] * c, mg.mT + (p[1] - d0) * c, c, c);
    });
    ctx.globalAlpha = 1;
  }
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x++) {
    const n = W - x;
    ctx.strokeStyle = n % 5 === 0 ? "#7d786c" : "#c9c4b8";
    ctx.beginPath();
    ctx.moveTo(mg.mL + x * c + 0.5, mg.mT);
    ctx.lineTo(mg.mL + x * c + 0.5, mg.mT + (d1 - d0) * c);
    ctx.stroke();
  }
  for (let y = d0; y <= d1; y++) {
    const n = H - y;
    ctx.strokeStyle = n % 5 === 0 ? "#7d786c" : "#c9c4b8";
    ctx.beginPath();
    ctx.moveTo(mg.mL, mg.mT + (y - d0) * c + 0.5);
    ctx.lineTo(mg.mL + W * c, mg.mT + (y - d0) * c + 0.5);
    ctx.stroke();
  }
  if (o.numeros) {
    ctx.fillStyle = "#444";
    ctx.font = Math.max(8, Math.min(11, Math.floor(c * 0.5))) + "px Helvetica, Arial, sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    for (let x = 0; x < W; x++) {
      const n = W - x;
      if (n === 1 || n % 5 === 0 || c >= 22) ctx.fillText(String(n), mg.mL + x * c + c / 2, mg.mT / 2);
    }
    for (let y = d0; y < d1; y++) {
      const n = H - y;
      if (!(n === 1 || n % 5 === 0 || c >= 14)) continue;
      const derecha = o.modo === "redondo" || n % 2 === 1;
      ctx.textAlign = derecha ? "left" : "right";
      ctx.fillText(String(n), derecha ? mg.mL + W * c + 5 : mg.mL - 5, mg.mT + (y - d0) * c + c / 2);
    }
  }
  if (o.sel) {
    const s = o.sel;
    const sx = mg.mL + s.x0 * c + 0.5, sy = mg.mT + (s.y0 - d0) * c + 0.5;
    const sw = (s.x1 - s.x0 + 1) * c, sh = (s.y1 - s.y0 + 1) * c;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = "#fff";
    ctx.strokeRect(sx, sy, sw, sh);
    ctx.lineDashOffset = 5;
    ctx.strokeStyle = "#000";
    ctx.strokeRect(sx, sy, sw, sh);
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
  }
}

// ═══════════════════════ CODIFICACIÓN ═══════════════════════
export const codificar = g => g.map(f => f.map(v => v.toString(36).padStart(2, "0")).join(""));
export const decodificar = (filas, ancho, alto) => {
  const g = [];
  for (let y = 0; y < alto; y++) {
    const fila = (filas && filas[y]) || "";
    const r = [];
    for (let x = 0; x < ancho; x++) {
      const v = parseInt(fila.substr(x * 2, 2), 36);
      r.push(isNaN(v) || !POR_ID[v] ? 0 : v);
    }
    g.push(r);
  }
  return g;
};

// ═══════════════════════ INSTRUCCIONES ESCRITAS ═══════════════════════
function tokenizar(cells, rs, desc) {
  const tokens = [];
  const avisos = [];
  let ok = true;
  let i = 0;
  while (i < cells.length) {
    const p = POR_ID[cells[i]];
    if (!p) { i++; continue; }
    if (p.cable) {
      const c = p.cable;
      let coincide = i + c.n <= cells.length;
      for (let j = 0; coincide && j < c.n; j++) {
        const esperado = c.base + (desc ? c.n - 1 - j : j);
        if (cells[i + j] !== esperado) coincide = false;
      }
      if (coincide) {
        tokens.push({k: c.clave, t: c.abrev, comb: false});
        if (!rs) avisos.push("hay una trenza en una fila del revés");
        i += c.n;
      } else {
        tokens.push({k: "?" + cells[i], t: "(trenza incompleta)", comb: false});
        ok = false;
        avisos.push("hay una trenza incompleta");
        i++;
      }
      continue;
    }
    if (p.produce === 0 && p.consume === 0) { i++; continue; }
    let t = rs ? p.rs : p.ws;
    if (!rs && p.ws === null) { t = p.rs; avisos.push("\"" + p.nombre + "\" está pensado para filas del derecho"); }
    tokens.push({k: p.clave, t: t, comb: !!p.comb});
    i++;
  }
  return {tokens: tokens, avisos: avisos, ok: ok};
}

function fmtTokens(tokens) {
  const partes = [];
  let i = 0;
  while (i < tokens.length) {
    let j = i;
    while (j + 1 < tokens.length && tokens[j + 1].k === tokens[i].k) j++;
    const n = j - i + 1;
    const t = tokens[i];
    if (n === 1) partes.push(t.comb ? "1 " + t.t : t.t);
    else partes.push(t.comb ? n + " " + t.t : t.t + " x" + n);
    i = j + 1;
  }
  return partes.join(", ");
}

function textoFila(cells, rs) {
  const desc = rs;
  const base = tokenizar(cells, rs, desc);
  let mejor = fmtTokens(base.tokens);
  const W = cells.length;
  for (let a = 0; a <= 4; a++) {
    for (let b = 0; b <= 4; b++) {
      if (a + b >= W) continue;
      const L = W - a - b;
      if (L < 4) continue;
      for (let per = 1; per <= L / 2; per++) {
        if (L % per !== 0) continue;
        let periodico = true;
        for (let i = 0; i < L; i++) {
          if (cells[a + i] !== cells[a + (i % per)]) { periodico = false; break; }
        }
        if (!periodico) continue;
        const u = tokenizar(cells.slice(a, a + per), rs, desc);
        const iz = tokenizar(cells.slice(0, a), rs, desc);
        const de = tokenizar(cells.slice(W - b), rs, desc);
        if (!u.ok || !iz.ok || !de.ok || u.tokens.length === 0) break;
        const partes = [];
        if (iz.tokens.length) partes.push(fmtTokens(iz.tokens));
        partes.push("(" + fmtTokens(u.tokens) + ") x" + (L / per));
        if (de.tokens.length) partes.push(fmtTokens(de.tokens));
        const texto = partes.join(", ");
        if (texto.length < mejor.length) mejor = texto;
        break;
      }
    }
  }
  return {texto: mejor, avisos: base.avisos};
}

// Genera las instrucciones fila por fila (de abajo hacia arriba) y revisa el conteo de puntos
export function generar(grid, modo) {
  const H = grid.length;
  const filas = [];
  const avisos = [];
  let prev = null;
  for (let n = 1; n <= H; n++) {
    const celdas = grid[H - n];
    const rs = modo === "redondo" || n % 2 === 1;
    const lectura = rs ? celdas.slice().reverse() : celdas.slice();
    const r = textoFila(lectura, rs);
    let consume = 0, produce = 0;
    celdas.forEach(id => { const p = POR_ID[id]; if (p) { consume += p.consume; produce += p.produce; } });
    const etiqueta = modo === "redondo" ? "Vuelta " + n : "Fila " + n + (rs ? " (derecho)" : " (revés)");
    filas.push({n: n, etiqueta: etiqueta, texto: r.texto || "sin puntos", puntos: produce, consume: consume});
    Array.from(new Set(r.avisos)).forEach(a => { avisos.push(etiqueta + ": " + a + "."); });
    if (prev !== null && consume !== prev) avisos.push(etiqueta + ": trabaja " + consume + " puntos, pero la fila anterior termina con " + prev + ".");
    prev = produce;
  }
  return {filas: filas, avisos: avisos};
}

// Puntos usados en el gráfico, para la leyenda
export function leyendaDe(grid) {
  const usados = {};
  grid.forEach(f => f.forEach(id => {
    const p = POR_ID[id];
    if (!p) return;
    usados[p.cable ? p.cable.clave : p.clave] = true;
  }));
  const out = [];
  PALETA.forEach(item => {
    if (!usados[item.clave]) return;
    if (item.cable) {
      out.push({ids: item.ids, abrev: item.cable.abrev, nombre: item.cable.nombre, exp: "Trenza de " + item.cable.n + " puntos: " + item.cable.txt + "."});
    } else {
      const p = POR_ID[item.id];
      out.push({ids: [item.id], abrev: p.abrev, nombre: p.nombre, exp: p.exp});
    }
  });
  return out;
}

// ═══════════════════════ PLANTILLAS ═══════════════════════
const PLANO = ["p", "p", "k", "k", "k", "k", "p", "p"];
const CABLE22 = ["p", "p", "t22d_0", "t22d_1", "t22d_2", "t22d_3", "p", "p"];
export const PLANTILLAS = [
  {id: "elastico11", nombre: "Elástico 1×1", modo: "plano", unidad: 2, ancho: 16, filas: [["k", "p"], ["k", "p"]]},
  {id: "elastico22", nombre: "Elástico 2×2", modo: "plano", unidad: 4, ancho: 16, filas: [["k", "k", "p", "p"], ["k", "k", "p", "p"]]},
  {id: "musgo", nombre: "Punto musgo", modo: "plano", unidad: 2, ancho: 16, filas: [["k", "p"], ["p", "k"]]},
  {id: "cesteria", nombre: "Cestería", modo: "plano", unidad: 8, ancho: 16, filas: [
    ["k", "k", "k", "k", "p", "p", "p", "p"], ["k", "k", "k", "k", "p", "p", "p", "p"],
    ["k", "k", "k", "k", "p", "p", "p", "p"], ["k", "k", "k", "k", "p", "p", "p", "p"],
    ["p", "p", "p", "p", "k", "k", "k", "k"], ["p", "p", "p", "p", "k", "k", "k", "k"],
    ["p", "p", "p", "p", "k", "k", "k", "k"], ["p", "p", "p", "p", "k", "k", "k", "k"]
  ]},
  {id: "trenza22", nombre: "Trenza 2/2 con revés", modo: "plano", unidad: 8, ancho: 8, filas: [PLANO, PLANO, PLANO, PLANO, CABLE22, PLANO, PLANO, PLANO]},
  {id: "ojalillos", nombre: "Ojalillos (calado simple)", modo: "plano", unidad: 8, ancho: 16, filas: [
    ["k", "yo", "k2tog", "k", "k", "yo", "k2tog", "k"],
    ["k", "k", "k", "k", "k", "k", "k", "k"],
    ["yo", "k2tog", "k", "k", "yo", "k2tog", "k", "k"],
    ["k", "k", "k", "k", "k", "k", "k", "k"]
  ]}
];
export function construirPlantilla(pl, anchoDeseado) {
  const reps = Math.max(1, Math.round(anchoDeseado / pl.unidad));
  const g = [];
  for (let n = pl.filas.length - 1; n >= 0; n--) {
    const fila = [];
    for (let r = 0; r < reps; r++) pl.filas[n].forEach(cl => { fila.push((POR_CLAVE[cl] || POR_CLAVE.k).id); });
    g.push(fila);
  }
  return g;
}
