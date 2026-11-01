import { useState, useMemo, useEffect, useRef, createContext, useContext } from "react";
import { dbGet, dbSet, getSession, onAuth, signIn, signOut } from "./supabase.js";

// ═══════════════════════ CONSTANTES ═══════════════════════
const T = {bg:"#faf7f2",bgCard:"#fff",bgMuted:"#f0ebe2",bgDeep:"#e6dfd4",ink:"#1e1c18",inkMid:"#5a5750",inkLt:"#9a9690",border:"#ddd8cf",borderLt:"#eae5dc",green:"#3d5a3e",greenLt:"#e8f0e8",tierra:"#8b6f47",danger:"#b03a2e",dangerLt:"#fdf0ee",warn:"#916a00",warnLt:"#fef8e6",ok:"#2d6a4f",okLt:"#e8f5ee",info:"#2c5f8a",infoLt:"#eaf2f8",violet:"#5b3f7a",violetLt:"#f2eef8"};
const ES = {Pendiente:{bg:"#fef8e6",tx:"#916a00"},"En producción":{bg:"#eaf2f8",tx:"#2c5f8a"},Bordado:{bg:"#f2eef8",tx:"#5b3f7a"},"Control calidad":{bg:"#f5efe6",tx:"#8b6f47"},Listo:{bg:"#e8f5ee",tx:"#2d6a4f"},Entregado:{bg:"#f0ebe2",tx:"#5a5750"}};
const ESTADOS = ["Pendiente","En producción","Bordado","Control calidad","Listo","Entregado"];
const ENVIO_ESTADOS = ["Sin envío","Preparando","Despachado","En camino","Entregado","Devuelto"];
const TIPOS_COMP = ["Factura compra","Factura venta","Remito","Nota de crédito"];
const TIPO_COLOR = {"Factura compra":{bg:"#fef3c7",tx:"#92400e"},"Factura venta":{bg:"#e8f0e8",tx:"#2c4230"},"Remito":{bg:"#eaf2f8",tx:"#2c5f8a"},"Nota de crédito":{bg:"#f2eef8",tx:"#5b3f7a"}};
const IVA_RATES = [0,10,22];
const TECNICAS = ["Tejido a dos agujas","Tejido circular","Crochet","Telar","Bordado","Macramé","Fieltro","Teñido natural","Tintura","Terminaciones a mano"];

// Catálogo base (las prendas originales). Las prendas nuevas se guardan en Supabase.
const CAT_DATA = {
  "Ruanas / Ponchos / Chales":[
    {n:"Ruana Junco"},{n:"Ruana Aura"},{n:"Ruana Aura Chica"},{n:"Ruana Juana"},{n:"Ruana Zira"},
    {n:"Ruana Wool Me Tender"},{n:"Ruana Triangulo"},{n:"Ruana Terra"},
    {n:"Chal Bufandon Merino Zig Zag"},{n:"Chal Bufandon Jacinta Degrade"},
    {n:"Chal Bufandon Jacinta Lisos"},{n:"Mantita/Chal"}
  ],
  "Sweaters / Sacos":[
    {n:"Sweater Jaspa"},{n:"Sweater Rumba"},{n:"Sweater Moly"},{n:"Sweater Antonia"},{n:"Sweater Alfonsina"},
    {n:"Saco Clementina"},{n:"Sweater Jazmin"},{n:"Sweater Uco"},{n:"Sweater Bariloche Bosque"},
    {n:"Tapado Maria Clara"},{n:"Sweater Fish"},{n:"Sweater Langosta"},{n:"Sweater Lobster"},
    {n:"Jaspa Cangrejo"},{n:"Sweater Rolling Stones"},{n:"Sweater MI Abuelo era Pescador"},
    {n:"Sweater Catch of the day"},{n:"Sweater The Summer Ranch"},{n:"Sweater Summer"}
  ],
  "Kids":[
    {n:"Sweater 2 colores 1-8 años"},{n:"Sweater 2 colores 10 años"},{n:"Sweater 2 colores 12 años"},
    {n:"Sweater Bariloche Beeh"},{n:"Poncho Merino"},{n:"Poncho Junco"},{n:"Poncho Beeh"},
    {n:"Poncho Faro"},{n:"Sweater Be Happy"},{n:"Sweater Beeh"},{n:"Sweater Honguitos"},
    {n:"Sweater Ava"},{n:"Sweater Gallo"},{n:"Sweater Nona"},{n:"Sweater Cordillera"},
    {n:"Sweater No More Screen Time"},{n:"Sweater Surf"},{n:"Sweater Good Morning"},
    {n:"Sweater Lochi"},{n:"Sweater Raval"},{n:"Sweater Cangrejo"},{n:"Sweater Estrella de Mar"},
    {n:"Sweater Uruguay"},{n:"Sweater Marino"},{n:"Sweater Helado"},{n:"Sweater Argentina"}
  ],
  "Sombreros":[
    {n:"Sombrero de Fábrica"},{n:"Sombrero Personalizado"},{n:"Sombrero Polo 2.0"},{n:"Sombrero Perlas"}
  ],
  "Hilados":[
    {n:"Virgen 100g"},{n:"Teñido 100g"},{n:"Hilado Fino"},{n:"Hilado Medio"},
    {n:"Hilado Grueso"},{n:"Hilado Flame"},{n:"Hilado Zig Zag"}
  ]
};
const BASE_CAT = {};
Object.entries(CAT_DATA).forEach(([cat, items]) => {
  items.forEach(p => { BASE_CAT[p.n] = cat; });
});

const tallesParaPrenda = (nombre, cat) => {
  const c = cat || "";
  const n = nombre || "";
  if (c.includes("Kids")) return ["1-2 m","3-4 m","5-6 m","7-8 m","9-11 m","1-2 años","3-4 años","5-6 años","7-8 años","10 años","12 años"];
  if (c.includes("Sombreros") || c.includes("Chales") || n.startsWith("Ruana") || n.startsWith("Manti")) return ["Talle único"];
  if (c.includes("Hilados")) return ["100g"];
  return ["XS","S","M","L","XL","XXL","Talle único"];
};

const TALLES_INIT = {
  adultos:[
    {talle:"XS",busto:82,largo:58,manga:58,cintura:66,cadera:88,peso:380,lana:850,manoObra:0},
    {talle:"S",busto:88,largo:60,manga:59,cintura:72,cadera:94,peso:420,lana:950,manoObra:0},
    {talle:"M",busto:94,largo:62,manga:60,cintura:78,cadera:100,peso:460,lana:1050,manoObra:0},
    {talle:"L",busto:100,largo:64,manga:61,cintura:84,cadera:106,peso:500,lana:1150,manoObra:0},
    {talle:"XL",busto:108,largo:66,manga:62,cintura:92,cadera:114,peso:550,lana:1280,manoObra:0},
    {talle:"XXL",busto:116,largo:68,manga:63,cintura:100,cadera:122,peso:600,lana:1400,manoObra:0}
  ],
  kids:[
    {talle:"1-2 años",busto:52,largo:38,manga:26,cintura:52,cadera:54,peso:140,lana:400,manoObra:0},
    {talle:"3-4 años",busto:56,largo:42,manga:30,cintura:54,cadera:58,peso:160,lana:450,manoObra:0},
    {talle:"5-6 años",busto:60,largo:46,manga:34,cintura:56,cadera:62,peso:185,lana:500,manoObra:0},
    {talle:"7-8 años",busto:64,largo:50,manga:38,cintura:58,cadera:66,peso:210,lana:560,manoObra:0},
    {talle:"10 años",busto:68,largo:54,manga:42,cintura:60,cadera:70,peso:240,lana:620,manoObra:0},
    {talle:"12 años",busto:72,largo:58,manga:46,cintura:62,cadera:74,peso:270,lana:700,manoObra:0}
  ],
  bebe:[
    {talle:"1-2 m",busto:42,largo:28,manga:16,cintura:42,cadera:44,peso:80,lana:250,manoObra:0},
    {talle:"3-4 m",busto:44,largo:30,manga:17,cintura:44,cadera:46,peso:90,lana:280,manoObra:0},
    {talle:"5-6 m",busto:46,largo:32,manga:18,cintura:46,cadera:48,peso:100,lana:310,manoObra:0},
    {talle:"7-8 m",busto:48,largo:34,manga:19,cintura:48,cadera:50,peso:110,lana:340,manoObra:0},
    {talle:"9-11 m",busto:50,largo:36,manga:20,cintura:50,cadera:52,peso:120,lana:370,manoObra:0}
  ],
  unico:[{talle:"Talle único",busto:null,largo:null,manga:null,cintura:null,cadera:null,peso:300,lana:960,manoObra:0}]
};
const GRUPOS_TALLES = [
  {id:"adultos",label:"Adultos",sub:"XS–XXL"},
  {id:"kids",label:"Kids",sub:"1-2 años → 12 años"},
  {id:"bebe",label:"Bebé",sub:"1-2 m → 9-11 m"},
  {id:"unico",label:"Talle único",sub:"Ruanas, chales, sombreros"}
];
const COLS_TALLE = [
  {k:"talle",label:"Talle",unit:""},{k:"busto",label:"Busto",unit:"cm"},{k:"largo",label:"Largo",unit:"cm"},
  {k:"manga",label:"Manga",unit:"cm"},{k:"cintura",label:"Cintura",unit:"cm"},{k:"cadera",label:"Cadera",unit:"cm"},
  {k:"peso",label:"Peso",unit:"g"},{k:"lana",label:"Lana",unit:"g"},{k:"manoObra",label:"M. de obra",unit:"$"}
];

const CFG_DEF = {
  alertaEntregaDias:5, stockMinimoDefault:2, margenMinimoAlerta:40, diasAlertaPago:7,
  taller:{nombre:"Junco Verde",email:"hola@juncoverde.com.uy",tel:"+598 99 452 591",ciudad:"Punta del Este, Uruguay"},
  tiemposProd:{}
};

const num = v => Number(v) || 0;
const fmt = n => "$ " + Math.round(n || 0).toLocaleString("es-AR");
const hoy = () => new Date().toISOString().split("T")[0];
const diasHasta = f => Math.ceil((new Date(f) - new Date()) / 86400000);

// ═══════════════════════ CONTEXTO ═══════════════════════
const Ctx = createContext(null);
const useApp = () => useContext(Ctx);

// ═══════════════════════ COMPONENTES BASE ═══════════════════════
function Badge({ e, children }) {
  const s = ES[e] || {bg:T.bgMuted, tx:T.inkMid};
  return <span style={{display:"inline-block",padding:"3px 10px",borderRadius:99,fontSize:10,fontWeight:500,background:s.bg,color:s.tx,whiteSpace:"nowrap"}}>{children || e}</span>;
}
function Pill({ active, onClick, children, color }) {
  return (
    <button onClick={onClick} style={{padding:"5px 14px",borderRadius:99,border:"1px solid "+(active?(color||T.green):T.border),background:active?(color||T.green):"transparent",color:active?"#fff":T.inkMid,cursor:"pointer",fontSize:12,fontFamily:"inherit",whiteSpace:"nowrap"}}>{children}</button>
  );
}
function Btn({ children, onClick, variant, disabled, small, style }) {
  const v = variant || "ghost";
  const base = {padding:small?"5px 12px":"8px 20px",borderRadius:2,cursor:disabled?"not-allowed":"pointer",fontSize:small?11:13,fontWeight:500,opacity:disabled?0.5:1,fontFamily:"inherit"};
  const variants = {
    primary:{background:T.green,color:"#fff",border:"none"},
    ghost:{background:"transparent",color:T.ink,border:"1px solid "+T.border},
    danger:{background:T.danger,color:"#fff",border:"none"}
  };
  return <button onClick={onClick} disabled={disabled} style={Object.assign({}, base, variants[v], style || {})}>{children}</button>;
}
function Card({ children, style }) {
  return <div style={Object.assign({background:T.bgCard,border:"1px solid "+T.border,borderRadius:4,padding:"1.5rem",marginBottom:16}, style || {})}>{children}</div>;
}
function Met({ label, value, sub, accent }) {
  return (
    <div style={{background:T.bgCard,border:"1px solid "+T.border,borderRadius:4,padding:"1.25rem 1.5rem"}}>
      <div style={{fontSize:11,color:T.inkLt,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:6}}>{label}</div>
      <div style={{fontSize:24,fontWeight:300,color:accent||T.ink,letterSpacing:"-0.5px"}}>{value}</div>
      {sub ? <div style={{fontSize:11,color:T.inkMid,marginTop:4}}>{sub}</div> : null}
    </div>
  );
}
function SecTitle({ children, action }) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:20,paddingBottom:10,borderBottom:"1px solid "+T.borderLt}}>
      <h2 style={{margin:0,fontSize:13,fontWeight:500,letterSpacing:"0.1em",textTransform:"uppercase",color:T.inkMid}}>{children}</h2>
      {action}
    </div>
  );
}
function Bar({ pct, color }) {
  return (
    <div style={{height:3,background:T.bgDeep,borderRadius:99,overflow:"hidden",marginTop:5}}>
      <div style={{height:3,width:Math.min(100, pct)+"%",background:color||T.green,borderRadius:99}}/>
    </div>
  );
}
function Inp({ label, ...p }) {
  return (
    <div style={{marginBottom:14}}>
      {label ? <label style={{fontSize:11,color:T.inkMid,display:"block",marginBottom:5}}>{label}</label> : null}
      <input style={{width:"100%",padding:"9px 12px",border:"1px solid "+T.border,borderRadius:2,background:T.bgCard,color:T.ink,fontSize:13,boxSizing:"border-box",fontFamily:"inherit"}} {...p}/>
    </div>
  );
}
function Sel({ label, children, ...p }) {
  return (
    <div style={{marginBottom:14}}>
      {label ? <label style={{fontSize:11,color:T.inkMid,display:"block",marginBottom:5}}>{label}</label> : null}
      <select style={{width:"100%",padding:"9px 12px",border:"1px solid "+T.border,borderRadius:2,background:T.bgCard,color:T.ink,fontSize:13,boxSizing:"border-box",fontFamily:"inherit"}} {...p}>{children}</select>
    </div>
  );
}
function Ov({ children, onClose, wide }) {
  const mob = window.innerWidth < 768;
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(30,28,24,0.5)",display:"flex",alignItems:mob?"flex-end":"center",justifyContent:"center",zIndex:300}}>
      <div style={{background:T.bgCard,border:"1px solid "+T.border,borderRadius:mob?"12px 12px 0 0":4,padding:"1.5rem",width:mob?"100%":(wide?700:520),maxWidth:"100vw",maxHeight:mob?"92vh":"90vh",overflowY:"auto"}}>{children}</div>
    </div>
  );
}
function MTitle({ children, onClose }) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,paddingBottom:12,borderBottom:"1px solid "+T.borderLt}}>
      <h3 style={{margin:0,fontSize:16,fontWeight:400}}>{children}</h3>
      {onClose ? <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:T.inkLt}}>×</button> : null}
    </div>
  );
}
function TH({ children }) {
  return <th style={{textAlign:"left",padding:"10px 14px",borderBottom:"1px solid "+T.border,fontSize:11,fontWeight:500,letterSpacing:"0.06em",textTransform:"uppercase",color:T.inkLt,whiteSpace:"nowrap"}}>{children}</th>;
}
function TD({ children, style }) {
  return <td style={Object.assign({padding:"11px 14px",borderBottom:"1px solid "+T.borderLt,verticalAlign:"middle"}, style || {})}>{children}</td>;
}
function Empty({ icon, title, sub, action }) {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"4rem 2rem",textAlign:"center",color:T.inkLt}}>
      <div style={{fontSize:40,marginBottom:16,opacity:0.3}}>{icon || "📭"}</div>
      <div style={{fontSize:15,fontWeight:500,color:T.inkMid,marginBottom:6}}>{title}</div>
      {sub ? <div style={{fontSize:13,marginBottom:20,maxWidth:320}}>{sub}</div> : null}
      {action}
    </div>
  );
}
function TotRow({ sub, ivaT, total }) {
  const filas = [["Subtotal", fmt(sub)], ["IVA", fmt(ivaT)], ["Total", fmt(total)]];
  return (
    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}>
      <div style={{width:220}}>
        {filas.map((f, i) => (
          <div key={f[0]} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid "+T.borderLt,fontSize:i===2?14:12,fontWeight:i===2?500:400}}>
            <span style={{color:i===2?T.ink:T.inkMid}}>{f[0]}</span><span>{f[1]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
function Splash({ texto }) {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",background:T.bg,gap:16,fontFamily:"Georgia,serif"}}>
      <div style={{fontSize:40}}>🧶</div>
      <div style={{fontSize:16,fontWeight:300,letterSpacing:"0.1em",textTransform:"uppercase",color:T.inkMid}}>{texto}</div>
    </div>
  );
}
function useIsMobile() {
  const [mob, setMob] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setMob(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return mob;
}

// ═══════════════════════ LOGIN ═══════════════════════
function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const entrar = async () => {
    if (!email.trim() || !pass) { setErr("Completá el email y la contraseña."); return; }
    setBusy(true);
    setErr("");
    const e = await signIn(email.trim(), pass);
    if (e) {
      const bajo = e.toLowerCase();
      setErr(bajo.includes("invalid") ? "Email o contraseña incorrectos." : "No se pudo ingresar: " + e);
      setBusy(false);
    }
  };

  return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:"1.5rem",fontFamily:"Georgia,serif"}}>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:44,marginBottom:10}}>🧶</div>
          <div style={{fontSize:20,fontWeight:400,letterSpacing:"0.16em",textTransform:"uppercase",color:T.ink}}>Junco Verde</div>
          <div style={{fontSize:12,color:T.inkLt,marginTop:4}}>Taller · acceso privado</div>
        </div>
        <form onSubmit={ev => { ev.preventDefault(); entrar(); }}>
          <Card>
            <Inp label="Email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com"/>
            <Inp label="Contraseña" type="password" autoComplete="current-password" value={pass} onChange={e => setPass(e.target.value)}/>
            {err ? <div style={{background:T.dangerLt,border:"1px solid "+T.danger,borderRadius:2,padding:"8px 12px",marginBottom:14,fontSize:12,color:T.danger}}>{err}</div> : null}
            <button type="submit" disabled={busy} style={{width:"100%",padding:"11px",border:"none",borderRadius:2,background:T.green,color:"#fff",cursor:busy?"wait":"pointer",fontSize:14,fontWeight:500,fontFamily:"inherit",opacity:busy?0.7:1}}>{busy ? "Ingresando…" : "Ingresar"}</button>
          </Card>
        </form>
        <div style={{textAlign:"center",fontSize:11,color:T.inkLt}}>Si no tenés usuario, pedíselo a quien administra el taller.</div>
      </div>
    </div>
  );
}

