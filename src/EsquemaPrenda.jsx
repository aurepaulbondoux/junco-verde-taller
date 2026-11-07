import { useState } from "react";

// Colores para distinguir cada motivo de una orden (se usan en pantalla y en el PDF)
export const COLORES_MOTIVO = ["#3d5a3e", "#c2692b", "#2c5f8a", "#8b3a62"];

const BORDE = "#8b8579";
const RELLENO = "#efe9dc";

// ═══════════════════════ GEOMETRÍA DE LOS ESQUEMAS ═══════════════════════
// Cada zona tiene "partes" (formas SVG) dibujadas en una o más vistas.
const dup = (d, vistas) => vistas.map(v => ({vista: v, d: d}));
function zona(id, partes, lx, ly, vistas, etq) {
  return {id: id, etq: etq || id, lx: lx, ly: ly, vistas: vistas, partes: partes};
}

const MANGA_I = "M86,42 L62,50 L34,196 L68,204 L92,112 Z";
const MANGA_D = "M214,42 L238,50 L266,196 L232,204 L208,112 Z";
const PUNO_I = "M34,196 L68,204 L65,226 L30,218 Z";
const PUNO_D = "M266,196 L232,204 L235,226 L270,218 Z";
const CUERPO = "M88,100 L212,100 L210,236 L90,236 Z";

const SWEATER = {
  tipo: "sweater", nombre: "Sweater / saco",
  ancho: 620, alto: 270,
  vistas: [{titulo: "Frente", dx: 0}, {titulo: "Espalda", dx: 320}],
  zonas: [
    zona("Canesú", dup("M86,42 L214,42 L212,100 L88,100 Z", [0, 1]), 150, 94, [0, 1]),
    zona("Frente", dup(CUERPO, [0]), 150, 170, [0]),
    zona("Espalda", dup(CUERPO, [1]), 150, 170, [1]),
    zona("Ruedo", dup("M90,236 L210,236 L211,258 L89,258 Z", [0, 1]), 150, 251, [0, 1]),
    zona("Mangas", dup(MANGA_I, [0, 1]).concat(dup(MANGA_D, [0, 1])), 56, 135, [0, 1]),
    zona("Puños", dup(PUNO_I, [0, 1]).concat(dup(PUNO_D, [0, 1])), 50, 214, [0, 1]),
    zona("Cuello", [
      {vista: 0, d: "M116,41 Q150,88 184,41 L172,41 Q150,70 128,41 Z"},
      {vista: 1, d: "M118,41 Q150,60 182,41 L172,41 Q150,52 128,41 Z"}
    ], 150, 34, [0, 1])
  ]
};

const PONCHO = {
  tipo: "poncho", nombre: "Poncho / ruana",
  ancho: 300, alto: 255,
  vistas: [{titulo: "Frente y espalda", dx: 0}],
  zonas: [
    zona("Canesú", dup("M72,54 L228,54 L238,104 L62,104 Z", [0]), 100, 92, [0]),
    zona("Cuerpo", dup("M62,104 L238,104 L262,205 L38,205 Z", [0]), 95, 160, [0]),
    zona("Ruedo", dup("M38,205 L262,205 L282,238 L18,238 Z", [0]), 95, 226, [0]),
    zona("Cuello", dup("M110,58 a40,14 0 1,0 80,0 a40,14 0 1,0 -80,0 Z", [0]), 150, 40, [0]),
    zona("Franja central", dup("M142,72 L158,72 L160,238 L140,238 Z", [0]), 150, 150, [0], "Franja")
  ]
};

const CHAL = {
  tipo: "chal", nombre: "Chal / bufanda",
  ancho: 300, alto: 190,
  vistas: [{titulo: "Chal extendido", dx: 0}],
  zonas: [
    zona("Extremo izquierdo", dup("M20,70 L90,70 L90,150 L20,150 Z", [0]), 55, 112, [0], "Ext. izq."),
    zona("Centro", dup("M90,70 L210,70 L210,150 L90,150 Z", [0]), 150, 112, [0]),
    zona("Extremo derecho", dup("M210,70 L280,70 L280,150 L210,150 Z", [0]), 245, 112, [0], "Ext. der."),
    zona("Borde superior", dup("M20,70 L280,70 L280,82 L20,82 Z", [0]), 150, 62, [0], "Borde sup."),
    zona("Borde inferior", dup("M20,138 L280,138 L280,150 L20,150 Z", [0]), 150, 166, [0], "Borde inf.")
  ]
};

const SOMBRERO = {
  tipo: "sombrero", nombre: "Sombrero",
  ancho: 300, alto: 215,
  vistas: [{titulo: "Vista lateral", dx: 0}],
  zonas: [
    zona("Copa", dup("M90,150 Q90,40 150,40 Q210,40 210,150 Z", [0]), 150, 80, [0]),
    zona("Ala", dup("M20,150 Q150,180 280,150 Q292,176 150,204 Q8,176 20,150 Z", [0]), 150, 188, [0]),
    zona("Banda", dup("M90,120 L210,120 L210,150 L90,150 Z", [0]), 150, 138, [0])
  ]
};

// Devuelve el esquema que corresponde a una prenda (o null si no tiene)
export function esquemaDe(nombre, cat) {
  const n = nombre || "";
  const c = cat || "";
  if (c.includes("Hilados")) return null;
  if (c.includes("Sombrero")) return SOMBRERO;
  if (/^(Chal|Mantita)/i.test(n)) return CHAL;
  if (/^(Ruana|Poncho)/i.test(n)) return PONCHO;
  return SWEATER;
}

