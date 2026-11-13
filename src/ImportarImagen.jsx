import { useState, useEffect, useMemo, useRef } from "react";

const T = {bg:"#faf7f2",bgCard:"#fff",bgMuted:"#f0ebe2",ink:"#1e1c18",inkMid:"#5a5750",inkLt:"#9a9690",border:"#ddd8cf",borderLt:"#eae5dc",green:"#3d5a3e",greenLt:"#e8f0e8",danger:"#b03a2e",dangerLt:"#fdf0ee",warn:"#916a00",warnLt:"#fef8e6",info:"#2c5f8a",infoLt:"#eaf2f8"};
const num = v => Number(v) || 0;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function aRgb(hex) {
  let h = (hex || "#cccccc").replace("#", "");
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  const n = parseInt(h, 16);
  if (isNaN(n)) return [204, 204, 204];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const aHex = rgb => "#" + rgb.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("");

// distancia de color aproximada a la percepción humana ("redmean")
function distColor(a, b) {
  const rm = (a[0] + b[0]) / 2;
  const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
  return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
}

function leerPixeles(img, W, H) {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, W, H);
  const data = ctx.getImageData(0, 0, W, H).data;
  const px = new Array(W * H);
  for (let i = 0; i < W * H; i++) px[i] = [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
  return px;
}

// Asigna cada punto al color de la paleta más cercano; si hay más colores que el máximo, descarta los menos usados
function procesar(px, W, H, permitidos, maxCol) {
  if (!permitidos.length) return null;
  let activos = permitidos.map(p => ({id: p.id, nombre: p.nombre, hex: p.hex, rgb: aRgb(p.hex)}));
  const n = W * H;
  const idx = new Array(n);
  let counts = [];
  const mapear = () => {
    counts = new Array(activos.length).fill(0);
    for (let i = 0; i < n; i++) {
      let best = 0, bd = Infinity;
      for (let k = 0; k < activos.length; k++) {
        const d = distColor(px[i], activos[k].rgb);
        if (d < bd) { bd = d; best = k; }
      }
      idx[i] = best;
      counts[best]++;
    }
  };
  mapear();
  while (counts.filter(c => c > 0).length > maxCol) {
    let minK = -1, minC = Infinity;
    counts.forEach((c, k) => { if (c > 0 && c < minC) { minC = c; minK = k; } });
    activos = activos.filter((_, k) => k !== minK);
    mapear();
  }
  const orden = counts.map((c, k) => ({k: k, c: c})).filter(o => o.c > 0).sort((a, b) => b.c - a.c);
  const remap = {};
  orden.forEach((o, nuevo) => { remap[o.k] = nuevo; });
  const grid = [];
  for (let y = 0; y < H; y++) {
    const fila = [];
    for (let x = 0; x < W; x++) fila.push(remap[idx[y * W + x]]);
    grid.push(fila);
  }
  return {grid: grid, usados: orden.map(o => activos[o.k]), conteos: orden.map(o => o.c)};
}

// Detecta los colores dominantes de la imagen (k-means sencillo)
function kmeans(px, k) {
  const cent = [px[0].slice()];
  while (cent.length < k) {
    let mejor = 0, md = -1;
    for (let i = 0; i < px.length; i++) {
      let d = Infinity;
      for (let c = 0; c < cent.length; c++) d = Math.min(d, distColor(px[i], cent[c]));
      if (d > md) { md = d; mejor = i; }
    }
    if (md <= 0) break;
    cent.push(px[mejor].slice());
  }
  for (let it = 0; it < 8; it++) {
    const suma = cent.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < px.length; i++) {
      let b = 0, bd = Infinity;
      for (let c = 0; c < cent.length; c++) {
        const d = distColor(px[i], cent[c]);
        if (d < bd) { bd = d; b = c; }
      }
      suma[b][0] += px[i][0];
      suma[b][1] += px[i][1];
      suma[b][2] += px[i][2];
      suma[b][3]++;
    }
    for (let c = 0; c < cent.length; c++) {
      if (suma[c][3] > 0) cent[c] = [suma[c][0] / suma[c][3], suma[c][1] / suma[c][3], suma[c][2] / suma[c][3]];
    }
  }
  return cent;
}

function Boton({ children, onClick, primario, disabled, small }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{padding: small ? "4px 10px" : "8px 16px", borderRadius: 2, border: primario ? "none" : "1px solid " + T.border, background: primario ? T.green : "transparent", color: primario ? "#fff" : T.ink, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, fontSize: small ? 11 : 13, fontWeight: 500, fontFamily: "inherit", whiteSpace: "nowrap"}}>{children}</button>
  );
}

