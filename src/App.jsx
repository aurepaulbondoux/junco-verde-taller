import { useState, useMemo, useEffect } from "react";

const T={bg:"#faf7f2",bgCard:"#fff",bgMuted:"#f0ebe2",bgDeep:"#e6dfd4",ink:"#1e1c18",inkMid:"#5a5750",inkLt:"#9a9690",border:"#ddd8cf",borderLt:"#eae5dc",green:"#3d5a3e",greenLt:"#e8f0e8",tierra:"#8b6f47",danger:"#b03a2e",dangerLt:"#fdf0ee",warn:"#916a00",warnLt:"#fef8e6",ok:"#2d6a4f",okLt:"#e8f5ee",info:"#2c5f8a",infoLt:"#eaf2f8",violet:"#5b3f7a",violetLt:"#f2eef8"};
const ES={Pendiente:{bg:"#fef8e6",tx:"#916a00"},"En producción":{bg:"#eaf2f8",tx:"#2c5f8a"},Bordado:{bg:"#f2eef8",tx:"#5b3f7a"},"Control calidad":{bg:"#f5efe6",tx:"#8b6f47"},Listo:{bg:"#e8f5ee",tx:"#2d6a4f"},Entregado:{bg:"#f0ebe2",tx:"#5a5750"}};
const ESTADOS=["Pendiente","En producción","Bordado","Control calidad","Listo","Entregado"];
const ENVIO_ESTADOS=["Sin envío","Preparando","Despachado","En camino","Entregado","Devuelto"];
const TIPOS_COMP=["Factura compra","Factura venta","Remito","Nota de crédito"];
const TIPO_COLOR={"Factura compra":{bg:"#fef3c7",tx:"#92400e"},"Factura venta":{bg:"#e8f0e8",tx:"#2c4230"},"Remito":{bg:"#eaf2f8",tx:"#2c5f8a"},"Nota de crédito":{bg:"#f2eef8",tx:"#5b3f7a"}};
const IVA_RATES=[0,10,22];
const TECNICAS=["Tejido a dos agujas","Tejido circular","Crochet","Telar","Bordado","Macramé","Fieltro","Teñido natural","Tintura","Terminaciones a mano"];

const CAT_DATA = {
  "Ruanas / Ponchos / Chales":[
    {n:"Ruana Junco"},{n:"Ruana Aura"},{n:"Ruana Aura Chica"},{n:"Ruana Juana"},{n:"Ruana Zira"},
    {n:"Ruana Wool Me Tender"},{n:"Ruana Triangulo"},{n:"Ruana Terra"},
    {n:"Chal Bufandon Merino Zig Zag"},{n:"Chal Bufandon Jacinta Degrade"},
    {n:"Chal Bufandon Jacinta Lisos"},{n:"Mantita/Chal"},
  ],
  "Sweaters / Sacos":[
    {n:"Sweater Jaspa"},{n:"Sweater Rumba"},{n:"Sweater Moly"},{n:"Sweater Antonia"},{n:"Sweater Alfonsina"},
    {n:"Saco Clementina"},{n:"Sweater Jazmin"},{n:"Sweater Uco"},{n:"Sweater Bariloche Bosque"},
    {n:"Tapado Maria Clara"},{n:"Sweater Fish"},{n:"Sweater Langosta"},{n:"Sweater Lobster"},
    {n:"Jaspa Cangrejo"},{n:"Sweater Rolling Stones"},{n:"Sweater MI Abuelo era Pescador"},
    {n:"Sweater Catch of the day"},{n:"Sweater The Summer Ranch"},{n:"Sweater Summer"},
  ],
  "Kids":[
    {n:"Sweater 2 colores 1-8 años"},{n:"Sweater 2 colores 10 años"},{n:"Sweater 2 colores 12 años"},
    {n:"Sweater Bariloche Beeh"},{n:"Poncho Merino"},{n:"Poncho Junco"},{n:"Poncho Beeh"},
    {n:"Poncho Faro"},{n:"Sweater Be Happy"},{n:"Sweater Beeh"},{n:"Sweater Honguitos"},
    {n:"Sweater Ava"},{n:"Sweater Gallo"},{n:"Sweater Nona"},{n:"Sweater Cordillera"},
    {n:"Sweater No More Screen Time"},{n:"Sweater Surf"},{n:"Sweater Good Morning"},
    {n:"Sweater Lochi"},{n:"Sweater Raval"},{n:"Sweater Cangrejo"},{n:"Sweater Estrella de Mar"},
    {n:"Sweater Uruguay"},{n:"Sweater Marino"},{n:"Sweater Helado"},{n:"Sweater Argentina"},
  ],
  "Sombreros":[
    {n:"Sombrero de Fábrica"},{n:"Sombrero Personalizado"},{n:"Sombrero Polo 2.0"},{n:"Sombrero Perlas"},
  ],
  "Hilados":[
    {n:"Virgen 100g"},{n:"Teñido 100g"},{n:"Hilado Fino"},{n:"Hilado Medio"},
    {n:"Hilado Grueso"},{n:"Hilado Flame"},{n:"Hilado Zig Zag"},
  ],
};

// Mutable catalog — prices start at 0, updated via Config
const CATALOG = {};
Object.entries(CAT_DATA).forEach(([cat, items]) => {
  items.forEach(p => { CATALOG[p.n] = { n: p.n, cat, c: 0, p: 0, lana: 0 }; });
});
const TODAS = () => Object.values(CATALOG);
const getPrenda = n => CATALOG[n] || null;

const tallesParaPrenda = nombre => {
  const cat = CATALOG[nombre]?.cat || "";
  if (cat.includes("Kids")) return ["1-2 m","3-4 m","5-6 m","7-8 m","9-11 m","1-2 años","3-4 años","5-6 años","7-8 años","10 años","12 años"];
  if (cat.includes("Sombreros") || cat.includes("Chales") || nombre.startsWith("Ruana") || nombre.startsWith("Manti")) return ["Talle único"];
  if (cat.includes("Hilados")) return ["100g"];
  return ["XS","S","M","L","XL","XXL","Talle único"];
};

const TALLES_INIT = {
  adultos:[
    {talle:"XS",busto:82,largo:58,manga:58,cintura:66,cadera:88,peso:380,lana:850,manoObra:0},
    {talle:"S",busto:88,largo:60,manga:59,cintura:72,cadera:94,peso:420,lana:950,manoObra:0},
    {talle:"M",busto:94,largo:62,manga:60,cintura:78,cadera:100,peso:460,lana:1050,manoObra:0},
    {talle:"L",busto:100,largo:64,manga:61,cintura:84,cadera:106,peso:500,lana:1150,manoObra:0},
    {talle:"XL",busto:108,largo:66,manga:62,cintura:92,cadera:114,peso:550,lana:1280,manoObra:0},
    {talle:"XXL",busto:116,largo:68,manga:63,cintura:100,cadera:122,peso:600,lana:1400,manoObra:0},
  ],
  kids:[
    {talle:"1-2 años",busto:52,largo:38,manga:26,cintura:52,cadera:54,peso:140,lana:400,manoObra:0},
    {talle:"3-4 años",busto:56,largo:42,manga:30,cintura:54,cadera:58,peso:160,lana:450,manoObra:0},
    {talle:"5-6 años",busto:60,largo:46,manga:34,cintura:56,cadera:62,peso:185,lana:500,manoObra:0},
    {talle:"7-8 años",busto:64,largo:50,manga:38,cintura:58,cadera:66,peso:210,lana:560,manoObra:0},
    {talle:"10 años",busto:68,largo:54,manga:42,cintura:60,cadera:70,peso:240,lana:620,manoObra:0},
    {talle:"12 años",busto:72,largo:58,manga:46,cintura:62,cadera:74,peso:270,lana:700,manoObra:0},
  ],
  bebe:[
    {talle:"1-2 m",busto:42,largo:28,manga:16,cintura:42,cadera:44,peso:80,lana:250,manoObra:0},
    {talle:"3-4 m",busto:44,largo:30,manga:17,cintura:44,cadera:46,peso:90,lana:280,manoObra:0},
    {talle:"5-6 m",busto:46,largo:32,manga:18,cintura:46,cadera:48,peso:100,lana:310,manoObra:0},
    {talle:"7-8 m",busto:48,largo:34,manga:19,cintura:48,cadera:50,peso:110,lana:340,manoObra:0},
    {talle:"9-11 m",busto:50,largo:36,manga:20,cintura:50,cadera:52,peso:120,lana:370,manoObra:0},
  ],
  unico:[{talle:"Talle único",busto:null,largo:null,manga:null,cintura:null,cadera:null,peso:300,lana:960,manoObra:0}],
};

const GRUPOS_TALLES=[{id:"adultos",label:"Adultos",sub:"XS–XXL"},{id:"kids",label:"Kids",sub:"1-2 años → 12 años"},{id:"bebe",label:"Bebé",sub:"1-2 m → 9-11 m"},{id:"unico",label:"Talle único",sub:"Ruanas, chales, sombreros"}];
const COLS_TALLE=[{k:"talle",label:"Talle",unit:""},{k:"busto",label:"Busto",unit:"cm"},{k:"largo",label:"Largo",unit:"cm"},{k:"manga",label:"Manga",unit:"cm"},{k:"cintura",label:"Cintura",unit:"cm"},{k:"cadera",label:"Cadera",unit:"cm"},{k:"peso",label:"Peso",unit:"g"},{k:"lana",label:"Lana",unit:"g"},{k:"manoObra",label:"M. de obra",unit:"$"}];

const fmt = n => "$ " + Math.round(n).toLocaleString("es-AR");
const hoy = () => new Date().toISOString().split("T")[0];
const diasHasta = f => Math.ceil((new Date(f) - new Date()) / 86400000);
const store = {
  get: (k, d) => { try { const r = window["_jv6"]?.[k]; return r ? JSON.parse(r) : d; } catch(e) { return d; } },
  set: (k, v) => { if (!window["_jv6"]) window["_jv6"] = {}; window["_jv6"][k] = JSON.stringify(v); }
};

// ── BASE COMPONENTS ──────────────────────────────────────────────────────────
const Badge = ({ e, children }) => {
  const s = ES[e] || { bg: T.bgMuted, tx: T.inkMid };
  return <span style={{display:"inline-block",padding:"3px 10px",borderRadius:99,fontSize:10,fontWeight:500,background:s.bg,color:s.tx,whiteSpace:"nowrap"}}>{children || e}</span>;
};
const Pill = ({ active, onClick, children, color }) => (
  <button onClick={onClick} style={{padding:"5px 14px",borderRadius:99,border:`1px solid ${active?(color||T.green):T.border}`,background:active?(color||T.green):"transparent",color:active?"#fff":T.inkMid,cursor:"pointer",fontSize:12,fontFamily:"inherit",whiteSpace:"nowrap"}}>{children}</button>
);
const Btn = ({ children, onClick, variant="ghost", disabled, small, style: sx={} }) => {
  const base = {padding:small?"5px 12px":"8px 20px",borderRadius:2,cursor:disabled?"not-allowed":"pointer",fontSize:small?11:13,fontWeight:500,opacity:disabled?.5:1,fontFamily:"inherit",...sx};
  const v = {primary:{background:T.green,color:"#fff",border:"none"},ghost:{background:"transparent",color:T.ink,border:`1px solid ${T.border}`},danger:{background:T.danger,color:"#fff",border:"none"}};
  return <button onClick={onClick} disabled={disabled} style={{...base,...v[variant]}}>{children}</button>;
};
const Card = ({ children, style: sx={} }) => <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:4,padding:"1.5rem",marginBottom:16,...sx}}>{children}</div>;
const Met = ({ label, value, sub, accent, onClick }) => (
  <div onClick={onClick} style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:4,padding:"1.25rem 1.5rem",cursor:onClick?"pointer":"default"}}>
    <div style={{fontSize:11,color:T.inkLt,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:6}}>{label}</div>
    <div style={{fontSize:24,fontWeight:300,color:accent||T.ink,letterSpacing:"-0.5px"}}>{value}</div>
    {sub && <div style={{fontSize:11,color:T.inkMid,marginTop:4}}>{sub}</div>}
  </div>
);
const SecTitle = ({ children, action }) => (
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:20,paddingBottom:10,borderBottom:`1px solid ${T.borderLt}`}}>
    <h2 style={{margin:0,fontSize:13,fontWeight:500,letterSpacing:"0.1em",textTransform:"uppercase",color:T.inkMid}}>{children}</h2>
    {action}
  </div>
);
const Bar = ({ pct, color }) => (
  <div style={{height:3,background:T.bgDeep,borderRadius:99,overflow:"hidden",marginTop:5}}>
    <div style={{height:3,width:`${Math.min(100,pct)}%`,background:color||T.green,borderRadius:99}}/>
  </div>
);
const Inp = ({ label, ...p }) => (
  <div style={{marginBottom:14}}>
    {label && <label style={{fontSize:11,color:T.inkMid,display:"block",marginBottom:5}}>{label}</label>}
    <input style={{width:"100%",padding:"9px 12px",border:`1px solid ${T.border}`,borderRadius:2,background:T.bgCard,color:T.ink,fontSize:13,boxSizing:"border-box",fontFamily:"inherit"}} {...p}/>
  </div>
);
const Sel = ({ label, children, ...p }) => (
  <div style={{marginBottom:14}}>
    {label && <label style={{fontSize:11,color:T.inkMid,display:"block",marginBottom:5}}>{label}</label>}
    <select style={{width:"100%",padding:"9px 12px",border:`1px solid ${T.border}`,borderRadius:2,background:T.bgCard,color:T.ink,fontSize:13,boxSizing:"border-box",fontFamily:"inherit"}} {...p}>{children}</select>
  </div>
);
const Ov = ({ children, onClose, wide }) => {
  const mob = window.innerWidth < 768;
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(30,28,24,0.5)",display:"flex",alignItems:mob?"flex-end":"center",justifyContent:"center",zIndex:300}}>
      <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:mob?"12px 12px 0 0":4,padding:"1.5rem",width:mob?"100%":wide?700:520,maxWidth:"100vw",maxHeight:mob?"92vh":"90vh",overflowY:"auto"}}>{children}</div>
    </div>
  );
};
const MTitle = ({ children, onClose }) => (
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,paddingBottom:12,borderBottom:`1px solid ${T.borderLt}`}}>
    <h3 style={{margin:0,fontSize:16,fontWeight:400}}>{children}</h3>
    {onClose && <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:T.inkLt}}>×</button>}
  </div>
);
const TH = ({ children }) => <th style={{textAlign:"left",padding:"10px 14px",borderBottom:`1px solid ${T.border}`,fontSize:11,fontWeight:500,letterSpacing:"0.06em",textTransform:"uppercase",color:T.inkLt,whiteSpace:"nowrap"}}>{children}</th>;
const TD = ({ children, style: sx={} }) => <td style={{padding:"11px 14px",borderBottom:`1px solid ${T.borderLt}`,verticalAlign:"middle",...sx}}>{children}</td>;
const Empty = ({ icon, title, sub, action }) => (
  <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"4rem 2rem",textAlign:"center",color:T.inkLt}}>
    <div style={{fontSize:40,marginBottom:16,opacity:0.3}}>{icon||"📭"}</div>
    <div style={{fontSize:15,fontWeight:500,color:T.inkMid,marginBottom:6}}>{title}</div>
    {sub && <div style={{fontSize:13,marginBottom:20,maxWidth:320}}>{sub}</div>}
    {action}
  </div>
);