// ═══════════════════════ DASHBOARD ═══════════════════════
function Dashboard() {
  const A = useApp();
  const { mob, pedidos, artesanas, clientes, activos, urgentes, lanasBajas, totalCobrado, totalVenta, totalCosto, getPrenda, statsArt, capArt, setTab } = A;
  const fechaHoy = new Date().toLocaleDateString("es-UY", {weekday:"long", day:"numeric", month:"long"});
  const sinEntregar = pedidos.filter(p => p.estado !== "Entregado");
  const pendCobro = activos.reduce((a, p) => { const pr = getPrenda(p.prenda); return a + (pr ? pr.p : 0) * p.cantidad - (p.pagado || 0); }, 0);
  const proxVenc = sinEntregar.slice().sort((a, b) => new Date(a.fechaEntrega) - new Date(b.fechaEntrega))[0];
  const dProx = proxVenc ? diasHasta(proxVenc.fechaEntrega) : null;
  const dColor = dProx === null ? T.inkLt : dProx < 0 ? T.danger : dProx <= 3 ? T.warn : T.ok;
  const dLabel = dProx === null ? "—" : dProx < 0 ? Math.abs(dProx) + "d vencido" : dProx === 0 ? "Hoy" : dProx + "d";

  if (pedidos.length === 0 && artesanas.length === 0 && clientes.length === 0) {
    return (
      <div>
        <div style={{marginBottom:mob?20:32}}>
          <div style={{fontSize:11,color:T.inkLt,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>{fechaHoy}</div>
          <div style={{fontSize:mob?20:28,fontWeight:300}}>Bienvenida a Junco Verde</div>
        </div>
        <Card style={{textAlign:"center",padding:"3rem 2rem",background:T.greenLt,border:"1px solid "+T.green}}>
          <div style={{fontSize:32,marginBottom:12}}>🧶</div>
          <div style={{fontSize:18,fontWeight:400,color:T.green,marginBottom:8}}>El taller está listo para comenzar</div>
          <div style={{fontSize:13,color:T.inkMid,maxWidth:480,margin:"0 auto",lineHeight:1.7}}>
            Empezá cargando las <strong>artesanas</strong>, luego los <strong>clientes</strong>, el <strong>stock de lanas</strong> y los <strong>precios del catálogo</strong> en Configuración.
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
  }

  return (
    <div>
      <div style={{marginBottom:mob?20:32,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div>
          <div style={{fontSize:11,color:T.inkLt,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>{fechaHoy}</div>
          <div style={{fontSize:mob?20:28,fontWeight:300}}>Junco Verde</div>
        </div>
        {(urgentes.length > 0 || lanasBajas.length > 0) ? <div style={{background:T.dangerLt,border:"1px solid "+T.danger,borderRadius:4,padding:"8px 16px",fontSize:12,color:T.danger,fontWeight:500}}>{urgentes.length + lanasBajas.length} alertas</div> : null}
      </div>
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"1fr 1fr 1fr",gap:mob?10:16,marginBottom:mob?16:32}}>
        <div style={{background:T.green,borderRadius:4,padding:"1.75rem 2rem"}}>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.65)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>Pendientes</div>
          <div style={{fontSize:48,fontWeight:300,color:"#fff",letterSpacing:"-2px",lineHeight:1}}>{sinEntregar.length}</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.55)",marginTop:10}}>{pedidos.filter(p => p.estado === "Entregado").length} entregados · {pedidos.length} total</div>
        </div>
        <div style={{background:T.bgCard,border:"1px solid "+T.border,borderRadius:4,padding:"1.75rem 2rem"}}>
          <div style={{fontSize:11,color:T.inkLt,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>Próx. vencimiento</div>
          <div style={{fontSize:42,fontWeight:300,letterSpacing:"-1px",lineHeight:1,color:dColor}}>{dLabel}</div>
          {proxVenc ? <div style={{marginTop:10}}><div style={{fontSize:13,fontWeight:500,marginBottom:2}}>{proxVenc.prenda}</div><div style={{fontSize:11,color:T.inkMid}}>{proxVenc.cliente} · {proxVenc.fechaEntrega}</div></div> : null}
        </div>
        <div style={{background:T.bgCard,border:"1px solid "+T.border,borderRadius:4,padding:"1.75rem 2rem"}}>
          <div style={{fontSize:11,color:T.inkLt,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>Pend. de cobrar</div>
          <div style={{fontSize:36,fontWeight:300,letterSpacing:"-1px",lineHeight:1,color:pendCobro>0?T.warn:T.ok}}>{fmt(pendCobro)}</div>
          <div style={{marginTop:10,display:"flex",gap:12}}>
            <div><div style={{fontSize:10,color:T.inkLt,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:2}}>Cobrado</div><div style={{fontSize:13,fontWeight:500,color:T.ok}}>{fmt(totalCobrado)}</div></div>
            <div style={{width:1,background:T.borderLt}}/>
            <div><div style={{fontSize:10,color:T.inkLt,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:2}}>Margen</div><div style={{fontSize:13,fontWeight:500,color:T.green}}>{fmt(totalVenta - totalCosto)}</div></div>
          </div>
        </div>
      </div>

      {(urgentes.length > 0 || lanasBajas.length > 0) ? (
        <div style={{background:T.dangerLt,border:"1px solid "+T.danger,borderLeft:"4px solid "+T.danger,borderRadius:4,padding:"1.25rem 1.5rem",marginBottom:24}}>
          <div style={{fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",color:T.danger,marginBottom:12,fontWeight:500}}>Requiere atención</div>
          {urgentes.map(p => {
            const d = diasHasta(p.fechaEntrega);
            return (
              <div key={p.id} onClick={() => setTab("pedidos")} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 10px",marginBottom:4,borderRadius:3,cursor:"pointer",background:"rgba(176,58,46,0.06)"}}>
                <div style={{fontSize:13}}><strong>{p.prenda}</strong> ×{p.cantidad} — {p.cliente} <Badge e={p.estado}/></div>
                <span style={{fontSize:12,fontWeight:500,color:d<0?T.danger:T.warn,marginLeft:12,whiteSpace:"nowrap"}}>{d < 0 ? Math.abs(d) + "d vencido" : d + "d"}</span>
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
      ) : null}

      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:mob?10:16}}>
        <Card style={{marginBottom:0}}>
          <SecTitle>Estado de producción</SecTitle>
          {ESTADOS.filter(est => pedidos.some(p => p.estado === est)).map(est => {
            const ct = pedidos.filter(p => p.estado === est).length;
            const pct = pedidos.length ? Math.round(ct / pedidos.length * 100) : 0;
            const e = ES[est];
            return (
              <div key={est} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:"1px solid "+T.borderLt}}>
                <span style={{fontSize:11,padding:"3px 10px",borderRadius:99,background:e.bg,color:e.tx,fontWeight:500,whiteSpace:"nowrap",minWidth:110,textAlign:"center"}}>{est}</span>
                <div style={{flex:1,height:4,background:T.bgDeep,borderRadius:99}}><div style={{height:4,width:pct+"%",background:e.tx,borderRadius:99,opacity:0.7}}/></div>
                <span style={{fontSize:13,fontWeight:500,minWidth:20,textAlign:"right"}}>{ct}</span>
              </div>
            );
          })}
          {pedidos.length === 0 ? <div style={{textAlign:"center",color:T.inkLt,fontSize:13,padding:"1rem"}}>Sin pedidos aún.</div> : null}
        </Card>
        <Card style={{marginBottom:0}}>
          <SecTitle action={<Btn small onClick={() => setTab("artesanas")}>Ver todas →</Btn>}>Artesanas</SecTitle>
          {artesanas.length === 0 ? <div style={{textAlign:"center",color:T.inkLt,fontSize:13,padding:"1rem"}}>Sin artesanas cargadas.</div> : null}
          {artesanas.map(a => {
            const st = statsArt(a.id);
            const cap = capArt(a.id);
            return (
              <div key={a.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid "+T.borderLt,cursor:"pointer"}} onClick={() => setTab("artesanas")}>
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
}

// ═══════════════════════ PEDIDOS ═══════════════════════
function ModalPago({ p, onClose }) {
  const { pedidos, sp, getPrenda } = useApp();
  const [monto, setMonto] = useState("");
  const pr = getPrenda(p.prenda);
  const tot = (pr ? pr.p : 0) * p.cantidad;
  const saldo = tot - (p.pagado || 0);
  const sugeridos = [saldo, saldo / 2].filter(v => v > 0);
  return (
    <Ov onClose={onClose}>
      <MTitle onClose={onClose}>Registrar pago</MTitle>
      <div style={{background:T.bgMuted,borderRadius:2,padding:"12px 14px",marginBottom:16,fontSize:13}}>
        <div style={{fontWeight:500,marginBottom:4}}>{p.cliente} — {p.prenda}{p.talle ? " (" + p.talle + ")" : ""} ×{p.cantidad}</div>
        <div style={{display:"flex",gap:20,color:T.inkMid,fontSize:12}}>
          <span>Total <strong style={{color:T.ink}}>{fmt(tot)}</strong></span>
          <span>Cobrado <strong style={{color:T.ok}}>{fmt(p.pagado || 0)}</strong></span>
          <span>Saldo <strong style={{color:T.danger}}>{fmt(saldo)}</strong></span>
        </div>
      </div>
      <Inp label="Monto" type="number" min="0" value={monto} placeholder="0" onChange={e => setMonto(e.target.value)}/>
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {sugeridos.map(v => <Btn key={v} small onClick={() => setMonto(String(Math.round(v)))}>{fmt(v)}</Btn>)}
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:"1px solid "+T.borderLt}}>
        <Btn onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" disabled={num(monto) <= 0} onClick={() => {
          sp(pedidos.map(x => x.id === p.id ? Object.assign({}, x, {pagado:(x.pagado || 0) + num(monto)}) : x));
          onClose();
        }}>Registrar</Btn>
      </div>
    </Ov>
  );
}

function ModalEnvio({ p, onClose }) {
  const { pedidos, sp } = useApp();
  const [env, setEnv] = useState({
    envioEstado: p.envioEstado || "Sin envío",
    envioTracking: p.envioTracking || "",
    envioEmpresa: p.envioEmpresa || "",
    envioFecha: p.envioFecha || ""
  });
  return (
    <Ov onClose={onClose}>
      <MTitle onClose={onClose}>Gestionar envío</MTitle>
      <div style={{background:T.bgMuted,borderRadius:2,padding:"10px 14px",marginBottom:14,fontSize:13}}><strong>{p.cliente}</strong> — {p.prenda}{p.talle ? " (" + p.talle + ")" : ""} ×{p.cantidad}</div>
      <Sel label="Estado" value={env.envioEstado} onChange={e => setEnv(Object.assign({}, env, {envioEstado:e.target.value}))}>
        {ENVIO_ESTADOS.map(e => <option key={e}>{e}</option>)}
      </Sel>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Inp label="Empresa" value={env.envioEmpresa} onChange={e => setEnv(Object.assign({}, env, {envioEmpresa:e.target.value}))} placeholder="OCA, Correo…"/>
        <Inp label="Tracking" value={env.envioTracking} onChange={e => setEnv(Object.assign({}, env, {envioTracking:e.target.value}))}/>
      </div>
      <Inp label="Fecha despacho" type="date" value={env.envioFecha} onChange={e => setEnv(Object.assign({}, env, {envioFecha:e.target.value}))}/>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:"1px solid "+T.borderLt}}>
        <Btn onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" onClick={() => {
          sp(pedidos.map(x => x.id === p.id ? Object.assign({}, x, env) : x));
          onClose();
        }}>Guardar</Btn>
      </div>
    </Ov>
  );
}

function ModalOrden({ p, onClose }) {
  const { artesanas, cfg, getPrenda } = useApp();
  const pr = getPrenda(p.prenda);
  const art = artesanas.find(a => a.nombre === p.artesana);
  const tiempo = cfg.tiemposProd[p.prenda] || 14;
  const copiar = () => {
    let txt = "ORDEN #" + p.id + " — Junco Verde\nArtesana: " + p.artesana + "\nCliente: " + p.cliente;
    txt += "\nPrenda: " + p.prenda + (p.talle ? " (" + p.talle + ")" : "") + " x" + p.cantidad;
    txt += "\nEntrega: " + p.fechaEntrega;
    if (pr && pr.lana) txt += "\nLana: " + (pr.lana * p.cantidad) + "g";
    if (p.notas) txt += "\nNotas: " + p.notas;
    if (navigator.clipboard) navigator.clipboard.writeText(txt);
  };
  return (
    <Ov onClose={onClose} wide>
      <MTitle onClose={onClose}>Orden de trabajo</MTitle>
      <div style={{border:"1px solid "+T.border,borderRadius:2,padding:"1.5rem"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:20,paddingBottom:14,borderBottom:"1px solid "+T.borderLt}}>
          <div><div style={{fontSize:16,fontWeight:400,letterSpacing:"0.1em",textTransform:"uppercase"}}>Junco Verde</div><div style={{fontSize:11,color:T.inkLt}}>Orden #{p.id}</div></div>
          <div style={{textAlign:"right",fontSize:12,color:T.inkMid}}><div>Fecha: {hoy()}</div><div>Entrega: <strong style={{color:T.ink}}>{p.fechaEntrega}</strong></div></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:20}}>
          <div><div style={{fontSize:11,color:T.inkLt,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Artesana</div><div style={{fontSize:15,fontWeight:500}}>{p.artesana}</div><div style={{fontSize:12,color:T.inkMid}}>{art ? art.especialidad : ""}</div></div>
          <div><div style={{fontSize:11,color:T.inkLt,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Cliente</div><div style={{fontSize:15,fontWeight:500}}>{p.cliente}</div></div>
        </div>
        <div style={{background:T.bg,borderRadius:2,padding:"14px 16px",marginBottom:16}}>
          <div style={{fontSize:11,color:T.inkLt,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10}}>Prenda</div>
          <div style={{fontSize:18,fontWeight:400,marginBottom:8}}>{p.prenda}</div>
          <div style={{display:"flex",gap:20,fontSize:13,flexWrap:"wrap"}}>
            <span><span style={{color:T.inkMid}}>Cantidad:</span> <strong>{p.cantidad}</strong></span>
            {p.talle ? <span><span style={{color:T.inkMid}}>Talle:</span> <strong>{p.talle}</strong></span> : null}
            {pr && pr.lana > 0 ? <span><span style={{color:T.inkMid}}>Lana:</span> <strong>{pr.lana * p.cantidad}g</strong></span> : null}
            <span><span style={{color:T.inkMid}}>Tiempo est.:</span> <strong>{tiempo}d</strong></span>
          </div>
        </div>
        {p.notas ? <div style={{marginBottom:16}}><div style={{fontSize:11,color:T.inkLt,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Instrucciones</div><div style={{fontSize:13,padding:"10px 14px",background:T.warnLt,borderRadius:2,color:T.warn,fontWeight:500}}>{p.notas}</div></div> : null}
        {art && art.tecnicas && art.tecnicas.length > 0 ? (
          <div style={{marginBottom:20}}>
            <div style={{fontSize:11,color:T.inkLt,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Técnicas</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{art.tecnicas.map(t => <span key={t} style={{padding:"3px 10px",borderRadius:99,background:T.violetLt,color:T.violet,fontSize:11}}>{t}</span>)}</div>
          </div>
        ) : null}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,borderTop:"1px solid "+T.borderLt,paddingTop:16}}>
          <div><div style={{fontSize:11,color:T.inkLt,marginBottom:6}}>Recibí la lana asignada</div><div style={{height:40,borderBottom:"1px solid "+T.ink,marginTop:16}}/><div style={{fontSize:10,color:T.inkLt,marginTop:4}}>Firma artesana</div></div>
          <div><div style={{fontSize:11,color:T.inkLt,marginBottom:6}}>Entregué las prendas terminadas</div><div style={{height:40,borderBottom:"1px solid "+T.ink,marginTop:16}}/><div style={{fontSize:10,color:T.inkLt,marginTop:4}}>Firma · Fecha</div></div>
        </div>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:14}}>
        <Btn onClick={onClose}>Cerrar</Btn>
        <Btn variant="primary" onClick={copiar}>Copiar texto</Btn>
      </div>
    </Ov>
  );
}

function Pedidos() {
  const A = useApp();
  const { mob, pedidos, clientes, artesanas, getPrenda, sp, sa, cambiarEstado, setTab, catData, nombres, catOf } = A;
  const [filtEst, setFiltEst] = useState("Todos");
  const [filtArt, setFiltArt] = useState("Todas");
  const [nPed, setNPed] = useState(null);
  const [accion, setAccion] = useState(null);

  const tallesDe = n => tallesParaPrenda(n, catOf(n));
  const nuevoVacio = () => {
    const disp = artesanas.filter(a => a.disponible)[0] || artesanas[0];
    const primera = nombres[0] || "";
    return {
      cliente: clientes[0] ? clientes[0].nombre : "",
      prenda: primera,
      talle: tallesDe(primera)[0],
      artesana: disp ? disp.nombre : "",
      cantidad: "1", fechaEntrega: hoy(), notas: "", estado: "Pendiente", pagado: "",
      coleccion: "", envioEstado: "Sin envío", envioTracking: "", envioEmpresa: "", envioFecha: ""
    };
  };

  if (clientes.length === 0 || artesanas.length === 0) {
    return (
      <div>
        <SecTitle>Pedidos</SecTitle>
        <Empty icon="📋" title="Antes de crear pedidos" sub="Necesitás tener al menos una artesana y un cliente cargados."
          action={<div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center"}}><Btn variant="primary" onClick={() => setTab("artesanas")}>Cargar artesanas</Btn><Btn onClick={() => setTab("clientes")}>Cargar clientes</Btn></div>}/>
      </div>
    );
  }

  const filt = pedidos.filter(p => (filtEst === "Todos" || p.estado === filtEst) && (filtArt === "Todas" || p.artesana === filtArt));

  const crear = () => {
    const pr = getPrenda(nPed.prenda);
    const cant = Math.max(1, num(nPed.cantidad));
    const nuevo = Object.assign({}, nPed, {id: Date.now(), cantidad: cant, pagado: num(nPed.pagado)});
    sp(pedidos.concat([nuevo]));
    if (pr && pr.lana) {
      sa(artesanas.map(x => x.nombre === nPed.artesana ? Object.assign({}, x, {lana_asignada: (x.lana_asignada || 0) + pr.lana * cant}) : x));
    }
    setNPed(null);
  };

  const prNuevo = nPed ? getPrenda(nPed.prenda) : null;

  return (
    <div>
      <SecTitle action={<Btn variant="primary" onClick={() => setNPed(nuevoVacio())}>+ Nuevo pedido</Btn>}>Pedidos</SecTitle>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
        {["Todos"].concat(ESTADOS).map(e => <Pill key={e} active={filtEst === e} onClick={() => setFiltEst(e)}>{e}</Pill>)}
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:20}}>
        {["Todas"].concat(artesanas.map(a => a.nombre)).map(a => <Pill key={a} active={filtArt === a} onClick={() => setFiltArt(a)} color={T.tierra}>{a}</Pill>)}
      </div>

      {filt.length === 0 ? <Empty icon="📋" title="Sin pedidos" sub="Usá + Nuevo pedido para comenzar."/> : null}

      {mob ? (
        <div>
          {filt.map(p => {
            const pr = getPrenda(p.prenda);
            const tot = (pr ? pr.p : 0) * p.cantidad;
            const saldo = tot - (p.pagado || 0);
            const d = diasHasta(p.fechaEntrega);
            const venc = d < 0 && p.estado !== "Entregado";
            const cajas = [["Artesana", p.artesana, null], ["Entrega", p.fechaEntrega, venc ? T.danger : (d <= 3 ? T.warn : null)], ["Total", fmt(tot), null], ["Saldo", fmt(saldo), saldo > 0 ? T.danger : T.ok]];
            return (
              <div key={p.id} style={{background:venc?T.dangerLt:T.bgCard,border:"1px solid "+(venc?T.danger:T.border),borderRadius:4,padding:"1rem",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div><div style={{fontWeight:500,fontSize:14}}>{p.cliente}</div><div style={{fontSize:12,color:T.inkMid,marginTop:2}}>{p.prenda}{p.talle ? " · " + p.talle : ""} ×{p.cantidad}</div></div>
                  <Badge e={p.estado}/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                  {cajas.map(c => (
                    <div key={c[0]} style={{background:T.bg,borderRadius:2,padding:"6px 8px"}}><div style={{fontSize:10,color:T.inkLt,textTransform:"uppercase",marginBottom:2}}>{c[0]}</div><div style={{fontSize:12,fontWeight:500,color:c[2] || T.ink}}>{c[1]}</div></div>
                  ))}
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <select value={p.estado} onChange={e => cambiarEstado(p.id, e.target.value)} style={{padding:"6px 10px",border:"1px solid "+T.border,borderRadius:2,background:ES[p.estado].bg,color:ES[p.estado].tx,fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit",flex:1,marginRight:8}}>
                    {ESTADOS.map(e => <option key={e}>{e}</option>)}
                  </select>
                  <div style={{display:"flex",gap:6}}>
                    <Btn small onClick={() => setAccion({tipo:"pago", p:p})}>Pago</Btn>
                    <Btn small onClick={() => setAccion({tipo:"orden", p:p})}>Orden</Btn>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        filt.length > 0 ? (
          <Card style={{padding:0,overflow:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:900}}>
              <thead><tr style={{background:T.bg}}><TH>Cliente</TH><TH>Prenda</TH><TH>Talle</TH><TH>Artesana</TH><TH>Cant.</TH><TH>Estado</TH><TH>Entrega</TH><TH>Total</TH><TH>Saldo</TH><TH>Envío</TH><TH></TH></tr></thead>
              <tbody>
                {filt.map((p, i) => {
                  const pr = getPrenda(p.prenda);
                  const tot = (pr ? pr.p : 0) * p.cantidad;
                  const saldo = tot - (p.pagado || 0);
                  const d = diasHasta(p.fechaEntrega);
                  const venc = d < 0 && p.estado !== "Entregado";
                  const envBg = p.envioEstado === "Entregado" ? T.okLt : p.envioEstado === "Sin envío" ? T.bgMuted : T.infoLt;
                  const envTx = p.envioEstado === "Entregado" ? T.ok : p.envioEstado === "Sin envío" ? T.inkLt : T.info;
                  return (
                    <tr key={p.id} style={{background:venc?T.dangerLt:(i%2===0?T.bgCard:T.bg)}}>
                      <TD><strong style={{fontWeight:500}}>{p.cliente}</strong></TD>
                      <TD style={{fontSize:11,color:T.inkMid}}>{p.prenda}</TD>
                      <TD><span style={{fontSize:11,padding:"2px 8px",borderRadius:99,background:T.bgMuted,color:T.inkMid}}>{p.talle || "—"}</span></TD>
                      <TD>{p.artesana}</TD>
                      <TD>{p.cantidad}</TD>
                      <TD>
                        <select value={p.estado} onChange={e => cambiarEstado(p.id, e.target.value)} style={{padding:"3px 8px",border:"1px solid "+T.border,borderRadius:2,background:ES[p.estado].bg,color:ES[p.estado].tx,fontSize:11,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>
                          {ESTADOS.map(e => <option key={e}>{e}</option>)}
                        </select>
                      </TD>
                      <TD style={{fontSize:11,color:venc?T.danger:(d<=3?T.warn:T.ink)}}>{p.fechaEntrega}</TD>
                      <TD>{fmt(tot)}</TD>
                      <TD style={{fontWeight:500,color:saldo>0?T.danger:T.ok}}>{fmt(saldo)}</TD>
                      <TD><span style={{fontSize:10,padding:"2px 8px",borderRadius:99,background:envBg,color:envTx}}>{p.envioEstado}</span></TD>
                      <TD>
                        <div style={{display:"flex",gap:4}}>
                          <Btn small onClick={() => setAccion({tipo:"pago", p:p})}>Pago</Btn>
                          <Btn small onClick={() => setAccion({tipo:"envio", p:p})}>Envío</Btn>
                          <Btn small onClick={() => setAccion({tipo:"orden", p:p})}>Orden</Btn>
                        </div>
                      </TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        ) : null
      )}

      {accion && accion.tipo === "pago" ? <ModalPago p={accion.p} onClose={() => setAccion(null)}/> : null}
      {accion && accion.tipo === "envio" ? <ModalEnvio p={accion.p} onClose={() => setAccion(null)}/> : null}
      {accion && accion.tipo === "orden" ? <ModalOrden p={accion.p} onClose={() => setAccion(null)}/> : null}

      {nPed ? (
        <Ov onClose={() => setNPed(null)}>
          <MTitle onClose={() => setNPed(null)}>Nuevo pedido</MTitle>
          <Sel label="Cliente" value={nPed.cliente} onChange={e => setNPed(Object.assign({}, nPed, {cliente:e.target.value}))}>
            {clientes.map(c => <option key={c.id}>{c.nombre}</option>)}
          </Sel>
          <Sel label="Prenda" value={nPed.prenda} onChange={e => setNPed(Object.assign({}, nPed, {prenda:e.target.value, talle:tallesDe(e.target.value)[0] || ""}))}>
            {Object.entries(catData).map(([cat, items]) => <optgroup key={cat} label={cat}>{items.map(p => <option key={p.n} value={p.n}>{p.n}</option>)}</optgroup>)}
          </Sel>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            <Sel label="Talle" value={nPed.talle} onChange={e => setNPed(Object.assign({}, nPed, {talle:e.target.value}))}>
              {tallesDe(nPed.prenda).map(t => <option key={t}>{t}</option>)}
            </Sel>
            <Sel label="Artesana" value={nPed.artesana} onChange={e => setNPed(Object.assign({}, nPed, {artesana:e.target.value}))}>
              {artesanas.map(a => <option key={a.id}>{a.nombre}</option>)}
            </Sel>
            <Inp label="Cantidad" type="number" min="1" value={nPed.cantidad} onChange={e => setNPed(Object.assign({}, nPed, {cantidad:e.target.value}))}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="Fecha entrega" type="date" value={nPed.fechaEntrega} onChange={e => setNPed(Object.assign({}, nPed, {fechaEntrega:e.target.value}))}/>
            <Inp label="Seña inicial" type="number" min="0" placeholder="0" value={nPed.pagado} onChange={e => setNPed(Object.assign({}, nPed, {pagado:e.target.value}))}/>
          </div>
          <Inp label="Colección" value={nPed.coleccion} onChange={e => setNPed(Object.assign({}, nPed, {coleccion:e.target.value}))} placeholder="OI 2025, PV 2026…"/>
          <Inp label="Notas" value={nPed.notas} onChange={e => setNPed(Object.assign({}, nPed, {notas:e.target.value}))} placeholder="Color, instrucciones…"/>
          {prNuevo ? (
            <div style={{background:T.bgMuted,borderRadius:2,padding:"10px 14px",marginBottom:14,fontSize:12,display:"flex",gap:18,flexWrap:"wrap"}}>
              <span style={{color:T.inkMid}}>Costo <strong style={{color:prNuevo.c>0?T.ink:T.danger}}>{prNuevo.c > 0 ? fmt(prNuevo.c) : "sin precio"}</strong></span>
              <span style={{color:T.inkMid}}>Precio <strong style={{color:prNuevo.p>0?T.ink:T.danger}}>{prNuevo.p > 0 ? fmt(prNuevo.p) : "sin precio"}</strong></span>
              {prNuevo.c > 0 && prNuevo.p > 0 ? <span style={{color:T.ok}}>Margen <strong>{fmt((prNuevo.p - prNuevo.c) * num(nPed.cantidad))}</strong></span> : null}
              {prNuevo.lana > 0 ? <span style={{color:T.tierra}}>Lana <strong>{prNuevo.lana * num(nPed.cantidad)}g</strong></span> : null}
            </div>
          ) : null}
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:"1px solid "+T.borderLt}}>
            <Btn onClick={() => setNPed(null)}>Cancelar</Btn>
            <Btn variant="primary" onClick={crear} disabled={!nPed.cliente || !nPed.artesana || !nPed.prenda}>Crear pedido</Btn>
          </div>
        </Ov>
      ) : null}
    </div>
  );
}

// ═══════════════════════ CLIENTES ═══════════════════════
function Clientes() {
  const { clientes, sc, statsCliente } = useApp();
  const [editC, setEditC] = useState(null);
  const vacio = () => ({id: Date.now(), nombre: "", tipo: "Particular", email: "", tel: "", ciudad: "", notas: "", descuento: ""});
  const guardar = () => {
    const c = Object.assign({}, editC, {descuento: num(editC.descuento)});
    if (clientes.find(x => x.id === c.id)) sc(clientes.map(x => x.id === c.id ? c : x));
    else sc(clientes.concat([c]));
    setEditC(null);
  };
  return (
    <div>
      <SecTitle action={<Btn variant="primary" onClick={() => setEditC(vacio())}>+ Nuevo cliente</Btn>}>Clientes</SecTitle>
      {clientes.length === 0 ? <Empty icon="👥" title="Sin clientes" sub="Cargá tus primeros clientes." action={<Btn variant="primary" onClick={() => setEditC(vacio())}>+ Nuevo cliente</Btn>}/> : null}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:12}}>
        {clientes.map(c => {
          const st = statsCliente(c.id);
          const cajas = [[st.ped.length, "Pedidos"], [fmt(st.total), "Total"], [fmt(st.saldo), "Saldo"]];
          return (
            <Card key={c.id} style={{marginBottom:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                <div><div style={{fontSize:15,fontWeight:500}}>{c.nombre}</div><div style={{fontSize:11,color:T.inkMid,marginTop:2}}>{c.tipo}{c.ciudad ? " · " + c.ciudad : ""}</div></div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  {c.descuento > 0 ? <span style={{fontSize:10,padding:"2px 8px",borderRadius:99,background:T.okLt,color:T.ok}}>{c.descuento}% desc.</span> : null}
                  <Btn small onClick={() => setEditC(Object.assign({}, c, {descuento: c.descuento ? String(c.descuento) : ""}))}>Editar</Btn>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
                {cajas.map(x => (
                  <div key={x[1]} style={{background:T.bg,borderRadius:2,padding:"8px 10px"}}>
                    <div style={{fontSize:10,color:T.inkLt,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:3}}>{x[1]}</div>
                    <div style={{fontSize:14,fontWeight:500,color:x[1]==="Saldo" && st.saldo>0 ? T.danger : T.ink}}>{x[0]}</div>
                  </div>
                ))}
              </div>
              {st.ped.slice(-3).reverse().map(p => (
                <div key={p.id} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"5px 0",borderBottom:"1px solid "+T.borderLt}}>
                  <span>{p.prenda}{p.talle ? " (" + p.talle + ")" : ""} ×{p.cantidad}</span>
                  <div style={{display:"flex",gap:8}}><Badge e={p.estado}/><span style={{color:T.inkMid}}>{p.fechaEntrega}</span></div>
                </div>
              ))}
              {(c.email || c.tel) ? <div style={{marginTop:8,fontSize:11,color:T.inkMid,borderTop:"1px solid "+T.borderLt,paddingTop:8}}>{c.email ? <div>{c.email}</div> : null}{c.tel ? <div>{c.tel}</div> : null}</div> : null}
            </Card>
          );
        })}
      </div>
      {editC ? (
        <Ov onClose={() => setEditC(null)}>
          <MTitle onClose={() => setEditC(null)}>{clientes.find(x => x.id === editC.id) ? "Editar cliente" : "Nuevo cliente"}</MTitle>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="Nombre" value={editC.nombre} onChange={e => setEditC(Object.assign({}, editC, {nombre:e.target.value}))}/>
            <Sel label="Tipo" value={editC.tipo} onChange={e => setEditC(Object.assign({}, editC, {tipo:e.target.value}))}>
              {["Revendedor","Exportación","Web","Feria","Particular"].map(t => <option key={t}>{t}</option>)}
            </Sel>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="Email" type="email" value={editC.email} onChange={e => setEditC(Object.assign({}, editC, {email:e.target.value}))}/>
            <Inp label="Teléfono" value={editC.tel} onChange={e => setEditC(Object.assign({}, editC, {tel:e.target.value}))}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="Ciudad" value={editC.ciudad} onChange={e => setEditC(Object.assign({}, editC, {ciudad:e.target.value}))}/>
            <Inp label="Descuento %" type="number" min="0" max="50" placeholder="0" value={editC.descuento} onChange={e => setEditC(Object.assign({}, editC, {descuento:e.target.value}))}/>
          </div>
          <Inp label="Notas" value={editC.notas} onChange={e => setEditC(Object.assign({}, editC, {notas:e.target.value}))}/>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:"1px solid "+T.borderLt}}>
            <Btn onClick={() => setEditC(null)}>Cancelar</Btn>
            {clientes.find(x => x.id === editC.id) ? <Btn variant="danger" onClick={() => { sc(clientes.filter(x => x.id !== editC.id)); setEditC(null); }}>Eliminar</Btn> : null}
            <Btn variant="primary" disabled={!editC.nombre} onClick={guardar}>Guardar</Btn>
          </div>
        </Ov>
      ) : null}
    </div>
  );
}

// ═══════════════════════ ARTESANAS ═══════════════════════
function FichaArtesana({ a, onClose }) {
  const { statsArt, capArt, getPrenda } = useApp();
  const st = statsArt(a.id);
  const cap = capArt(a.id);
  const cajas = [[st.totalPrendas, "Entregadas"], [st.pendPrendas, "En proceso"], [fmt(st.totalValor), "Valor"], [st.tasaEntrega + "%", "Tasa"]];
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(30,28,24,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}}>
      <div style={{background:T.bgCard,border:"1px solid "+T.border,borderRadius:4,padding:"2rem",width:640,maxWidth:"96vw",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:20,paddingBottom:14,borderBottom:"1px solid "+T.borderLt}}>
          <div style={{display:"flex",gap:14,alignItems:"center"}}>
            <div style={{width:44,height:44,borderRadius:"50%",background:T.greenLt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:T.green}}>{a.nombre[0]}</div>
            <div><div style={{fontSize:17,fontWeight:400}}>{a.nombre}</div><div style={{fontSize:12,color:T.inkMid,marginTop:2}}>{a.especialidad}</div></div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:T.inkLt}}>×</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
          {cajas.map(c => (
            <div key={c[1]} style={{background:T.bg,borderRadius:2,padding:"10px 12px"}}>
              <div style={{fontSize:10,color:T.inkLt,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:3}}>{c[1]}</div>
              <div style={{fontSize:17,fontWeight:300}}>{c[0]}</div>
            </div>
          ))}
        </div>
        <div style={{background:T.bg,borderRadius:2,padding:"10px 14px",marginBottom:14,display:"flex",justifyContent:"space-between"}}>
          <div><div style={{fontSize:11,color:T.inkLt,marginBottom:2}}>Capacidad mensual</div><div style={{fontSize:12}}>{cap.ocupada}/{cap.cap} · <span style={{color:cap.libre>0?T.ok:T.danger}}>{cap.libre} libres</span></div></div>
          <div style={{textAlign:"right"}}><div style={{fontSize:11,color:T.inkLt,marginBottom:2}}>Lana asignada</div><div style={{fontSize:14,fontWeight:500,color:(a.lana_asignada||0)>4000?T.warn:T.ok}}>{(a.lana_asignada || 0).toLocaleString()}g</div></div>
        </div>
        {a.tecnicas && a.tecnicas.length > 0 ? (
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,color:T.inkLt,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Técnicas</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{a.tecnicas.map(t => <span key={t} style={{padding:"4px 12px",borderRadius:99,background:T.violetLt,color:T.violet,fontSize:12}}>{t}</span>)}</div>
          </div>
        ) : null}
        {a.prendas_habituales && a.prendas_habituales.length > 0 ? (
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,color:T.inkLt,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Prendas que teje</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{a.prendas_habituales.map(p => <span key={p} style={{padding:"3px 10px",borderRadius:99,background:T.greenLt,color:T.green,fontSize:11}}>{p}</span>)}</div>
          </div>
        ) : null}
        {st.pend.length > 0 ? (
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,color:T.inkLt,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>En curso</div>
            {st.pend.map(p => {
              const d = diasHasta(p.fechaEntrega);
              const es = ES[p.estado];
              return (
                <div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid "+T.borderLt,fontSize:12}}>
                  <span><strong>{p.prenda}</strong>{p.talle ? " (" + p.talle + ")" : ""} ×{p.cantidad} — {p.cliente}</span>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <span style={{padding:"2px 9px",borderRadius:99,fontSize:10,fontWeight:500,background:es.bg,color:es.tx}}>{p.estado}</span>
                    <span style={{color:d<0?T.danger:(d<=3?T.warn:T.inkMid)}}>{d < 0 ? Math.abs(d) + "d venc." : d + "d"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
        {st.entg.length > 0 ? (
          <div>
            <div style={{fontSize:11,color:T.inkLt,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Historial</div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr>{["Prenda","Talle","Cant.","Cliente","Fecha","Valor"].map(h => <th key={h} style={{textAlign:"left",padding:"6px 0",borderBottom:"1px solid "+T.border,color:T.inkLt,fontWeight:500,fontSize:11}}>{h}</th>)}</tr></thead>
              <tbody>
                {st.entg.slice().reverse().map(p => {
                  const pr = getPrenda(p.prenda);
                  const celda = {padding:"6px 0",borderBottom:"1px solid "+T.borderLt};
                  return (
                    <tr key={p.id}>
                      <td style={celda}>{p.prenda}</td>
                      <td style={Object.assign({color:T.inkMid}, celda)}>{p.talle || "—"}</td>
                      <td style={celda}>{p.cantidad}</td>
                      <td style={celda}>{p.cliente}</td>
                      <td style={Object.assign({color:T.inkMid}, celda)}>{p.fechaEntrega}</td>
                      <td style={Object.assign({color:T.ok}, celda)}>{fmt((pr ? pr.p : 0) * p.cantidad)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
        {a.notas ? <div style={{marginTop:12,fontSize:11,color:T.inkMid,fontStyle:"italic",borderTop:"1px solid "+T.borderLt,paddingTop:10}}>{a.notas}</div> : null}
      </div>
    </div>
  );
}

function Artesanas() {
  const { mob, artesanas, sa, statsArt, capArt, nombres } = useApp();
  const [editA, setEditA] = useState(null);
  const [fichaA, setFichaA] = useState(null);
  const vacia = () => ({id: Date.now(), nombre: "", especialidad: "", tecnicas: [], prendas_habituales: [], disponible: true, lana_asignada: "", capacidad_semanal: "2", notas: ""});
  const abrirEditar = a => setEditA(Object.assign({}, a, {
    tecnicas: (a.tecnicas || []).slice(),
    prendas_habituales: (a.prendas_habituales || []).slice(),
    lana_asignada: a.lana_asignada ? String(a.lana_asignada) : "",
    capacidad_semanal: String(a.capacidad_semanal || 2)
  }));
  const toggle = (key, val) => setEditA(a => Object.assign({}, a, {[key]: a[key].includes(val) ? a[key].filter(x => x !== val) : a[key].concat([val])}));
  const guardar = () => {
    const a = Object.assign({}, editA, {lana_asignada: num(editA.lana_asignada), capacidad_semanal: Math.max(1, num(editA.capacidad_semanal))});
    if (artesanas.find(x => x.id === a.id)) sa(artesanas.map(x => x.id === a.id ? a : x));
    else sa(artesanas.concat([a]));
    setEditA(null);
  };
  return (
    <div>
      <SecTitle action={<Btn variant="primary" onClick={() => setEditA(vacia())}>+ Nueva artesana</Btn>}>Artesanas</SecTitle>
      {artesanas.length === 0 ? <Empty icon="🧶" title="Sin artesanas" sub="Cargá las artesanas del taller." action={<Btn variant="primary" onClick={() => setEditA(vacia())}>+ Nueva artesana</Btn>}/> : null}

      {mob ? (
        <div>
          {artesanas.map(a => {
            const cap = capArt(a.id);
            return (
              <div key={a.id} style={{background:T.bgCard,border:"1px solid "+T.border,borderRadius:4,padding:"1rem",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div style={{display:"flex",gap:10,alignItems:"center"}}>
                    <div style={{width:36,height:36,borderRadius:"50%",background:a.disponible?T.greenLt:T.bgMuted,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:a.disponible?T.green:T.inkLt,fontWeight:500}}>{a.nombre[0]}</div>
                    <div><div style={{fontWeight:500,fontSize:14}}>{a.nombre}</div><div style={{fontSize:11,color:T.inkMid}}>{a.especialidad}</div></div>
                  </div>
                  <span style={{fontSize:10,padding:"2px 8px",borderRadius:99,background:a.disponible?T.okLt:T.warnLt,color:a.disponible?T.ok:T.warn}}>{a.disponible ? "Disponible" : "Ocupada"}</span>
                </div>
                <Bar pct={cap.pct} color={cap.pct>80?T.danger:cap.pct>50?T.warn:T.ok}/>
                <div style={{display:"flex",gap:6,marginTop:10}}>
                  <Btn small onClick={() => setFichaA(a)}>Ver ficha</Btn>
                  <Btn small onClick={() => abrirEditar(a)}>Editar</Btn>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        artesanas.length > 0 ? (
          <Card style={{padding:0,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr style={{background:T.bg}}><TH>Artesana</TH><TH>Especialidad</TH><TH>Lana asig.</TH><TH>Entregadas</TH><TH>Pend.</TH><TH>Valor</TH><TH>Capacidad</TH><TH>Estado</TH><TH></TH></tr></thead>
              <tbody>
                {artesanas.map((a, i) => {
                  const st = statsArt(a.id);
                  const cap = capArt(a.id);
                  return (
                    <tr key={a.id} style={{background:i%2===0?T.bgCard:T.bg}}>
                      <TD><strong style={{fontWeight:500}}>{a.nombre}</strong></TD>
                      <TD style={{color:T.inkMid,fontSize:12}}>{a.especialidad}</TD>
                      <TD>{(a.lana_asignada || 0).toLocaleString()}g</TD>
                      <TD><strong style={{fontWeight:500}}>{st.totalPrendas}</strong></TD>
                      <TD style={{color:st.pendPrendas>0?T.info:T.inkLt}}>{st.pendPrendas}</TD>
                      <TD style={{color:T.ok}}>{fmt(st.totalValor)}</TD>
                      <TD style={{minWidth:100}}><div style={{fontSize:11}}>{cap.ocupada}/{cap.cap}</div><Bar pct={cap.pct} color={cap.pct>80?T.danger:cap.pct>50?T.warn:T.ok}/></TD>
                      <TD><span style={{fontSize:10,padding:"2px 8px",borderRadius:99,background:a.disponible?T.okLt:T.warnLt,color:a.disponible?T.ok:T.warn}}>{a.disponible ? "Disponible" : "Ocupada"}</span></TD>
                      <TD><div style={{display:"flex",gap:4}}><Btn small onClick={() => setFichaA(a)}>Ficha</Btn><Btn small onClick={() => abrirEditar(a)}>Editar</Btn></div></TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        ) : null
      )}

      {fichaA ? <FichaArtesana a={fichaA} onClose={() => setFichaA(null)}/> : null}

      {editA ? (
        <Ov onClose={() => setEditA(null)}>
          <MTitle onClose={() => setEditA(null)}>{artesanas.find(x => x.id === editA.id) ? "Editar artesana" : "Nueva artesana"}</MTitle>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="Nombre" value={editA.nombre} onChange={e => setEditA(Object.assign({}, editA, {nombre:e.target.value}))}/>
            <Inp label="Especialidad" value={editA.especialidad} onChange={e => setEditA(Object.assign({}, editA, {especialidad:e.target.value}))}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            <Inp label="Lana asignada (g)" type="number" placeholder="0" value={editA.lana_asignada} onChange={e => setEditA(Object.assign({}, editA, {lana_asignada:e.target.value}))}/>
            <Inp label="Cap. semanal" type="number" min="1" value={editA.capacidad_semanal} onChange={e => setEditA(Object.assign({}, editA, {capacidad_semanal:e.target.value}))}/>
            <Sel label="Estado" value={editA.disponible ? "1" : "0"} onChange={e => setEditA(Object.assign({}, editA, {disponible:e.target.value === "1"}))}>
              <option value="1">Disponible</option><option value="0">Ocupada</option>
            </Sel>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,color:T.inkMid,marginBottom:6}}>Técnicas</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {TECNICAS.map(t => {
                const on = editA.tecnicas.includes(t);
                return <span key={t} onClick={() => toggle("tecnicas", t)} style={{padding:"4px 12px",borderRadius:99,fontSize:12,cursor:"pointer",background:on?T.violetLt:"transparent",color:on?T.violet:T.inkMid,border:"1px solid "+(on?T.violet:T.border)}}>{t}</span>;
              })}
            </div>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,color:T.inkMid,marginBottom:6}}>Prendas que teje</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5,maxHeight:120,overflowY:"auto"}}>
              {nombres.map(n => {
                const on = editA.prendas_habituales.includes(n);
                return <span key={n} onClick={() => toggle("prendas_habituales", n)} style={{padding:"3px 9px",borderRadius:99,fontSize:11,cursor:"pointer",background:on?T.greenLt:"transparent",color:on?T.green:T.inkMid,border:"1px solid "+(on?T.green:T.border)}}>{n}</span>;
              })}
            </div>
          </div>
          <Inp label="Notas" value={editA.notas} onChange={e => setEditA(Object.assign({}, editA, {notas:e.target.value}))}/>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:"1px solid "+T.borderLt}}>
            <Btn onClick={() => setEditA(null)}>Cancelar</Btn>
            {artesanas.find(x => x.id === editA.id) ? <Btn variant="danger" onClick={() => { sa(artesanas.filter(x => x.id !== editA.id)); setEditA(null); }}>Eliminar</Btn> : null}
            <Btn variant="primary" disabled={!editA.nombre} onClick={guardar}>Guardar</Btn>
          </div>
        </Ov>
      ) : null}
    </div>
  );
}

// ═══════════════════════ PAGOS A ARTESANAS ═══════════════════════
function PagosArt() {
  const { mob, artesanas, pedidos, pagosArt, spa, resumenArtPago, moSugerida, setTab } = useApp();
  const [filtA2, setFiltA2] = useState("Todas");
  const [filtMes, setFiltMes] = useState("Todos");
  const [nPago, setNPago] = useState(null);

  if (artesanas.length === 0) {
    return <div><SecTitle>Pagos a artesanas</SecTitle><Empty icon="💚" title="Sin artesanas" sub="Cargá artesanas primero." action={<Btn variant="primary" onClick={() => setTab("artesanas")}>Ir a Artesanas</Btn>}/></div>;
  }

  const meses = Array.from(new Set(pagosArt.map(p => p.fecha ? p.fecha.slice(0, 7) : "").filter(Boolean))).sort().reverse();
  const pfilt = pagosArt.filter(p => (filtA2 === "Todas" || p.artesana === filtA2) && (filtMes === "Todos" || (p.fecha || "").startsWith(filtMes)));
  const totMO = artesanas.reduce((a, x) => a + resumenArtPago(x.nombre).totalMO, 0);
  const totPag = artesanas.reduce((a, x) => a + resumenArtPago(x.nombre).totalPag, 0);
  const totPend = artesanas.reduce((a, x) => a + resumenArtPago(x.nombre).pendiente, 0);

  const abrirPago = nombre => {
    const ped = pedidos.filter(p => p.artesana === nombre && p.estado === "Entregado");
    const ul = ped[ped.length - 1];
    setNPago({artesana: nombre, monto: ul ? String(moSugerida(ul)) : "", fecha: hoy(), concepto: "Prendas entregadas", metodo: "Transferencia", notas: ""});
  };
  const registrar = () => {
    spa(pagosArt.concat([Object.assign({}, nPago, {id: Date.now(), monto: num(nPago.monto)})]));
    setNPago(null);
  };
  const resNPago = nPago ? resumenArtPago(nPago.artesana) : null;

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24,paddingBottom:12,borderBottom:"1px solid "+T.borderLt}}>
        <div><div style={{fontSize:11,color:T.inkLt,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>Comercio justo</div><div style={{fontSize:22,fontWeight:300}}>Pagos a artesanas</div></div>
        <Btn variant="primary" onClick={() => abrirPago(artesanas[0].nombre)}>+ Registrar pago</Btn>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:24}}>
        <Met label="M.O. estimada" value={fmt(totMO)}/>
        <Met label="Total pagado" value={fmt(totPag)} accent={T.ok}/>
        <Met label="Pendiente" value={fmt(totPend)} accent={totPend > 0 ? T.warn : T.ok}/>
        <Met label="Pagos" value={pagosArt.length}/>
      </div>

      {mob ? (
        <div style={{marginBottom:16}}>
          {artesanas.map(a => {
            const r = resumenArtPago(a.nombre);
            const pct = r.totalMO > 0 ? Math.min(100, Math.round(r.totalPag / r.totalMO * 100)) : 100;
            return (
              <div key={a.id} style={{background:T.bgCard,border:"1px solid "+T.border,borderRadius:4,padding:"1rem",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                  <div><div style={{fontWeight:500,fontSize:14}}>{a.nombre}</div><div style={{fontSize:11,color:T.inkMid}}>{a.especialidad}</div></div>
                  <Btn small variant={r.pendiente > 0 ? "primary" : "ghost"} onClick={() => abrirPago(a.nombre)}>{r.pendiente > 0 ? "Pagar" : "+ Pago"}</Btn>
                </div>
                <div style={{fontSize:12,color:T.inkMid,marginBottom:4}}>Pendiente: <strong style={{color:r.pendiente>0?T.warn:T.ok}}>{r.pendiente > 0 ? fmt(r.pendiente) : "Al día"}</strong></div>
                <Bar pct={pct} color={pct === 100 ? T.ok : (pct > 50 ? T.green : T.warn)}/>
              </div>
            );
          })}
        </div>
      ) : (
        <Card style={{marginBottom:16,padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{background:T.bg}}><TH>Artesana</TH><TH>Especialidad</TH><TH>Prendas entregadas</TH><TH>M.O. estimada</TH><TH>Pagado</TH><TH>Pendiente</TH><TH></TH></tr></thead>
            <tbody>
              {artesanas.map((a, i) => {
                const r = resumenArtPago(a.nombre);
                const pct = r.totalMO > 0 ? Math.min(100, Math.round(r.totalPag / r.totalMO * 100)) : 100;
                return (
                  <tr key={a.id} style={{background:i%2===0?T.bgCard:T.bg}}>
                    <TD><strong style={{fontWeight:500}}>{a.nombre}</strong></TD>
                    <TD style={{color:T.inkMid,fontSize:12}}>{a.especialidad}</TD>
                    <TD>{r.entg.length} pedidos · {r.entg.reduce((s, p) => s + p.cantidad, 0)} prendas</TD>
                    <TD style={{fontWeight:500}}>{fmt(r.totalMO)}</TD>
                    <TD><span style={{color:T.ok,fontWeight:500}}>{fmt(r.totalPag)}</span><Bar pct={pct} color={pct === 100 ? T.ok : (pct > 50 ? T.green : T.warn)}/></TD>
                    <TD><span style={{fontWeight:500,color:r.pendiente>0?T.warn:T.ok}}>{r.pendiente > 0 ? fmt(r.pendiente) : "✓ Al día"}</span></TD>
                    <TD><Btn small variant={r.pendiente > 0 ? "primary" : "ghost"} onClick={() => abrirPago(a.nombre)}>{r.pendiente > 0 ? "Pagar" : "+ Pago"}</Btn></TD>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
        {["Todas"].concat(artesanas.map(a => a.nombre)).map(a => <Pill key={a} active={filtA2 === a} onClick={() => setFiltA2(a)} color={T.tierra}>{a}</Pill>)}
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
        {["Todos"].concat(meses).map(m => <Pill key={m} active={filtMes === m} onClick={() => setFiltMes(m)}>{m === "Todos" ? "Todos los meses" : m}</Pill>)}
      </div>
      <Card style={{padding:0,overflow:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead><tr style={{background:T.bg}}><TH>Fecha</TH><TH>Artesana</TH><TH>Concepto</TH><TH>Método</TH><TH>Monto</TH><TH>Notas</TH><TH></TH></tr></thead>
          <tbody>
            {pfilt.length === 0 ? <tr><td colSpan={7} style={{padding:"2rem",textAlign:"center",color:T.inkLt,fontSize:13}}>Sin pagos registrados aún.</td></tr> : null}
            {pfilt.slice().reverse().map((p, i) => (
              <tr key={p.id} style={{background:i%2===0?T.bgCard:T.bg}}>
                <TD style={{fontSize:12,color:T.inkMid}}>{p.fecha}</TD>
                <TD><strong style={{fontWeight:500}}>{p.artesana}</strong></TD>
                <TD style={{fontSize:12}}>{p.concepto}</TD>
                <TD><span style={{fontSize:11,padding:"2px 8px",borderRadius:99,background:T.infoLt,color:T.info}}>{p.metodo}</span></TD>
                <TD><strong style={{fontWeight:500,color:T.ok}}>{fmt(p.monto)}</strong></TD>
                <TD style={{fontSize:11,color:T.inkMid}}>{p.notas || "—"}</TD>
                <TD><Btn small onClick={() => spa(pagosArt.filter(x => x.id !== p.id))}>✕</Btn></TD>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {nPago ? (
        <Ov onClose={() => setNPago(null)}>
          <MTitle onClose={() => setNPago(null)}>Registrar pago</MTitle>
          <Sel label="Artesana" value={nPago.artesana} onChange={e => abrirPago(e.target.value)}>
            {artesanas.map(a => <option key={a.id}>{a.nombre}</option>)}
          </Sel>
          {resNPago && resNPago.totalMO > 0 ? (
            <div style={{background:T.bgMuted,borderRadius:2,padding:"10px 14px",marginBottom:14,fontSize:12,display:"flex",gap:16,flexWrap:"wrap"}}>
              <span>M.O. est. <strong>{fmt(resNPago.totalMO)}</strong></span>
              <span style={{color:T.ok}}>Pagado <strong>{fmt(resNPago.totalPag)}</strong></span>
              <span style={{color:resNPago.pendiente>0?T.warn:T.ok}}>Pend. <strong>{fmt(resNPago.pendiente)}</strong></span>
            </div>
          ) : null}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="Monto ($)" type="number" min="0" placeholder="0" value={nPago.monto} onChange={e => setNPago(Object.assign({}, nPago, {monto:e.target.value}))}/>
            <Inp label="Fecha" type="date" value={nPago.fecha} onChange={e => setNPago(Object.assign({}, nPago, {fecha:e.target.value}))}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Sel label="Concepto" value={nPago.concepto} onChange={e => setNPago(Object.assign({}, nPago, {concepto:e.target.value}))}>
              {["Prendas entregadas","Mano de obra","Anticipo","Aguinaldo","Bonificación","Otro"].map(c => <option key={c}>{c}</option>)}
            </Sel>
            <Sel label="Método" value={nPago.metodo} onChange={e => setNPago(Object.assign({}, nPago, {metodo:e.target.value}))}>
              {["Transferencia","Efectivo","MercadoPago","Redpagos","Cheque","Otro"].map(m => <option key={m}>{m}</option>)}
            </Sel>
          </div>
          <Inp label="Notas" value={nPago.notas} onChange={e => setNPago(Object.assign({}, nPago, {notas:e.target.value}))} placeholder="Ej: pago quincenal…"/>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:"1px solid "+T.borderLt}}>
            <Btn onClick={() => setNPago(null)}>Cancelar</Btn>
            <Btn variant="primary" disabled={num(nPago.monto) <= 0} onClick={registrar}>Registrar pago</Btn>
          </div>
        </Ov>
      ) : null}
    </div>
  );
}

// ═══════════════════════ PRODUCCIÓN ═══════════════════════
function Planif() {
  const { artesanas, activos, lanas, cfg, getPrenda, capArt, setTab, catData, nombres } = useApp();
  const [simCant, setSimCant] = useState("1");
  const [simPrenda, setSimPrenda] = useState(nombres[0] || "");
  const pr = getPrenda(simPrenda) || {p: 0, c: 0, lana: 0};
  const cant = Math.max(1, num(simCant));
  const lanaTotal = lanas.reduce((a, l) => a + l.stock, 0);
  const lanaNec = pr.lana * cant;
  const tiempo = cfg.tiemposProd[simPrenda] || 14;

  if (artesanas.length === 0) {
    return <div><SecTitle>Producción</SecTitle><Empty icon="📅" title="Sin artesanas" sub="Cargá artesanas para planificar." action={<Btn variant="primary" onClick={() => setTab("artesanas")}>Ir a Artesanas</Btn>}/></div>;
  }
  const cajas = [
    [fmt(pr.p * cant), "Venta", T.green],
    [fmt(pr.c * cant), "Costo", T.ink],
    [fmt((pr.p - pr.c) * cant), "Margen", T.ok],
    [lanaNec.toLocaleString() + "g", "Lana", (lanaNec > lanaTotal && lanaTotal > 0) ? T.danger : T.tierra],
    [tiempo + "d", "Tiempo", T.info]
  ];
  return (
    <div>
      <SecTitle>Planificación de producción</SecTitle>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10,marginBottom:24}}>
        {artesanas.map(a => {
          const cap = capArt(a.id);
          return (
            <div key={a.id} style={{background:T.bgCard,border:"1px solid "+T.border,borderRadius:4,padding:"1rem"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:13,fontWeight:500}}>{a.nombre}</span><span style={{fontSize:10,padding:"2px 8px",borderRadius:99,background:a.disponible?T.okLt:T.warnLt,color:a.disponible?T.ok:T.warn}}>{a.disponible ? "Disp." : "Ocupada"}</span></div>
              <div style={{fontSize:11,color:T.inkMid,marginBottom:8}}>{a.especialidad}</div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}><span style={{color:T.inkMid}}>En producción</span><span style={{fontWeight:500}}>{cap.ocupada}/{cap.cap}</span></div>
              <Bar pct={cap.pct} color={cap.pct>80?T.danger:cap.pct>50?T.warn:T.ok}/>
              <div style={{marginTop:8,fontSize:11,color:cap.libre>0?T.ok:T.danger}}>{cap.libre > 0 ? cap.libre + " libres" : "Sin capacidad"}</div>
            </div>
          );
        })}
      </div>
      <Card>
        <div style={{fontSize:11,color:T.inkMid,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:12}}>Simulador</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          <Sel label="Prenda" value={simPrenda} onChange={e => setSimPrenda(e.target.value)}>
            {Object.entries(catData).map(([cat, items]) => <optgroup key={cat} label={cat}>{items.map(p => <option key={p.n} value={p.n}>{p.n}</option>)}</optgroup>)}
          </Sel>
          <Inp label="Cantidad" type="number" min="1" value={simCant} onChange={e => setSimCant(e.target.value)}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:10}}>
          {cajas.map(c => (
            <div key={c[1]} style={{background:T.bg,borderRadius:2,padding:"10px 12px"}}><div style={{fontSize:10,color:T.inkLt,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{c[1]}</div><div style={{fontSize:16,fontWeight:500,color:c[2]}}>{c[0]}</div></div>
          ))}
        </div>
      </Card>
      {activos.length > 0 ? (
        <Card>
          <div style={{fontSize:11,color:T.inkMid,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:16}}>Próximas entregas</div>
          {activos.slice().sort((a, b) => new Date(a.fechaEntrega) - new Date(b.fechaEntrega)).map(p => {
            const d = diasHasta(p.fechaEntrega);
            const pct = Math.max(0, Math.min(100, Math.round((1 - d / 30) * 100)));
            return (
              <div key={p.id} style={{marginBottom:12,paddingBottom:12,borderBottom:"1px solid "+T.borderLt}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:13}}><strong>{p.prenda}</strong> ×{p.cantidad} — {p.cliente} — {p.artesana}</span>
                  <span style={{fontSize:12,fontWeight:500,color:d<0?T.danger:(d<=3?T.warn:T.inkMid),whiteSpace:"nowrap",marginLeft:8}}>{d < 0 ? Math.abs(d) + "d vencido" : d + "d"}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{flex:1,height:4,background:T.bgDeep,borderRadius:99}}><div style={{height:4,width:pct+"%",background:d<0?T.danger:(d<=3?T.warn:T.green),borderRadius:99}}/></div>
                  <Badge e={p.estado}/>
                </div>
              </div>
            );
          })}
        </Card>
      ) : null}
    </div>
  );
}

// ═══════════════════════ ANÁLISIS ═══════════════════════
function Analisis() {
  const { pedidos, clientes, artesanas, getPrenda, statsCliente, statsArt, finanzasMes, topPrendas } = useApp();
  const [sec, setSec] = useState("financiero");
  if (pedidos.length === 0) {
    return <div><SecTitle>Análisis</SecTitle><Empty icon="📊" title="Sin datos" sub="El análisis se construye a medida que cargás pedidos."/></div>;
  }
  const vT = pedidos.reduce((a, p) => { const pr = getPrenda(p.prenda); return a + (pr ? pr.p : 0) * p.cantidad; }, 0);
  const cT = pedidos.reduce((a, p) => { const pr = getPrenda(p.prenda); return a + (pr ? pr.c : 0) * p.cantidad; }, 0);
  const maxV = Math.max.apply(null, finanzasMes.map(m => m.venta).concat([1]));
  const vporCli = clientes.map(c => ({nombre: c.nombre, total: statsCliente(c.id).total})).sort((a, b) => b.total - a.total);
  const maxCli = Math.max.apply(null, vporCli.map(c => c.total).concat([1]));
  const pedEnt = pedidos.filter(p => p.estado === "Entregado");
  const pedAct = pedidos.filter(p => p.estado !== "Entregado");
  const venc = pedAct.filter(p => diasHasta(p.fechaEntrega) < 0);
  const riesgo = pedAct.filter(p => { const d = diasHasta(p.fechaEntrega); return d >= 0 && d <= 5; });
  const enTiempo = pedAct.filter(p => diasHasta(p.fechaEntrega) > 5);
  const tasaG = Math.round(pedEnt.length / pedidos.length * 100);
  const SECS = [{id:"financiero",l:"Financiero"},{id:"artesanas",l:"Artesanas"},{id:"expedicion",l:"Expedición"}];
  const maxP = Math.max.apply(null, artesanas.map(x => statsArt(x.id).totalPrendas).concat([1]));
  const semaforo = [
    {label:"Vencidos", items:venc, color:T.danger, bg:T.dangerLt},
    {label:"En riesgo (1–5d)", items:riesgo, color:T.warn, bg:T.warnLt},
    {label:"En tiempo (>5d)", items:enTiempo, color:T.ok, bg:T.okLt}
  ];
  return (
    <div>
      <SecTitle>Análisis</SecTitle>
      <div style={{display:"flex",gap:8,marginBottom:28,flexWrap:"wrap"}}>
        {SECS.map(s => <button key={s.id} onClick={() => setSec(s.id)} style={{padding:"7px 18px",borderRadius:2,border:"1px solid "+(sec===s.id?T.green:T.border),background:sec===s.id?T.greenLt:"transparent",color:sec===s.id?T.green:T.inkMid,cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:sec===s.id?500:400}}>{s.l}</button>)}
      </div>

      {sec === "financiero" ? (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:12,marginBottom:24}}>
            <Met label="Venta histórica" value={fmt(vT)} accent={T.green}/>
            <Met label="Costo total" value={fmt(cT)}/>
            <Met label="Margen" value={fmt(vT - cT)} accent={T.ok} sub={Math.round((vT - cT) / Math.max(vT, 1) * 100) + "%"}/>
            <Met label="Ticket promedio" value={fmt(vT / pedidos.length)}/>
            <Met label="Prendas" value={pedidos.reduce((a, p) => a + p.cantidad, 0)}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:16,marginBottom:16}}>
            <Card style={{marginBottom:0}}>
              <div style={{fontSize:11,color:T.inkMid,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:16}}>Evolución mensual</div>
              {finanzasMes.length === 0 ? <span style={{fontSize:12,color:T.inkLt}}>Sin pedidos entregados aún.</span> : null}
              {finanzasMes.map(m => (
                <div key={m.mes} style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:12}}><span style={{color:T.inkMid}}>{m.mes}</span><span style={{color:T.green,fontWeight:500}}>{fmt(m.venta)}</span></div>
                  <div style={{height:8,background:T.bgDeep,borderRadius:99,marginBottom:3,overflow:"hidden"}}><div style={{height:8,width:Math.round(m.venta / maxV * 100) + "%",background:T.green,borderRadius:99}}/></div>
                  <div style={{height:4,background:T.bgDeep,borderRadius:99,overflow:"hidden"}}><div style={{height:4,width:Math.round(m.costo / maxV * 100) + "%",background:T.tierra,borderRadius:99,opacity:0.7}}/></div>
                </div>
              ))}
            </Card>
            <Card style={{marginBottom:0}}>
              <div style={{fontSize:11,color:T.inkMid,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:16}}>Ventas por cliente</div>
              {vporCli.filter(c => c.total > 0).map(c => (
                <div key={c.nombre} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3,fontSize:12}}><span>{c.nombre}</span><span style={{fontWeight:500,color:T.green}}>{fmt(c.total)}</span></div>
                  <Bar pct={Math.round(c.total / maxCli * 100)} color={T.green}/>
                </div>
              ))}
              {vporCli.filter(c => c.total > 0).length === 0 ? <span style={{fontSize:12,color:T.inkLt}}>Sin ventas aún (cargá los precios del catálogo).</span> : null}
            </Card>
          </div>
          {topPrendas.length > 0 ? (
            <Card style={{padding:0,overflow:"auto"}}>
              <div style={{fontSize:11,color:T.inkMid,letterSpacing:"0.06em",textTransform:"uppercase",padding:"1.25rem 1.5rem 0"}}>Prendas más pedidas</div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr style={{background:T.bg}}><TH>Prenda</TH><TH>Unidades</TH><TH>Venta</TH><TH>Margen unit.</TH><TH>Margen %</TH></tr></thead>
                <tbody>
                  {topPrendas.map((p, i) => {
                    const pr = getPrenda(p.n) || {p: 0, c: 0};
                    const mg = pr.p - pr.c;
                    const mgp = pr.p ? Math.round(mg / pr.p * 100) : 0;
                    return (
                      <tr key={p.n} style={{background:i%2===0?T.bgCard:T.bg}}>
                        <TD><strong style={{fontWeight:500}}>{p.n}</strong></TD>
                        <TD style={{fontWeight:500}}>{p.qty}</TD>
                        <TD style={{color:T.green,fontWeight:500}}>{fmt(p.venta)}</TD>
                        <TD style={{color:T.ok}}>{fmt(mg)}</TD>
                        <TD><span style={{padding:"2px 8px",borderRadius:99,background:mgp>60?T.okLt:(mgp>40?T.warnLt:T.dangerLt),color:mgp>60?T.ok:(mgp>40?T.warn:T.danger),fontSize:11,fontWeight:500}}>{mgp}%</span></TD>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          ) : null}
        </div>
      ) : null}

      {sec === "artesanas" ? (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:12,marginBottom:24}}>
            <Met label="Artesanas" value={artesanas.length}/>
            <Met label="Disponibles" value={artesanas.filter(a => a.disponible).length} accent={T.ok}/>
            <Met label="Prendas entregadas" value={pedEnt.reduce((a, p) => a + p.cantidad, 0)} accent={T.green}/>
            <Met label="Valor producido" value={fmt(pedEnt.reduce((a, p) => { const pr = getPrenda(p.prenda); return a + (pr ? pr.p : 0) * p.cantidad; }, 0))} accent={T.green}/>
          </div>
          <Card style={{padding:0,overflow:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr style={{background:T.bg}}><TH>#</TH><TH>Artesana</TH><TH>Especialidad</TH><TH>Prendas</TH><TH>Valor</TH><TH>Pedidos</TH><TH>Tasa</TH><TH>Pend.</TH></tr></thead>
              <tbody>
                {artesanas.map((a, i) => {
                  const st = statsArt(a.id);
                  const tBg = st.tasaEntrega >= 80 ? T.okLt : (st.tasaEntrega >= 50 ? T.warnLt : T.dangerLt);
                  const tTx = st.tasaEntrega >= 80 ? T.ok : (st.tasaEntrega >= 50 ? T.warn : T.danger);
                  return (
                    <tr key={a.id} style={{background:i%2===0?T.bgCard:T.bg}}>
                      <TD>{i + 1}</TD>
                      <TD><strong style={{fontWeight:500}}>{a.nombre}</strong></TD>
                      <TD style={{color:T.inkMid,fontSize:12}}>{a.especialidad}</TD>
                      <TD><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{flex:1,height:4,background:T.bgDeep,borderRadius:99,minWidth:60}}><div style={{height:4,width:Math.round(st.totalPrendas / maxP * 100) + "%",background:T.green,borderRadius:99}}/></div><span style={{fontWeight:500}}>{st.totalPrendas}</span></div></TD>
                      <TD style={{color:T.ok,fontWeight:500}}>{fmt(st.totalValor)}</TD>
                      <TD style={{color:T.inkMid}}>{st.ped.length}</TD>
                      <TD><span style={{padding:"3px 10px",borderRadius:99,background:tBg,color:tTx,fontSize:11,fontWeight:500}}>{st.tasaEntrega}%</span></TD>
                      <TD style={{color:st.pendPrendas>0?T.info:T.inkLt}}>{st.pendPrendas}</TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      ) : null}

      {sec === "expedicion" ? (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:12,marginBottom:24}}>
            <Met label="Tasa de entrega" value={tasaG + "%"} accent={tasaG>=80?T.ok:(tasaG>=50?T.warn:T.danger)}/>
            <Met label="Entregados" value={pedEnt.length} accent={T.ok}/>
            <Met label="Vencidos" value={venc.length} accent={venc.length>0?T.danger:T.ok}/>
            <Met label="En riesgo (≤5d)" value={riesgo.length} accent={riesgo.length>0?T.warn:T.ok}/>
            <Met label="Total pedidos" value={pedidos.length}/>
          </div>
          <Card>
            <div style={{fontSize:11,color:T.inkMid,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:16}}>Semáforo</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
              {semaforo.map(s => (
                <div key={s.label} style={{background:s.bg,borderRadius:4,padding:"1rem 1.25rem",borderLeft:"3px solid "+s.color}}>
                  <div style={{fontSize:11,color:s.color,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6,fontWeight:500}}>{s.label}</div>
                  <div style={{fontSize:32,fontWeight:300,color:s.color,letterSpacing:"-1px",marginBottom:8}}>{s.items.length}</div>
                  {s.items.slice(0, 3).map(p => {
                    const d = diasHasta(p.fechaEntrega);
                    return <div key={p.id} style={{fontSize:11,color:s.color,padding:"3px 0",borderBottom:"1px solid rgba(0,0,0,0.06)"}}>{p.prenda} — {p.artesana}<span style={{float:"right",fontWeight:500}}>{d < 0 ? Math.abs(d) + "d venc." : d + "d"}</span></div>;
                  })}
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

// ═══════════════════════ STOCK DE PRENDAS ═══════════════════════
function StockPrendas() {
  const { stockP, ss, cfg, getPrenda, catData, nombres } = useApp();
  const [addM, setAddM] = useState(false);
  const [ns, setNs] = useState({prenda: nombres[0] || "", qty: "1"});
  const [busq, setBusq] = useState("");
  const filt = stockP.filter(s => s.prenda.toLowerCase().includes(busq.toLowerCase()));
  const agregar = () => {
    const pr = getPrenda(ns.prenda);
    if (!pr) return;
    const q = Math.max(1, num(ns.qty));
    const ex = stockP.find(x => x.prenda === ns.prenda);
    if (ex) ss(stockP.map(x => x.prenda === ns.prenda ? Object.assign({}, x, {qty: x.qty + q}) : x));
    else ss(stockP.concat([{id: Date.now(), prenda: ns.prenda, cat: pr.cat, qty: q, costo: pr.c, precio: pr.p}]));
    setAddM(false);
  };
  const cambiar = (id, delta) => ss(stockP.map(x => x.id === id ? Object.assign({}, x, {qty: Math.max(0, x.qty + delta)}) : x));
  const btnSt = {width:22,height:22,borderRadius:2,border:"1px solid "+T.border,background:T.bgCard,cursor:"pointer",color:T.ink,fontSize:14,fontFamily:"inherit"};
  return (
    <div>
      <SecTitle action={<Btn variant="primary" onClick={() => setAddM(true)}>+ Agregar</Btn>}>Stock de prendas</SecTitle>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:12,marginBottom:20}}>
        <Met label="Unidades" value={stockP.reduce((a, s) => a + s.qty, 0)}/>
        <Met label="Sin stock" value={stockP.filter(s => s.qty === 0).length} accent={T.danger}/>
        <Met label="Stock bajo" value={stockP.filter(s => s.qty <= cfg.stockMinimoDefault && s.qty > 0).length} accent={T.warn}/>
        <Met label="Valor total" value={fmt(stockP.reduce((a, s) => a + s.precio * s.qty, 0))} accent={T.green}/>
      </div>
      {stockP.length === 0 ? <Empty icon="👗" title="Sin stock" sub="El stock se genera al marcar pedidos como Entregados." action={<Btn variant="primary" onClick={() => setAddM(true)}>+ Agregar</Btn>}/> : null}
      {stockP.length > 0 ? (
        <div>
          <div style={{marginBottom:16}}><input value={busq} onChange={e => setBusq(e.target.value)} placeholder="Buscar…" style={{padding:"8px 14px",border:"1px solid "+T.border,borderRadius:2,background:T.bgCard,color:T.ink,fontSize:13,width:260,maxWidth:"100%",outline:"none",fontFamily:"inherit"}}/></div>
          <Card style={{padding:0,overflow:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr style={{background:T.bg}}><TH>Prenda</TH><TH>Cat.</TH><TH>Stock</TH><TH>Costo</TH><TH>Precio</TH><TH>Margen</TH><TH>Valor</TH><TH></TH></tr></thead>
              <tbody>
                {filt.map((s, i) => {
                  const mg = s.precio > 0 ? Math.round((s.precio - s.costo) / s.precio * 100) : 0;
                  return (
                    <tr key={s.id} style={{background:s.qty===0?T.dangerLt:(i%2===0?T.bgCard:T.bg)}}>
                      <TD><strong style={{fontWeight:500}}>{s.prenda}</strong></TD>
                      <TD style={{color:T.inkMid,fontSize:11}}>{s.cat}</TD>
                      <TD>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <button onClick={() => cambiar(s.id, -1)} style={btnSt}>−</button>
                          <span style={{fontWeight:500,color:s.qty===0?T.danger:(s.qty<=cfg.stockMinimoDefault?T.warn:T.ink),minWidth:22,textAlign:"center"}}>{s.qty}</span>
                          <button onClick={() => cambiar(s.id, 1)} style={btnSt}>+</button>
                        </div>
                      </TD>
                      <TD style={{color:T.inkMid}}>{fmt(s.costo)}</TD>
                      <TD><strong style={{fontWeight:500}}>{fmt(s.precio)}</strong></TD>
                      <TD><span style={{color:mg>=cfg.margenMinimoAlerta?T.ok:T.danger}}>{mg}%</span></TD>
                      <TD>{fmt(s.precio * s.qty)}</TD>
                      <TD><Btn small onClick={() => ss(stockP.filter(x => x.id !== s.id))}>✕</Btn></TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      ) : null}
      {addM ? (
        <Ov onClose={() => setAddM(false)}>
          <MTitle onClose={() => setAddM(false)}>Agregar stock</MTitle>
          <Sel label="Prenda" value={ns.prenda} onChange={e => setNs(Object.assign({}, ns, {prenda:e.target.value}))}>
            {Object.entries(catData).map(([cat, items]) => <optgroup key={cat} label={cat}>{items.map(p => <option key={p.n} value={p.n}>{p.n}</option>)}</optgroup>)}
          </Sel>
          <Inp label="Cantidad" type="number" min="1" value={ns.qty} onChange={e => setNs(Object.assign({}, ns, {qty:e.target.value}))}/>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:"1px solid "+T.borderLt}}>
            <Btn onClick={() => setAddM(false)}>Cancelar</Btn>
            <Btn variant="primary" disabled={!ns.prenda} onClick={agregar}>Agregar</Btn>
          </div>
        </Ov>
      ) : null}
    </div>
  );
}

// ═══════════════════════ STOCK DE LANAS ═══════════════════════
function ReponerLana({ l }) {
  const { lanas, sl } = useApp();
  const [g, setG] = useState("500");
  return (
    <div style={{display:"flex",gap:6,alignItems:"center"}}>
      <input type="number" min="0" value={g} onChange={e => setG(e.target.value)} style={{width:70,padding:"5px 8px",border:"1px solid "+T.border,borderRadius:2,fontSize:12,background:T.bgCard,color:T.ink,fontFamily:"inherit"}}/>
      <Btn small onClick={() => sl(lanas.map(x => x.id === l.id ? Object.assign({}, x, {stock: x.stock + num(g)}) : x))}>+g</Btn>
      <Btn small onClick={() => sl(lanas.filter(x => x.id !== l.id))}>✕</Btn>
    </div>
  );
}

function Lanas() {
  const { lanas, sl, lanasBajas } = useApp();
  const [nL, setNL] = useState(null);
  const vacia = () => ({tipo: "", color: "", proveedor: "", precio_kg: "", stock: "", minimo: "1000"});
  const guardar = () => {
    sl(lanas.concat([{id: Date.now(), tipo: nL.tipo, color: nL.color, proveedor: nL.proveedor, precio_kg: num(nL.precio_kg), stock: num(nL.stock), minimo: num(nL.minimo)}]));
    setNL(null);
  };
  return (
    <div>
      <SecTitle action={<Btn variant="primary" onClick={() => setNL(vacia())}>+ Agregar lana</Btn>}>Stock de lanas</SecTitle>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:12,marginBottom:20}}>
        <Met label="Stock total" value={lanas.reduce((a, l) => a + l.stock, 0).toLocaleString() + "g"}/>
        <Met label="Bajo mínimo" value={lanasBajas.length} accent={lanasBajas.length > 0 ? T.danger : T.ok}/>
        <Met label="Valor inventario" value={fmt(lanas.reduce((a, l) => a + l.stock / 1000 * l.precio_kg, 0))} accent={T.green}/>
      </div>
      {lanas.length === 0 ? <Empty icon="🧵" title="Sin lanas" sub="Cargá los tipos de lana con stock actual y mínimo de alerta." action={<Btn variant="primary" onClick={() => setNL(vacia())}>+ Agregar lana</Btn>}/> : null}
      {lanas.length > 0 ? (
        <Card style={{padding:0,overflow:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:800}}>
            <thead><tr style={{background:T.bg}}><TH>Tipo</TH><TH>Color</TH><TH>Stock</TH><TH>Mínimo</TH><TH>Estado</TH><TH>Proveedor</TH><TH>$/kg</TH><TH>Reponer</TH></tr></thead>
            <tbody>
              {lanas.map((l, i) => {
                const baja = l.stock < l.minimo;
                const pct = l.minimo > 0 ? Math.min(100, Math.round(l.stock / l.minimo * 100)) : 100;
                return (
                  <tr key={l.id} style={{background:baja?T.warnLt:(i%2===0?T.bgCard:T.bg)}}>
                    <TD><strong style={{fontWeight:500}}>{l.tipo}</strong></TD>
                    <TD style={{color:T.inkMid,fontSize:12}}>{l.color}</TD>
                    <TD style={{minWidth:120}}><span style={{fontWeight:500,color:baja?T.warn:T.ink}}>{l.stock.toLocaleString()}g</span><Bar pct={pct} color={baja?T.warn:T.ok}/></TD>
                    <TD style={{color:T.inkMid}}>{l.minimo.toLocaleString()}g</TD>
                    <TD><span style={{fontSize:10,padding:"2px 10px",borderRadius:99,background:baja?T.warnLt:T.okLt,color:baja?T.warn:T.ok}}>{baja ? "Reponer" : "OK"}</span></TD>
                    <TD style={{fontSize:12}}>{l.proveedor}</TD>
                    <TD style={{color:T.inkMid}}>{fmt(l.precio_kg)}</TD>
                    <TD><ReponerLana l={l}/></TD>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ) : null}
      {nL ? (
        <Ov onClose={() => setNL(null)}>
          <MTitle onClose={() => setNL(null)}>Agregar lana</MTitle>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="Tipo" value={nL.tipo} onChange={e => setNL(Object.assign({}, nL, {tipo:e.target.value}))} placeholder="Merino Natural…"/>
            <Inp label="Color" value={nL.color} onChange={e => setNL(Object.assign({}, nL, {color:e.target.value}))} placeholder="Crudo, Teñido…"/>
            <Inp label="Proveedor" value={nL.proveedor} onChange={e => setNL(Object.assign({}, nL, {proveedor:e.target.value}))}/>
            <Inp label="Precio/kg ($)" type="number" min="0" placeholder="0" value={nL.precio_kg} onChange={e => setNL(Object.assign({}, nL, {precio_kg:e.target.value}))}/>
            <Inp label="Stock actual (g)" type="number" min="0" placeholder="0" value={nL.stock} onChange={e => setNL(Object.assign({}, nL, {stock:e.target.value}))}/>
            <Inp label="Stock mínimo (g)" type="number" min="0" placeholder="0" value={nL.minimo} onChange={e => setNL(Object.assign({}, nL, {minimo:e.target.value}))}/>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:"1px solid "+T.borderLt}}>
            <Btn onClick={() => setNL(null)}>Cancelar</Btn>
            <Btn variant="primary" disabled={!nL.tipo} onClick={guardar}>Agregar</Btn>
          </div>
        </Ov>
      ) : null}
    </div>
  );
}

// ═══════════════════════ TALLES ═══════════════════════
function Talles() {
  const { talles, stl, lanas } = useApp();
  const [grupo, setGrupo] = useState("adultos");
  const [editIdx, setEditIdx] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [addM, setAddM] = useState(false);
  const vacia = () => ({talle: "", busto: "", largo: "", manga: "", cintura: "", cadera: "", peso: "", lana: "", manoObra: ""});
  const [newRow, setNewRow] = useState(vacia());
  const rows = talles[grupo] || [];
  const precioLanaKg = lanas.length ? Math.round(lanas.reduce((a, l) => a + l.precio_kg, 0) / lanas.length) : 3000;
  const costoEst = r => Math.round((num(r.lana) / 1000) * precioLanaKg + num(r.manoObra));
  const opc = v => (v === "" || v === null || v === undefined) ? null : Number(v);
  const normalizar = r => ({talle: r.talle, busto: opc(r.busto), largo: opc(r.largo), manga: opc(r.manga), cintura: opc(r.cintura), cadera: opc(r.cadera), peso: num(r.peso), lana: num(r.lana), manoObra: num(r.manoObra)});
  const cancelar = () => { setEditIdx(null); setEditRow(null); };
  const guardarEdit = () => {
    const nuevas = rows.map((r, i) => i === editIdx ? normalizar(editRow) : r);
    stl(Object.assign({}, talles, {[grupo]: nuevas}));
    cancelar();
  };
  const borrar = i => stl(Object.assign({}, talles, {[grupo]: rows.filter((_, j) => j !== i)}));
  const agregar = () => {
    stl(Object.assign({}, talles, {[grupo]: rows.concat([normalizar(newRow)])}));
    setAddM(false);
    setNewRow(vacia());
  };
  const celdaIn = {padding:"5px 7px",border:"1px solid "+T.border,borderRadius:2,background:T.bgCard,color:T.ink,fontSize:12,fontFamily:"inherit",width:"100%",boxSizing:"border-box"};
  const td = {padding:"11px 12px",borderBottom:"1px solid "+T.borderLt};
  const tdE = {padding:"8px 10px",borderBottom:"1px solid "+T.borderLt};
  const camposNum = ["busto","largo","manga","cintura","cadera","peso","lana","manoObra"];
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24,paddingBottom:12,borderBottom:"1px solid "+T.borderLt}}>
        <div><div style={{fontSize:11,color:T.inkLt,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>Producción</div><div style={{fontSize:22,fontWeight:300}}>Tabla de talles</div></div>
        <Btn variant="primary" onClick={() => setAddM(true)}>+ Agregar talle</Btn>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:24}}>
        {GRUPOS_TALLES.map(g => {
          const on = grupo === g.id;
          return (
            <div key={g.id} onClick={() => { setGrupo(g.id); cancelar(); }} style={{background:on?T.green:T.bgCard,border:"1px solid "+(on?T.green:T.border),borderRadius:4,padding:"1rem 1.25rem",cursor:"pointer"}}>
              <div style={{fontSize:14,fontWeight:500,color:on?"#fff":T.ink,marginBottom:3}}>{g.label}</div>
              <div style={{fontSize:11,color:on?"rgba(255,255,255,0.7)":T.inkLt}}>{g.sub}</div>
              <div style={{fontSize:12,color:on?"rgba(255,255,255,0.8)":T.inkMid,marginTop:6}}>{(talles[g.id] || []).length} talles</div>
            </div>
          );
        })}
      </div>
      <Card style={{padding:0,overflow:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:820}}>
          <thead>
            <tr style={{background:T.bg}}>
              {COLS_TALLE.map(c => <th key={c.k} style={{textAlign:"left",padding:"10px 12px",borderBottom:"1px solid "+T.border,fontSize:11,fontWeight:500,letterSpacing:"0.05em",textTransform:"uppercase",color:T.inkLt,whiteSpace:"nowrap"}}>{c.label}{c.unit ? <span style={{fontSize:9,marginLeft:3}}>({c.unit})</span> : null}</th>)}
              <th style={{textAlign:"left",padding:"10px 12px",borderBottom:"1px solid "+T.border,fontSize:11,fontWeight:500,color:T.inkLt}}>Costo est.</th>
              <th style={{padding:"10px 12px",borderBottom:"1px solid "+T.border}}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              if (editIdx === i) {
                return (
                  <tr key={i} style={{background:T.greenLt}}>
                    <td style={tdE}><input value={editRow.talle} onChange={e => setEditRow(Object.assign({}, editRow, {talle:e.target.value}))} style={celdaIn}/></td>
                    {camposNum.map(k => <td key={k} style={tdE}><input type="number" min="0" value={editRow[k] === null || editRow[k] === undefined ? "" : editRow[k]} onChange={e => setEditRow(Object.assign({}, editRow, {[k]:e.target.value}))} style={celdaIn}/></td>)}
                    <td style={tdE}><span style={{fontSize:12,color:T.ok,fontWeight:500}}>{fmt(costoEst(editRow))}</span></td>
                    <td style={tdE}><div style={{display:"flex",gap:4}}><Btn small variant="primary" onClick={guardarEdit}>✓</Btn><Btn small onClick={cancelar}>✕</Btn></div></td>
                  </tr>
                );
              }
              return (
                <tr key={i} style={{background:i%2===0?T.bgCard:T.bg}}>
                  <td style={td}><strong style={{fontWeight:500}}>{r.talle}</strong></td>
                  {["busto","largo","manga","cintura","cadera"].map(k => <td key={k} style={Object.assign({color:r[k]==null?T.inkLt:T.inkMid}, td)}>{r[k] != null ? r[k] : "—"}</td>)}
                  <td style={Object.assign({color:T.inkMid}, td)}>{r.peso}</td>
                  <td style={Object.assign({color:T.info,fontWeight:500}, td)}>{r.lana}g</td>
                  <td style={Object.assign({color:r.manoObra>0?T.tierra:T.danger,fontWeight:500}, td)}>{r.manoObra > 0 ? fmt(r.manoObra) : <span style={{fontSize:11}}>Pendiente</span>}</td>
                  <td style={td}>{r.manoObra > 0 ? <span style={{background:T.okLt,color:T.ok,borderRadius:2,padding:"3px 10px",fontSize:12,fontWeight:500}}>{fmt(costoEst(r))}</span> : <span style={{fontSize:11,color:T.inkLt}}>—</span>}</td>
                  <td style={td}><div style={{display:"flex",gap:4}}><Btn small onClick={() => { setEditIdx(i); setEditRow(Object.assign({}, r)); }}>Editar</Btn><Btn small onClick={() => borrar(i)}>✕</Btn></div></td>
                </tr>
              );
            })}
            {rows.length === 0 ? <tr><td colSpan={COLS_TALLE.length + 2} style={{padding:"2rem",textAlign:"center",color:T.inkLt,fontSize:13}}>Sin talles. Agregá el primero.</td></tr> : null}
          </tbody>
        </table>
      </Card>
      {addM ? (
        <Ov onClose={() => setAddM(false)}>
          <MTitle onClose={() => setAddM(false)}>Agregar talle — {GRUPOS_TALLES.find(g => g.id === grupo).label}</MTitle>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Inp label="Talle" value={newRow.talle} onChange={e => setNewRow(Object.assign({}, newRow, {talle:e.target.value}))} placeholder="Ej: M, 5-6 años"/>
            <Inp label="Peso (g)" type="number" min="0" value={newRow.peso} onChange={e => setNewRow(Object.assign({}, newRow, {peso:e.target.value}))}/>
          </div>
          <div style={{fontSize:11,color:T.inkMid,marginBottom:10,marginTop:4,letterSpacing:"0.06em",textTransform:"uppercase"}}>Medidas (cm) — opcional</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            {["busto","largo","manga","cintura","cadera"].map(k => <Inp key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} type="number" min="0" value={newRow[k]} onChange={e => setNewRow(Object.assign({}, newRow, {[k]:e.target.value}))}/>)}
          </div>
          <div style={{fontSize:11,color:T.inkMid,marginBottom:10,marginTop:4,letterSpacing:"0.06em",textTransform:"uppercase"}}>Costos</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Inp label="Lana necesaria (g)" type="number" min="0" value={newRow.lana} onChange={e => setNewRow(Object.assign({}, newRow, {lana:e.target.value}))}/>
            <Inp label="Mano de obra ($)" type="number" min="0" value={newRow.manoObra} onChange={e => setNewRow(Object.assign({}, newRow, {manoObra:e.target.value}))}/>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:"1px solid "+T.borderLt}}>
            <Btn onClick={() => setAddM(false)}>Cancelar</Btn>
            <Btn variant="primary" disabled={!newRow.talle} onClick={agregar}>Agregar</Btn>
          </div>
        </Ov>
      ) : null}
    </div>
  );
}

// ═══════════════════════ COMPROBANTES ═══════════════════════
function Comprobantes() {
  const { comps, sco, provs, spr, clientes, sc, lanas, sl, stockP, ss, pedidos, sp, cfg, todosNombres } = useApp();
  const [vista, setVista] = useState("lista");
  const [selComp, setSelComp] = useState(null);
  const [filtTipo, setFiltTipo] = useState("Todos");
  const [filtPag, setFiltPag] = useState("Todos");
  const [editProv, setEditProv] = useState(null);
  const itemVacio = () => ({descripcion: "", qty: "1", precio_unit: "", iva: 22, subtotal: 0});
  const formVacio = () => ({tipo: "Factura compra", numero: "", fecha: hoy(), proveedor_cliente: "", items: [itemVacio()], notas: "", pagado: false, subtotal: 0, iva_total: 0, total: 0});
  const [form, setForm] = useState(formVacio());

  const calcItem = it => Object.assign({}, it, {subtotal: Math.round(num(it.qty) * num(it.precio_unit))});
  const recalc = items => {
    const sub = items.reduce((a, i) => a + i.subtotal, 0);
    const ivaT = items.reduce((a, i) => a + Math.round(i.subtotal * (i.iva / 100)), 0);
    return {subtotal: sub, iva_total: ivaT, total: sub + ivaT};
  };
  const updItem = (idx, key, val) => {
    const items = form.items.map((it, i) => i !== idx ? it : calcItem(Object.assign({}, it, {[key]: val})));
    setForm(Object.assign({}, form, {items: items}, recalc(items)));
  };
  const quitarItem = idx => {
    const items = form.items.filter((_, j) => j !== idx);
    setForm(Object.assign({}, form, {items: items}, recalc(items)));
  };

  const aplicar = comp => {
    if (comp.tipo === "Factura compra") {
      if (comp.proveedor_cliente && !provs.find(p => p.nombre === comp.proveedor_cliente)) {
        spr(provs.concat([{id: Date.now(), nombre: comp.proveedor_cliente, rut: "", email: "", tel: "", ciudad: "", notas: "", tipo: "Insumos"}]));
      }
      let nuevas = lanas;
      let cambio = false;
      comp.items.forEach(it => {
        const desc = it.descripcion.toLowerCase();
        const m = nuevas.find(l => l.tipo && desc.includes(l.tipo.toLowerCase().split(" ")[0]));
        if (m) {
          nuevas = nuevas.map(l => l.id === m.id ? Object.assign({}, l, {stock: l.stock + it.qty * 1000}) : l);
          cambio = true;
        }
      });
      if (cambio) sl(nuevas);
    }
    if (comp.tipo === "Factura venta") {
      if (comp.proveedor_cliente && !clientes.find(c => c.nombre === comp.proveedor_cliente)) {
        sc(clientes.concat([{id: Date.now(), nombre: comp.proveedor_cliente, tipo: "Particular", email: "", tel: "", ciudad: "", notas: "", descuento: 0}]));
      }
      let nuevoStock = stockP;
      let cambioS = false;
      comp.items.forEach(it => {
        const desc = it.descripcion.toLowerCase();
        const n = todosNombres.find(nm => desc.includes(nm.toLowerCase()));
        if (n) {
          nuevoStock = nuevoStock.map(s => s.prenda === n ? Object.assign({}, s, {qty: Math.max(0, s.qty - it.qty)}) : s);
          cambioS = true;
        }
      });
      if (cambioS) ss(nuevoStock);
      if (comp.pagado) {
        const ped = pedidos.find(p => p.cliente === comp.proveedor_cliente && p.estado !== "Entregado");
        if (ped) sp(pedidos.map(p => p.id === ped.id ? Object.assign({}, p, {pagado: (p.pagado || 0) + comp.total}) : p));
      }
    }
    if (comp.tipo === "Nota de crédito" && comp.proveedor_cliente) {
      const propios = pedidos.filter(p => p.cliente === comp.proveedor_cliente && (p.pagado || 0) > 0);
      const ult = propios[propios.length - 1];
      if (ult) sp(pedidos.map(p => p.id === ult.id ? Object.assign({}, p, {pagado: Math.max(0, (p.pagado || 0) - comp.total)}) : p));
    }
  };

  const guardarComp = () => {
    const items = form.items.map(it => Object.assign({}, it, {qty: num(it.qty), precio_unit: num(it.precio_unit)}));
    const n = Object.assign({}, form, {items: items, id: Date.now()});
    sco(comps.concat([n]));
    aplicar(n);
    setVista("lista");
    setForm(formVacio());
  };

  const tC = comps.filter(c => c.tipo === "Factura compra").reduce((a, c) => a + c.total, 0);
  const tV = comps.filter(c => c.tipo === "Factura venta").reduce((a, c) => a + c.total, 0);
  const pP = comps.filter(c => !c.pagado && c.tipo === "Factura compra").reduce((a, c) => a + c.total, 0);
  const pC = comps.filter(c => !c.pagado && c.tipo === "Factura venta").reduce((a, c) => a + c.total, 0);
  const filt = comps.filter(c => (filtTipo === "Todos" || c.tipo === filtTipo) && (filtPag === "Todos" || (filtPag === "Pagado" ? c.pagado : !c.pagado)));
  const iSt = {width:"100%",padding:"7px 10px",border:"1px solid "+T.border,borderRadius:2,background:T.bgCard,color:T.ink,fontSize:12,boxSizing:"border-box",fontFamily:"inherit"};
  const provVacio = () => ({id: Date.now(), nombre: "", rut: "", email: "", tel: "", ciudad: "", notas: "", tipo: "Lana"});

  if (vista === "detalle" && selComp) {
    const etiqueta = (selComp.tipo.includes("compra") || selComp.tipo === "Remito") ? "Proveedor" : "Cliente";
    return (
      <div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}><Btn onClick={() => setVista("lista")}>← Volver</Btn><h2 style={{margin:0,fontSize:18,fontWeight:300}}>{selComp.tipo} {selComp.numero}</h2></div>
        <Card style={{maxWidth:640}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:20,paddingBottom:14,borderBottom:"1px solid "+T.borderLt}}>
            <div><div style={{fontSize:16,fontWeight:400,letterSpacing:"0.1em",textTransform:"uppercase"}}>Junco Verde</div><div style={{fontSize:11,color:T.inkLt}}>{cfg.taller.email}</div></div>
            <div style={{textAlign:"right"}}><div style={{fontSize:12,color:T.inkMid}}>Nro: <strong style={{fontFamily:"monospace"}}>{selComp.numero || "—"}</strong></div><div style={{fontSize:12,color:T.inkMid}}>Fecha: {selComp.fecha}</div></div>
          </div>
          <div style={{marginBottom:16}}><div style={{fontSize:11,color:T.inkLt,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{etiqueta}</div><div style={{fontSize:15,fontWeight:500}}>{selComp.proveedor_cliente}</div></div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,marginBottom:16}}>
            <thead><tr style={{background:T.bg}}><TH>Descripción</TH><TH>Cant.</TH><TH>Precio</TH><TH>IVA%</TH><TH>Subtotal</TH></tr></thead>
            <tbody>{(selComp.items || []).map((it, i) => <tr key={i}><TD>{it.descripcion}</TD><TD>{it.qty}</TD><TD style={{color:T.inkMid}}>{fmt(it.precio_unit)}</TD><TD style={{color:T.inkMid}}>{it.iva}%</TD><TD><strong>{fmt(it.subtotal)}</strong></TD></tr>)}</tbody>
          </table>
          <TotRow sub={selComp.subtotal} ivaT={selComp.iva_total} total={selComp.total}/>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",borderTop:"1px solid "+T.borderLt,paddingTop:12}}>
            <span style={{fontSize:12,padding:"6px 12px",borderRadius:99,background:selComp.pagado?T.okLt:T.dangerLt,color:selComp.pagado?T.ok:T.danger,fontWeight:500}}>{selComp.pagado ? "✓ Pagado" : "Pendiente"}</span>
            <Btn small onClick={() => { const nuevo = Object.assign({}, selComp, {pagado: !selComp.pagado}); sco(comps.map(c => c.id === selComp.id ? nuevo : c)); setSelComp(nuevo); }}>Cambiar pago</Btn>
          </div>
        </Card>
      </div>
    );
  }

  if (vista === "nuevo") {
    return (
      <div style={{maxWidth:680}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}><Btn onClick={() => setVista("lista")}>← Volver</Btn><h2 style={{margin:0,fontSize:20,fontWeight:300}}>Nuevo comprobante</h2></div>
        <Card>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:4}}>
            <Sel label="Tipo" value={form.tipo} onChange={e => setForm(Object.assign({}, form, {tipo:e.target.value}))}>{TIPOS_COMP.map(t => <option key={t}>{t}</option>)}</Sel>
            <Inp label="Número" value={form.numero} onChange={e => setForm(Object.assign({}, form, {numero:e.target.value}))} placeholder="A-0001"/>
            <Inp label="Fecha" type="date" value={form.fecha} onChange={e => setForm(Object.assign({}, form, {fecha:e.target.value}))}/>
          </div>
          <Inp label="Proveedor / Cliente" value={form.proveedor_cliente} onChange={e => setForm(Object.assign({}, form, {proveedor_cliente:e.target.value}))}/>
          <div style={{fontSize:11,color:T.inkMid,textTransform:"uppercase",marginBottom:8,marginTop:4}}>Ítems</div>
          {form.items.map((it, i) => (
            <div key={i} style={{display:"grid",gridTemplateColumns:"3fr 1fr 1.5fr 1fr 1.2fr auto",gap:8,alignItems:"end",marginBottom:8}}>
              <Inp label={i === 0 ? "Descripción" : ""} value={it.descripcion} onChange={e => updItem(i, "descripcion", e.target.value)} placeholder="Producto"/>
              <Inp label={i === 0 ? "Cant." : ""} type="number" min="0" value={it.qty} onChange={e => updItem(i, "qty", e.target.value)}/>
              <Inp label={i === 0 ? "Precio unit." : ""} type="number" min="0" placeholder="0" value={it.precio_unit} onChange={e => updItem(i, "precio_unit", e.target.value)}/>
              <div style={{marginBottom:14}}>
                {i === 0 ? <label style={{fontSize:11,color:T.inkMid,display:"block",marginBottom:5}}>IVA%</label> : null}
                <select value={it.iva} onChange={e => updItem(i, "iva", Number(e.target.value))} style={Object.assign({}, iSt, {padding:"9px 8px"})}>{IVA_RATES.map(r => <option key={r} value={r}>{r}%</option>)}</select>
              </div>
              <div style={{marginBottom:14}}>
                {i === 0 ? <label style={{fontSize:11,color:T.inkMid,display:"block",marginBottom:5}}>Subtotal</label> : null}
                <div style={{padding:"9px 12px",background:T.bgMuted,borderRadius:2,fontSize:13}}>{fmt(it.subtotal)}</div>
              </div>
              <div style={{marginBottom:14}}>
                {i === 0 ? <div style={{height:21}}/> : null}
                <button onClick={() => quitarItem(i)} disabled={form.items.length === 1} style={{padding:"9px 10px",border:"1px solid "+T.border,borderRadius:2,background:"transparent",cursor:"pointer",color:T.danger,fontFamily:"inherit",opacity:form.items.length === 1 ? 0.3 : 1}}>×</button>
              </div>
            </div>
          ))}
          <Btn small onClick={() => setForm(Object.assign({}, form, {items: form.items.concat([itemVacio()])}))} style={{marginBottom:16}}>+ Agregar ítem</Btn>
          <TotRow sub={form.subtotal} ivaT={form.iva_total} total={form.total}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <Inp label="Notas" value={form.notas} onChange={e => setForm(Object.assign({}, form, {notas:e.target.value}))}/>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,color:T.inkMid,display:"block",marginBottom:5}}>Estado de pago</label>
              <div style={{display:"flex",gap:8}}>
                <Btn small variant={form.pagado ? "primary" : "ghost"} onClick={() => setForm(Object.assign({}, form, {pagado:true}))}>Pagado</Btn>
                <Btn small variant={!form.pagado ? "danger" : "ghost"} onClick={() => setForm(Object.assign({}, form, {pagado:false}))}>Pendiente</Btn>
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:"1px solid "+T.borderLt}}>
            <Btn onClick={() => setVista("lista")}>Cancelar</Btn>
            <Btn variant="primary" onClick={guardarComp} disabled={!form.proveedor_cliente || !form.items[0].descripcion}>Guardar</Btn>
          </div>
        </Card>
      </div>
    );
  }

  if (vista === "prov_edit" && editProv) {
    const existe = provs.find(p => p.id === editProv.id);
    return (
      <div style={{maxWidth:520}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}><Btn onClick={() => setVista("lista")}>← Volver</Btn><h2 style={{margin:0,fontSize:20,fontWeight:300}}>{existe ? "Editar" : "Nuevo"} proveedor</h2></div>
        <Card>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Inp label="Nombre" value={editProv.nombre} onChange={e => setEditProv(Object.assign({}, editProv, {nombre:e.target.value}))}/>
            <Sel label="Tipo" value={editProv.tipo} onChange={e => setEditProv(Object.assign({}, editProv, {tipo:e.target.value}))}>{["Lana","Insumos","Bordado","Logística","Otro"].map(t => <option key={t}>{t}</option>)}</Sel>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Inp label="RUT" value={editProv.rut} onChange={e => setEditProv(Object.assign({}, editProv, {rut:e.target.value}))}/>
            <Inp label="Ciudad" value={editProv.ciudad} onChange={e => setEditProv(Object.assign({}, editProv, {ciudad:e.target.value}))}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Inp label="Email" type="email" value={editProv.email} onChange={e => setEditProv(Object.assign({}, editProv, {email:e.target.value}))}/>
            <Inp label="Teléfono" value={editProv.tel} onChange={e => setEditProv(Object.assign({}, editProv, {tel:e.target.value}))}/>
          </div>
          <Inp label="Notas" value={editProv.notas} onChange={e => setEditProv(Object.assign({}, editProv, {notas:e.target.value}))}/>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:"1px solid "+T.borderLt}}>
            <Btn onClick={() => setVista("lista")}>Cancelar</Btn>
            {existe ? <Btn variant="danger" onClick={() => { spr(provs.filter(p => p.id !== editProv.id)); setVista("lista"); }}>Eliminar</Btn> : null}
            <Btn variant="primary" disabled={!editProv.nombre} onClick={() => { if (existe) spr(provs.map(p => p.id === editProv.id ? editProv : p)); else spr(provs.concat([editProv])); setVista("lista"); }}>Guardar</Btn>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <SecTitle action={<Btn variant="primary" onClick={() => { setForm(formVacio()); setVista("nuevo"); }}>+ Cargar comprobante</Btn>}>Comprobantes</SecTitle>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:24}}>
        <Met label="Compras" value={fmt(tC)} accent={T.tierra}/>
        <Met label="Ventas" value={fmt(tV)} accent={T.green}/>
        <Met label="Pend. pago" value={fmt(pP)} accent={pP > 0 ? T.danger : T.ok}/>
        <Met label="Pend. cobro" value={fmt(pC)} accent={pC > 0 ? T.warn : T.ok}/>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>{["Todos"].concat(TIPOS_COMP).map(t => <Pill key={t} active={filtTipo === t} onClick={() => setFiltTipo(t)}>{t}</Pill>)}</div>
      <div style={{display:"flex",gap:6,marginBottom:20}}>{["Todos","Pagado","Pendiente"].map(t => <Pill key={t} active={filtPag === t} onClick={() => setFiltPag(t)}>{t}</Pill>)}</div>
      {comps.length === 0 ? <Empty icon="🧾" title="Sin comprobantes" sub="Cargá tus facturas de compra y venta." action={<Btn variant="primary" onClick={() => { setForm(formVacio()); setVista("nuevo"); }}>+ Cargar comprobante</Btn>}/> : null}
      {comps.length > 0 ? (
        <Card style={{padding:0,overflow:"auto",marginBottom:24}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:800}}>
            <thead><tr style={{background:T.bg}}><TH>Tipo</TH><TH>Número</TH><TH>Fecha</TH><TH>Proveedor/Cliente</TH><TH>Subtotal</TH><TH>IVA</TH><TH>Total</TH><TH>Estado</TH><TH></TH></tr></thead>
            <tbody>
              {filt.slice().reverse().map((c, i) => {
                const tc = TIPO_COLOR[c.tipo] || {bg: T.bgMuted, tx: T.inkMid};
                return (
                  <tr key={c.id} style={{background:i%2===0?T.bgCard:T.bg}}>
                    <TD><span style={{fontSize:10,padding:"2px 9px",borderRadius:99,background:tc.bg,color:tc.tx,fontWeight:500}}>{c.tipo}</span></TD>
                    <TD style={{fontFamily:"monospace",fontSize:12}}>{c.numero || "—"}</TD>
                    <TD style={{fontSize:12,color:T.inkMid}}>{c.fecha}</TD>
                    <TD><strong style={{fontWeight:500}}>{c.proveedor_cliente}</strong></TD>
                    <TD style={{color:T.inkMid}}>{fmt(c.subtotal)}</TD>
                    <TD style={{color:T.inkMid,fontSize:12}}>{fmt(c.iva_total)}</TD>
                    <TD><strong style={{fontWeight:500}}>{fmt(c.total)}</strong></TD>
                    <TD>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontSize:10,padding:"2px 8px",borderRadius:99,background:c.pagado?T.okLt:T.dangerLt,color:c.pagado?T.ok:T.danger}}>{c.pagado ? "Pagado" : "Pendiente"}</span>
                        <button onClick={() => sco(comps.map(x => x.id === c.id ? Object.assign({}, x, {pagado: !x.pagado}) : x))} style={{fontSize:10,background:"none",border:"1px solid "+T.border,borderRadius:2,cursor:"pointer",padding:"2px 6px",color:T.inkMid,fontFamily:"inherit"}}>±</button>
                      </div>
                    </TD>
                    <TD><div style={{display:"flex",gap:4}}><Btn small onClick={() => { setSelComp(c); setVista("detalle"); }}>Ver</Btn><Btn small onClick={() => sco(comps.filter(x => x.id !== c.id))}>✕</Btn></div></TD>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ) : null}
      <SecTitle action={<Btn small variant="primary" onClick={() => { setEditProv(provVacio()); setVista("prov_edit"); }}>+ Proveedor</Btn>}>Proveedores</SecTitle>
      {provs.length === 0 ? <Empty icon="🏭" title="Sin proveedores" sub="Cargá tus proveedores de lana e insumos." action={<Btn variant="primary" onClick={() => { setEditProv(provVacio()); setVista("prov_edit"); }}>+ Nuevo proveedor</Btn>}/> : null}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
        {provs.map(p => {
          const compras = comps.filter(c => c.proveedor_cliente === p.nombre && c.tipo === "Factura compra");
          return (
            <Card key={p.id} style={{marginBottom:0}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <div><div style={{fontSize:14,fontWeight:500}}>{p.nombre}</div><div style={{fontSize:11,color:T.inkMid}}>{p.tipo}{p.ciudad ? " · " + p.ciudad : ""}</div></div>
                <Btn small onClick={() => { setEditProv(Object.assign({}, p)); setVista("prov_edit"); }}>Editar</Btn>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>
                <div style={{background:T.bg,borderRadius:2,padding:"6px 10px"}}><div style={{fontSize:10,color:T.inkLt,textTransform:"uppercase"}}>Facturas</div><div style={{fontSize:13,fontWeight:500}}>{compras.length}</div></div>
                <div style={{background:T.bg,borderRadius:2,padding:"6px 10px"}}><div style={{fontSize:10,color:T.inkLt,textTransform:"uppercase"}}>Total</div><div style={{fontSize:13,fontWeight:500,color:T.tierra}}>{fmt(compras.reduce((a, c) => a + c.total, 0))}</div></div>
              </div>
              {(p.rut || p.email || p.tel) ? <div style={{fontSize:11,color:T.inkMid,borderTop:"1px solid "+T.borderLt,paddingTop:6}}>{p.rut ? <div>RUT: {p.rut}</div> : null}{p.email ? <div>{p.email}</div> : null}{p.tel ? <div>{p.tel}</div> : null}</div> : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════ CONFIGURACIÓN ═══════════════════════
function CatalogEditor() {
  const { catalogo, saveCatalogo, catAll, todosNombres, pedidos, stockP } = useApp();
  const [vals, setVals] = useState({});
  const [msg, setMsg] = useState("");
  const [mostrarDisc, setMostrarDisc] = useState(false);
  const [nueva, setNueva] = useState(null);
  const [errNueva, setErrNueva] = useState("");

  const desdeCatalogo = n => {
    const c = catalogo[n] || {};
    return {c: c.c ? String(c.c) : "", pv: c.p ? String(c.p) : "", lana: c.lana ? String(c.lana) : ""};
  };
  const get = n => vals[n] || desdeCatalogo(n);
  const upd = (n, k, v) => setVals(prev => Object.assign({}, prev, {[n]: Object.assign({}, prev[n] || desdeCatalogo(n), {[k]: v})}));
  const valorDe = n => { const v = get(n); return {c: num(v.c), p: num(v.pv), lana: num(v.lana)}; };
  const aviso = t => { setMsg(t); setTimeout(() => setMsg(""), 3000); };

  const guardarCats = (cats, etiqueta) => {
    const next = Object.assign({}, catalogo);
    cats.forEach(cat => {
      (catAll[cat] || []).forEach(p => {
        next[p.n] = Object.assign({}, catalogo[p.n] || {}, valorDe(p.n));
      });
    });
    saveCatalogo(next);
    aviso("✓ " + etiqueta + " guardado");
  };

  const discontinuar = n => {
    if (!window.confirm("¿Discontinuar \"" + n + "\"?\n\nDeja de aparecer al crear pedidos y stock, pero los pedidos anteriores se conservan. Podés reactivarla cuando quieras.")) return;
    const next = Object.assign({}, catalogo);
    next[n] = Object.assign({}, catalogo[n] || {}, valorDe(n), {descontinuada: true});
    saveCatalogo(next);
    aviso("✓ \"" + n + "\" discontinuada");
  };
  const reactivar = n => {
    const next = Object.assign({}, catalogo);
    next[n] = Object.assign({}, catalogo[n] || {}, {descontinuada: false});
    saveCatalogo(next);
    aviso("✓ \"" + n + "\" reactivada");
  };
  const eliminar = n => {
    const enUso = pedidos.some(p => p.prenda === n) || stockP.some(s => s.prenda === n);
    if (enUso) {
      window.alert("\"" + n + "\" tiene pedidos o stock asociados, así que no se puede eliminar. Dejala discontinuada.");
      return;
    }
    if (!window.confirm("¿Eliminar \"" + n + "\" definitivamente?")) return;
    const next = Object.assign({}, catalogo);
    delete next[n];
    saveCatalogo(next);
    aviso("✓ \"" + n + "\" eliminada");
  };

  const abrirNueva = () => {
    setErrNueva("");
    setNueva({nombre: "", cat: Object.keys(catAll)[0] || "__nueva", catNueva: "", c: "", p: "", lana: ""});
  };
  const crearNueva = () => {
    const nombre = nueva.nombre.trim();
    const cat = nueva.cat === "__nueva" ? nueva.catNueva.trim() : nueva.cat;
    if (!nombre) { setErrNueva("Escribí el nombre de la prenda."); return; }
    if (!cat) { setErrNueva("Elegí una categoría o escribí una nueva."); return; }
    if (todosNombres.some(x => x.toLowerCase() === nombre.toLowerCase())) { setErrNueva("Ya existe una prenda con ese nombre."); return; }
    const next = Object.assign({}, catalogo);
    next[nombre] = {custom: true, cat: cat, c: num(nueva.c), p: num(nueva.p), lana: num(nueva.lana), descontinuada: false};
    saveCatalogo(next);
    setNueva(null);
    aviso("✓ \"" + nombre + "\" agregada");
  };

  const campo = (n, k, w) => (
    <input type="number" min="0" placeholder="0" value={get(n)[k]} onChange={e => upd(n, k, e.target.value)}
      style={{width:w,padding:"5px 8px",border:"1px solid "+T.border,borderRadius:2,fontSize:12,background:T.bgCard,color:T.ink,fontFamily:"inherit"}}/>
  );
  const cats = Object.keys(catAll);
  const cantDisc = Object.values(catAll).reduce((a, arr) => a + arr.filter(p => p.descontinuada).length, 0);
  const tag = (txt, bg, tx) => <span style={{fontSize:9,padding:"1px 7px",borderRadius:99,background:bg,color:tx,marginLeft:6,whiteSpace:"nowrap"}}>{txt}</span>;

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:16}}>
        <div style={{background:T.warnLt,border:"1px solid "+T.warn,borderRadius:4,padding:"10px 14px",fontSize:13,color:T.warn,flex:1,minWidth:240}}>
          Completá costo, precio y gramos de lana. Después apretá Guardar.
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <Btn onClick={abrirNueva}>+ Nueva prenda</Btn>
          <Btn variant="primary" onClick={() => guardarCats(cats, "Catálogo completo")}>Guardar todo</Btn>
        </div>
      </div>
      {msg ? <div style={{background:T.okLt,border:"1px solid "+T.ok,borderRadius:4,padding:"9px 14px",marginBottom:14,fontSize:13,color:T.ok}}>{msg}</div> : null}
      {cantDisc > 0 ? (
        <div style={{marginBottom:14}}>
          <Pill active={mostrarDisc} onClick={() => setMostrarDisc(!mostrarDisc)} color={T.tierra}>{mostrarDisc ? "Ocultar" : "Mostrar"} descontinuadas ({cantDisc})</Pill>
        </div>
      ) : null}

      {cats.map(cat => {
        const visibles = catAll[cat].filter(p => mostrarDisc || !p.descontinuada);
        if (visibles.length === 0) return null;
        return (
          <Card key={cat} style={{marginBottom:12,padding:"1.25rem",overflow:"auto"}}>
            <div style={{fontSize:11,color:T.inkMid,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:14}}>{cat}</div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:620}}>
              <thead><tr style={{background:T.bg}}><TH>Prenda</TH><TH>Costo ($)</TH><TH>Precio ($)</TH><TH>Lana (g)</TH><TH>Margen</TH><TH></TH></tr></thead>
              <tbody>
                {visibles.map((p, i) => {
                  const v = get(p.n);
                  const c = num(v.c);
                  const pv = num(v.pv);
                  const mg = pv > 0 ? Math.round((pv - c) / pv * 100) : null;
                  const bg = mg === null ? T.bgMuted : (mg > 50 ? T.okLt : (mg > 30 ? T.warnLt : T.dangerLt));
                  const tx = mg === null ? T.inkLt : (mg > 50 ? T.ok : (mg > 30 ? T.warn : T.danger));
                  return (
                    <tr key={p.n} style={{background:p.descontinuada ? T.bgMuted : (i%2===0?T.bgCard:T.bg),opacity:p.descontinuada?0.75:1}}>
                      <TD style={{fontWeight:500,fontSize:12}}>{p.n}{p.custom ? tag("propia", T.violetLt, T.violet) : null}{p.descontinuada ? tag("descontinuada", T.warnLt, T.warn) : null}</TD>
                      <TD>{campo(p.n, "c", 90)}</TD>
                      <TD>{campo(p.n, "pv", 90)}</TD>
                      <TD>{campo(p.n, "lana", 80)}</TD>
                      <TD>{mg !== null ? <span style={{fontSize:11,padding:"2px 8px",borderRadius:99,background:bg,color:tx}}>{mg}%</span> : <span style={{fontSize:11,color:T.inkLt}}>—</span>}</TD>
                      <TD>
                        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                          {p.descontinuada ? <Btn small onClick={() => reactivar(p.n)}>Reactivar</Btn> : <Btn small onClick={() => discontinuar(p.n)}>Discontinuar</Btn>}
                          {p.custom ? <Btn small onClick={() => eliminar(p.n)}>Eliminar</Btn> : null}
                        </div>
                      </TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{marginTop:10,textAlign:"right"}}><Btn small variant="primary" onClick={() => guardarCats([cat], cat)}>Guardar {cat}</Btn></div>
          </Card>
        );
      })}

      {nueva ? (
        <Ov onClose={() => setNueva(null)}>
          <MTitle onClose={() => setNueva(null)}>Nueva prenda</MTitle>
          <Inp label="Nombre de la prenda" value={nueva.nombre} onChange={e => setNueva(Object.assign({}, nueva, {nombre:e.target.value}))} placeholder="Ej: Chaleco Aurora"/>
          <Sel label="Categoría" value={nueva.cat} onChange={e => setNueva(Object.assign({}, nueva, {cat:e.target.value}))}>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
            <option value="__nueva">+ Crear categoría nueva…</option>
          </Sel>
          {nueva.cat === "__nueva" ? <Inp label="Nombre de la categoría nueva" value={nueva.catNueva} onChange={e => setNueva(Object.assign({}, nueva, {catNueva:e.target.value}))} placeholder="Ej: Accesorios"/> : null}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            <Inp label="Costo ($)" type="number" min="0" placeholder="0" value={nueva.c} onChange={e => setNueva(Object.assign({}, nueva, {c:e.target.value}))}/>
            <Inp label="Precio ($)" type="number" min="0" placeholder="0" value={nueva.p} onChange={e => setNueva(Object.assign({}, nueva, {p:e.target.value}))}/>
            <Inp label="Lana (g)" type="number" min="0" placeholder="0" value={nueva.lana} onChange={e => setNueva(Object.assign({}, nueva, {lana:e.target.value}))}/>
          </div>
          {errNueva ? <div style={{background:T.dangerLt,border:"1px solid "+T.danger,borderRadius:2,padding:"8px 12px",marginBottom:12,fontSize:12,color:T.danger}}>{errNueva}</div> : null}
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:"1px solid "+T.borderLt}}>
            <Btn onClick={() => setNueva(null)}>Cancelar</Btn>
            <Btn variant="primary" onClick={crearNueva}>Agregar prenda</Btn>
          </div>
        </Ov>
      ) : null}
    </div>
  );
}

function Config() {
  const { cfg, scfg, catData } = useApp();
  const [sec, setSec] = useState("catalogo");
  const [lc, setLc] = useState(() => ({
    alertaEntregaDias: String(cfg.alertaEntregaDias),
    stockMinimoDefault: String(cfg.stockMinimoDefault),
    margenMinimoAlerta: String(cfg.margenMinimoAlerta),
    diasAlertaPago: String(cfg.diasAlertaPago),
    taller: Object.assign({}, cfg.taller),
    tiemposProd: Object.assign({}, cfg.tiemposProd)
  }));
  const [ok, setOk] = useState(false);
  const guardar = () => {
    const tiempos = {};
    Object.keys(lc.tiemposProd).forEach(k => { tiempos[k] = num(lc.tiemposProd[k]) || 14; });
    scfg({
      alertaEntregaDias: num(lc.alertaEntregaDias),
      stockMinimoDefault: num(lc.stockMinimoDefault),
      margenMinimoAlerta: num(lc.margenMinimoAlerta),
      diasAlertaPago: num(lc.diasAlertaPago),
      taller: lc.taller,
      tiemposProd: tiempos
    });
    setOk(true);
    setTimeout(() => setOk(false), 2500);
  };
  const SECS = [{id:"catalogo",l:"Catálogo"},{id:"alertas",l:"Alertas"},{id:"tiempos",l:"Tiempos"},{id:"taller",l:"Taller"}];
  const alertas = [["Alerta entrega (días)","alertaEntregaDias","días"],["Stock mínimo prendas","stockMinimoDefault","u."],["Margen mínimo","margenMinimoAlerta","%"],["Alerta cobro (días)","diasAlertaPago","días"]];
  const setTaller = (k, v) => setLc(Object.assign({}, lc, {taller: Object.assign({}, lc.taller, {[k]: v})}));
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24,paddingBottom:12,borderBottom:"1px solid "+T.borderLt}}>
        <div><div style={{fontSize:11,color:T.inkLt,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>Sistema</div><div style={{fontSize:22,fontWeight:300}}>Configuración</div></div>
        {sec !== "catalogo" ? <div style={{display:"flex",gap:8,alignItems:"center"}}>{ok ? <span style={{fontSize:12,color:T.ok,padding:"6px 12px",background:T.okLt,borderRadius:2}}>✓ Guardado</span> : null}<Btn variant="primary" onClick={guardar}>Guardar</Btn></div> : null}
      </div>
      <div style={{display:"flex",gap:8,marginBottom:28,flexWrap:"wrap"}}>
        {SECS.map(s => <button key={s.id} onClick={() => setSec(s.id)} style={{padding:"7px 18px",borderRadius:2,border:"1px solid "+(sec===s.id?T.green:T.border),background:sec===s.id?T.greenLt:"transparent",color:sec===s.id?T.green:T.inkMid,cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:sec===s.id?500:400}}>{s.l}</button>)}
      </div>

      {sec === "catalogo" ? <CatalogEditor/> : null}

      {sec === "alertas" ? (
        <div style={{maxWidth:560}}>
          <Card>
            {alertas.map(a => (
              <div key={a[1]} style={{marginBottom:20,paddingBottom:20,borderBottom:"1px solid "+T.borderLt}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:13,fontWeight:500}}>{a[0]}</div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <input type="number" min="0" value={lc[a[1]]} onChange={e => setLc(Object.assign({}, lc, {[a[1]]: e.target.value}))} style={{width:70,padding:"7px 10px",border:"1px solid "+T.border,borderRadius:2,background:T.bgCard,color:T.ink,fontSize:14,fontWeight:500,textAlign:"center",fontFamily:"inherit"}}/>
                    <span style={{fontSize:12,color:T.inkMid}}>{a[2]}</span>
                  </div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      ) : null}

      {sec === "tiempos" ? (
        <div>
          {Object.entries(catData).map(([cat, items]) => (
            <Card key={cat} style={{marginBottom:12}}>
              <div style={{fontSize:11,color:T.inkMid,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:16}}>{cat}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
                {items.map(p => {
                  const d = lc.tiemposProd[p.n] !== undefined ? lc.tiemposProd[p.n] : "14";
                  return (
                    <div key={p.n} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:T.bg,borderRadius:2,gap:12}}>
                      <div style={{flex:1,minWidth:0,fontSize:12,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.n}</div>
                      <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                        <input type="number" min="1" max="90" value={d} onChange={e => setLc(Object.assign({}, lc, {tiemposProd: Object.assign({}, lc.tiemposProd, {[p.n]: e.target.value})}))} style={{width:55,padding:"5px 8px",border:"1px solid "+T.border,borderRadius:2,background:T.bgCard,color:T.ink,fontSize:13,fontWeight:500,textAlign:"center",fontFamily:"inherit"}}/>
                        <span style={{fontSize:11,color:T.inkMid}}>días</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {sec === "taller" ? (
        <div style={{maxWidth:520}}>
          <Card>
            <Inp label="Nombre" value={lc.taller.nombre} onChange={e => setTaller("nombre", e.target.value)}/>
            <Inp label="Email" type="email" value={lc.taller.email} onChange={e => setTaller("email", e.target.value)}/>
            <Inp label="Teléfono" value={lc.taller.tel} onChange={e => setTaller("tel", e.target.value)}/>
            <Inp label="Ciudad" value={lc.taller.ciudad} onChange={e => setTaller("ciudad", e.target.value)}/>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

// ═══════════════════════ APP ═══════════════════════
const TABS = [
  {id:"dashboard", l:"Inicio", icon:"⌂"},
  {id:"pedidos", l:"Pedidos", icon:"📋"},
  {id:"clientes", l:"Clientes", icon:"👥"},
  {id:"artesanas", l:"Artesanas", icon:"🧶"},
  {id:"pagos_art", l:"Pagos art.", icon:"💚"},
  {id:"planif", l:"Producción", icon:"📅"},
  {id:"analisis", l:"Análisis", icon:"📊"},
  {id:"stock", l:"Stock prendas", icon:"👗"},
  {id:"lanas", l:"Stock lanas", icon:"🧵"},
  {id:"talles", l:"Talles", icon:"📐"},
  {id:"comprobantes", l:"Comprobantes", icon:"🧾"},
  {id:"config", l:"Config.", icon:"⚙"}
];
const MOB_TABS = ["dashboard", "pedidos", "artesanas", "pagos_art", "comprobantes"];
const PANTALLAS = {
  dashboard: Dashboard, pedidos: Pedidos, clientes: Clientes, artesanas: Artesanas, pagos_art: PagosArt,
  planif: Planif, analisis: Analisis, stock: StockPrendas, lanas: Lanas, talles: Talles,
  comprobantes: Comprobantes, config: Config
};
const CLAVES = ["pedidos","stock_prendas","lanas","artesanas","clientes","comprobantes","proveedores","pagos_artesanas","talles","configuracion","catalogo"];

function Taller({ email, onLogout }) {
  const mob = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sync, setSync] = useState("ok");
  const [tab, setTab] = useState("dashboard");
  const [pedidos, setPedidos] = useState([]);
  const [stockP, setStockP] = useState([]);
  const [lanas, setLanas] = useState([]);
  const [artesanas, setArtesanas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [comps, setComps] = useState([]);
  const [provs, setProvs] = useState([]);
  const [pagosArt, setPagosArt] = useState([]);
  const [talles, setTalles] = useState(TALLES_INIT);
  const [cfg, setCfg] = useState(CFG_DEF);
  const [catalogo, setCatalogo] = useState({});
  const cargado = useRef(false);
  const loadOk = useRef(false);

  // Carga inicial desde Supabase
  useEffect(() => {
    if (cargado.current) return;
    cargado.current = true;
    async function cargar() {
      const res = await Promise.all(CLAVES.map(k => dbGet(k)));
      if (res.some(r => r === undefined)) {
        setLoadError(true);
        setLoading(false);
        return;
      }
      const p = res[0], s = res[1], l = res[2], a = res[3], c = res[4], co = res[5], pr = res[6], pa = res[7], tl = res[8], cf = res[9], cat = res[10];
      if (p) setPedidos(p);
      if (s) setStockP(s);
      if (l) setLanas(l);
      if (a) setArtesanas(a);
      if (c) setClientes(c);
      if (co) setComps(co);
      if (pr) setProvs(pr);
      if (pa) setPagosArt(pa);
      if (tl) setTalles(tl);
      if (cf) setCfg(Object.assign({}, CFG_DEF, cf, {taller: Object.assign({}, CFG_DEF.taller, cf.taller || {}), tiemposProd: cf.tiemposProd || {}}));
      if (cat) setCatalogo(cat);
      loadOk.current = true;
      setLoading(false);
    }
    cargar();
  }, []);

  // Catálogo efectivo: prendas base + prendas propias; activas y descontinuadas
  const todasPrendas = useMemo(() => {
    const m = {};
    Object.keys(BASE_CAT).forEach(n => { m[n] = {n: n, cat: BASE_CAT[n], custom: false}; });
    Object.keys(catalogo).forEach(n => {
      const o = catalogo[n];
      if (o && o.custom) m[n] = {n: n, cat: o.cat || "Otros", custom: true};
    });
    return m;
  }, [catalogo]);

  const catInfo = useMemo(() => {
    const all = {};
    const act = {};
    Object.keys(CAT_DATA).forEach(c => { all[c] = []; act[c] = []; });
    Object.values(todasPrendas).forEach(b => {
      const o = catalogo[b.n] || {};
      if (!all[b.cat]) { all[b.cat] = []; act[b.cat] = []; }
      all[b.cat].push({n: b.n, custom: b.custom, descontinuada: !!o.descontinuada});
      if (!o.descontinuada) act[b.cat].push({n: b.n});
    });
    Object.keys(act).forEach(c => { if (act[c].length === 0) delete act[c]; });
    Object.keys(all).forEach(c => { if (all[c].length === 0) delete all[c]; });
    const flat = [];
    Object.keys(act).forEach(c => { act[c].forEach(p => flat.push(p.n)); });
    return {catAll: all, catData: act, nombres: flat};
  }, [todasPrendas, catalogo]);

  const finanzasMes = useMemo(() => {
    const m = {};
    pedidos.filter(p => p.estado === "Entregado").forEach(p => {
      const mes = p.fechaEntrega ? p.fechaEntrega.slice(0, 7) : "";
      if (!mes) return;
      const o = catalogo[p.prenda] || {};
      if (!m[mes]) m[mes] = {mes: mes, venta: 0, costo: 0, prendas: 0};
      m[mes].venta += (o.p || 0) * p.cantidad;
      m[mes].costo += (o.c || 0) * p.cantidad;
      m[mes].prendas += p.cantidad;
    });
    return Object.values(m).sort((a, b) => a.mes.localeCompare(b.mes)).slice(-6);
  }, [pedidos, catalogo]);

  const topPrendas = useMemo(() => {
    const m = {};
    pedidos.forEach(p => {
      if (!m[p.prenda]) m[p.prenda] = {n: p.prenda, qty: 0, venta: 0};
      m[p.prenda].qty += p.cantidad;
      const o = catalogo[p.prenda] || {};
      m[p.prenda].venta += (o.p || 0) * p.cantidad;
    });
    return Object.values(m).sort((a, b) => b.qty - a.qty).slice(0, 6);
  }, [pedidos, catalogo]);

  // Guardado en Supabase
  const persist = (tabla, valor) => {
    if (!loadOk.current) { setSync("error"); return; }
    setSync("saving");
    dbSet(tabla, valor).then(ok => setSync(ok ? "ok" : "error"));
  };
  const sp = v => { setPedidos(v); persist("pedidos", v); };
  const ss = v => { setStockP(v); persist("stock_prendas", v); };
  const sl = v => { setLanas(v); persist("lanas", v); };
  const sa = v => { setArtesanas(v); persist("artesanas", v); };
  const sc = v => { setClientes(v); persist("clientes", v); };
  const sco = v => { setComps(v); persist("comprobantes", v); };
  const spr = v => { setProvs(v); persist("proveedores", v); };
  const spa = v => { setPagosArt(v); persist("pagos_artesanas", v); };
  const stl = v => { setTalles(v); persist("talles", v); };
  const scfg = v => { setCfg(v); persist("configuracion", v); };
  const saveCatalogo = v => { setCatalogo(v); persist("catalogo", v); };

  const getPrenda = n => {
    const b = todasPrendas[n];
    if (!b) return null;
    const o = catalogo[n] || {};
    return {n: n, cat: b.cat, custom: b.custom, c: o.c || 0, p: o.p || 0, lana: o.lana || 0, descontinuada: !!o.descontinuada};
  };
  const catOf = n => (todasPrendas[n] ? todasPrendas[n].cat : "");

  const activos = pedidos.filter(p => p.estado !== "Entregado");
  const totalVenta = activos.reduce((a, p) => { const pr = getPrenda(p.prenda); return a + (pr ? pr.p : 0) * p.cantidad; }, 0);
  const totalCosto = activos.reduce((a, p) => { const pr = getPrenda(p.prenda); return a + (pr ? pr.c : 0) * p.cantidad; }, 0);
  const totalCobrado = pedidos.reduce((a, p) => a + (p.pagado || 0), 0);
  const urgentes = activos.filter(p => diasHasta(p.fechaEntrega) <= cfg.alertaEntregaDias);
  const lanasBajas = lanas.filter(l => l.stock < l.minimo);

  const statsCliente = id => {
    const cli = clientes.find(c => c.id === id);
    const nom = cli ? cli.nombre : "";
    const ped = pedidos.filter(p => p.cliente === nom);
    const total = ped.reduce((a, p) => { const pr = getPrenda(p.prenda); return a + (pr ? pr.p : 0) * p.cantidad; }, 0);
    const cobrado = ped.reduce((a, p) => a + (p.pagado || 0), 0);
    return {ped: ped, total: total, cobrado: cobrado, saldo: total - cobrado};
  };
  const statsArt = id => {
    const art = artesanas.find(a => a.id === id);
    const nom = art ? art.nombre : "";
    const ped = pedidos.filter(p => p.artesana === nom);
    const entg = ped.filter(p => p.estado === "Entregado");
    const pend = ped.filter(p => p.estado !== "Entregado");
    return {
      ped: ped, entg: entg, pend: pend,
      totalPrendas: entg.reduce((a, p) => a + p.cantidad, 0),
      totalValor: entg.reduce((a, p) => { const pr = getPrenda(p.prenda); return a + (pr ? pr.p : 0) * p.cantidad; }, 0),
      pendPrendas: pend.reduce((a, p) => a + p.cantidad, 0),
      tasaEntrega: ped.length ? Math.round(entg.length / ped.length * 100) : 0
    };
  };
  const capArt = id => {
    const art = artesanas.find(a => a.id === id);
    if (!art) return {libre: 0, ocupada: 0, pct: 0, cap: 0};
    const st = statsArt(id);
    const cap = (art.capacidad_semanal || 2) * 4;
    return {libre: Math.max(0, cap - st.pendPrendas), ocupada: st.pendPrendas, pct: Math.min(100, Math.round(st.pendPrendas / cap * 100)), cap: cap};
  };
  const moSugerida = p => {
    const pr = getPrenda(p.prenda);
    const cat = pr ? pr.cat : "";
    const grupo = cat.includes("Kids") ? "kids" : (cat.includes("Sombreros") ? "unico" : "adultos");
    const fila = (talles[grupo] || []).find(t => t.talle === p.talle);
    if (fila && fila.manoObra > 0) return fila.manoObra * p.cantidad;
    return Math.round((pr ? pr.p : 0) * p.cantidad * 0.30);
  };
  const resumenArtPago = nombre => {
    const pag = pagosArt.filter(p => p.artesana === nombre);
    const totalPag = pag.reduce((a, p) => a + (Number(p.monto) || 0), 0);
    const entg = pedidos.filter(p => p.artesana === nombre && p.estado === "Entregado");
    const totalMO = entg.reduce((a, p) => a + moSugerida(p), 0);
    return {pag: pag, totalPag: totalPag, totalMO: totalMO, pendiente: Math.max(0, totalMO - totalPag), entg: entg};
  };

  const cambiarEstado = (id, est) => {
    const p = pedidos.find(x => x.id === id);
    if (!p) return;
    const pr = getPrenda(p.prenda);
    if (est === "Entregado" && p.estado !== "Entregado") {
      sa(artesanas.map(x => x.nombre === p.artesana ? Object.assign({}, x, {lana_asignada: Math.max(0, (x.lana_asignada || 0) - (pr ? pr.lana : 0) * p.cantidad)}) : x));
      const ex = stockP.find(x => x.prenda === p.prenda);
      if (ex) ss(stockP.map(x => x.prenda === p.prenda ? Object.assign({}, x, {qty: x.qty + p.cantidad}) : x));
      else ss(stockP.concat([{id: Date.now(), prenda: p.prenda, cat: pr ? pr.cat : "", qty: p.cantidad, costo: pr ? pr.c : 0, precio: pr ? pr.p : 0}]));
    }
    sp(pedidos.map(x => x.id === id ? Object.assign({}, x, {estado: est}) : x));
  };

  if (loading) return <Splash texto="Cargando Junco Verde…"/>;
  if (loadError) {
    return (
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",background:T.bg,gap:14,fontFamily:"Georgia,serif",padding:"2rem",textAlign:"center"}}>
        <div style={{fontSize:40}}>⚠️</div>
        <div style={{fontSize:18,color:T.danger}}>No se pudieron cargar los datos</div>
        <div style={{fontSize:13,color:T.inkMid,maxWidth:380}}>Para no pisar la información guardada, la app no deja editar hasta poder leerla. Revisá la conexión y que las variables de Supabase estén cargadas, y recargá.</div>
        <div style={{display:"flex",gap:8}}>
          <Btn variant="primary" onClick={() => window.location.reload()}>Reintentar</Btn>
          <Btn onClick={onLogout}>Cerrar sesión</Btn>
        </div>
      </div>
    );
  }

  const A = {
    mob: mob, tab: tab, setTab: setTab, email: email,
    pedidos: pedidos, sp: sp, stockP: stockP, ss: ss, lanas: lanas, sl: sl,
    artesanas: artesanas, sa: sa, clientes: clientes, sc: sc, comps: comps, sco: sco,
    provs: provs, spr: spr, pagosArt: pagosArt, spa: spa, talles: talles, stl: stl,
    cfg: cfg, scfg: scfg, catalogo: catalogo, saveCatalogo: saveCatalogo, getPrenda: getPrenda, catOf: catOf,
    catAll: catInfo.catAll, catData: catInfo.catData, nombres: catInfo.nombres, todosNombres: Object.keys(todasPrendas),
    activos: activos, totalVenta: totalVenta, totalCosto: totalCosto, totalCobrado: totalCobrado,
    urgentes: urgentes, lanasBajas: lanasBajas,
    statsCliente: statsCliente, statsArt: statsArt, capArt: capArt, moSugerida: moSugerida,
    resumenArtPago: resumenArtPago, finanzasMes: finanzasMes, topPrendas: topPrendas, cambiarEstado: cambiarEstado
  };

  const Pantalla = PANTALLAS[tab];
  const syncTxt = sync === "ok" ? "☁ Guardado" : (sync === "saving" ? "☁ Guardando…" : "⚠ Error al guardar");
  const syncCol = sync === "ok" ? T.ok : (sync === "saving" ? T.warn : T.danger);

  return (
    <Ctx.Provider value={A}>
      <div style={{fontFamily:"'Georgia',serif",minHeight:"100vh",background:T.bg,color:T.ink,paddingBottom:mob?72:0}}>
        <div style={{background:T.bgCard,borderBottom:"1px solid "+T.border,padding:"0 "+(mob?"1rem":"1.5rem"),display:"flex",alignItems:"center",justifyContent:"space-between",height:mob?48:52,position:"sticky",top:0,zIndex:100,gap:12}}>
          <div style={{display:"flex",alignItems:"baseline",gap:8,flexShrink:0}}>
            <span style={{fontSize:mob?14:16,fontWeight:400,letterSpacing:"0.14em",textTransform:"uppercase"}}>Junco Verde</span>
            <span style={{fontSize:10,color:syncCol}}>{syncTxt}</span>
          </div>
          {!mob ? (
            <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
              <nav style={{display:"flex",overflowX:"auto"}}>
                {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{padding:"0 12px",height:52,border:"none",borderBottom:tab===t.id?"2px solid "+T.green:"2px solid transparent",background:"transparent",color:tab===t.id?T.green:T.inkMid,cursor:"pointer",fontSize:12,letterSpacing:"0.04em",fontFamily:"inherit",whiteSpace:"nowrap"}}>{t.l}</button>)}
              </nav>
              <Btn small onClick={onLogout}>Salir</Btn>
            </div>
          ) : (
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:13,color:T.inkMid}}>{tab === "__menu" ? "Menú" : TABS.find(t => t.id === tab).l}</span>
              <button onClick={() => setTab(tab === "__menu" ? "dashboard" : "__menu")} style={{background:"none",border:"1px solid "+T.border,borderRadius:4,padding:"4px 10px",cursor:"pointer",fontSize:12,color:T.ink,fontFamily:"inherit"}}>{tab === "__menu" ? "✕" : "☰ Más"}</button>
            </div>
          )}
        </div>

        {mob && tab === "__menu" ? (
          <div style={{position:"fixed",top:48,left:0,right:0,bottom:0,background:T.bgCard,zIndex:99,overflowY:"auto",padding:"1rem"}}>
            <div style={{fontSize:11,color:T.inkLt,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:12}}>Todas las secciones</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:20}}>
              {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"14px 16px",borderRadius:4,border:"1px solid "+T.border,background:T.bgCard,cursor:"pointer",fontSize:13,fontFamily:"inherit",color:T.ink,textAlign:"left"}}><span style={{fontSize:20}}>{t.icon}</span><span>{t.l}</span></button>)}
            </div>
            <div style={{borderTop:"1px solid "+T.borderLt,paddingTop:14}}>
              <div style={{fontSize:11,color:T.inkLt,marginBottom:8,wordBreak:"break-all"}}>Sesión: {email}</div>
              <Btn onClick={onLogout}>Cerrar sesión</Btn>
            </div>
          </div>
        ) : null}

        <div style={{padding:mob?"1rem":"2rem",maxWidth:mob?"100%":1200,margin:"0 auto"}}>
          {Pantalla ? <Pantalla/> : null}
        </div>

        {mob && tab !== "__menu" ? (
          <div style={{position:"fixed",bottom:0,left:0,right:0,height:64,background:T.bgCard,borderTop:"1px solid "+T.border,display:"flex",alignItems:"center",justifyContent:"space-around",zIndex:100}}>
            {MOB_TABS.map(id => {
              const t = TABS.find(x => x.id === id);
              const activo = tab === id;
              return (
                <button key={id} onClick={() => setTab(id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"6px 10px",border:"none",background:"none",cursor:"pointer",color:activo?T.green:T.inkLt,fontFamily:"inherit"}}>
                  <span style={{fontSize:22,lineHeight:1}}>{t.icon}</span>
                  <span style={{fontSize:9,letterSpacing:"0.04em",fontWeight:activo?500:400}}>{t.l}</span>
                </button>
              );
            })}
            <button onClick={() => setTab("__menu")} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"6px 10px",border:"none",background:"none",cursor:"pointer",color:T.inkLt,fontFamily:"inherit"}}>
              <span style={{fontSize:22,lineHeight:1}}>⋯</span><span style={{fontSize:9}}>Más</span>
            </button>
          </div>
        ) : null}
      </div>
    </Ctx.Provider>
  );
}

// ═══════════════════════ RAÍZ: LOGIN + TALLER ═══════════════════════
export default function App() {
  const [session, setSession] = useState(undefined); // undefined = verificando

  useEffect(() => {
    let vivo = true;
    getSession().then(s => { if (vivo) setSession(s || null); });
    const dejar = onAuth(s => { if (vivo) setSession(s || null); });
    return () => { vivo = false; dejar(); };
  }, []);

  if (session === undefined) return <Splash texto="Cargando…"/>;
  if (!session) return <Login/>;
  return <Taller email={session.user ? session.user.email : ""} onLogout={signOut}/>;
}