// ═══════════════════════ IMPORTAR UNA IMAGEN COMO GRÁFICO ═══════════════════════
export default function ImportarImagen({ paleta, aspecto, onAplicar, onAgregarPaleta, onCerrar }) {
  const [img, setImg] = useState(null);
  const [archivo, setArchivo] = useState("");
  const [ancho, setAncho] = useState("40");
  const [alto, setAlto] = useState("40");
  const [bloquear, setBloquear] = useState(true);
  const [nCol, setNCol] = useState(4);
  const [permitidos, setPermitidos] = useState(() => paleta.slice(0, 12).map(p => p.id));
  const [error, setError] = useState("");
  const prevRef = useRef(null);
  const asp = aspecto > 0 ? aspecto : 1;

  const calcAlto = (im, a) => clamp(Math.round(a * (im.height / im.width) / asp), 4, 120);

  const alElegir = e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setError("");
    const url = URL.createObjectURL(f);
    const im = new Image();
    im.onload = () => {
      setImg(im);
      setArchivo(f.name);
      const a = clamp(Math.round(num(ancho)) || 40, 4, 120);
      setAlto(String(calcAlto(im, a)));
    };
    im.onerror = () => { setError("No se pudo leer esa imagen. Probá con un JPG o PNG."); };
    im.src = url;
  };
  const cambiarAncho = v => {
    setAncho(v);
    if (img && bloquear) setAlto(String(calcAlto(img, clamp(Math.round(num(v)) || 4, 4, 120))));
  };
  const alternar = id => setPermitidos(permitidos.includes(id) ? permitidos.filter(x => x !== id) : permitidos.concat([id]));

  const resultado = useMemo(() => {
    if (!img) return null;
    const W = clamp(Math.round(num(ancho)) || 4, 4, 120);
    const H = clamp(Math.round(num(alto)) || 4, 4, 120);
    const lista = paleta.filter(p => permitidos.includes(p.id));
    if (lista.length === 0) return null;
    const px = leerPixeles(img, W, H);
    const r = procesar(px, W, H, lista, nCol);
    return r ? {...r, W: W, H: H} : null;
  }, [img, ancho, alto, nCol, permitidos, paleta]);

  useEffect(() => {
    const c = prevRef.current;
    if (!c || !resultado) return;
    const pw = Math.max(2, Math.floor(300 / Math.max(resultado.W, resultado.H)));
    const ph = Math.max(2, Math.round(pw * asp));
    c.width = resultado.W * pw;
    c.height = resultado.H * ph;
    const ctx = c.getContext("2d");
    for (let y = 0; y < resultado.H; y++) {
      for (let x = 0; x < resultado.W; x++) {
        ctx.fillStyle = resultado.usados[resultado.grid[y][x]].hex;
        ctx.fillRect(x * pw, y * ph, pw, ph);
      }
    }
  }, [resultado, asp]);

  const detectar = () => {
    if (!img) return;
    const W = 48;
    const H = Math.max(4, Math.round(W * img.height / img.width));
    const px = leerPixeles(img, W, H);
    const cent = kmeans(px, nCol);
    const base = Date.now();
    const nuevos = cent.map((c, i) => ({id: base + i, nombre: "Imagen " + (i + 1), hex: aHex(c), lanaId: null}));
    onAgregarPaleta(nuevos);
    setPermitidos(nuevos.map(n => n.id));
  };

  const aplicar = () => {
    if (!resultado) return;
    onAplicar({grid: resultado.grid, coloresIds: resultado.usados.map(u => u.id), ancho: resultado.W, alto: resultado.H});
  };

  const mob = window.innerWidth < 768;
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onCerrar(); }} style={{position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(30,28,24,0.55)", display: "flex", alignItems: mob ? "flex-end" : "center", justifyContent: "center", zIndex: 400}}>
      <div style={{background: T.bgCard, border: "1px solid " + T.border, borderRadius: mob ? "12px 12px 0 0" : 4, padding: "1.5rem", width: mob ? "100%" : 760, maxWidth: "100vw", maxHeight: mob ? "94vh" : "90vh", overflowY: "auto", fontFamily: "'Georgia',serif", color: T.ink}}>
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12}}>
          <h3 style={{margin: 0, fontSize: 17, fontWeight: 400}}>Importar imagen como gráfico</h3>
          <button onClick={onCerrar} style={{background: "none", border: "none", cursor: "pointer", fontSize: 22, color: T.inkLt}}>×</button>
        </div>
        <div style={{fontSize: 12, color: T.inkMid, marginBottom: 14, lineHeight: 1.5}}>
          Subí un dibujo o una foto y la app lo convierte en gráfico usando los colores de tu paleta. Funciona mejor con imágenes simples y de colores definidos (logos, dibujos, siluetas).
        </div>

        {paleta.length === 0 ? <div style={{background: T.warnLt, border: "1px solid " + T.warn, borderRadius: 2, padding: "9px 12px", fontSize: 12, color: T.warn, marginBottom: 12}}>Primero cargá colores en la Paleta del taller.</div> : null}

        <div style={{marginBottom: 14}}>
          <input type="file" accept="image/*" onChange={alElegir} style={{fontSize: 12}}/>
          {archivo ? <span style={{fontSize: 11, color: T.inkLt, marginLeft: 8}}>{archivo}</span> : null}
          {error ? <div style={{fontSize: 12, color: T.danger, marginTop: 6}}>{error}</div> : null}
        </div>

        {img ? (
          <div style={{display: "grid", gridTemplateColumns: mob ? "1fr" : "260px 1fr", gap: 16}}>
            <div>
              <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8}}>
                <div>
                  <label style={{fontSize: 11, color: T.inkMid, display: "block", marginBottom: 4}}>Ancho (puntos)</label>
                  <input type="number" min="4" max="120" value={ancho} onChange={e => cambiarAncho(e.target.value)} style={{width: "100%", padding: "7px 10px", border: "1px solid " + T.border, borderRadius: 2, fontSize: 13, boxSizing: "border-box", fontFamily: "inherit"}}/>
                </div>
                <div>
                  <label style={{fontSize: 11, color: T.inkMid, display: "block", marginBottom: 4}}>Alto (vueltas)</label>
                  <input type="number" min="4" max="120" value={alto} onChange={e => { setAlto(e.target.value); setBloquear(false); }} style={{width: "100%", padding: "7px 10px", border: "1px solid " + T.border, borderRadius: 2, fontSize: 13, boxSizing: "border-box", fontFamily: "inherit"}}/>
                </div>
              </div>
              <label style={{display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T.inkMid, marginBottom: 12, cursor: "pointer"}}>
                <input type="checkbox" checked={bloquear} onChange={e => { setBloquear(e.target.checked); if (e.target.checked && img) setAlto(String(calcAlto(img, clamp(Math.round(num(ancho)) || 4, 4, 120)))); }}/>
                Mantener la proporción de la imagen
              </label>
              <label style={{fontSize: 11, color: T.inkMid, display: "block", marginBottom: 4}}>Máximo de colores: <strong>{nCol}</strong></label>
              <input type="range" min="2" max="12" value={nCol} onChange={e => setNCol(Number(e.target.value))} style={{width: "100%", marginBottom: 14}}/>

              <div style={{fontSize: 11, color: T.inkMid, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em"}}>Colores permitidos</div>
              <div style={{display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10, maxHeight: 150, overflowY: "auto"}}>
                {paleta.map(p => {
                  const on = permitidos.includes(p.id);
                  return (
                    <span key={p.id} onClick={() => alternar(p.id)} style={{display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px 3px 5px", borderRadius: 99, fontSize: 11, cursor: "pointer", background: on ? T.greenLt : "transparent", border: "1px solid " + (on ? T.green : T.border), color: on ? T.green : T.inkMid}}>
                      <span style={{width: 12, height: 12, borderRadius: 3, background: p.hex, border: "1px solid rgba(0,0,0,0.25)"}}/>{p.nombre}
                    </span>
                  );
                })}
              </div>
              <Boton small onClick={detectar}>Detectar colores de la imagen y agregarlos a la paleta</Boton>
            </div>

            <div>
              <div style={{fontSize: 11, color: T.inkMid, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em"}}>Resultado</div>
              {resultado ? (
                <div>
                  <div style={{background: T.bg, border: "1px solid " + T.border, borderRadius: 2, padding: 8, textAlign: "center", marginBottom: 8}}>
                    <canvas ref={prevRef} style={{maxWidth: "100%", height: "auto"}}/>
                  </div>
                  <div style={{fontSize: 11, color: T.inkMid, marginBottom: 6}}>{resultado.W}×{resultado.H} puntos · {resultado.usados.length} colores</div>
                  <div style={{display: "flex", flexWrap: "wrap", gap: 6}}>
                    {resultado.usados.map((u, i) => (
                      <span key={u.id} style={{display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: T.inkMid}}>
                        <span style={{width: 12, height: 12, borderRadius: 3, background: u.hex, border: "1px solid rgba(0,0,0,0.25)"}}/>{u.nombre} ({resultado.conteos[i]})
                      </span>
                    ))}
                  </div>
                </div>
              ) : <div style={{fontSize: 12, color: T.warn}}>Elegí al menos un color permitido.</div>}
            </div>
          </div>
        ) : null}

        <div style={{display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16, paddingTop: 12, borderTop: "1px solid " + T.borderLt}}>
          <Boton onClick={onCerrar}>Cancelar</Boton>
          <Boton primario onClick={aplicar} disabled={!resultado}>Usar como gráfico</Boton>
        </div>
      </div>
    </div>
  );
}