function useIsMobile() {
  const [mob, setMob] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setMob(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return mob;
}

// ── CATALOG EDITOR (standalone component to avoid JSX parse issues) ──────────
function CatalogEditor({ cfg, scfg }) {
  const allNames = Object.values(CATALOG).map(p => p.n);
  const initVals = {};
  allNames.forEach(n => { initVals[n] = { c: CATALOG[n].c, pv: CATALOG[n].p, lana: CATALOG[n].lana }; });
  const [vals, setVals] = useState(initVals);
  const [saved, setSaved] = useState(false);

  const upd = (n, k, v) => setVals(prev => ({ ...prev, [n]: { ...prev[n], [k]: Number(v) } }));

  const saveGroup = (cat) => {
    CAT_DATA[cat].forEach(p => {
      const v = vals[p.n] || { c: 0, pv: 0, lana: 0 };
      CATALOG[p.n].c = v.c;
      CATALOG[p.n].p = v.pv;
      CATALOG[p.n].lana = v.lana;
    });
    scfg({ ...cfg, _t: Date.now() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const numInput = (n, k, w) => (
    <input
      type="number" min="0"
      value={vals[n] ? vals[n][k] : 0}
      onChange={e => upd(n, k, e.target.value)}
      style={{width:w||90,padding:"5px 8px",border:`1px solid ${T.border}`,borderRadius:2,fontSize:12,background:T.bgCard,color:T.ink,fontFamily:"inherit"}}
    />
  );

  return (
    <div>
      {saved && <div style={{background:T.okLt,border:`1px solid ${T.ok}`,borderRadius:4,padding:"10px 16px",marginBottom:16,fontSize:13,color:T.ok}}>✓ Precios guardados</div>}
      <div style={{background:T.warnLt,border:`1px solid ${T.warn}`,borderRadius:4,padding:"12px 16px",marginBottom:20,fontSize:13,color:T.warn}}>
        ⚠ Completá costo y precio de cada prenda para que funcionen los cálculos de margen, análisis y planificación.
      </div>
      {Object.entries(CAT_DATA).map(([cat, items]) => (
        <Card key={cat} style={{marginBottom:12}}>
          <div style={{fontSize:11,color:T.inkMid,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:16}}>{cat}</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{background:T.bg}}>
                <TH>Prenda</TH><TH>Costo ($)</TH><TH>Precio venta ($)</TH><TH>Lana (g)</TH><TH>Margen</TH>
              </tr>
            </thead>
            <tbody>
              {items.map((p, i) => {
                const v = vals[p.n] || { c: 0, pv: 0, lana: 0 };
                const mg = v.pv > 0 ? Math.round((v.pv - v.c) / v.pv * 100) : null;
                const mgBg = mg === null ? T.bgMuted : mg > 50 ? T.okLt : mg > 30 ? T.warnLt : T.dangerLt;
                const mgTx = mg === null ? T.inkLt : mg > 50 ? T.ok : mg > 30 ? T.warn : T.danger;
                return (
                  <tr key={p.n} style={{background:i%2===0?T.bgCard:T.bg}}>
                    <TD style={{fontWeight:500,fontSize:12}}>{p.n}</TD>
                    <TD>{numInput(p.n, "c", 90)}</TD>
                    <TD>{numInput(p.n, "pv", 90)}</TD>
                    <TD>{numInput(p.n, "lana", 80)}</TD>
                    <TD>
                      {mg !== null
                        ? <span style={{fontSize:11,padding:"2px 8px",borderRadius:99,background:mgBg,color:mgTx}}>{mg}%</span>
                        : <span style={{fontSize:11,color:T.inkLt}}>—</span>
                      }
                    </TD>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{marginTop:10,textAlign:"right"}}>
            <Btn small variant="primary" onClick={() => saveGroup(cat)}>Guardar {cat}</Btn>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── FICHA ARTESANA ────────────────────────────────────────────────────────────
function FichaArtesana({ a, statsArt, capArt, onClose }) {
  const st = statsArt(a.id);
  const cap = capArt(a.id);
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(30,28,24,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}}>
      <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:4,padding:"2rem",width:640,maxWidth:"96vw",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:20,paddingBottom:14,borderBottom:`1px solid ${T.borderLt}`}}>
          <div style={{display:"flex",gap:14,alignItems:"center"}}>
            <div style={{width:44,height:44,borderRadius:"50%",background:T.greenLt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:T.green}}>{a.nombre[0]}</div>
            <div>
              <div style={{fontSize:17,fontWeight:400}}>{a.nombre}</div>
              <div style={{fontSize:12,color:T.inkMid,marginTop:2}}>{a.especialidad}</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:T.inkLt}}>×</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
          {[[st.totalPrendas,"Entregadas"],[st.pendPrendas,"En proceso"],[fmt(st.totalValor),"Valor"],[`${st.tasaEntrega}%`,"Tasa"]].map(([v,l]) => (
            <div key={l} style={{background:T.bg,borderRadius:2,padding:"10px 12px"}}>
              <div style={{fontSize:10,color:T.inkLt,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:3}}>{l}</div>
              <div style={{fontSize:17,fontWeight:300}}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{background:T.bg,borderRadius:2,padding:"10px 14px",marginBottom:14,display:"flex",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:11,color:T.inkLt,marginBottom:2}}>Capacidad mensual</div>
            <div style={{fontSize:12}}>{cap.ocupada}/{cap.cap} · <span style={{color:cap.libre>0?T.ok:T.danger}}>{cap.libre} libres</span></div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11,color:T.inkLt,marginBottom:2}}>Lana asignada</div>
            <div style={{fontSize:14,fontWeight:500,color:(a.lana_asignada||0)>4000?T.warn:T.ok}}>{(a.lana_asignada||0).toLocaleString()}g</div>
          </div>
        </div>
        {(a.tecnicas||[]).length > 0 && (
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,color:T.inkLt,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Técnicas</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {a.tecnicas.map(t => <span key={t} style={{padding:"4px 12px",borderRadius:99,background:T.violetLt,color:T.violet,fontSize:12}}>{t}</span>)}
            </div>
          </div>
        )}
        {(a.prendas_habituales||[]).length > 0 && (
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,color:T.inkLt,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Prendas que teje</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
              {a.prendas_habituales.map(p => <span key={p} style={{padding:"3px 10px",borderRadius:99,background:T.greenLt,color:T.green,fontSize:11}}>{p}</span>)}
            </div>
          </div>
        )}
        {st.pend.length > 0 && (
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,color:T.inkLt,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>En curso</div>
            {st.pend.map(p => {
              const d = Math.ceil((new Date(p.fechaEntrega) - new Date()) / 86400000);
              const es = ES[p.estado] || { bg: T.bgMuted, tx: T.inkMid };
              return (
                <div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${T.borderLt}`,fontSize:12}}>
                  <span><strong>{p.prenda}</strong>{p.talle ? ` (${p.talle})` : ""} ×{p.cantidad} — {p.cliente}</span>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <span style={{padding:"2px 9px",borderRadius:99,fontSize:10,fontWeight:500,background:es.bg,color:es.tx}}>{p.estado}</span>
                    <span style={{color:d<0?T.danger:d<=3?T.warn:T.inkMid}}>{d<0?`${Math.abs(d)}d venc.`:`${d}d`}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {st.entg.length > 0 && (
          <div>
            <div style={{fontSize:11,color:T.inkLt,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Historial</div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr>{["Prenda","Talle","Cant.","Cliente","Fecha","Valor"].map(h => <th key={h} style={{textAlign:"left",padding:"6px 0",borderBottom:`1px solid ${T.border}`,color:T.inkLt,fontWeight:500,fontSize:11}}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {st.entg.slice().reverse().map(p => {
                  const pr = getPrenda(p.prenda);
                  return (
                    <tr key={p.id}>
                      <td style={{padding:"6px 0",borderBottom:`1px solid ${T.borderLt}`}}>{p.prenda}</td>
                      <td style={{padding:"6px 0",borderBottom:`1px solid ${T.borderLt}`,color:T.inkMid}}>{p.talle||"—"}</td>
                      <td style={{padding:"6px 0",borderBottom:`1px solid ${T.borderLt}`}}>{p.cantidad}</td>
                      <td style={{padding:"6px 0",borderBottom:`1px solid ${T.borderLt}`}}>{p.cliente}</td>
                      <td style={{padding:"6px 0",borderBottom:`1px solid ${T.borderLt}`,color:T.inkMid}}>{p.fechaEntrega}</td>
                      <td style={{padding:"6px 0",borderBottom:`1px solid ${T.borderLt}`,color:T.ok}}>{fmt((pr?.p||0)*p.cantidad)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {a.notas && <div style={{marginTop:12,fontSize:11,color:T.inkMid,fontStyle:"italic",borderTop:`1px solid ${T.borderLt}`,paddingTop:10}}>{a.notas}</div>}
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const mob = useIsMobile();
  const [tab, setTab] = useState("dashboard");
  const [pedidos, setPedidos] = useState(() => store.get("p6", []));
  const [stockP, setStockP] = useState(() => store.get("s6", []));
  const [lanas, setLanas] = useState(() => store.get("l6", []));
  const [artesanas, setArtesanas] = useState(() => store.get("a6", []));
  const [clientes, setClientes] = useState(() => store.get("c6", []));
  const [comps, setComps] = useState(() => store.get("co6", []));
  const [provs, setProvs] = useState(() => store.get("pr6", []));
  const [pagosArt, setPagosArt] = useState(() => store.get("pa6", []));
  const [talles, setTalles] = useState(() => store.get("tl6", TALLES_INIT));
  const [modal, setModal] = useState(null);
  const [sel, setSel] = useState(null);
  const [filtEst, setFiltEst] = useState("Todos");
  const [filtArt, setFiltArt] = useState("Todas");
  const [busqP, setBusqP] = useState("");
  const cfgDef = { alertaEntregaDias:5, stockMinimoDefault:2, margenMinimoAlerta:40, diasAlertaPago:7, taller:{nombre:"Junco Verde",email:"hola@juncoverde.com.uy",tel:"+598 99 452 591",ciudad:"Punta del Este, Uruguay"}, tiemposProd:{} };
  const [cfg, setCfg] = useState(() => store.get("cfg6", cfgDef));

  const sv = (k, v, fn) => { fn(v); store.set(k, v); };
  const sp  = v => sv("p6",  v, setPedidos);
  const ss  = v => sv("s6",  v, setStockP);
  const sl  = v => sv("l6",  v, setLanas);
  const sa  = v => sv("a6",  v, setArtesanas);
  const sc  = v => sv("c6",  v, setClientes);
  const sco = v => sv("co6", v, setComps);
  const spr = v => sv("pr6", v, setProvs);
  const spa = v => sv("pa6", v, setPagosArt);
  const stl = v => sv("tl6", v, setTalles);
  const scfg= v => sv("cfg6",v, setCfg);

  const activos = pedidos.filter(p => p.estado !== "Entregado");
  const totalVenta = activos.reduce((a, p) => { const pr = getPrenda(p.prenda); return a + (pr?.p||0)*p.cantidad; }, 0);
  const totalCosto = activos.reduce((a, p) => { const pr = getPrenda(p.prenda); return a + (pr?.c||0)*p.cantidad; }, 0);
  const totalCobrado = pedidos.reduce((a, p) => a + (p.pagado||0), 0);
  const urgentes = activos.filter(p => diasHasta(p.fechaEntrega) <= cfg.alertaEntregaDias);
  const lanasBajas = lanas.filter(l => l.stock < l.minimo);

  const statsCliente = id => {
    const nom = clientes.find(c => c.id === id)?.nombre;
    const ped = pedidos.filter(p => p.cliente === nom);
    const total = ped.reduce((a, p) => { const pr = getPrenda(p.prenda); return a + (pr?.p||0)*p.cantidad; }, 0);
    const cobrado = ped.reduce((a, p) => a + (p.pagado||0), 0);
    return { ped, total, cobrado, saldo: total - cobrado };
  };
  const statsArt = id => {
    const nom = artesanas.find(a => a.id === id)?.nombre;
    const ped = pedidos.filter(p => p.artesana === nom);
    const entg = ped.filter(p => p.estado === "Entregado");
    const pend = ped.filter(p => p.estado !== "Entregado");
    return {
      ped, entg, pend,
      totalPrendas: entg.reduce((a, p) => a + p.cantidad, 0),
      totalValor: entg.reduce((a, p) => { const pr = getPrenda(p.prenda); return a + (pr?.p||0)*p.cantidad; }, 0),
      pendPrendas: pend.reduce((a, p) => a + p.cantidad, 0),
      tasaEntrega: ped.length ? Math.round(entg.length / ped.length * 100) : 0
    };
  };
  const capArt = id => {
    const art = artesanas.find(a => a.id === id);
    if (!art) return { libre:0, ocupada:0, pct:0, cap:0 };
    const st = statsArt(id);
    const cap = (art.capacidad_semanal||2) * 4;
    const libre = Math.max(0, cap - st.pendPrendas);
    return { libre, ocupada: st.pendPrendas, pct: Math.min(100, Math.round(st.pendPrendas/cap*100)), cap };
  };
  const moSugerida = p => {
    const pr = getPrenda(p.prenda);
    const cat = pr?.cat || "";
    const grupo = cat.includes("Kids") ? "kids" : cat.includes("Sombreros") ? "unico" : "adultos";
    const fila = (talles[grupo]||[]).find(t => t.talle === p.talle);
    if (fila) return fila.manoObra * p.cantidad;
    return Math.round((pr?.p||0) * p.cantidad * 0.30);
  };
  const resumenArtPago = nombre => {
    const pag = pagosArt.filter(p => p.artesana === nombre);
    const totalPag = pag.reduce((a, p) => a + (+p.monto||0), 0);
    const entg = pedidos.filter(p => p.artesana === nombre && p.estado === "Entregado");
    const totalMO = entg.reduce((a, p) => a + moSugerida(p), 0);
    return { pag, totalPag, totalMO, pendiente: Math.max(0, totalMO - totalPag), entg };
  };
  const finanzasMes = useMemo(() => {
    const m = {};
    pedidos.filter(p => p.estado === "Entregado").forEach(p => {
      const mes = p.fechaEntrega?.slice(0,7) || "";
      if (!mes) return;
      const pr = getPrenda(p.prenda);
      if (!m[mes]) m[mes] = { mes, venta:0, costo:0, prendas:0 };
      m[mes].venta += (pr?.p||0)*p.cantidad;
      m[mes].costo += (pr?.c||0)*p.cantidad;
      m[mes].prendas += p.cantidad;
    });
    return Object.values(m).sort((a,b) => a.mes.localeCompare(b.mes)).slice(-6);
  }, [pedidos]);
  const topPrendas = useMemo(() => {
    const m = {};
    pedidos.forEach(p => {
      if (!m[p.prenda]) m[p.prenda] = { n:p.prenda, qty:0, venta:0 };
      m[p.prenda].qty += p.cantidad;
      const pr = getPrenda(p.prenda);
      m[p.prenda].venta += (pr?.p||0)*p.cantidad;
    });
    return Object.values(m).sort((a,b) => b.qty - a.qty).slice(0,6);
  }, [pedidos]);

  const cambiarEstado = (id, est) => {
    const p = pedidos.find(x => x.id === id);
    if (!p) return;
    const pr = getPrenda(p.prenda);
    if (est === "Entregado") {
      sa(artesanas.map(x => x.nombre === p.artesana ? { ...x, lana_asignada: Math.max(0, (x.lana_asignada||0) - (pr?.lana||0)*p.cantidad) } : x));
      const ex = stockP.find(x => x.prenda === p.prenda);
      if (ex) ss(stockP.map(x => x.prenda === p.prenda ? { ...x, qty: x.qty + p.cantidad } : x));
      else ss([...stockP, { id:Date.now(), prenda:p.prenda, cat:pr?.cat||"", qty:p.cantidad, costo:pr?.c||0, precio:pr?.p||0 }]);
    }
    sp(pedidos.map(x => x.id === id ? { ...x, estado: est } : x));
  };

  const TABS = [
    {id:"dashboard",   l:"Inicio",        icon:"⌂"},
    {id:"pedidos",     l:"Pedidos",        icon:"📋"},
    {id:"clientes",    l:"Clientes",       icon:"👥"},
    {id:"artesanas",   l:"Artesanas",      icon:"🧶"},
    {id:"pagos_art",   l:"Pagos art.",     icon:"💚"},
    {id:"planif",      l:"Producción",     icon:"📅"},
    {id:"analisis",    l:"Análisis",       icon:"📊"},
    {id:"stock",       l:"Stock prendas",  icon:"👗"},
    {id:"lanas",       l:"Stock lanas",    icon:"🧵"},
    {id:"talles",      l:"Talles",         icon:"📐"},
    {id:"comprobantes",l:"Comprobantes",   icon:"🧾"},
    {id:"config",      l:"Config.",        icon:"⚙"},
  ];
  const MOB_TABS = ["dashboard","pedidos","artesanas","pagos_art","comprobantes"];

  // ── DASHBOARD ────────────────────────────────────────────────────────────
  const Dashboard = () => {
    const fechaHoy = new Date().toLocaleDateString("es-UY",{weekday:"long",day:"numeric",month:"long"});
    const sinEntregar = pedidos.filter(p => p.estado !== "Entregado");
    const pendCobro = activos.reduce((a,p) => { const pr = getPrenda(p.prenda); return a + (pr?.p||0)*p.cantidad - (p.pagado||0); }, 0);
    const proxVenc = [...sinEntregar].sort((a,b) => new Date(a.fechaEntrega)-new Date(b.fechaEntrega))[0];
    const dProx = proxVenc ? diasHasta(proxVenc.fechaEntrega) : null;
    const dColor = dProx===null ? T.inkLt : dProx<0 ? T.danger : dProx<=3 ? T.warn : T.ok;
    const dLabel = dProx===null ? "—" : dProx<0 ? `${Math.abs(dProx)}d vencido` : dProx===0 ? "Hoy" : `${dProx}d`;

    if (pedidos.length===0 && artesanas.length===0 && clientes.length===0) return (
      <div>
        <div style={{marginBottom:mob?20:32}}>
          <div style={{fontSize:11,color:T.inkLt,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>{fechaHoy}</div>
          <div style={{fontSize:mob?20:28,fontWeight:300}}>Bienvenida a Junco Verde</div>
        </div>
        <Card style={{textAlign:"center",padding:"3rem 2rem",background:T.greenLt,border:`1px solid ${T.green}`}}>
          <div style={{fontSize:32,marginBottom:12}}>🧶</div>
          <div style={{fontSize:18,fontWeight:400,color:T.green,marginBottom:8}}>El taller está listo para comenzar</div>
          <div style={{fontSize:13,color:T.inkMid,maxWidth:480,margin:"0 auto",lineHeight:1.7}}>
            Empezá cargando las <strong>artesanas</strong>, luego los <strong>clientes</strong>, el <strong>stock de lanas</strong>, y los <strong>precios del catálogo</strong> en Configuración.
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"center",marginTop:20,flexWrap:"wrap"}}>
            <Btn variant="primary" onClick={() => setTab("artesanas")}>1 · Artesanas</Btn>
            <Btn onClick={() => setTab("clientes")}>2 · Clientes</Btn>
            <Btn onClick={() => setTab("lanas")}>3 · Lanas</Btn>
            <Btn onClick={() => setTab("config")}>4 · Precios catálogo</Btn>
          </div>
        </Card>
      </div>
    );

    return (
      <div>
        <div style={{marginBottom:mob?20:32,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
          <div>
            <div style={{fontSize:11,color:T.inkLt,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>{fechaHoy}</div>
            <div style={{fontSize:mob?20:28,fontWeight:300}}>Junco Verde</div>
          </div>
          {(urgentes.length>0||lanasBajas.length>0) && <div style={{background:T.dangerLt,border:`1px solid ${T.danger}`,borderRadius:4,padding:"8px 16px",fontSize:12,color:T.danger,fontWeight:500}}>{urgentes.length+lanasBajas.length} alertas</div>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"1fr 1fr 1fr",gap:mob?10:16,marginBottom:mob?16:32}}>
          <div style={{background:T.green,borderRadius:4,padding:"1.75rem 2rem"}}>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.65)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>Pendientes</div>
            <div style={{fontSize:48,fontWeight:300,color:"#fff",letterSpacing:"-2px",lineHeight:1}}>{sinEntregar.length}</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.55)",marginTop:10}}>{pedidos.filter(p=>p.estado==="Entregado").length} entregados · {pedidos.length} total</div>
          </div>
          <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:4,padding:"1.75rem 2rem"}}>
            <div style={{fontSize:11,color:T.inkLt,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>Próx. vencimiento</div>
            <div style={{fontSize:42,fontWeight:300,letterSpacing:"-1px",lineHeight:1,color:dColor}}>{dLabel}</div>
            {proxVenc && <div style={{marginTop:10}}><div style={{fontSize:13,fontWeight:500,marginBottom:2}}>{proxVenc.prenda}</div><div style={{fontSize:11,color:T.inkMid}}>{proxVenc.cliente} · {proxVenc.fechaEntrega}</div></div>}
          </div>
          <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:4,padding:"1.75rem 2rem"}}>
            <div style={{fontSize:11,color:T.inkLt,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>Pend. de cobrar</div>
            <div style={{fontSize:36,fontWeight:300,letterSpacing:"-1px",lineHeight:1,color:pendCobro>0?T.warn:T.ok}}>{fmt(pendCobro)}</div>
            <div style={{marginTop:10,display:"flex",gap:12}}>
              <div><div style={{fontSize:10,color:T.inkLt,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:2}}>Cobrado</div><div style={{fontSize:13,fontWeight:500,color:T.ok}}>{fmt(totalCobrado)}</div></div>
              <div style={{width:1,background:T.borderLt}}/>
              <div><div style={{fontSize:10,color:T.inkLt,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:2}}>Margen</div><div style={{fontSize:13,fontWeight:500,color:T.green}}>{fmt(totalVenta-totalCosto)}</div></div>
            </div>
          </div>
        </div>
        {(urgentes.length>0||lanasBajas.length>0) && (
          <div style={{background:T.dangerLt,border:`1px solid ${T.danger}`,borderLeft:`4px solid ${T.danger}`,borderRadius:4,padding:"1.25rem 1.5rem",marginBottom:24}}>
            <div style={{fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",color:T.danger,marginBottom:12,fontWeight:500}}>Requiere atención</div>
            {urgentes.map(p => {
              const d = diasHasta(p.fechaEntrega);
              return (
                <div key={p.id} onClick={() => setTab("pedidos")} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 10px",marginBottom:4,borderRadius:3,cursor:"pointer",background:"rgba(176,58,46,0.06)"}}>
                  <div style={{fontSize:13}}><strong>{p.prenda}</strong> ×{p.cantidad} — {p.cliente} <Badge e={p.estado}/></div>
                  <span style={{fontSize:12,fontWeight:500,color:d<0?T.danger:T.warn,marginLeft:12,whiteSpace:"nowrap"}}>{d<0?`${Math.abs(d)}d vencido`:`${d}d`}</span>
                </div>
              );
            })}
            {lanasBajas.map(l => (
              <div key={l.id} onClick={() => setTab("lanas")} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 10px",marginBottom:4,borderRadius:3,cursor:"pointer",background:"rgba(176,58,46,0.06)"}}>
                <div style={{fontSize:13}}><strong>Lana baja: {l.tipo}</strong> — {l.stock.toLocaleString()}g / mín {l.minimo.toLocaleString()}g</div>
                <span style={{fontSize:11,padding:"2px 8px",borderRadius:99,background:T.danger,color:"#fff",fontWeight:500}}>Reponer</span>
              </div>
            ))}
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:mob?10:16}}>
          <Card style={{marginBottom:0}}>
            <SecTitle>Estado de producción</SecTitle>
            {ESTADOS.filter(est => pedidos.some(p => p.estado===est)).map(est => {
              const ct = pedidos.filter(p => p.estado===est).length;
              const pct = pedidos.length ? Math.round(ct/pedidos.length*100) : 0;
              const e = ES[est] || {bg:T.bgMuted,tx:T.inkMid};
              return (
                <div key={est} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:`1px solid ${T.borderLt}`}}>
                  <span style={{fontSize:11,padding:"3px 10px",borderRadius:99,background:e.bg,color:e.tx,fontWeight:500,whiteSpace:"nowrap",minWidth:110,textAlign:"center"}}>{est}</span>
                  <div style={{flex:1,height:4,background:T.bgDeep,borderRadius:99}}><div style={{height:4,width:`${pct}%`,background:e.tx,borderRadius:99,opacity:0.7}}/></div>
                  <span style={{fontSize:13,fontWeight:500,minWidth:20,textAlign:"right"}}>{ct}</span>
                </div>
              );
            })}
            {pedidos.length===0 && <div style={{textAlign:"center",color:T.inkLt,fontSize:13,padding:"1rem"}}>Sin pedidos aún.</div>}
          </Card>
          <Card style={{marginBottom:0}}>
            <SecTitle action={<Btn small onClick={() => setTab("artesanas")}>Ver todas →</Btn>}>Artesanas</SecTitle>
            {artesanas.length===0 && <div style={{textAlign:"center",color:T.inkLt,fontSize:13,padding:"1rem"}}>Sin artesanas cargadas.</div>}
            {artesanas.map(a => {
              const st = statsArt(a.id);
              const cap = capArt(a.id);
              return (
                <div key={a.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${T.borderLt}`,cursor:"pointer"}} onClick={() => setTab("artesanas")}>
                  <div style={{width:30,height:30,borderRadius:"50%",background:a.disponible?T.greenLt:T.bgMuted,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:a.disponible?T.green:T.inkLt,fontWeight:500,flexShrink:0}}>{a.nombre[0]}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:13}}>{a.nombre}</span><span style={{fontSize:11,color:T.inkMid}}>{st.pendPrendas} pend.</span></div>
                    <Bar pct={cap.pct} color={cap.pct>80?T.danger:cap.pct>50?T.warn:T.green}/>
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      </div>
    );
  };

  // ── PEDIDOS ────────────────────────────────────────────────────────────────
  const Pedidos = () => {
    const todasPrendas = TODAS();
    const pedF0 = { cliente:clientes[0]?.nombre||"", prenda:todasPrendas[0]?.n||"", talle:"M", artesana:artesanas.filter(a=>a.disponible)[0]?.nombre||artesanas[0]?.nombre||"", cantidad:1, fechaEntrega:hoy(), notas:"", estado:"Pendiente", pagado:0, coleccion:"", envioEstado:"Sin envío", envioTracking:"", envioEmpresa:"", envioFecha:"" };
    const [nPed, setNPed] = useState(pedF0);
    const filt = pedidos.filter(p => (filtEst==="Todos"||p.estado===filtEst) && (filtArt==="Todas"||p.artesana===filtArt));

    const crear = () => {
      const pr = getPrenda(nPed.prenda);
      sp([...pedidos, { ...nPed, id:Date.now(), cantidad:+nPed.cantidad, pagado:+nPed.pagado }]);
      if (pr?.lana) sa(artesanas.map(x => x.nombre===nPed.artesana ? { ...x, lana_asignada:(x.lana_asignada||0)+pr.lana*+nPed.cantidad } : x));
      setModal(null);
    };

    if (clientes.length===0 || artesanas.length===0) return (
      <div>
        <SecTitle>Pedidos</SecTitle>
        <Empty icon="📋" title="Antes de crear pedidos" sub="Necesitás tener al menos una artesana y un cliente cargados." action={<div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center"}}><Btn variant="primary" onClick={() => setTab("artesanas")}>Cargar artesanas</Btn><Btn onClick={() => setTab("clientes")}>Cargar clientes</Btn></div>}/>
      </div>
    );

    return (
      <div>
        <SecTitle action={<Btn variant="primary" onClick={() => { setNPed({...pedF0}); setModal("ped"); }}>+ Nuevo pedido</Btn>}>Pedidos</SecTitle>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
          {["Todos",...ESTADOS].map(e => <Pill key={e} active={filtEst===e} onClick={() => setFiltEst(e)}>{e}</Pill>)}
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:20}}>
          {["Todas",...artesanas.map(a=>a.nombre)].map(a => <Pill key={a} active={filtArt===a} onClick={() => setFiltArt(a)} color={T.tierra}>{a}</Pill>)}
        </div>

        {mob ? (
          <div>
            {filt.map(p => {
              const pr = getPrenda(p.prenda);
              const tot = (pr?.p||0)*p.cantidad;
              const saldo = tot-(p.pagado||0);
              const d = diasHasta(p.fechaEntrega);
              const venc = d<0 && p.estado!=="Entregado";
              return (
                <div key={p.id} style={{background:venc?T.dangerLt:T.bgCard,border:`1px solid ${venc?T.danger:T.border}`,borderRadius:4,padding:"1rem",marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <div><div style={{fontWeight:500,fontSize:14}}>{p.cliente}</div><div style={{fontSize:12,color:T.inkMid,marginTop:2}}>{p.prenda}{p.talle?` · ${p.talle}`:""} ×{p.cantidad}</div></div>
                    <Badge e={p.estado}/>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                    {[["Artesana",p.artesana,null],["Entrega",p.fechaEntrega,venc?T.danger:d<=3?T.warn:null],["Total",fmt(tot),null],["Saldo",fmt(saldo),saldo>0?T.danger:T.ok]].map(([l,v,c]) => (
                      <div key={l} style={{background:T.bg,borderRadius:2,padding:"6px 8px"}}>
                        <div style={{fontSize:10,color:T.inkLt,textTransform:"uppercase",marginBottom:2}}>{l}</div>
                        <div style={{fontSize:12,fontWeight:500,color:c||T.ink}}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <select value={p.estado} onChange={e => cambiarEstado(p.id, e.target.value)} style={{padding:"6px 10px",border:`1px solid ${T.border}`,borderRadius:2,background:ES[p.estado]?.bg||T.bgMuted,color:ES[p.estado]?.tx||T.ink,fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit",flex:1,marginRight:8}}>
                      {ESTADOS.map(e => <option key={e}>{e}</option>)}
                    </select>
                    <div style={{display:"flex",gap:6}}>
                      <Btn small onClick={() => { setSel(p); setModal("pago"); }}>Pago</Btn>
                      <Btn small onClick={() => { setSel(p); setModal("orden"); }}>Orden</Btn>
                    </div>
                  </div>
                </div>
              );
            })}
            {filt.length===0 && <Empty icon="📋" title="Sin pedidos" sub="Usá + Nuevo pedido para comenzar."/>}
          </div>
        ) : (
          filt.length===0 ? <Empty icon="📋" title="Sin pedidos" sub={filtEst==="Todos"?"Usá + Nuevo pedido para comenzar.":"No hay pedidos con ese filtro."}/> :
          <Card style={{padding:0,overflow:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:900}}>
              <thead><tr style={{background:T.bg}}><TH>Cliente</TH><TH>Prenda</TH><TH>Talle</TH><TH>Artesana</TH><TH>Cant.</TH><TH>Estado</TH><TH>Entrega</TH><TH>Total</TH><TH>Saldo</TH><TH>Envío</TH><TH></TH></tr></thead>
              <tbody>
                {filt.map((p,i) => {
                  const pr = getPrenda(p.prenda);
                  const tot = (pr?.p||0)*p.cantidad;
                  const saldo = tot-(p.pagado||0);
                  const d = diasHasta(p.fechaEntrega);
                  const venc = d<0 && p.estado!=="Entregado";
                  return (
                    <tr key={p.id} style={{background:venc?T.dangerLt:i%2===0?T.bgCard:T.bg}}>
                      <TD><strong style={{fontWeight:500}}>{p.cliente}</strong></TD>
                      <TD style={{fontSize:11,color:T.inkMid}}>{p.prenda}</TD>
                      <TD><span style={{fontSize:11,padding:"2px 8px",borderRadius:99,background:T.bgMuted,color:T.inkMid}}>{p.talle||"—"}</span></TD>
                      <TD>{p.artesana}</TD><TD>{p.cantidad}</TD>
                      <TD>
                        <select value={p.estado} onChange={e => cambiarEstado(p.id, e.target.value)} style={{padding:"3px 8px",border:`1px solid ${T.border}`,borderRadius:2,background:ES[p.estado]?.bg||T.bgMuted,color:ES[p.estado]?.tx||T.ink,fontSize:11,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>
                          {ESTADOS.map(e => <option key={e}>{e}</option>)}
                        </select>
                      </TD>
                      <TD style={{fontSize:11,color:venc?T.danger:d<=3?T.warn:T.ink}}>{p.fechaEntrega}</TD>
                      <TD>{fmt(tot)}</TD>
                      <TD style={{fontWeight:500,color:saldo>0?T.danger:T.ok}}>{fmt(saldo)}</TD>
                      <TD><span style={{fontSize:10,padding:"2px 8px",borderRadius:99,background:p.envioEstado==="Entregado"?T.okLt:p.envioEstado==="Sin envío"?T.bgMuted:T.infoLt,color:p.envioEstado==="Entregado"?T.ok:p.envioEstado==="Sin envío"?T.inkLt:T.info}}>{p.envioEstado}</span></TD>
                      <TD>
                        <div style={{display:"flex",gap:4}}>
                          <Btn small onClick={() => { setSel(p); setModal("pago"); }}>Pago</Btn>
                          <Btn small onClick={() => { setSel(p); setModal("envio"); }}>Envío</Btn>
                          <Btn small onClick={() => { setSel(p); setModal("orden"); }}>Orden</Btn>
                        </div>
                      </TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}

        {modal==="ped" && (
          <Ov onClose={() => setModal(null)}>
            <MTitle onClose={() => setModal(null)}>Nuevo pedido</MTitle>
            <Sel label="Cliente" value={nPed.cliente} onChange={e => setNPed({...nPed,cliente:e.target.value})}>
              {clientes.map(c => <option key={c.id}>{c.nombre}</option>)}
            </Sel>
            <Sel label="Prenda" value={nPed.prenda} onChange={e => setNPed({...nPed,prenda:e.target.value,talle:tallesParaPrenda(e.target.value)[0]||""})}>
              {Object.entries(CAT_DATA).map(([cat,items]) => <optgroup key={cat} label={cat}>{items.map(p => <option key={p.n} value={p.n}>{p.n}</option>)}</optgroup>)}
            </Sel>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
              <Sel label="Talle" value={nPed.talle} onChange={e => setNPed({...nPed,talle:e.target.value})}>
                {tallesParaPrenda(nPed.prenda).map(t => <option key={t}>{t}</option>)}
              </Sel>
              <Sel label="Artesana" value={nPed.artesana} onChange={e => setNPed({...nPed,artesana:e.target.value})}>
                {artesanas.filter(a=>a.disponible).map(a => <option key={a.id}>{a.nombre}</option>)}
              </Sel>
              <Inp label="Cantidad" type="number" min="1" value={nPed.cantidad} onChange={e => setNPed({...nPed,cantidad:e.target.value})}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Inp label="Fecha entrega" type="date" value={nPed.fechaEntrega} onChange={e => setNPed({...nPed,fechaEntrega:e.target.value})}/>
              <Inp label="Seña inicial" type="number" min="0" value={nPed.pagado} onChange={e => setNPed({...nPed,pagado:e.target.value})}/>
            </div>
            <Inp label="Colección" value={nPed.coleccion} onChange={e => setNPed({...nPed,coleccion:e.target.value})} placeholder="OI 2025, PV 2026…"/>
            <Inp label="Notas" value={nPed.notas} onChange={e => setNPed({...nPed,notas:e.target.value})} placeholder="Color, instrucciones…"/>
            {(() => {
              const pr = getPrenda(nPed.prenda);
              if (!pr) return null;
              return (
                <div style={{background:T.bgMuted,borderRadius:2,padding:"10px 14px",marginBottom:14,fontSize:12,display:"flex",gap:18,flexWrap:"wrap"}}>
                  <span style={{color:T.inkMid}}>Costo <strong style={{color:pr.c>0?T.ink:T.danger}}>{pr.c>0?fmt(pr.c):"sin precio"}</strong></span>
                  <span style={{color:T.inkMid}}>Precio <strong style={{color:pr.p>0?T.ink:T.danger}}>{pr.p>0?fmt(pr.p):"sin precio"}</strong></span>
                  {pr.c>0&&pr.p>0&&<span style={{color:T.ok}}>Margen <strong>{fmt((pr.p-pr.c)*+nPed.cantidad)}</strong></span>}
                  {pr.lana>0&&<span style={{color:T.tierra}}>Lana <strong>{pr.lana*+nPed.cantidad}g</strong></span>}
                </div>
              );
            })()}
            {getPrenda(nPed.prenda)?.p===0 && <div style={{background:T.warnLt,border:`1px solid ${T.warn}`,borderRadius:2,padding:"8px 12px",marginBottom:12,fontSize:12,color:T.warn}}>Esta prenda no tiene precio. Configuralo en Config → Catálogo.</div>}
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:`1px solid ${T.borderLt}`}}>
              <Btn onClick={() => setModal(null)}>Cancelar</Btn>
              <Btn variant="primary" onClick={crear} disabled={!nPed.cliente||!nPed.artesana}>Crear pedido</Btn>
            </div>
          </Ov>
        )}
      </div>
    );
  };

  // ── CLIENTES ───────────────────────────────────────────────────────────────
  const Clientes = () => {
    const [editC, setEditC] = useState(null);
    const openNew = () => { setEditC({id:Date.now(),nombre:"",tipo:"Particular",email:"",tel:"",ciudad:"",notas:"",descuento:0}); setModal("cli"); };
    const save = () => {
      if (clientes.find(x => x.id===editC.id)) sc(clientes.map(x => x.id===editC.id ? editC : x));
      else sc([...clientes, editC]);
      setModal(null);
    };
    return (
      <div>
        <SecTitle action={<Btn variant="primary" onClick={openNew}>+ Nuevo cliente</Btn>}>Clientes</SecTitle>
        {clientes.length===0 && <Empty icon="👥" title="Sin clientes" sub="Cargá tus primeros clientes: tiendas, revendedores, particulares." action={<Btn variant="primary" onClick={openNew}>+ Nuevo cliente</Btn>}/>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:12}}>
          {clientes.map(c => {
            const st = statsCliente(c.id);
            return (
              <Card key={c.id} style={{marginBottom:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                  <div><div style={{fontSize:15,fontWeight:500}}>{c.nombre}</div><div style={{fontSize:11,color:T.inkMid,marginTop:2}}>{c.tipo}{c.ciudad?` · ${c.ciudad}`:""}</div></div>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    {c.descuento>0 && <span style={{fontSize:10,padding:"2px 8px",borderRadius:99,background:T.okLt,color:T.ok}}>{c.descuento}% desc.</span>}
                    <Btn small onClick={() => { setEditC({...c}); setModal("cli"); }}>Editar</Btn>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
                  {[[st.ped.length,"Pedidos"],[fmt(st.total),"Total"],[fmt(st.saldo),"Saldo"]].map(([v,l]) => (
                    <div key={l} style={{background:T.bg,borderRadius:2,padding:"8px 10px"}}>
                      <div style={{fontSize:10,color:T.inkLt,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:3}}>{l}</div>
                      <div style={{fontSize:14,fontWeight:500,color:l==="Saldo"&&st.saldo>0?T.danger:T.ink}}>{v}</div>
                    </div>
                  ))}
                </div>
                {st.ped.slice(-3).reverse().map(p => (
                  <div key={p.id} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"5px 0",borderBottom:`1px solid ${T.borderLt}`}}>
                    <span>{p.prenda}{p.talle?` (${p.talle})`:""} ×{p.cantidad}</span>
                    <div style={{display:"flex",gap:8}}><Badge e={p.estado}/><span style={{color:T.inkMid}}>{p.fechaEntrega}</span></div>
                  </div>
                ))}
                {(c.email||c.tel) && <div style={{marginTop:8,fontSize:11,color:T.inkMid,borderTop:`1px solid ${T.borderLt}`,paddingTop:8}}>{c.email&&<div>{c.email}</div>}{c.tel&&<div>{c.tel}</div>}</div>}
              </Card>
            );
          })}
        </div>
        {modal==="cli" && editC && (
          <Ov onClose={() => setModal(null)}>
            <MTitle onClose={() => setModal(null)}>{clientes.find(x=>x.id===editC.id)?"Editar cliente":"Nuevo cliente"}</MTitle>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Inp label="Nombre" value={editC.nombre} onChange={e => setEditC({...editC,nombre:e.target.value})}/>
              <Sel label="Tipo" value={editC.tipo} onChange={e => setEditC({...editC,tipo:e.target.value})}>
                {["Revendedor","Exportación","Web","Feria","Particular"].map(t => <option key={t}>{t}</option>)}
              </Sel>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Inp label="Email" type="email" value={editC.email} onChange={e => setEditC({...editC,email:e.target.value})}/>
              <Inp label="Teléfono" value={editC.tel} onChange={e => setEditC({...editC,tel:e.target.value})}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Inp label="Ciudad" value={editC.ciudad} onChange={e => setEditC({...editC,ciudad:e.target.value})}/>
              <Inp label="Descuento %" type="number" min="0" max="50" value={editC.descuento} onChange={e => setEditC({...editC,descuento:+e.target.value})}/>
            </div>
            <Inp label="Notas" value={editC.notas} onChange={e => setEditC({...editC,notas:e.target.value})}/>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:`1px solid ${T.borderLt}`}}>
              <Btn onClick={() => setModal(null)}>Cancelar</Btn>
              <Btn variant="primary" disabled={!editC.nombre} onClick={save}>Guardar</Btn>
            </div>
          </Ov>
        )}
      </div>
    );
  };

  // ── ARTESANAS ──────────────────────────────────────────────────────────────
  const Artesanas = () => {
    const [editA, setEditA] = useState(null);
    const [fichaA, setFichaA] = useState(null);
    const toggle = (key, val) => setEditA(a => ({ ...a, [key]: a[key].includes(val) ? a[key].filter(x=>x!==val) : [...a[key],val] }));
    const emptyArt = { id:Date.now(), nombre:"", especialidad:"", tecnicas:[], prendas_habituales:[], disponible:true, lana_asignada:0, capacidad_semanal:2, notas:"" };
    const saveArt = () => {
      if (artesanas.find(x => x.id===editA.id)) sa(artesanas.map(x => x.id===editA.id ? editA : x));
      else sa([...artesanas, editA]);
      setModal(null);
    };
    return (
      <div>
        <SecTitle action={<Btn variant="primary" onClick={() => { setEditA({...emptyArt,id:Date.now()}); setModal("art_edit"); }}>+ Nueva artesana</Btn>}>Artesanas</SecTitle>
        {artesanas.length===0 && <Empty icon="🧶" title="Sin artesanas" sub="Cargá las artesanas que trabajan con Junco Verde." action={<Btn variant="primary" onClick={() => { setEditA({...emptyArt,id:Date.now()}); setModal("art_edit"); }}>+ Nueva artesana</Btn>}/>}
        {mob ? (
          <div>
            {artesanas.map(a => {
              const st = statsArt(a.id);
              const cap = capArt(a.id);
              return (
                <div key={a.id} style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:4,padding:"1rem",marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                    <div style={{display:"flex",gap:10,alignItems:"center"}}>
                      <div style={{width:36,height:36,borderRadius:"50%",background:a.disponible?T.greenLt:T.bgMuted,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:a.disponible?T.green:T.inkLt,fontWeight:500}}>{a.nombre[0]}</div>
                      <div><div style={{fontWeight:500,fontSize:14}}>{a.nombre}</div><div style={{fontSize:11,color:T.inkMid}}>{a.especialidad}</div></div>
                    </div>
                    <span style={{fontSize:10,padding:"2px 8px",borderRadius:99,background:a.disponible?T.okLt:T.warnLt,color:a.disponible?T.ok:T.warn}}>{a.disponible?"Disponible":"Ocupada"}</span>
                  </div>
                  <Bar pct={cap.pct} color={cap.pct>80?T.danger:cap.pct>50?T.warn:T.ok}/>
                  <div style={{display:"flex",gap:6,marginTop:10}}>
                    <Btn small onClick={() => { setFichaA(a); setModal("art_ficha"); }}>Ver ficha</Btn>
                    <Btn small onClick={() => { setEditA({...a,tecnicas:[...a.tecnicas],prendas_habituales:[...a.prendas_habituales]}); setModal("art_edit"); }}>Editar</Btn>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          artesanas.length > 0 && (
            <Card style={{padding:0,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr style={{background:T.bg}}><TH>Artesana</TH><TH>Especialidad</TH><TH>Lana asig.</TH><TH>Entregadas</TH><TH>Pend.</TH><TH>Valor</TH><TH>Capacidad</TH><TH>Estado</TH><TH></TH></tr></thead>
                <tbody>
                  {artesanas.map((a,i) => {
                    const st = statsArt(a.id);
                    const cap = capArt(a.id);
                    return (
                      <tr key={a.id} style={{background:i%2===0?T.bgCard:T.bg}}>
                        <TD><strong style={{fontWeight:500}}>{a.nombre}</strong></TD>
                        <TD style={{color:T.inkMid,fontSize:12}}>{a.especialidad}</TD>
                        <TD style={{color:(a.lana_asignada||0)>4000?T.warn:T.ink}}>{(a.lana_asignada||0).toLocaleString()}g</TD>
                        <TD><strong style={{fontWeight:500}}>{st.totalPrendas}</strong></TD>
                        <TD style={{color:st.pendPrendas>0?T.info:T.inkLt}}>{st.pendPrendas}</TD>
                        <TD style={{color:T.ok}}>{fmt(st.totalValor)}</TD>
                        <TD style={{minWidth:100}}><div style={{fontSize:11}}>{cap.ocupada}/{cap.cap}</div><Bar pct={cap.pct} color={cap.pct>80?T.danger:cap.pct>50?T.warn:T.ok}/></TD>
                        <TD><span style={{fontSize:10,padding:"2px 8px",borderRadius:99,background:a.disponible?T.okLt:T.warnLt,color:a.disponible?T.ok:T.warn}}>{a.disponible?"Disponible":"Ocupada"}</span></TD>
                        <TD>
                          <div style={{display:"flex",gap:4}}>
                            <Btn small onClick={() => { setFichaA(a); setModal("art_ficha"); }}>Ficha</Btn>
                            <Btn small onClick={() => { setEditA({...a,tecnicas:[...a.tecnicas],prendas_habituales:[...a.prendas_habituales]}); setModal("art_edit"); }}>Editar</Btn>
                          </div>
                        </TD>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )
        )}
        {modal==="art_ficha" && fichaA && <FichaArtesana a={fichaA} statsArt={statsArt} capArt={capArt} onClose={() => setModal(null)}/>}
        {modal==="art_edit" && editA && (
          <Ov onClose={() => setModal(null)}>
            <MTitle onClose={() => setModal(null)}>{artesanas.find(x=>x.id===editA.id)?"Editar":"Nueva artesana"}</MTitle>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Inp label="Nombre" value={editA.nombre} onChange={e => setEditA({...editA,nombre:e.target.value})}/>
              <Inp label="Especialidad" value={editA.especialidad} onChange={e => setEditA({...editA,especialidad:e.target.value})}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
              <Inp label="Lana asignada (g)" type="number" value={editA.lana_asignada||0} onChange={e => setEditA({...editA,lana_asignada:+e.target.value})}/>
              <Inp label="Cap. semanal" type="number" min="1" value={editA.capacidad_semanal} onChange={e => setEditA({...editA,capacidad_semanal:+e.target.value})}/>
              <Sel label="Estado" value={editA.disponible?"1":"0"} onChange={e => setEditA({...editA,disponible:e.target.value==="1"})}>
                <option value="1">Disponible</option><option value="0">Ocupada</option>
              </Sel>
            </div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,color:T.inkMid,marginBottom:6}}>Técnicas</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {TECNICAS.map(t => <span key={t} onClick={() => toggle("tecnicas",t)} style={{padding:"4px 12px",borderRadius:99,fontSize:12,cursor:"pointer",background:editA.tecnicas.includes(t)?T.violetLt:"transparent",color:editA.tecnicas.includes(t)?T.violet:T.inkMid,border:`1px solid ${editA.tecnicas.includes(t)?T.violet:T.border}`}}>{t}</span>)}
              </div>
            </div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,color:T.inkMid,marginBottom:6}}>Prendas que teje</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5,maxHeight:120,overflowY:"auto"}}>
                {TODAS().map(p => <span key={p.n} onClick={() => toggle("prendas_habituales",p.n)} style={{padding:"3px 9px",borderRadius:99,fontSize:11,cursor:"pointer",background:editA.prendas_habituales.includes(p.n)?T.greenLt:"transparent",color:editA.prendas_habituales.includes(p.n)?T.green:T.inkMid,border:`1px solid ${editA.prendas_habituales.includes(p.n)?T.green:T.border}`}}>{p.n}</span>)}
              </div>
            </div>
            <Inp label="Notas" value={editA.notas} onChange={e => setEditA({...editA,notas:e.target.value})}/>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:`1px solid ${T.borderLt}`}}>
              <Btn onClick={() => setModal(null)}>Cancelar</Btn>
              {artesanas.find(x=>x.id===editA.id) && <Btn variant="danger" onClick={() => { sa(artesanas.filter(x=>x.id!==editA.id)); setModal(null); }}>Eliminar</Btn>}
              <Btn variant="primary" disabled={!editA.nombre} onClick={saveArt}>Guardar</Btn>
            </div>
          </Ov>
        )}
      </div>
    );
  };

  // ── PAGOS ARTESANAS ────────────────────────────────────────────────────────
  const PagosArt = () => {
    const [filtA2, setFiltA2] = useState("Todas");
    const [filtMes, setFiltMes] = useState("Todos");
    const [mp, setMp] = useState(false);
    const [nPago, setNPago] = useState({ artesana:artesanas[0]?.nombre||"", pedidoId:"", monto:0, fecha:hoy(), concepto:"Prendas entregadas", metodo:"Transferencia", notas:"" });
    const meses = [...new Set(pagosArt.map(p => p.fecha?.slice(0,7)).filter(Boolean))].sort().reverse();
    const pfilt = pagosArt.filter(p => (filtA2==="Todas"||p.artesana===filtA2) && (filtMes==="Todos"||p.fecha?.startsWith(filtMes)));
    const totMOG = artesanas.reduce((a,x) => a + resumenArtPago(x.nombre).totalMO, 0);
    const totPagG = artesanas.reduce((a,x) => a + resumenArtPago(x.nombre).totalPag, 0);
    const totPendG = artesanas.reduce((a,x) => a + resumenArtPago(x.nombre).pendiente, 0);
    const abrirPago = art => {
      const ped = pedidos.filter(p => p.artesana===art.nombre && p.estado==="Entregado");
      const ul = ped[ped.length-1];
      setNPago({ artesana:art.nombre, pedidoId:ul?.id||"", monto:ul?moSugerida(ul):0, fecha:hoy(), concepto:"Prendas entregadas", metodo:"Transferencia", notas:"" });
      setMp(true);
    };
    const registrar = () => { spa([...pagosArt, {...nPago, id:Date.now(), monto:+nPago.monto}]); setMp(false); };

    if (artesanas.length===0) return <div><SecTitle>Pagos a artesanas</SecTitle><Empty icon="💚" title="Sin artesanas" sub="Cargá artesanas primero." action={<Btn variant="primary" onClick={() => setTab("artesanas")}>Ir a Artesanas</Btn>}/></div>;

    return (
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24,paddingBottom:12,borderBottom:`1px solid ${T.borderLt}`}}>
          <div><div style={{fontSize:11,color:T.inkLt,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>Comercio justo</div><div style={{fontSize:22,fontWeight:300}}>Pagos a artesanas</div></div>
          <Btn variant="primary" onClick={() => { setNPago({artesana:artesanas[0]?.nombre||"",pedidoId:"",monto:0,fecha:hoy(),concepto:"Prendas entregadas",metodo:"Transferencia",notas:""}); setMp(true); }}>+ Registrar pago</Btn>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:24}}>
          <Met label="M.O. estimada" value={fmt(totMOG)}/>
          <Met label="Total pagado" value={fmt(totPagG)} accent={T.ok}/>
          <Met label="Pendiente" value={fmt(totPendG)} accent={totPendG>0?T.warn:T.ok}/>
          <Met label="Pagos registrados" value={pagosArt.length}/>
        </div>
        {mob ? (
          <div style={{marginBottom:16}}>
            {artesanas.map(a => {
              const r = resumenArtPago(a.nombre);
              const pct = r.totalMO>0 ? Math.min(100,Math.round(r.totalPag/r.totalMO*100)) : 100;
              return (
                <div key={a.id} style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:4,padding:"1rem",marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                    <div><div style={{fontWeight:500,fontSize:14}}>{a.nombre}</div><div style={{fontSize:11,color:T.inkMid}}>{a.especialidad}</div></div>
                    <Btn small variant={r.pendiente>0?"primary":"ghost"} onClick={() => abrirPago(a)}>{r.pendiente>0?"Pagar":"+ Pago"}</Btn>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8}}>
                    {[[fmt(r.totalMO),"M.O."],[fmt(r.totalPag),"Pagado"],[r.pendiente>0?fmt(r.pendiente):"✓ Al día","Pend."]].map(([v,l],i) => (
                      <div key={l} style={{background:T.bg,borderRadius:2,padding:"6px 8px"}}><div style={{fontSize:10,color:T.inkLt,textTransform:"uppercase",marginBottom:2}}>{l}</div><div style={{fontSize:12,fontWeight:500,color:i===2&&r.pendiente>0?T.warn:i===2?T.ok:T.ink}}>{v}</div></div>
                    ))}
                  </div>
                  <Bar pct={pct} color={pct===100?T.ok:pct>50?T.green:T.warn}/>
                </div>
              );
            })}
          </div>
        ) : (
          <Card style={{marginBottom:16}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr style={{background:T.bg}}><TH>Artesana</TH><TH>Especialidad</TH><TH>Prendas entregadas</TH><TH>M.O. estimada</TH><TH>Pagado</TH><TH>Pendiente</TH><TH></TH></tr></thead>
              <tbody>
                {artesanas.map((a,i) => {
                  const r = resumenArtPago(a.nombre);
                  const pct = r.totalMO>0 ? Math.min(100,Math.round(r.totalPag/r.totalMO*100)) : 100;
                  return (
                    <tr key={a.id} style={{background:i%2===0?T.bgCard:T.bg}}>
                      <TD><strong style={{fontWeight:500}}>{a.nombre}</strong></TD>
                      <TD style={{color:T.inkMid,fontSize:12}}>{a.especialidad}</TD>
                      <TD>{r.entg.length} pedidos · {r.entg.reduce((s,p)=>s+p.cantidad,0)} prendas</TD>
                      <TD style={{fontWeight:500}}>{fmt(r.totalMO)}</TD>
                      <TD><span style={{color:T.ok,fontWeight:500}}>{fmt(r.totalPag)}</span><Bar pct={pct} color={pct===100?T.ok:pct>50?T.green:T.warn}/></TD>
                      <TD><span style={{fontWeight:500,color:r.pendiente>0?T.warn:T.ok}}>{r.pendiente>0?fmt(r.pendiente):"✓ Al día"}</span></TD>
                      <TD><Btn small variant={r.pendiente>0?"primary":"ghost"} onClick={() => abrirPago(a)}>{r.pendiente>0?"Pagar":"+ Pago"}</Btn></TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
          {["Todas",...artesanas.map(a=>a.nombre)].map(a => <Pill key={a} active={filtA2===a} onClick={() => setFiltA2(a)} color={T.tierra}>{a}</Pill>)}
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
          {["Todos",...meses].map(m => <Pill key={m} active={filtMes===m} onClick={() => setFiltMes(m)}>{m==="Todos"?"Todos los meses":m}</Pill>)}
        </div>
        <Card style={{padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{background:T.bg}}><TH>Fecha</TH><TH>Artesana</TH><TH>Concepto</TH><TH>Método</TH><TH>Monto</TH><TH>Notas</TH><TH></TH></tr></thead>
            <tbody>
              {pfilt.length===0 && <tr><td colSpan={7} style={{padding:"2rem",textAlign:"center",color:T.inkLt,fontSize:13}}>Sin pagos registrados aún.</td></tr>}
              {pfilt.slice().reverse().map((p,i) => (
                <tr key={p.id} style={{background:i%2===0?T.bgCard:T.bg}}>
                  <TD style={{fontSize:12,color:T.inkMid}}>{p.fecha}</TD>
                  <TD><strong style={{fontWeight:500}}>{p.artesana}</strong></TD>
                  <TD style={{fontSize:12}}>{p.concepto}</TD>
                  <TD><span style={{fontSize:11,padding:"2px 8px",borderRadius:99,background:T.infoLt,color:T.info}}>{p.metodo}</span></TD>
                  <TD><strong style={{fontWeight:500,color:T.ok}}>{fmt(p.monto)}</strong></TD>
                  <TD style={{fontSize:11,color:T.inkMid}}>{p.notas||"—"}</TD>
                  <TD><Btn small onClick={() => spa(pagosArt.filter(x=>x.id!==p.id))}>✕</Btn></TD>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        {mp && (
          <Ov onClose={() => setMp(false)}>
            <MTitle onClose={() => setMp(false)}>Registrar pago a artesana</MTitle>
            <Sel label="Artesana" value={nPago.artesana} onChange={e => {
              const ped = pedidos.filter(p => p.artesana===e.target.value && p.estado==="Entregado");
              const ul = ped[ped.length-1];
              setNPago({...nPago, artesana:e.target.value, pedidoId:ul?.id||"", monto:ul?moSugerida(ul):0});
            }}>
              {artesanas.map(a => <option key={a.id}>{a.nombre}</option>)}
            </Sel>
            {(() => {
              const r = resumenArtPago(nPago.artesana);
              if (!r.totalMO) return null;
              return <div style={{background:T.bgMuted,borderRadius:2,padding:"10px 14px",marginBottom:14,fontSize:12,display:"flex",gap:16,flexWrap:"wrap"}}><span>M.O. est. <strong>{fmt(r.totalMO)}</strong></span><span style={{color:T.ok}}>Pagado <strong>{fmt(r.totalPag)}</strong></span><span style={{color:r.pendiente>0?T.warn:T.ok}}>Pend. <strong>{fmt(r.pendiente)}</strong></span></div>;
            })()}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Inp label="Monto ($)" type="number" min="0" value={nPago.monto} onChange={e => setNPago({...nPago,monto:e.target.value})}/>
              <Inp label="Fecha" type="date" value={nPago.fecha} onChange={e => setNPago({...nPago,fecha:e.target.value})}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Sel label="Concepto" value={nPago.concepto} onChange={e => setNPago({...nPago,concepto:e.target.value})}>
                {["Prendas entregadas","Mano de obra","Anticipo","Aguinaldo","Bonificación","Otro"].map(c => <option key={c}>{c}</option>)}
              </Sel>
              <Sel label="Método" value={nPago.metodo} onChange={e => setNPago({...nPago,metodo:e.target.value})}>
                {["Transferencia","Efectivo","MercadoPago","Redpagos","Cheque","Otro"].map(m => <option key={m}>{m}</option>)}
              </Sel>
            </div>
            <Inp label="Notas" value={nPago.notas} onChange={e => setNPago({...nPago,notas:e.target.value})} placeholder="Ej: pago quincenal…"/>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:`1px solid ${T.borderLt}`}}>
              <Btn onClick={() => setMp(false)}>Cancelar</Btn>
              <Btn variant="primary" disabled={!nPago.artesana||!nPago.monto} onClick={registrar}>Registrar pago</Btn>
            </div>
          </Ov>
        )}
      </div>
    );
  };

  // ── PLANIFICACIÓN ──────────────────────────────────────────────────────────
  const Planif = () => {
    const todasPrendas = TODAS();
    const [simCant, setSimCant] = useState(1);
    const [simPrenda, setSimPrenda] = useState(todasPrendas[0]?.n||"");
    const pr = getPrenda(simPrenda);
    const lanaTotal = lanas.reduce((a,l) => a+l.stock, 0);
    const lanaNec = (pr?.lana||0)*simCant;
    if (artesanas.length===0) return <div><SecTitle>Producción</SecTitle><Empty icon="📅" title="Sin artesanas" sub="Cargá artesanas para planificar." action={<Btn variant="primary" onClick={() => setTab("artesanas")}>Ir a Artesanas</Btn>}/></div>;
    return (
      <div>
        <SecTitle>Planificación de producción</SecTitle>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10,marginBottom:24}}>
          {artesanas.map(a => {
            const cap = capArt(a.id);
            return (
              <div key={a.id} style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:4,padding:"1rem"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:13,fontWeight:500}}>{a.nombre}</span><span style={{fontSize:10,padding:"2px 8px",borderRadius:99,background:a.disponible?T.okLt:T.warnLt,color:a.disponible?T.ok:T.warn}}>{a.disponible?"Disp.":"Ocupada"}</span></div>
                <div style={{fontSize:11,color:T.inkMid,marginBottom:8}}>{a.especialidad}</div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}><span style={{color:T.inkMid}}>En producción</span><span style={{fontWeight:500}}>{cap.ocupada}/{cap.cap}</span></div>
                <Bar pct={cap.pct} color={cap.pct>80?T.danger:cap.pct>50?T.warn:T.ok}/>
                <div style={{marginTop:8,fontSize:11,color:cap.libre>0?T.ok:T.danger}}>{cap.libre>0?`${cap.libre} libres`:"Sin capacidad"}</div>
              </div>
            );
          })}
        </div>
        <Card>
          <div style={{fontSize:11,color:T.inkMid,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:12}}>Simulador</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            <Sel label="Prenda" value={simPrenda} onChange={e => setSimPrenda(e.target.value)}>
              {Object.entries(CAT_DATA).map(([cat,items]) => <optgroup key={cat} label={cat}>{items.map(p => <option key={p.n} value={p.n}>{p.n}</option>)}</optgroup>)}
            </Sel>
            <Inp label="Cantidad" type="number" min="1" value={simCant} onChange={e => setSimCant(+e.target.value)}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
            {[[fmt((pr?.p||0)*simCant),"Venta",T.green],[fmt((pr?.c||0)*simCant),"Costo",T.ink],[fmt(((pr?.p||0)-(pr?.c||0))*simCant),"Margen",T.ok],[lanaNec.toLocaleString()+"g","Lana",lanaNec>lanaTotal&&lanaTotal>0?T.danger:T.tierra],[(cfg.tiemposProd[simPrenda]||14)+"d","Tiempo",T.info]].map(([v,l,col]) => (
              <div key={l} style={{background:T.bg,borderRadius:2,padding:"10px 12px"}}><div style={{fontSize:10,color:T.inkLt,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{l}</div><div style={{fontSize:16,fontWeight:500,color:col}}>{v}</div></div>
            ))}
          </div>
        </Card>
        {activos.length > 0 && (
          <Card>
            <div style={{fontSize:11,color:T.inkMid,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:16}}>Próximas entregas</div>
            {[...activos].sort((a,b) => new Date(a.fechaEntrega)-new Date(b.fechaEntrega)).map(p => {
              const d = diasHasta(p.fechaEntrega);
              const pct = Math.max(0,Math.min(100,Math.round((1-d/30)*100)));
              return (
                <div key={p.id} style={{marginBottom:12,paddingBottom:12,borderBottom:`1px solid ${T.borderLt}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13}}><strong>{p.prenda}</strong> ×{p.cantidad} — {p.cliente} — {p.artesana}</span><span style={{fontSize:12,fontWeight:500,color:d<0?T.danger:d<=3?T.warn:T.inkMid,whiteSpace:"nowrap",marginLeft:8}}>{d<0?`${Math.abs(d)}d vencido`:`${d}d`}</span></div>
                  <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{flex:1,height:4,background:T.bgDeep,borderRadius:99}}><div style={{height:4,width:`${pct}%`,background:d<0?T.danger:d<=3?T.warn:T.green,borderRadius:99}}/></div><Badge e={p.estado}/></div>
                </div>
              );
            })}
          </Card>
        )}
      </div>
    );
  };

  // ── ANÁLISIS ───────────────────────────────────────────────────────────────
  const Analisis = () => {
    const [sec, setSec] = useState("financiero");
    const vT = pedidos.reduce((a,p) => { const pr=getPrenda(p.prenda); return a+(pr?.p||0)*p.cantidad; }, 0);
    const cT = pedidos.reduce((a,p) => { const pr=getPrenda(p.prenda); return a+(pr?.c||0)*p.cantidad; }, 0);
    const maxV = Math.max(...finanzasMes.map(m=>m.venta),1);
    const vporCli = clientes.map(c => { const st=statsCliente(c.id); return {nombre:c.nombre,total:st.total}; }).sort((a,b)=>b.total-a.total);
    const maxCli = Math.max(...vporCli.map(c=>c.total),1);
    const pedEnt = pedidos.filter(p=>p.estado==="Entregado");
    const pedAct = pedidos.filter(p=>p.estado!=="Entregado");
    const venc = pedAct.filter(p=>diasHasta(p.fechaEntrega)<0);
    const riesgo = pedAct.filter(p=>{ const d=diasHasta(p.fechaEntrega); return d>=0&&d<=5; });
    const tasaG = pedidos.length ? Math.round(pedEnt.length/pedidos.length*100) : 0;
    const SECS = [{id:"financiero",l:"Financiero"},{id:"artesanas",l:"Artesanas"},{id:"expedicion",l:"Expedición"}];
    if (pedidos.length===0) return <div><SecTitle>Análisis</SecTitle><Empty icon="📊" title="Sin datos" sub="El análisis se construye a medida que cargás pedidos."/></div>;
    return (
      <div>
        <SecTitle>Análisis</SecTitle>
        <div style={{display:"flex",gap:8,marginBottom:28}}>
          {SECS.map(s => <button key={s.id} onClick={() => setSec(s.id)} style={{padding:"7px 18px",borderRadius:2,border:`1px solid ${sec===s.id?T.green:T.border}`,background:sec===s.id?T.greenLt:"transparent",color:sec===s.id?T.green:T.inkMid,cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:sec===s.id?500:400}}>{s.l}</button>)}
        </div>
        {sec==="financiero" && (
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:12,marginBottom:24}}>
              <Met label="Venta histórica" value={fmt(vT)} accent={T.green}/>
              <Met label="Costo total" value={fmt(cT)}/>
              <Met label="Margen" value={fmt(vT-cT)} accent={T.ok} sub={`${Math.round((vT-cT)/Math.max(vT,1)*100)}%`}/>
              <Met label="Ticket promedio" value={fmt(pedidos.length?vT/pedidos.length:0)}/>
              <Met label="Prendas" value={pedidos.reduce((a,p)=>a+p.cantidad,0)}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
              <Card style={{marginBottom:0}}>
                <div style={{fontSize:11,color:T.inkMid,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:16}}>Evolución mensual</div>
                {finanzasMes.length===0 && <span style={{fontSize:12,color:T.inkLt}}>Sin pedidos entregados aún.</span>}
                {finanzasMes.map(m => (
                  <div key={m.mes} style={{marginBottom:14}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:12}}><span style={{color:T.inkMid}}>{m.mes}</span><span style={{color:T.green,fontWeight:500}}>{fmt(m.venta)}</span></div>
                    <div style={{height:8,background:T.bgDeep,borderRadius:99,marginBottom:3,overflow:"hidden"}}><div style={{height:8,width:`${Math.round(m.venta/maxV*100)}%`,background:T.green,borderRadius:99}}/></div>
                    <div style={{height:4,background:T.bgDeep,borderRadius:99,overflow:"hidden"}}><div style={{height:4,width:`${Math.round(m.costo/maxV*100)}%`,background:T.tierra,borderRadius:99,opacity:0.7}}/></div>
                  </div>
                ))}
              </Card>
              <Card style={{marginBottom:0}}>
                <div style={{fontSize:11,color:T.inkMid,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:16}}>Ventas por cliente</div>
                {vporCli.filter(c=>c.total>0).map(c => (
                  <div key={c.nombre} style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3,fontSize:12}}><span>{c.nombre}</span><span style={{fontWeight:500,color:T.green}}>{fmt(c.total)}</span></div>
                    <Bar pct={Math.round(c.total/maxCli*100)} color={T.green}/>
                  </div>
                ))}
                {vporCli.filter(c=>c.total>0).length===0 && <span style={{fontSize:12,color:T.inkLt}}>Sin ventas aún.</span>}
              </Card>
            </div>
            {topPrendas.length > 0 && (
              <Card>
                <div style={{fontSize:11,color:T.inkMid,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:16}}>Prendas por rentabilidad</div>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead><tr style={{background:T.bg}}><TH>Prenda</TH><TH>Unidades</TH><TH>Venta</TH><TH>Margen unit.</TH><TH>Margen %</TH></tr></thead>
                  <tbody>
                    {topPrendas.map((p,i) => {
                      const pr = getPrenda(p.n);
                      const mg = (pr?.p||0)-(pr?.c||0);
                      const mgp = pr?.p ? Math.round(mg/pr.p*100) : 0;
                      return (
                        <tr key={p.n} style={{background:i%2===0?T.bgCard:T.bg}}>
                          <TD><strong style={{fontWeight:500}}>{p.n}</strong></TD>
                          <TD style={{fontWeight:500}}>{p.qty}</TD>
                          <TD style={{color:T.green,fontWeight:500}}>{fmt(p.venta)}</TD>
                          <TD style={{color:T.ok}}>{fmt(mg)}</TD>
                          <TD><span style={{padding:"2px 8px",borderRadius:99,background:mgp>60?T.okLt:mgp>40?T.warnLt:T.dangerLt,color:mgp>60?T.ok:mgp>40?T.warn:T.danger,fontSize:11,fontWeight:500}}>{mgp}%</span></TD>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        )}
        {sec==="artesanas" && (
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:12,marginBottom:24}}>
              <Met label="Artesanas" value={artesanas.length}/>
              <Met label="Disponibles" value={artesanas.filter(a=>a.disponible).length} accent={T.ok}/>
              <Met label="Prendas entregadas" value={pedEnt.reduce((a,p)=>a+p.cantidad,0)} accent={T.green}/>
              <Met label="Valor producido" value={fmt(pedEnt.reduce((a,p)=>{ const pr=getPrenda(p.prenda); return a+(pr?.p||0)*p.cantidad; },0))} accent={T.green}/>
            </div>
            <Card>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr style={{background:T.bg}}><TH>#</TH><TH>Artesana</TH><TH>Especialidad</TH><TH>Prendas</TH><TH>Valor</TH><TH>Pedidos</TH><TH>Tasa</TH><TH>Pend.</TH></tr></thead>
                <tbody>
                  {artesanas.map((a,i) => {
                    const st = statsArt(a.id);
                    const maxP = Math.max(...artesanas.map(x=>statsArt(x.id).totalPrendas),1);
                    return (
                      <tr key={a.id} style={{background:i%2===0?T.bgCard:T.bg}}>
                        <TD><span style={{fontSize:10,width:18,height:18,borderRadius:"50%",background:i===0?T.greenLt:T.bgMuted,color:i===0?T.green:T.inkLt,display:"inline-flex",alignItems:"center",justifyContent:"center",fontWeight:500}}>{i+1}</span></TD>
                        <TD><strong style={{fontWeight:500}}>{a.nombre}</strong></TD>
                        <TD style={{color:T.inkMid,fontSize:12}}>{a.especialidad}</TD>
                        <TD><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{flex:1,height:4,background:T.bgDeep,borderRadius:99,minWidth:60}}><div style={{height:4,width:`${Math.round(st.totalPrendas/maxP*100)}%`,background:T.green,borderRadius:99}}/></div><span style={{fontWeight:500}}>{st.totalPrendas}</span></div></TD>
                        <TD style={{color:T.ok,fontWeight:500}}>{fmt(st.totalValor)}</TD>
                        <TD style={{color:T.inkMid}}>{st.ped.length}</TD>
                        <TD><div style={{width:32,height:32,borderRadius:"50%",background:st.tasaEntrega>=80?T.okLt:st.tasaEntrega>=50?T.warnLt:T.dangerLt,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:500,color:st.tasaEntrega>=80?T.ok:st.tasaEntrega>=50?T.warn:T.danger}}>{st.tasaEntrega}%</div></TD>
                        <TD style={{color:st.pendPrendas>0?T.info:T.inkLt}}>{st.pendPrendas}</TD>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </div>
        )}
        {sec==="expedicion" && (
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:12,marginBottom:24}}>
              <Met label="Tasa de entrega" value={`${tasaG}%`} accent={tasaG>=80?T.ok:tasaG>=50?T.warn:T.danger}/>
              <Met label="Entregados" value={pedEnt.length} accent={T.ok}/>
              <Met label="Vencidos" value={venc.length} accent={venc.length>0?T.danger:T.ok}/>
              <Met label="En riesgo (≤5d)" value={riesgo.length} accent={riesgo.length>0?T.warn:T.ok}/>
              <Met label="Total pedidos" value={pedidos.length}/>
            </div>
            <Card>
              <div style={{fontSize:11,color:T.inkMid,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:16}}>Semáforo</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                {[{label:"Vencidos",items:venc,color:T.danger,bg:T.dangerLt},{label:"En riesgo (1–5d)",items:riesgo,color:T.warn,bg:T.warnLt},{label:"En tiempo (>5d)",items:pedAct.filter(p=>diasHasta(p.fechaEntrega)>5),color:T.ok,bg:T.okLt}].map(({label,items,color,bg}) => (
                  <div key={label} style={{background:bg,borderRadius:4,padding:"1rem 1.25rem",borderLeft:`3px solid ${color}`}}>
                    <div style={{fontSize:11,color,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6,fontWeight:500}}>{label}</div>
                    <div style={{fontSize:32,fontWeight:300,color,letterSpacing:"-1px",marginBottom:8}}>{items.length}</div>
                    {items.slice(0,3).map(p => {
                      const d = diasHasta(p.fechaEntrega);
                      return <div key={p.id} style={{fontSize:11,color,padding:"3px 0",borderBottom:`1px solid rgba(0,0,0,0.06)`}}>{p.prenda} — {p.artesana}<span style={{float:"right",fontWeight:500}}>{d<0?`${Math.abs(d)}d venc.`:`${d}d`}</span></div>;
                    })}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  };

  // ── STOCK PRENDAS ──────────────────────────────────────────────────────────
  const StockPrendas = () => {
    const [addM, setAddM] = useState(false);
    const [ns, setNs] = useState({ prenda:TODAS()[0]?.n||"", qty:1 });
    const filt = stockP.filter(s => s.prenda.toLowerCase().includes(busqP.toLowerCase()));
    return (
      <div>
        <SecTitle action={<Btn variant="primary" onClick={() => setAddM(true)}>+ Agregar</Btn>}>Stock de prendas</SecTitle>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:12,marginBottom:20}}>
          <Met label="Unidades" value={stockP.reduce((a,s)=>a+s.qty,0)}/>
          <Met label="Sin stock" value={stockP.filter(s=>s.qty===0).length} accent={T.danger}/>
          <Met label="Stock bajo" value={stockP.filter(s=>s.qty<=cfg.stockMinimoDefault&&s.qty>0).length} accent={T.warn}/>
          <Met label="Valor total" value={fmt(stockP.reduce((a,s)=>a+s.precio*s.qty,0))} accent={T.green}/>
        </div>
        {stockP.length===0 && <Empty icon="👗" title="Sin stock" sub="El stock se genera al marcar pedidos como Entregados, o podés agregar manualmente." action={<Btn variant="primary" onClick={() => setAddM(true)}>+ Agregar</Btn>}/>}
        {stockP.length > 0 && (
          <>
            <div style={{marginBottom:16}}><input value={busqP} onChange={e => setBusqP(e.target.value)} placeholder="Buscar…" style={{padding:"8px 14px",border:`1px solid ${T.border}`,borderRadius:2,background:T.bgCard,color:T.ink,fontSize:13,width:260,outline:"none",fontFamily:"inherit"}}/></div>
            <Card style={{padding:0,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr style={{background:T.bg}}><TH>Prenda</TH><TH>Cat.</TH><TH>Stock</TH><TH>Costo</TH><TH>Precio</TH><TH>Margen</TH><TH>Valor</TH></tr></thead>
                <tbody>
                  {filt.map((s,i) => {
                    const mg = s.precio>0 ? Math.round((s.precio-s.costo)/s.precio*100) : 0;
                    return (
                      <tr key={s.id} style={{background:s.qty===0?T.dangerLt:i%2===0?T.bgCard:T.bg}}>
                        <TD><strong style={{fontWeight:500}}>{s.prenda}</strong></TD>
                        <TD style={{color:T.inkMid,fontSize:11}}>{s.cat}</TD>
                        <TD>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <button onClick={() => ss(stockP.map(x=>x.id===s.id?{...x,qty:Math.max(0,x.qty-1)}:x))} style={{width:22,height:22,borderRadius:2,border:`1px solid ${T.border}`,background:T.bgCard,cursor:"pointer",color:T.ink,fontSize:14,fontFamily:"inherit"}}>−</button>
                            <span style={{fontWeight:500,color:s.qty===0?T.danger:s.qty<=cfg.stockMinimoDefault?T.warn:T.ink,minWidth:22,textAlign:"center"}}>{s.qty}</span>
                            <button onClick={() => ss(stockP.map(x=>x.id===s.id?{...x,qty:x.qty+1}:x))} style={{width:22,height:22,borderRadius:2,border:`1px solid ${T.border}`,background:T.bgCard,cursor:"pointer",color:T.ink,fontSize:14,fontFamily:"inherit"}}>+</button>
                          </div>
                        </TD>
                        <TD style={{color:T.inkMid}}>{fmt(s.costo)}</TD>
                        <TD><strong style={{fontWeight:500}}>{fmt(s.precio)}</strong></TD>
                        <TD><span style={{color:mg>=cfg.margenMinimoAlerta?T.ok:T.danger}}>{mg}%</span></TD>
                        <TD>{fmt(s.precio*s.qty)}</TD>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </>
        )}
        {addM && (
          <Ov onClose={() => setAddM(false)}>
            <MTitle onClose={() => setAddM(false)}>Agregar stock</MTitle>
            <Sel label="Prenda" value={ns.prenda} onChange={e => setNs({...ns,prenda:e.target.value})}>
              {Object.entries(CAT_DATA).map(([cat,items]) => <optgroup key={cat} label={cat}>{items.map(p => <option key={p.n} value={p.n}>{p.n}</option>)}</optgroup>)}
            </Sel>
            <Inp label="Cantidad" type="number" min="1" value={ns.qty} onChange={e => setNs({...ns,qty:e.target.value})}/>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:`1px solid ${T.borderLt}`}}>
              <Btn onClick={() => setAddM(false)}>Cancelar</Btn>
              <Btn variant="primary" onClick={() => {
                const pr = getPrenda(ns.prenda);
                const ex = stockP.find(x => x.prenda===ns.prenda);
                if (ex) ss(stockP.map(x => x.prenda===ns.prenda ? {...x,qty:x.qty+ +ns.qty} : x));
                else ss([...stockP,{id:Date.now(),prenda:ns.prenda,cat:pr?.cat||"",qty:+ns.qty,costo:pr?.c||0,precio:pr?.p||0}]);
                setAddM(false);
              }}>Agregar</Btn>
            </div>
          </Ov>
        )}
      </div>
    );
  };

  // ── STOCK LANAS ────────────────────────────────────────────────────────────
  const Lanas = () => {
    const [addM, setAddM] = useState(false);
    const [nL, setNL] = useState({ tipo:"", color:"", proveedor:"", precio_kg:0, stock:0, minimo:1000 });
    return (
      <div>
        <SecTitle action={<Btn variant="primary" onClick={() => { setNL({tipo:"",color:"",proveedor:"",precio_kg:0,stock:0,minimo:1000}); setAddM(true); }}>+ Agregar lana</Btn>}>Stock de lanas</SecTitle>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:12,marginBottom:20}}>
          <Met label="Stock total" value={lanas.reduce((a,l)=>a+l.stock,0).toLocaleString()+"g"}/>
          <Met label="Bajo mínimo" value={lanasBajas.length} accent={lanasBajas.length>0?T.danger:T.ok}/>
          <Met label="Valor inventario" value={fmt(lanas.reduce((a,l)=>a+l.stock/1000*l.precio_kg,0))} accent={T.green}/>
        </div>
        {lanas.length===0 && <Empty icon="🧵" title="Sin lanas" sub="Cargá los tipos de lana con stock actual y mínimo de alerta." action={<Btn variant="primary" onClick={() => setAddM(true)}>+ Agregar lana</Btn>}/>}
        {lanas.length > 0 && (
          <Card style={{padding:0,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr style={{background:T.bg}}><TH>Tipo</TH><TH>Color</TH><TH>Stock</TH><TH>Mínimo</TH><TH>Estado</TH><TH>Proveedor</TH><TH>$/kg</TH><TH>Reponer</TH></tr></thead>
              <tbody>
                {lanas.map((l,i) => {
                  const baja = l.stock < l.minimo;
                  const pct = Math.min(100, Math.round(l.stock/l.minimo*100));
                  return (
                    <tr key={l.id} style={{background:baja?T.warnLt:i%2===0?T.bgCard:T.bg}}>
                      <TD><strong style={{fontWeight:500}}>{l.tipo}</strong></TD>
                      <TD style={{color:T.inkMid,fontSize:12}}>{l.color}</TD>
                      <TD style={{minWidth:120}}><span style={{fontWeight:500,color:baja?T.warn:T.ink}}>{l.stock.toLocaleString()}g</span><Bar pct={pct} color={baja?T.warn:T.ok}/></TD>
                      <TD style={{color:T.inkMid}}>{l.minimo.toLocaleString()}g</TD>
                      <TD><span style={{fontSize:10,padding:"2px 10px",borderRadius:99,background:baja?T.warnLt:T.okLt,color:baja?T.warn:T.ok}}>{baja?"Reponer":"OK"}</span></TD>
                      <TD style={{fontSize:12}}>{l.proveedor}</TD>
                      <TD style={{color:T.inkMid}}>{fmt(l.precio_kg)}</TD>
                      <TD>
                        <div style={{display:"flex",gap:6,alignItems:"center"}}>
                          <input type="number" min="0" defaultValue={500} id={`l${l.id}`} style={{width:70,padding:"5px 8px",border:`1px solid ${T.border}`,borderRadius:2,fontSize:12,background:T.bgCard,color:T.ink,fontFamily:"inherit"}}/>
                          <Btn small onClick={() => { const v = +document.getElementById(`l${l.id}`).value||0; sl(lanas.map(x=>x.id===l.id?{...x,stock:x.stock+v}:x)); }}>+g</Btn>
                          <Btn small onClick={() => sl(lanas.filter(x=>x.id!==l.id))}>✕</Btn>
                        </div>
                      </TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
        {addM && (
          <Ov onClose={() => setAddM(false)}>
            <MTitle onClose={() => setAddM(false)}>Agregar lana</MTitle>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Inp label="Tipo" value={nL.tipo} onChange={e => setNL({...nL,tipo:e.target.value})} placeholder="Merino Natural…"/>
              <Inp label="Color" value={nL.color} onChange={e => setNL({...nL,color:e.target.value})} placeholder="Crudo, Teñido…"/>
              <Inp label="Proveedor" value={nL.proveedor} onChange={e => setNL({...nL,proveedor:e.target.value})}/>
              <Inp label="Precio/kg ($)" type="number" min="0" value={nL.precio_kg} onChange={e => setNL({...nL,precio_kg:+e.target.value})}/>
              <Inp label="Stock actual (g)" type="number" min="0" value={nL.stock} onChange={e => setNL({...nL,stock:+e.target.value})}/>
              <Inp label="Stock mínimo (g)" type="number" min="0" value={nL.minimo} onChange={e => setNL({...nL,minimo:+e.target.value})}/>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:`1px solid ${T.borderLt}`}}>
              <Btn onClick={() => setAddM(false)}>Cancelar</Btn>
              <Btn variant="primary" disabled={!nL.tipo} onClick={() => { sl([...lanas,{...nL,id:Date.now()}]); setAddM(false); }}>Agregar</Btn>
            </div>
          </Ov>
        )}
      </div>
    );
  };

  // ── TALLES ─────────────────────────────────────────────────────────────────
  const Talles = () => {
    const [grupo, setGrupo] = useState("adultos");
    const [editIdx, setEditIdx] = useState(null);
    const [editRow, setEditRow] = useState(null);
    const [addM, setAddM] = useState(false);
    const [newRow, setNewRow] = useState({talle:"",busto:"",largo:"",manga:"",cintura:"",cadera:"",peso:"",lana:"",manoObra:""});
    const rows = talles[grupo] || [];
    const precioLanaKg = lanas.length ? Math.round(lanas.reduce((a,l)=>a+l.precio_kg,0)/lanas.length) : 3000;
    const costoEst = r => Math.round(((+r.lana||0)/1000)*precioLanaKg+(+r.manoObra||0));
    const startEdit = i => { setEditIdx(i); setEditRow({...rows[i]}); };
    const cancelEdit = () => { setEditIdx(null); setEditRow(null); };
    const saveEdit = () => {
      const toNum = v => v===""?null:+v;
      const upd = rows.map((r,i) => i===editIdx ? {...editRow,busto:toNum(editRow.busto),largo:toNum(editRow.largo),manga:toNum(editRow.manga),cintura:toNum(editRow.cintura),cadera:toNum(editRow.cadera),peso:+editRow.peso||0,lana:+editRow.lana||0,manoObra:+editRow.manoObra||0} : r);
      stl({...talles,[grupo]:upd}); cancelEdit();
    };
    const delRow = i => stl({...talles,[grupo]:rows.filter((_,j)=>j!==i)});
    const addRow = () => {
      const toNum = v => v===""?null:+v;
      const r = {talle:newRow.talle,busto:toNum(newRow.busto),largo:toNum(newRow.largo),manga:toNum(newRow.manga),cintura:toNum(newRow.cintura),cadera:toNum(newRow.cadera),peso:+newRow.peso||0,lana:+newRow.lana||0,manoObra:+newRow.manoObra||0};
      stl({...talles,[grupo]:[...rows,r]});
      setAddM(false);
      setNewRow({talle:"",busto:"",largo:"",manga:"",cintura:"",cadera:"",peso:"",lana:"",manoObra:""});
    };
    const ni = (val, onChange) => <input type="number" min="0" value={val??""} onChange={onChange} style={{padding:"5px 7px",border:`1px solid ${T.border}`,borderRadius:2,background:T.bgCard,color:T.ink,fontSize:12,fontFamily:"inherit",width:"100%",boxSizing:"border-box"}}/>;
    return (
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24,paddingBottom:12,borderBottom:`1px solid ${T.borderLt}`}}>
          <div><div style={{fontSize:11,color:T.inkLt,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>Producción</div><div style={{fontSize:22,fontWeight:300}}>Tabla de talles</div></div>
          <Btn variant="primary" onClick={() => setAddM(true)}>+ Agregar talle</Btn>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:24}}>
          {GRUPOS_TALLES.map(g => (
            <div key={g.id} onClick={() => { setGrupo(g.id); cancelEdit(); }} style={{background:grupo===g.id?T.green:T.bgCard,border:`1px solid ${grupo===g.id?T.green:T.border}`,borderRadius:4,padding:"1rem 1.25rem",cursor:"pointer"}}>
              <div style={{fontSize:14,fontWeight:500,color:grupo===g.id?"#fff":T.ink,marginBottom:3}}>{g.label}</div>
              <div style={{fontSize:11,color:grupo===g.id?"rgba(255,255,255,0.7)":T.inkLt}}>{g.sub}</div>
              <div style={{fontSize:12,color:grupo===g.id?"rgba(255,255,255,0.8)":T.inkMid,marginTop:6}}>{(talles[g.id]||[]).length} talles</div>
            </div>
          ))}
        </div>
        <Card style={{padding:0,overflow:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:820}}>
            <thead>
              <tr style={{background:T.bg}}>
                {COLS_TALLE.map(c => <th key={c.k} style={{textAlign:"left",padding:"10px 12px",borderBottom:`1px solid ${T.border}`,fontSize:11,fontWeight:500,letterSpacing:"0.05em",textTransform:"uppercase",color:T.inkLt,whiteSpace:"nowrap"}}>{c.label}{c.unit?<span style={{fontSize:9,color:T.inkLt,marginLeft:3}}>({c.unit})</span>:null}</th>)}
                <th style={{textAlign:"left",padding:"10px 12px",borderBottom:`1px solid ${T.border}`,fontSize:11,fontWeight:500,color:T.inkLt}}>Costo est.</th>
                <th style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`}}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r,i) => (
                <tr key={i} style={{background:editIdx===i?T.greenLt:i%2===0?T.bgCard:T.bg}}>
                  {editIdx===i ? (
                    <>
                      <td style={{padding:"8px 10px",borderBottom:`1px solid ${T.borderLt}`}}><input value={editRow.talle} onChange={e => setEditRow({...editRow,talle:e.target.value})} style={{padding:"5px 7px",border:`1px solid ${T.border}`,borderRadius:2,background:T.bgCard,color:T.ink,fontSize:12,fontFamily:"inherit",width:"100%",boxSizing:"border-box"}}/></td>
                      {["busto","largo","manga","cintura","cadera","peso","lana","manoObra"].map(k => <td key={k} style={{padding:"8px 10px",borderBottom:`1px solid ${T.borderLt}`}}>{ni(editRow[k], e => setEditRow({...editRow,[k]:e.target.value}))}</td>)}
                      <td style={{padding:"8px 10px",borderBottom:`1px solid ${T.borderLt}`}}><span style={{fontSize:12,color:T.ok,fontWeight:500}}>{fmt(costoEst({lana:+editRow.lana||0,manoObra:+editRow.manoObra||0}))}</span></td>
                      <td style={{padding:"8px 10px",borderBottom:`1px solid ${T.borderLt}`}}><div style={{display:"flex",gap:4}}><Btn small variant="primary" onClick={saveEdit}>✓</Btn><Btn small onClick={cancelEdit}>✕</Btn></div></td>
                    </>
                  ) : (
                    <>
                      <td style={{padding:"11px 12px",borderBottom:`1px solid ${T.borderLt}`}}><strong style={{fontWeight:500}}>{r.talle}</strong></td>
                      {["busto","largo","manga","cintura","cadera"].map(k => <td key={k} style={{padding:"11px 12px",borderBottom:`1px solid ${T.borderLt}`,color:r[k]==null?T.inkLt:T.inkMid}}>{r[k]!=null?r[k]:"—"}</td>)}
                      <td style={{padding:"11px 12px",borderBottom:`1px solid ${T.borderLt}`,color:T.inkMid}}>{r.peso}</td>
                      <td style={{padding:"11px 12px",borderBottom:`1px solid ${T.borderLt}`,color:T.info,fontWeight:500}}>{r.lana}g</td>
                      <td style={{padding:"11px 12px",borderBottom:`1px solid ${T.borderLt}`,color:r.manoObra>0?T.tierra:T.danger,fontWeight:500}}>{r.manoObra>0?fmt(r.manoObra):<span style={{fontSize:11}}>Pendiente</span>}</td>
                      <td style={{padding:"11px 12px",borderBottom:`1px solid ${T.borderLt}`}}>{r.manoObra>0?<span style={{background:T.okLt,color:T.ok,borderRadius:2,padding:"3px 10px",fontSize:12,fontWeight:500}}>{fmt(costoEst(r))}</span>:<span style={{fontSize:11,color:T.inkLt}}>—</span>}</td>
                      <td style={{padding:"11px 12px",borderBottom:`1px solid ${T.borderLt}`}}><div style={{display:"flex",gap:4}}><Btn small onClick={() => startEdit(i)}>Editar</Btn><Btn small onClick={() => delRow(i)}>✕</Btn></div></td>
                    </>
                  )}
                </tr>
              ))}
              {rows.length===0 && <tr><td colSpan={COLS_TALLE.length+2} style={{padding:"2rem",textAlign:"center",color:T.inkLt,fontSize:13}}>Sin talles. Agregá el primero.</td></tr>}
            </tbody>
          </table>
        </Card>
        {addM && (
          <Ov onClose={() => setAddM(false)}>
            <MTitle onClose={() => setAddM(false)}>Agregar talle — {GRUPOS_TALLES.find(g=>g.id===grupo)?.label}</MTitle>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Inp label="Talle" value={newRow.talle} onChange={e => setNewRow({...newRow,talle:e.target.value})} placeholder="Ej: M, 5-6 años"/>
              <Inp label="Peso (g)" type="number" min="0" value={newRow.peso} onChange={e => setNewRow({...newRow,peso:e.target.value})}/>
            </div>
            <div style={{fontSize:11,color:T.inkMid,marginBottom:10,marginTop:4,letterSpacing:"0.06em",textTransform:"uppercase"}}>Medidas (cm) — opcional</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              <Inp label="Busto" type="number" min="0" value={newRow.busto} onChange={e => setNewRow({...newRow,busto:e.target.value})}/>
              <Inp label="Largo" type="number" min="0" value={newRow.largo} onChange={e => setNewRow({...newRow,largo:e.target.value})}/>
              <Inp label="Manga" type="number" min="0" value={newRow.manga} onChange={e => setNewRow({...newRow,manga:e.target.value})}/>
              <Inp label="Cintura" type="number" min="0" value={newRow.cintura} onChange={e => setNewRow({...newRow,cintura:e.target.value})}/>
              <Inp label="Cadera" type="number" min="0" value={newRow.cadera} onChange={e => setNewRow({...newRow,cadera:e.target.value})}/>
            </div>
            <div style={{fontSize:11,color:T.inkMid,marginBottom:10,marginTop:4,letterSpacing:"0.06em",textTransform:"uppercase"}}>Costos</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Inp label="Lana necesaria (g)" type="number" min="0" value={newRow.lana} onChange={e => setNewRow({...newRow,lana:e.target.value})}/>
              <Inp label="Mano de obra ($)" type="number" min="0" value={newRow.manoObra} onChange={e => setNewRow({...newRow,manoObra:e.target.value})}/>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:`1px solid ${T.borderLt}`}}>
              <Btn onClick={() => setAddM(false)}>Cancelar</Btn>
              <Btn variant="primary" disabled={!newRow.talle} onClick={addRow}>Agregar</Btn>
            </div>
          </Ov>
        )}
      </div>
    );
  };

  // ── COMPROBANTES ───────────────────────────────────────────────────────────
  const Comprobantes = () => {
    const [vista, setVista] = useState("lista");
    const [selComp, setSelComp] = useState(null);
    const [filtTipo, setFiltTipo] = useState("Todos");
    const [filtPag, setFiltPag] = useState("Todos");
    const [editProv, setEditProv] = useState(null);
    const [imgB64, setImgB64] = useState(null);
    const [mime, setMime] = useState("image/jpeg");
    const [loading, setLoading] = useState(false);
    const [iaR, setIaR] = useState(null);
    const [iaErr, setIaErr] = useState(null);
    const iV = { descripcion:"", qty:1, precio_unit:0, iva:22, subtotal:0 };
    const cV = { tipo:"Factura compra", numero:"", fecha:hoy(), proveedor_cliente:"", items:[{...iV}], notas:"", pagado:false, subtotal:0, iva_total:0, total:0 };
    const [form, setForm] = useState(cV);
    const calcItem = it => ({...it, subtotal:Math.round(+it.qty * +it.precio_unit)});
    const recalc = items => { const sub=items.reduce((a,i)=>a+i.subtotal,0); const ivaT=items.reduce((a,i)=>a+Math.round(i.subtotal*(i.iva/100)),0); return {subtotal:sub,iva_total:ivaT,total:sub+ivaT}; };
    const updItem = (idx, key, val) => { const items=form.items.map((it,i)=>i!==idx?it:calcItem({...it,[key]:val})); setForm(f=>({...f,items,...recalc(items)})); };
    const updIaItem = (idx, key, val) => { const items=iaR.items.map((it,i)=>i!==idx?it:calcItem({...it,[key]:val})); setIaR(r=>({...r,items,...recalc(items)})); };
    const aplicar = comp => {
      if (comp.tipo==="Factura compra") {
        if (comp.proveedor_cliente && !provs.find(p=>p.nombre===comp.proveedor_cliente)) spr([...provs,{id:Date.now(),nombre:comp.proveedor_cliente,rut:"",email:"",tel:"",ciudad:"",notas:"",tipo:"Insumos"}]);
        comp.items.forEach(it => { const g=it.qty*1000; const m=lanas.find(l=>it.descripcion.toLowerCase().includes(l.tipo.toLowerCase().split(" ")[0])); if(m) sl(lanas.map(l=>l.id===m.id?{...l,stock:l.stock+g}:l)); });
      }
      if (comp.tipo==="Factura venta") {
        if (comp.proveedor_cliente && !clientes.find(c=>c.nombre===comp.proveedor_cliente)) sc([...clientes,{id:Date.now(),nombre:comp.proveedor_cliente,tipo:"Particular",email:"",tel:"",ciudad:"",notas:"",descuento:0}]);
        comp.items.forEach(it => { const pr=TODAS().find(p=>it.descripcion.toLowerCase().includes(p.n.toLowerCase())); if(pr) ss(stockP.map(s=>s.prenda===pr.n?{...s,qty:Math.max(0,s.qty-it.qty)}:s)); });
        if (comp.pagado) { const ped=pedidos.find(p=>p.cliente===comp.proveedor_cliente&&p.estado!=="Entregado"); if(ped) sp(pedidos.map(p=>p.id===ped.id?{...p,pagado:(p.pagado||0)+comp.total}:p)); }
      }
    };
    const guardarComp = () => { const n={...form,id:Date.now()}; sco([...comps,n]); aplicar(n); setVista("lista"); setForm(cV); };
    const guardarIA = () => { const n={...iaR,id:Date.now()}; sco([...comps,n]); aplicar(n); setVista("lista"); setIaR(null); setImgB64(null); };
    const analizar = async () => {
      setLoading(true); setIaErr(null); setIaR(null);
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1500,messages:[{role:"user",content:[{type:"image",source:{type:"base64",media_type:mime,data:imgB64}},{type:"text",text:`Analizá esta factura. Devolvé ÚNICAMENTE JSON sin texto ni backticks:\n{"tipo":"Factura compra|Factura venta|Remito|Nota de crédito","numero":"","fecha":"YYYY-MM-DD","proveedor_cliente":"","items":[{"descripcion":"","qty":1,"precio_unit":0,"iva":22,"subtotal":0}],"subtotal":0,"iva_total":0,"total":0,"pagado":false,"notas":""}`}]}]}) });
        const data = await res.json();
        const txt = data.content?.map(b=>b.text||"").join("").trim().replace(/```json|```/g,"").trim();
        const p = JSON.parse(txt);
        const items = (p.items||[]).map(it => calcItem(it));
        setIaR({...p, items, ...recalc(items)});
      } catch(e) { setIaErr("No pude leer la factura."); }
      setLoading(false);
    };
    const onFile = e => { const f=e.target.files[0]; if(!f) return; setMime(f.type||"image/jpeg"); setIaR(null); setIaErr(null); const r=new FileReader(); r.onload=ev=>setImgB64(ev.target.result.split(",")[1]); r.readAsDataURL(f); };
    const tC = comps.filter(c=>c.tipo==="Factura compra").reduce((a,c)=>a+c.total,0);
    const tV = comps.filter(c=>c.tipo==="Factura venta").reduce((a,c)=>a+c.total,0);
    const pP = comps.filter(c=>!c.pagado&&c.tipo==="Factura compra").reduce((a,c)=>a+c.total,0);
    const pC = comps.filter(c=>!c.pagado&&c.tipo==="Factura venta").reduce((a,c)=>a+c.total,0);
    const filt = comps.filter(c => (filtTipo==="Todos"||c.tipo===filtTipo) && (filtPag==="Todos"||(filtPag==="Pagado"?c.pagado:!c.pagado)));
    const P2 = ({active,onClick,children}) => <button onClick={onClick} style={{padding:"5px 14px",borderRadius:99,border:`1px solid ${active?T.green:T.border}`,background:active?T.green:"transparent",color:active?"#fff":T.inkMid,cursor:"pointer",fontSize:12,fontFamily:"inherit",whiteSpace:"nowrap"}}>{children}</button>;
    const iSt = {width:"100%",padding:"7px 10px",border:`1px solid ${T.border}`,borderRadius:2,background:T.bgCard,color:T.ink,fontSize:12,boxSizing:"border-box",fontFamily:"inherit"};
    const TotRow = ({sub,ivaT,total}) => (
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}>
        <div style={{width:220}}>
          {[["Subtotal",fmt(sub||0)],["IVA",fmt(ivaT||0)],["Total",fmt(total||0)]].map(([l,v],i) => (
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${T.borderLt}`,fontSize:i===2?14:12,fontWeight:i===2?500:400}}>
              <span style={{color:i===2?T.ink:T.inkMid}}>{l}</span><span>{v}</span>
            </div>
          ))}
        </div>
      </div>
    );

    if (vista==="lista") return (
      <div>
        <SecTitle action={<div style={{display:"flex",gap:8}}><Btn onClick={() => { setIaR(null); setImgB64(null); setIaErr(null); setVista("scanner"); }}>📷 Subir factura</Btn><Btn variant="primary" onClick={() => { setForm(cV); setVista("nuevo"); }}>+ Cargar manual</Btn></div>}>Comprobantes</SecTitle>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:24}}>
          <Met label="Compras" value={fmt(tC)} accent={T.tierra}/><Met label="Ventas" value={fmt(tV)} accent={T.green}/><Met label="Pend. pago" value={fmt(pP)} accent={pP>0?T.danger:T.ok}/><Met label="Pend. cobro" value={fmt(pC)} accent={pC>0?T.warn:T.ok}/>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
          {["Todos",...TIPOS_COMP].map(t => <P2 key={t} active={filtTipo===t} onClick={() => setFiltTipo(t)}>{t}</P2>)}
        </div>
        <div style={{display:"flex",gap:6,marginBottom:20}}>
          {["Todos","Pagado","Pendiente"].map(t => <P2 key={t} active={filtPag===t} onClick={() => setFiltPag(t)}>{t}</P2>)}
        </div>
        {comps.length===0 && <Empty icon="🧾" title="Sin comprobantes" sub="Cargá facturas de forma manual o subí una foto con IA." action={<div style={{display:"flex",gap:10,justifyContent:"center"}}><Btn variant="primary" onClick={() => { setForm(cV); setVista("nuevo"); }}>+ Cargar manual</Btn><Btn onClick={() => setVista("scanner")}>📷 Subir factura</Btn></div>}/>}
        {comps.length > 0 && (
          <Card style={{padding:0,overflow:"hidden",marginBottom:24}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr style={{background:T.bg}}><TH>Tipo</TH><TH>Número</TH><TH>Fecha</TH><TH>Proveedor/Cliente</TH><TH>Subtotal</TH><TH>IVA</TH><TH>Total</TH><TH>Estado</TH><TH></TH></tr></thead>
              <tbody>
                {filt.slice().reverse().map((c,i) => {
                  const tc = TIPO_COLOR[c.tipo]||{bg:T.bgMuted,tx:T.inkMid};
                  return (
                    <tr key={c.id} style={{background:i%2===0?T.bgCard:T.bg}}>
                      <TD><span style={{fontSize:10,padding:"2px 9px",borderRadius:99,background:tc.bg,color:tc.tx,fontWeight:500}}>{c.tipo}</span></TD>
                      <TD style={{fontFamily:"monospace",fontSize:12}}>{c.numero||"—"}</TD>
                      <TD style={{fontSize:12,color:T.inkMid}}>{c.fecha}</TD>
                      <TD><strong style={{fontWeight:500}}>{c.proveedor_cliente}</strong></TD>
                      <TD style={{color:T.inkMid}}>{fmt(c.subtotal||0)}</TD>
                      <TD style={{color:T.inkMid,fontSize:12}}>{fmt(c.iva_total||0)}</TD>
                      <TD><strong style={{fontWeight:500}}>{fmt(c.total||0)}</strong></TD>
                      <TD>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <span style={{fontSize:10,padding:"2px 8px",borderRadius:99,background:c.pagado?T.okLt:T.dangerLt,color:c.pagado?T.ok:T.danger}}>{c.pagado?"Pagado":"Pendiente"}</span>
                          <button onClick={() => sco(comps.map(x=>x.id===c.id?{...x,pagado:!x.pagado}:x))} style={{fontSize:10,background:"none",border:`1px solid ${T.border}`,borderRadius:2,cursor:"pointer",padding:"2px 6px",color:T.inkMid,fontFamily:"inherit"}}>±</button>
                        </div>
                      </TD>
                      <TD><div style={{display:"flex",gap:4}}><Btn small onClick={() => { setSelComp(c); setVista("detalle"); }}>Ver</Btn><Btn small onClick={() => sco(comps.filter(x=>x.id!==c.id))}>✕</Btn></div></TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
        <SecTitle action={<Btn small variant="primary" onClick={() => { setEditProv({id:Date.now(),nombre:"",rut:"",email:"",tel:"",ciudad:"",notas:"",tipo:"Lana"}); setVista("prov_edit"); }}>+ Proveedor</Btn>}>Proveedores</SecTitle>
        {provs.length===0 && <Empty icon="🏭" title="Sin proveedores" sub="Cargá tus proveedores de lana e insumos." action={<Btn variant="primary" onClick={() => { setEditProv({id:Date.now(),nombre:"",rut:"",email:"",tel:"",ciudad:"",notas:"",tipo:"Lana"}); setVista("prov_edit"); }}>+ Nuevo proveedor</Btn>}/>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
          {provs.map(p => {
            const compras = comps.filter(c=>c.proveedor_cliente===p.nombre&&c.tipo==="Factura compra");
            return (
              <Card key={p.id} style={{marginBottom:0}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <div><div style={{fontSize:14,fontWeight:500}}>{p.nombre}</div><div style={{fontSize:11,color:T.inkMid}}>{p.tipo}{p.ciudad?` · ${p.ciudad}`:""}</div></div>
                  <Btn small onClick={() => { setEditProv({...p}); setVista("prov_edit"); }}>Editar</Btn>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>
                  <div style={{background:T.bg,borderRadius:2,padding:"6px 10px"}}><div style={{fontSize:10,color:T.inkLt,textTransform:"uppercase",letterSpacing:"0.05em"}}>Facturas</div><div style={{fontSize:13,fontWeight:500}}>{compras.length}</div></div>
                  <div style={{background:T.bg,borderRadius:2,padding:"6px 10px"}}><div style={{fontSize:10,color:T.inkLt,textTransform:"uppercase",letterSpacing:"0.05em"}}>Total</div><div style={{fontSize:13,fontWeight:500,color:T.tierra}}>{fmt(compras.reduce((a,c)=>a+c.total,0))}</div></div>
                </div>
                {(p.rut||p.email||p.tel) && <div style={{fontSize:11,color:T.inkMid,borderTop:`1px solid ${T.borderLt}`,paddingTop:6}}>{p.rut&&<div>RUT: {p.rut}</div>}{p.email&&<div>{p.email}</div>}{p.tel&&<div>{p.tel}</div>}</div>}
              </Card>
            );
          })}
        </div>
      </div>
    );

    if (vista==="detalle" && selComp) return (
      <div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}><Btn onClick={() => setVista("lista")}>← Volver</Btn><h2 style={{margin:0,fontSize:18,fontWeight:300}}>{selComp.tipo} {selComp.numero}</h2></div>
        <Card style={{maxWidth:640}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:20,paddingBottom:14,borderBottom:`1px solid ${T.borderLt}`}}>
            <div><div style={{fontSize:16,fontWeight:400,letterSpacing:"0.1em",textTransform:"uppercase"}}>Junco Verde</div><div style={{fontSize:11,color:T.inkLt}}>{cfg.taller.email}</div></div>
            <div style={{textAlign:"right"}}><div style={{fontSize:12,color:T.inkMid}}>Nro: <strong style={{fontFamily:"monospace"}}>{selComp.numero||"—"}</strong></div><div style={{fontSize:12,color:T.inkMid}}>Fecha: {selComp.fecha}</div></div>
          </div>
          <div style={{marginBottom:16}}><div style={{fontSize:11,color:T.inkLt,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{selComp.tipo.includes("compra")||selComp.tipo==="Remito"?"Proveedor":"Cliente"}</div><div style={{fontSize:15,fontWeight:500}}>{selComp.proveedor_cliente}</div></div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,marginBottom:16}}><thead><tr style={{background:T.bg}}><TH>Descripción</TH><TH>Cant.</TH><TH>Precio</TH><TH>IVA%</TH><TH>Subtotal</TH></tr></thead><tbody>{(selComp.items||[]).map((it,i) => <tr key={i}><TD>{it.descripcion}</TD><TD>{it.qty}</TD><TD style={{color:T.inkMid}}>{fmt(it.precio_unit||0)}</TD><TD style={{color:T.inkMid}}>{it.iva}%</TD><TD><strong>{fmt(it.subtotal||0)}</strong></TD></tr>)}</tbody></table>
          <TotRow sub={selComp.subtotal} ivaT={selComp.iva_total} total={selComp.total}/>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",borderTop:`1px solid ${T.borderLt}`,paddingTop:12}}>
            <span style={{fontSize:12,padding:"6px 12px",borderRadius:99,background:selComp.pagado?T.okLt:T.dangerLt,color:selComp.pagado?T.ok:T.danger,fontWeight:500}}>{selComp.pagado?"✓ Pagado":"Pendiente"}</span>
            <Btn small onClick={() => sco(comps.map(c=>c.id===selComp.id?{...c,pagado:!c.pagado}:c))}>Cambiar pago</Btn>
          </div>
        </Card>
      </div>
    );

    if (vista==="scanner") return (
      <div style={{maxWidth:640}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}><Btn onClick={() => setVista("lista")}>← Volver</Btn><h2 style={{margin:0,fontSize:20,fontWeight:300}}>Subir factura con IA</h2></div>
        <Card>
          <div style={{border:`2px dashed ${T.border}`,borderRadius:4,padding:"2rem",textAlign:"center",background:T.bg,marginBottom:16}}>
            {imgB64 ? (
              <div><img src={`data:${mime};base64,${imgB64}`} alt="f" style={{maxWidth:"100%",maxHeight:220,borderRadius:2,marginBottom:10,objectFit:"contain"}}/><label style={{padding:"6px 16px",border:`1px solid ${T.border}`,borderRadius:2,cursor:"pointer",fontSize:12,fontFamily:"inherit",color:T.ink,background:T.bgCard}}>Cambiar <input type="file" accept="image/*" style={{display:"none"}} onChange={onFile}/></label></div>
            ) : (
              <label style={{cursor:"pointer",display:"block"}}><div style={{fontSize:28,marginBottom:8,opacity:0.25}}>↑</div><div style={{fontSize:14,marginBottom:3,color:T.ink}}>Subir imagen de factura</div><div style={{fontSize:11,color:T.inkLt}}>JPG · PNG</div><input type="file" accept="image/*" style={{display:"none"}} onChange={onFile}/></label>
            )}
          </div>
          {imgB64 && !iaR && <button onClick={analizar} disabled={loading} style={{width:"100%",padding:"12px",border:"none",borderRadius:2,background:T.green,color:"#fff",cursor:loading?"wait":"pointer",fontSize:13,fontWeight:500,fontFamily:"inherit"}}>{loading?"Leyendo…":"Leer con IA"}</button>}
          {iaErr && <div style={{background:T.dangerLt,border:`1px solid ${T.danger}`,borderRadius:2,padding:"10px 14px",marginTop:10,fontSize:12,color:T.danger}}>{iaErr}</div>}
        </Card>
        {iaR && (
          <Card>
            <div style={{fontSize:11,color:T.inkLt,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:14}}>Datos detectados — revisá antes de confirmar</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
              <div><label style={{fontSize:11,color:T.inkMid,display:"block",marginBottom:4}}>Tipo</label><select value={iaR.tipo} onChange={e => setIaR(r=>({...r,tipo:e.target.value}))} style={iSt}>{TIPOS_COMP.map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label style={{fontSize:11,color:T.inkMid,display:"block",marginBottom:4}}>Número</label><input style={iSt} value={iaR.numero||""} onChange={e => setIaR(r=>({...r,numero:e.target.value}))}/></div>
              <div><label style={{fontSize:11,color:T.inkMid,display:"block",marginBottom:4}}>Fecha</label><input type="date" style={iSt} value={iaR.fecha||""} onChange={e => setIaR(r=>({...r,fecha:e.target.value}))}/></div>
            </div>
            <div style={{marginBottom:12}}><label style={{fontSize:11,color:T.inkMid,display:"block",marginBottom:4}}>Proveedor / Cliente</label><input style={iSt} value={iaR.proveedor_cliente||""} onChange={e => setIaR(r=>({...r,proveedor_cliente:e.target.value}))}/></div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,marginBottom:12}}>
              <thead><tr style={{background:T.bg}}><TH>Descripción</TH><TH>Cant.</TH><TH>Precio</TH><TH>IVA%</TH><TH>Subtotal</TH><TH></TH></tr></thead>
              <tbody>
                {(iaR.items||[]).map((it,i) => (
                  <tr key={i}>
                    <TD><input style={{...iSt,padding:"4px 6px"}} value={it.descripcion} onChange={e => updIaItem(i,"descripcion",e.target.value)}/></TD>
                    <TD><input type="number" style={{...iSt,width:55,padding:"4px 6px"}} value={it.qty} onChange={e => updIaItem(i,"qty",+e.target.value)}/></TD>
                    <TD><input type="number" style={{...iSt,width:90,padding:"4px 6px"}} value={it.precio_unit} onChange={e => updIaItem(i,"precio_unit",+e.target.value)}/></TD>
                    <TD><select value={it.iva} onChange={e => updIaItem(i,"iva",+e.target.value)} style={{...iSt,width:60,padding:"4px 6px"}}>{IVA_RATES.map(r=><option key={r} value={r}>{r}%</option>)}</select></TD>
                    <TD style={{fontWeight:500}}>{fmt(it.subtotal||0)}</TD>
                    <TD><button onClick={() => { const items=iaR.items.filter((_,j)=>j!==i); setIaR(r=>({...r,items,...recalc(items)})); }} style={{background:"none",border:"none",cursor:"pointer",color:T.danger,fontSize:14}}>×</button></TD>
                  </tr>
                ))}
              </tbody>
            </table>
            <TotRow sub={iaR.subtotal} ivaT={iaR.iva_total} total={iaR.total}/>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={() => setIaR(null)}>Descartar</Btn><Btn variant="primary" onClick={guardarIA}>Confirmar y guardar</Btn></div>
          </Card>
        )}
      </div>
    );

    if (vista==="nuevo") return (
      <div style={{maxWidth:680}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}><Btn onClick={() => setVista("lista")}>← Volver</Btn><h2 style={{margin:0,fontSize:20,fontWeight:300}}>Nuevo comprobante</h2></div>
        <Card>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:4}}>
            <div><label style={{fontSize:11,color:T.inkMid,display:"block",marginBottom:4}}>Tipo</label><select value={form.tipo} onChange={e => setForm(f=>({...f,tipo:e.target.value}))} style={iSt}>{TIPOS_COMP.map(t=><option key={t}>{t}</option>)}</select></div>
            <Inp label="Número" value={form.numero} onChange={e => setForm(f=>({...f,numero:e.target.value}))} placeholder="A-0001"/>
            <Inp label="Fecha" type="date" value={form.fecha} onChange={e => setForm(f=>({...f,fecha:e.target.value}))}/>
          </div>
          <Inp label="Proveedor / Cliente" value={form.proveedor_cliente} onChange={e => setForm(f=>({...f,proveedor_cliente:e.target.value}))}/>
          <div style={{fontSize:11,color:T.inkMid,textTransform:"uppercase",marginBottom:8,marginTop:4}}>Ítems</div>
          {form.items.map((it,i) => (
            <div key={i} style={{display:"grid",gridTemplateColumns:"3fr 1fr 1.5fr 1fr 1fr auto",gap:8,alignItems:"end",marginBottom:8}}>
              <Inp label={i===0?"Descripción":""} value={it.descripcion} onChange={e => updItem(i,"descripcion",e.target.value)} placeholder="Producto"/>
              <Inp label={i===0?"Cant.":""} type="number" min="0" value={it.qty} onChange={e => updItem(i,"qty",+e.target.value)}/>
              <Inp label={i===0?"Precio unit.":""} type="number" min="0" value={it.precio_unit} onChange={e => updItem(i,"precio_unit",+e.target.value)}/>
              <div style={{marginBottom:14}}>{i===0&&<label style={{fontSize:11,color:T.inkMid,display:"block",marginBottom:5}}>IVA%</label>}<select value={it.iva} onChange={e => updItem(i,"iva",+e.target.value)} style={{...iSt,padding:"9px 8px"}}>{IVA_RATES.map(r=><option key={r} value={r}>{r}%</option>)}</select></div>
              <div style={{marginBottom:14}}>{i===0&&<label style={{fontSize:11,color:T.inkMid,display:"block",marginBottom:5}}>Subtotal</label>}<div style={{padding:"9px 12px",background:T.bgMuted,borderRadius:2,fontSize:13}}>{fmt(it.subtotal||0)}</div></div>
              <div style={{marginBottom:14}}>{i===0&&<div style={{height:21}}/>}<button onClick={() => { const items=form.items.filter((_,j)=>j!==i); setForm(f=>({...f,items,...recalc(items)})); }} disabled={form.items.length===1} style={{padding:"9px 10px",border:`1px solid ${T.border}`,borderRadius:2,background:"transparent",cursor:"pointer",color:T.danger,fontFamily:"inherit",opacity:form.items.length===1?.3:1}}>×</button></div>
            </div>
          ))}
          <Btn small onClick={() => { const items=[...form.items,{...iV}]; setForm(f=>({...f,items})); }} style={{marginBottom:16}}>+ Agregar ítem</Btn>
          <TotRow sub={form.subtotal} ivaT={form.iva_total} total={form.total}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <Inp label="Notas" value={form.notas} onChange={e => setForm(f=>({...f,notas:e.target.value}))}/>
            <div style={{marginBottom:14}}><label style={{fontSize:11,color:T.inkMid,display:"block",marginBottom:5}}>Estado de pago</label><div style={{display:"flex",gap:8}}><Btn small variant={form.pagado?"primary":"ghost"} onClick={() => setForm(f=>({...f,pagado:true}))}>Pagado</Btn><Btn small variant={!form.pagado?"danger":"ghost"} onClick={() => setForm(f=>({...f,pagado:false}))}>Pendiente</Btn></div></div>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:`1px solid ${T.borderLt}`}}><Btn onClick={() => setVista("lista")}>Cancelar</Btn><Btn variant="primary" onClick={guardarComp} disabled={!form.proveedor_cliente||!form.items[0]?.descripcion}>Guardar</Btn></div>
        </Card>
      </div>
    );

    if (vista==="prov_edit" && editProv) return (
      <div style={{maxWidth:520}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}><Btn onClick={() => setVista("lista")}>← Volver</Btn><h2 style={{margin:0,fontSize:20,fontWeight:300}}>{provs.find(p=>p.id===editProv.id)?"Editar":"Nuevo"} proveedor</h2></div>
        <Card>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Inp label="Nombre" value={editProv.nombre} onChange={e => setEditProv({...editProv,nombre:e.target.value})}/>
            <Sel label="Tipo" value={editProv.tipo} onChange={e => setEditProv({...editProv,tipo:e.target.value})}>{["Lana","Insumos","Bordado","Logística","Otro"].map(t=><option key={t}>{t}</option>)}</Sel>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Inp label="RUT" value={editProv.rut} onChange={e => setEditProv({...editProv,rut:e.target.value})}/>
            <Inp label="Ciudad" value={editProv.ciudad} onChange={e => setEditProv({...editProv,ciudad:e.target.value})}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Inp label="Email" type="email" value={editProv.email} onChange={e => setEditProv({...editProv,email:e.target.value})}/>
            <Inp label="Teléfono" value={editProv.tel} onChange={e => setEditProv({...editProv,tel:e.target.value})}/>
          </div>
          <Inp label="Notas" value={editProv.notas} onChange={e => setEditProv({...editProv,notas:e.target.value})}/>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:`1px solid ${T.borderLt}`}}>
            <Btn onClick={() => setVista("lista")}>Cancelar</Btn>
            {provs.find(p=>p.id===editProv.id) && <Btn variant="danger" onClick={() => { spr(provs.filter(p=>p.id!==editProv.id)); setVista("lista"); }}>Eliminar</Btn>}
            <Btn variant="primary" disabled={!editProv.nombre} onClick={() => { if(provs.find(p=>p.id===editProv.id)) spr(provs.map(p=>p.id===editProv.id?editProv:p)); else spr([...provs,editProv]); setVista("lista"); }}>Guardar</Btn>
          </div>
        </Card>
      </div>
    );
    return null;
  };

  // ── CONFIG ─────────────────────────────────────────────────────────────────
  const Config = () => {
    const [sec, setSec] = useState("catalogo");
    const [lc, setLc] = useState({...cfg, taller:{...cfg.taller}, tiemposProd:{...cfg.tiemposProd}});
    const [ok, setOk] = useState(false);
    const guardar = () => { scfg(lc); setOk(true); setTimeout(()=>setOk(false),2500); };
    const SECS = [{id:"catalogo",l:"Catálogo"},{id:"alertas",l:"Alertas"},{id:"tiempos",l:"Tiempos"},{id:"taller",l:"Taller"}];
    return (
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24,paddingBottom:12,borderBottom:`1px solid ${T.borderLt}`}}>
          <div><div style={{fontSize:11,color:T.inkLt,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>Sistema</div><div style={{fontSize:22,fontWeight:300}}>Configuración</div></div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>{ok && <span style={{fontSize:12,color:T.ok,padding:"6px 12px",background:T.okLt,borderRadius:2}}>✓ Guardado</span>}<Btn variant="primary" onClick={guardar}>Guardar</Btn></div>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:28,flexWrap:"wrap"}}>
          {SECS.map(s => <button key={s.id} onClick={() => setSec(s.id)} style={{padding:"7px 18px",borderRadius:2,border:`1px solid ${sec===s.id?T.green:T.border}`,background:sec===s.id?T.greenLt:"transparent",color:sec===s.id?T.green:T.inkMid,cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:sec===s.id?500:400}}>{s.l}</button>)}
        </div>
        {sec==="catalogo" && <CatalogEditor cfg={cfg} scfg={scfg}/>}
        {sec==="alertas" && (
          <div style={{maxWidth:560}}>
            <Card>
              {[["Alerta entrega (días)","alertaEntregaDias","días"],["Stock mínimo prendas","stockMinimoDefault","u."],["Margen mínimo","margenMinimoAlerta","%"],["Alerta cobro (días)","diasAlertaPago","días"]].map(([titulo,key,unit]) => (
                <div key={key} style={{marginBottom:20,paddingBottom:20,borderBottom:`1px solid ${T.borderLt}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontSize:13,fontWeight:500}}>{titulo}</div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <input type="number" min="0" value={lc[key]} onChange={e => setLc(c=>({...c,[key]:+e.target.value}))} style={{width:70,padding:"7px 10px",border:`1px solid ${T.border}`,borderRadius:2,background:T.bgCard,color:T.ink,fontSize:14,fontWeight:500,textAlign:"center",fontFamily:"inherit"}}/>
                      <span style={{fontSize:12,color:T.inkMid}}>{unit}</span>
                    </div>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        )}
        {sec==="tiempos" && (
          <div>
            {Object.entries(CAT_DATA).map(([cat,items]) => (
              <Card key={cat} style={{marginBottom:12}}>
                <div style={{fontSize:11,color:T.inkMid,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:16}}>{cat}</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10}}>
                  {items.map(p => {
                    const d = lc.tiemposProd[p.n] || 14;
                    return (
                      <div key={p.n} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:T.bg,borderRadius:2,gap:12}}>
                        <div style={{flex:1,minWidth:0,fontSize:12,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.n}</div>
                        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                          <input type="number" min="1" max="90" value={d} onChange={e => setLc(c=>({...c,tiemposProd:{...c.tiemposProd,[p.n]:+e.target.value}}))} style={{width:55,padding:"5px 8px",border:`1px solid ${T.border}`,borderRadius:2,background:T.bgCard,color:T.ink,fontSize:13,fontWeight:500,textAlign:"center",fontFamily:"inherit"}}/>
                          <span style={{fontSize:11,color:T.inkMid}}>días</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}
        {sec==="taller" && (
          <div style={{maxWidth:520}}>
            <Card>
              <Inp label="Nombre" value={lc.taller.nombre} onChange={e => setLc(c=>({...c,taller:{...c.taller,nombre:e.target.value}}))}/>
              <Inp label="Email" type="email" value={lc.taller.email} onChange={e => setLc(c=>({...c,taller:{...c.taller,email:e.target.value}}))}/>
              <Inp label="Teléfono" value={lc.taller.tel} onChange={e => setLc(c=>({...c,taller:{...c.taller,tel:e.target.value}}))}/>
              <Inp label="Ciudad" value={lc.taller.ciudad} onChange={e => setLc(c=>({...c,taller:{...c.taller,ciudad:e.target.value}}))}/>
            </Card>
          </div>
        )}
        <div style={{marginTop:24,paddingTop:16,borderTop:`1px solid ${T.borderLt}`,display:"flex",justifyContent:"flex-end"}}>
          {ok && <span style={{fontSize:12,color:T.ok,padding:"8px 14px",background:T.okLt,borderRadius:2,marginRight:8}}>✓ Guardado</span>}
          <Btn variant="primary" onClick={guardar}>Guardar todos los cambios</Btn>
        </div>
      </div>
    );
  };

  // ── MODALES GLOBALES ───────────────────────────────────────────────────────
  const ModalPago = () => {
    const [monto, setMonto] = useState(0);
    if (!sel) return null;
    const pr = getPrenda(sel.prenda);
    const tot = (pr?.p||0)*sel.cantidad;
    const saldo = tot-(sel.pagado||0);
    return (
      <Ov onClose={() => setModal(null)}>
        <MTitle onClose={() => setModal(null)}>Registrar pago</MTitle>
        <div style={{background:T.bgMuted,borderRadius:2,padding:"12px 14px",marginBottom:16,fontSize:13}}>
          <div style={{fontWeight:500,marginBottom:4}}>{sel.cliente} — {sel.prenda}{sel.talle?` (${sel.talle})`:""} ×{sel.cantidad}</div>
          <div style={{display:"flex",gap:20,color:T.inkMid,fontSize:12}}><span>Total <strong style={{color:T.ink}}>{fmt(tot)}</strong></span><span>Cobrado <strong style={{color:T.ok}}>{fmt(sel.pagado||0)}</strong></span><span>Saldo <strong style={{color:T.danger}}>{fmt(saldo)}</strong></span></div>
        </div>
        <Inp label="Monto" type="number" min="0" value={monto} onChange={e => setMonto(e.target.value)} autoFocus/>
        <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
          {[saldo,saldo/2].filter(v=>v>0).map(v => <Btn key={v} small onClick={() => setMonto(Math.round(v))}>{fmt(v)}</Btn>)}
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:`1px solid ${T.borderLt}`}}>
          <Btn onClick={() => setModal(null)}>Cancelar</Btn>
          <Btn variant="primary" onClick={() => { sp(pedidos.map(p=>p.id===sel.id?{...p,pagado:(p.pagado||0)+ +monto}:p)); setModal(null); }}>Registrar</Btn>
        </div>
      </Ov>
    );
  };

  const ModalEnvio = () => {
    const [env, setEnv] = useState(sel ? {envioEstado:sel.envioEstado||"Sin envío",envioTracking:sel.envioTracking||"",envioEmpresa:sel.envioEmpresa||"",envioFecha:sel.envioFecha||""} : {});
    if (!sel) return null;
    return (
      <Ov onClose={() => setModal(null)}>
        <MTitle onClose={() => setModal(null)}>Gestionar envío</MTitle>
        <div style={{background:T.bgMuted,borderRadius:2,padding:"10px 14px",marginBottom:14,fontSize:13}}><strong>{sel.cliente}</strong> — {sel.prenda}{sel.talle?` (${sel.talle})`:""} ×{sel.cantidad}</div>
        <Sel label="Estado" value={env.envioEstado} onChange={e => setEnv({...env,envioEstado:e.target.value})}>{ENVIO_ESTADOS.map(e=><option key={e}>{e}</option>)}</Sel>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Inp label="Empresa" value={env.envioEmpresa} onChange={e => setEnv({...env,envioEmpresa:e.target.value})} placeholder="OCA, Correo…"/>
          <Inp label="Tracking" value={env.envioTracking} onChange={e => setEnv({...env,envioTracking:e.target.value})}/>
        </div>
        <Inp label="Fecha despacho" type="date" value={env.envioFecha} onChange={e => setEnv({...env,envioFecha:e.target.value})}/>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:`1px solid ${T.borderLt}`}}>
          <Btn onClick={() => setModal(null)}>Cancelar</Btn>
          <Btn variant="primary" onClick={() => { sp(pedidos.map(p=>p.id===sel.id?{...p,...env}:p)); setModal(null); }}>Guardar</Btn>
        </div>
      </Ov>
    );
  };

  const ModalOrden = () => {
    if (!sel) return null;
    const pr = getPrenda(sel.prenda);
    const art = artesanas.find(a => a.nombre===sel.artesana);
    return (
      <Ov onClose={() => setModal(null)} wide>
        <MTitle onClose={() => setModal(null)}>Orden de trabajo</MTitle>
        <div style={{border:`1px solid ${T.border}`,borderRadius:2,padding:"1.5rem"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:20,paddingBottom:14,borderBottom:`1px solid ${T.borderLt}`}}>
            <div><div style={{fontSize:16,fontWeight:400,letterSpacing:"0.1em",textTransform:"uppercase"}}>Junco Verde</div><div style={{fontSize:11,color:T.inkLt}}>Orden #{sel.id}</div></div>
            <div style={{textAlign:"right",fontSize:12,color:T.inkMid}}><div>Fecha: {hoy()}</div><div>Entrega: <strong style={{color:T.ink}}>{sel.fechaEntrega}</strong></div></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:20}}>
            <div><div style={{fontSize:11,color:T.inkLt,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Artesana</div><div style={{fontSize:15,fontWeight:500}}>{sel.artesana}</div><div style={{fontSize:12,color:T.inkMid}}>{art?.especialidad}</div></div>
            <div><div style={{fontSize:11,color:T.inkLt,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Cliente</div><div style={{fontSize:15,fontWeight:500}}>{sel.cliente}</div></div>
          </div>
          <div style={{background:T.bg,borderRadius:2,padding:"14px 16px",marginBottom:16}}>
            <div style={{fontSize:11,color:T.inkLt,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10}}>Prenda</div>
            <div style={{fontSize:18,fontWeight:400,marginBottom:8}}>{sel.prenda}</div>
            <div style={{display:"flex",gap:20,fontSize:13}}>
              <span><span style={{color:T.inkMid}}>Cantidad:</span> <strong>{sel.cantidad}</strong></span>
              {sel.talle && <span><span style={{color:T.inkMid}}>Talle:</span> <strong>{sel.talle}</strong></span>}
              {pr?.lana>0 && <span><span style={{color:T.inkMid}}>Lana:</span> <strong>{pr.lana*sel.cantidad}g</strong></span>}
              <span><span style={{color:T.inkMid}}>Tiempo est.:</span> <strong>{cfg.tiemposProd[sel.prenda]||14}d</strong></span>
            </div>
          </div>
          {sel.notas && <div style={{marginBottom:16}}><div style={{fontSize:11,color:T.inkLt,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Instrucciones</div><div style={{fontSize:13,padding:"10px 14px",background:T.warnLt,borderRadius:2,color:T.warn,fontWeight:500}}>{sel.notas}</div></div>}
          {(art?.tecnicas||[]).length > 0 && <div style={{marginBottom:20}}><div style={{fontSize:11,color:T.inkLt,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Técnicas</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{art.tecnicas.map(t=><span key={t} style={{padding:"3px 10px",borderRadius:99,background:T.violetLt,color:T.violet,fontSize:11}}>{t}</span>)}</div></div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,borderTop:`1px solid ${T.borderLt}`,paddingTop:16}}>
            <div><div style={{fontSize:11,color:T.inkLt,marginBottom:6}}>Recibí la lana asignada</div><div style={{height:40,borderBottom:`1px solid ${T.ink}`,marginTop:16}}/><div style={{fontSize:10,color:T.inkLt,marginTop:4}}>Firma artesana</div></div>
            <div><div style={{fontSize:11,color:T.inkLt,marginBottom:6}}>Entregué las prendas terminadas</div><div style={{height:40,borderBottom:`1px solid ${T.ink}`,marginTop:16}}/><div style={{fontSize:10,color:T.inkLt,marginTop:4}}>Firma · Fecha</div></div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:14}}>
          <Btn onClick={() => setModal(null)}>Cerrar</Btn>
          <Btn variant="primary" onClick={() => { const txt=`ORDEN #${sel.id} — Junco Verde\nArtesana: ${sel.artesana}\nCliente: ${sel.cliente}\nPrenda: ${sel.prenda}${sel.talle?` (${sel.talle})`:""} x${sel.cantidad}\nEntrega: ${sel.fechaEntrega}${pr?.lana?`\nLana: ${pr.lana*sel.cantidad}g`:""}${sel.notas?`\nNotas: ${sel.notas}`:""}`;navigator.clipboard?.writeText(txt);}}>Copiar texto</Btn>
        </div>
      </Ov>
    );
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={{fontFamily:"'Georgia',serif",minHeight:"100vh",background:T.bg,color:T.ink,paddingBottom:mob?72:0}}>
      <div style={{background:T.bgCard,borderBottom:`1px solid ${T.border}`,padding:`0 ${mob?"1rem":"1.5rem"}`,display:"flex",alignItems:"center",justifyContent:"space-between",height:mob?48:52,position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"baseline",gap:8}}>
          <span style={{fontSize:mob?14:16,fontWeight:400,letterSpacing:"0.14em",textTransform:"uppercase"}}>Junco Verde</span>
          <span style={{fontSize:10,color:T.inkLt,letterSpacing:"0.05em"}}>taller</span>
        </div>
        {!mob && <nav style={{display:"flex",overflowX:"auto"}}>{TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{padding:"0 12px",height:52,border:"none",borderBottom:tab===t.id?`2px solid ${T.green}`:"2px solid transparent",background:"transparent",color:tab===t.id?T.green:T.inkMid,cursor:"pointer",fontSize:12,letterSpacing:"0.04em",fontFamily:"inherit",whiteSpace:"nowrap"}}>{t.l}</button>)}</nav>}
        {mob && <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:13,color:T.inkMid}}>{TABS.find(t=>t.id===tab)?.l||"Menú"}</span><button onClick={() => setTab(tab==="__menu"?"dashboard":"__menu")} style={{background:"none",border:`1px solid ${T.border}`,borderRadius:4,padding:"4px 10px",cursor:"pointer",fontSize:12,color:T.ink,fontFamily:"inherit"}}>{tab==="__menu"?"✕":"☰ Más"}</button></div>}
      </div>

      {mob && tab==="__menu" && (
        <div style={{position:"fixed",top:48,left:0,right:0,bottom:0,background:T.bgCard,zIndex:99,overflowY:"auto",padding:"1rem"}}>
          <div style={{fontSize:11,color:T.inkLt,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:12}}>Todas las secciones</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"14px 16px",borderRadius:4,border:`1px solid ${T.border}`,background:T.bgCard,cursor:"pointer",fontSize:13,fontFamily:"inherit",color:T.ink,textAlign:"left"}}><span style={{fontSize:20}}>{t.icon}</span><span>{t.l}</span></button>)}
          </div>
        </div>
      )}

      <div style={{padding:mob?"1rem":"2rem",maxWidth:mob?"100%":1200,margin:"0 auto"}}>
        {tab==="dashboard"    && <Dashboard/>}
        {tab==="pedidos"      && <Pedidos/>}
        {tab==="clientes"     && <Clientes/>}
        {tab==="artesanas"    && <Artesanas/>}
        {tab==="pagos_art"    && <PagosArt/>}
        {tab==="planif"       && <Planif/>}
        {tab==="analisis"     && <Analisis/>}
        {tab==="stock"        && <StockPrendas/>}
        {tab==="lanas"        && <Lanas/>}
        {tab==="talles"       && <Talles/>}
        {tab==="comprobantes" && <Comprobantes/>}
        {tab==="config"       && <Config/>}
      </div>

      {mob && tab!=="__menu" && (
        <div style={{position:"fixed",bottom:0,left:0,right:0,height:64,background:T.bgCard,borderTop:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-around",zIndex:100}}>
          {MOB_TABS.map(id => {
            const t = TABS.find(x=>x.id===id);
            const active = tab===id;
            return <button key={id} onClick={() => setTab(id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"6px 12px",border:"none",background:"none",cursor:"pointer",color:active?T.green:T.inkLt,fontFamily:"inherit"}}><span style={{fontSize:22,lineHeight:1}}>{t.icon}</span><span style={{fontSize:9,letterSpacing:"0.04em",fontWeight:active?500:400}}>{t.l}</span></button>;
          })}
          <button onClick={() => setTab("__menu")} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"6px 12px",border:"none",background:"none",cursor:"pointer",color:T.inkLt,fontFamily:"inherit"}}><span style={{fontSize:22,lineHeight:1}}>⋯</span><span style={{fontSize:9}}>Más</span></button>
        </div>
      )}

      {modal==="pago"  && <ModalPago/>}
      {modal==="envio" && <ModalEnvio/>}
      {modal==="orden" && <ModalOrden/>}
    </div>
  );
}