// ═══════════════════════ DIBUJO PARA EL PDF (canvas) ═══════════════════════
export function canvasEsquema(esq, colorPorZona, k) {
  const c = document.createElement("canvas");
  c.width = Math.round(esq.ancho * k);
  c.height = Math.round(esq.alto * k);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.scale(k, k);
  ctx.font = "12px Georgia, serif";
  ctx.fillStyle = "#9a9690";
  ctx.textAlign = "center";
  esq.vistas.forEach(v => { ctx.fillText(v.titulo, v.dx + 150, 16); });
  esq.zonas.forEach(z => {
    z.partes.forEach(pt => {
      ctx.save();
      ctx.translate(esq.vistas[pt.vista].dx, 0);
      const path = new Path2D(pt.d);
      ctx.fillStyle = colorPorZona[z.id] || RELLENO;
      ctx.fill(path);
      ctx.lineWidth = 1.5;
      ctx.lineJoin = "round";
      ctx.strokeStyle = BORDE;
      ctx.stroke(path);
      ctx.restore();
    });
  });
  ctx.font = "bold 10px Georgia, serif";
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  esq.zonas.forEach(z => {
    if (!colorPorZona[z.id]) return;
    z.vistas.forEach(v => {
      const x = esq.vistas[v].dx + z.lx;
      ctx.strokeStyle = "#1e1c18";
      ctx.strokeText(z.etq, x, z.ly);
      ctx.fillStyle = "#fff";
      ctx.fillText(z.etq, x, z.ly);
    });
  });
  return c;
}

// ═══════════════════════ DIBUJO EN PANTALLA (SVG) ═══════════════════════
export function EsquemaPrenda({ esq, colorPorZona, onToggle, maxAlto }) {
  const sel = colorPorZona || {};
  return (
    <svg viewBox={"0 0 " + esq.ancho + " " + esq.alto} style={{width: "100%", maxHeight: maxAlto || 230, display: "block"}}>
      {esq.vistas.map((v, i) => (
        <text key={"t" + i} x={v.dx + 150} y={16} textAnchor="middle" fontSize="12" fill="#9a9690" fontFamily="Georgia, serif">{v.titulo}</text>
      ))}
      {esq.zonas.map(z => z.partes.map((pt, k) => (
        <g key={z.id + "-" + k} transform={"translate(" + esq.vistas[pt.vista].dx + ",0)"} onClick={onToggle ? () => onToggle(z.id) : undefined} style={{cursor: onToggle ? "pointer" : "default"}}>
          <path d={pt.d} fill={sel[z.id] || RELLENO} fillOpacity={sel[z.id] ? 0.9 : 1} stroke={BORDE} strokeWidth="1.5" strokeLinejoin="round">
            <title>{z.id}</title>
          </path>
        </g>
      )))}
      {esq.zonas.filter(z => sel[z.id]).map(z => z.vistas.map(v => (
        <text key={"l" + z.id + v} x={esq.vistas[v].dx + z.lx} y={z.ly} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#fff" stroke="#1e1c18" strokeWidth="2.5" paintOrder="stroke" fontFamily="Georgia, serif" style={{pointerEvents: "none"}}>{z.etq}</text>
      )))}
    </svg>
  );
}

// Selector que se usa dentro de la orden: elegir las zonas tocando el esquema
export function SelectorZonas({ esq, vinculos, indice, onChange }) {
  const [abierto, setAbierto] = useState(false);
  if (!esq) return null;
  const mio = vinculos[indice].zonas || [];
  const miColor = COLORES_MOTIVO[indice % COLORES_MOTIVO.length];
  const colorPorZona = {};
  vinculos.forEach((v, i) => {
    (v.zonas || []).forEach(z => {
      if (!colorPorZona[z]) colorPorZona[z] = COLORES_MOTIVO[i % COLORES_MOTIVO.length];
    });
  });
  const toggle = id => {
    onChange(mio.includes(id) ? mio.filter(z => z !== id) : mio.concat([id]));
  };
  return (
    <div style={{marginTop: 8}}>
      <button onClick={() => setAbierto(!abierto)} style={{padding: "5px 10px", border: "1px solid #ddd8cf", borderRadius: 2, background: "transparent", cursor: "pointer", fontSize: 11, fontFamily: "inherit", color: "#1e1c18"}}>
        {abierto ? "Ocultar esquema" : "📐 Elegir en el esquema de la prenda"}{mio.length > 0 ? " (" + mio.length + ")" : ""}
      </button>
      {abierto ? (
        <div style={{marginTop: 8, background: "#fff", border: "1px solid #ddd8cf", borderRadius: 4, padding: 10}}>
          <EsquemaPrenda esq={esq} colorPorZona={colorPorZona} onToggle={toggle} maxAlto={220}/>
          <div style={{display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8}}>
            {esq.zonas.map(z => {
              const on = mio.includes(z.id);
              return (
                <span key={z.id} onClick={() => toggle(z.id)} style={{padding: "3px 10px", borderRadius: 99, fontSize: 11, cursor: "pointer", background: on ? miColor : "transparent", color: on ? "#fff" : "#5a5750", border: "1px solid " + (on ? miColor : "#ddd8cf")}}>{z.id}</span>
              );
            })}
          </div>
          <div style={{fontSize: 10, color: "#9a9690", marginTop: 6, lineHeight: 1.4}}>
            Tocá las zonas donde va este motivo. Cada motivo de la orden se marca con su propio color.
          </div>
        </div>
      ) : null}
    </div>
  );
}
