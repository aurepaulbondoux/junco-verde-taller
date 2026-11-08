import { useState, useEffect } from "react";
import { dbGet, dbSet } from "./supabase.js";

const T = {bg:"#faf7f2",bgCard:"#fff",bgMuted:"#f0ebe2",ink:"#1e1c18",inkMid:"#5a5750",inkLt:"#9a9690",border:"#ddd8cf",borderLt:"#eae5dc",green:"#3d5a3e",greenLt:"#e8f0e8",danger:"#b03a2e",dangerLt:"#fdf0ee",warn:"#916a00",warnLt:"#fef8e6",ok:"#2d6a4f",okLt:"#e8f5ee",info:"#2c5f8a",infoLt:"#eaf2f8"};
const fmt = n => "$ " + Math.round(n || 0).toLocaleString("es-AR");
const MOTIVOS = ["Cliente canceló", "Error de carga", "Pedido duplicado", "No se puede producir (lana o tiempo)", "Cambio de prenda o talle", "Otro"];

const fechaLocal = iso => {
  try {
    return new Date(iso).toLocaleString("es-UY", {day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"});
  } catch (e) {
    return iso || "";
  }
};

// Guarda el registro en la tabla pedidos_eliminados. Devuelve true si se guardó.
async function registrarEliminado(registro) {
  const actual = await dbGet("pedidos_eliminados");
  if (actual === undefined) return false;
  const lista = Array.isArray(actual) ? actual : [];
  return await dbSet("pedidos_eliminados", lista.concat([registro]));
}

function Boton({ children, onClick, peligro, primario, disabled, small }) {
  let bg = "transparent", col = T.ink, bor = "1px solid " + T.border;
  if (primario) { bg = T.green; col = "#fff"; bor = "none"; }
  if (peligro) { bg = T.danger; col = "#fff"; bor = "none"; }
  return (
    <button onClick={onClick} disabled={disabled} style={{padding: small ? "4px 10px" : "8px 18px", borderRadius: 2, border: bor, background: bg, color: col, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, fontSize: small ? 11 : 13, fontWeight: 500, fontFamily: "inherit", whiteSpace: "nowrap"}}>{children}</button>
  );
}
function Modal({ children, onClose, ancho }) {
  const mob = window.innerWidth < 768;
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(30,28,24,0.5)", display: "flex", alignItems: mob ? "flex-end" : "center", justifyContent: "center", zIndex: 320}}>
      <div style={{background: T.bgCard, border: "1px solid " + T.border, borderRadius: mob ? "12px 12px 0 0" : 4, padding: "1.5rem", width: mob ? "100%" : (ancho || 520), maxWidth: "100vw", maxHeight: mob ? "92vh" : "90vh", overflowY: "auto", fontFamily: "'Georgia',serif", color: T.ink}}>{children}</div>
    </div>
  );
}

// ═══════════════════════ ELIMINAR UN PEDIDO ═══════════════════════
export function ModalEliminar({ p, app, onClose }) {
  const [motivo, setMotivo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const pr = app.getPrenda(p.prenda);
  const total = (pr ? pr.p : 0) * p.cantidad;
  const entregado = p.estado === "Entregado";
  const lanaDevuelta = (!entregado && pr && pr.lana) ? pr.lana * p.cantidad : 0;
  const valido = motivo !== "" && (motivo !== "Otro" || detalle.trim().length >= 3);

  const confirmar = async () => {
    setEnviando(true);
    setError("");
    const registro = {
      id: Date.now(),
      pedido: p,
      motivo: motivo,
      detalle: detalle.trim(),
      fecha: new Date().toISOString(),
      por: app.email || "",
      estadoAlEliminar: p.estado
    };
    const ok = await registrarEliminado(registro);
    if (!ok) {
      setError("No se pudo guardar el registro, así que el pedido NO se eliminó. Verificá que exista la tabla pedidos_eliminados en Supabase y probá de nuevo.");
      setEnviando(false);
      return;
    }
    if (lanaDevuelta > 0) {
      app.sa(app.artesanas.map(x => x.nombre === p.artesana ? {...x, lana_asignada: Math.max(0, (x.lana_asignada || 0) - lanaDevuelta)} : x));
    }
    app.sp(app.pedidos.filter(x => x.id !== p.id));
    onClose();
  };

  return (
    <Modal onClose={enviando ? () => {} : onClose}>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid " + T.borderLt}}>
        <h3 style={{margin: 0, fontSize: 17, fontWeight: 400, color: T.danger}}>Eliminar pedido</h3>
        <button onClick={onClose} disabled={enviando} style={{background: "none", border: "none", cursor: "pointer", fontSize: 22, color: T.inkLt}}>×</button>
      </div>

      <div style={{background: T.bg, borderRadius: 2, padding: "12px 14px", marginBottom: 12, fontSize: 13}}>
        <div style={{fontWeight: 500, marginBottom: 4}}>{p.cliente} — {p.prenda}{p.talle ? " (" + p.talle + ")" : ""} ×{p.cantidad}</div>
        <div style={{color: T.inkMid, fontSize: 12, lineHeight: 1.6}}>
          Artesana: {p.artesana} · Estado: {p.estado} · Entrega: {p.fechaEntrega}<br/>
          Total: {fmt(total)} · Cobrado: {fmt(p.pagado || 0)}
        </div>
      </div>

      {entregado ? (
        <div style={{background: T.dangerLt, border: "1px solid " + T.danger, borderRadius: 2, padding: "9px 12px", marginBottom: 10, fontSize: 12, color: T.danger, lineHeight: 1.5}}>
          <strong>Este pedido ya figura como entregado.</strong> Al eliminarlo deja de contarse en ventas, análisis y en el historial de la artesana (también cambia el estimado de lo que se le debe pagar). El <strong>stock de prendas no se modifica</strong>: ajustalo a mano si hace falta.
        </div>
      ) : null}
      {(p.pagado || 0) > 0 ? (
        <div style={{background: T.warnLt, border: "1px solid " + T.warn, borderRadius: 2, padding: "9px 12px", marginBottom: 10, fontSize: 12, color: T.warn, lineHeight: 1.5}}>
          Este pedido tiene <strong>{fmt(p.pagado)}</strong> cobrados. Ese dinero dejará de figurar en la app: acordate de devolverlo o registrarlo donde corresponda.
        </div>
      ) : null}
      {lanaDevuelta > 0 ? (
        <div style={{background: T.infoLt, border: "1px solid " + T.info, borderRadius: 2, padding: "9px 12px", marginBottom: 10, fontSize: 12, color: T.info}}>
          Se descontarán <strong>{lanaDevuelta.toLocaleString()} g</strong> de la lana asignada a {p.artesana}.
        </div>
      ) : null}

      <div style={{fontSize: 11, color: T.inkMid, textTransform: "uppercase", letterSpacing: "0.06em", margin: "14px 0 8px", fontWeight: 500}}>¿Por qué lo eliminás?</div>
      <div style={{display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10}}>
        {MOTIVOS.map(m => {
          const on = motivo === m;
          return (
            <span key={m} onClick={() => setMotivo(m)} style={{padding: "6px 12px", borderRadius: 99, fontSize: 12, cursor: "pointer", background: on ? T.danger : "transparent", color: on ? "#fff" : T.inkMid, border: "1px solid " + (on ? T.danger : T.border)}}>{m}</span>
          );
        })}
      </div>
      <input value={detalle} onChange={e => setDetalle(e.target.value)} placeholder={motivo === "Otro" ? "Contá el motivo (obligatorio)" : "Detalle (opcional)"}
        style={{width: "100%", padding: "9px 12px", border: "1px solid " + T.border, borderRadius: 2, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 12}}/>

      <div style={{fontSize: 11, color: T.inkLt, marginBottom: 12, lineHeight: 1.5}}>
        El pedido sale de la lista, pero queda guardado en <strong>🗑 Eliminados</strong> con el motivo, la fecha y quién lo eliminó. Desde ahí se puede restaurar.
      </div>

      {error ? <div style={{background: T.dangerLt, border: "1px solid " + T.danger, borderRadius: 2, padding: "9px 12px", marginBottom: 12, fontSize: 12, color: T.danger}}>{error}</div> : null}

      <div style={{display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 10, borderTop: "1px solid " + T.borderLt}}>
        <Boton onClick={onClose} disabled={enviando}>Cancelar</Boton>
        <Boton peligro onClick={confirmar} disabled={!valido || enviando}>{enviando ? "Eliminando…" : "Eliminar pedido"}</Boton>
      </div>
    </Modal>
  );
}

// ═══════════════════════ REGISTRO DE ELIMINADOS ═══════════════════════
export function ModalEliminados({ app, onClose }) {
  const [lista, setLista] = useState(null);
  const [error, setError] = useState(false);
  const [msg, setMsg] = useState("");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    let vivo = true;
    dbGet("pedidos_eliminados").then(d => {
      if (!vivo) return;
      if (d === undefined) { setError(true); return; }
      setLista(Array.isArray(d) ? d : []);
    });
    return () => { vivo = false; };
  }, []);

  const restaurar = async reg => {
    const ped = reg.pedido;
    if (app.pedidos.some(x => x.id === ped.id)) { setMsg("Ese pedido ya está en la lista de pedidos."); return; }
    if (!window.confirm("¿Restaurar el pedido de " + ped.cliente + " (" + ped.prenda + ")?")) return;
    const nueva = lista.map(r => r.id === reg.id ? {...r, restaurado: {fecha: new Date().toISOString(), por: app.email || ""}} : r);
    const ok = await dbSet("pedidos_eliminados", nueva);
    if (!ok) { setMsg("No se pudo actualizar el registro. Probá de nuevo."); return; }
    setLista(nueva);
    app.sp(app.pedidos.concat([ped]));
    const pr = app.getPrenda(ped.prenda);
    if (ped.estado !== "Entregado" && pr && pr.lana) {
      app.sa(app.artesanas.map(x => x.nombre === ped.artesana ? {...x, lana_asignada: (x.lana_asignada || 0) + pr.lana * ped.cantidad} : x));
    }
    setMsg("Pedido restaurado: ya está de nuevo en la lista.");
  };

  const ordenada = lista ? lista.slice().sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))) : [];
  const q = busqueda.trim().toLowerCase();
  const visibles = ordenada.filter(r => {
    if (!q) return true;
    const ped = r.pedido || {};
    const texto = [ped.cliente, ped.prenda, ped.artesana, r.motivo, r.detalle, r.por].join(" ").toLowerCase();
    return texto.includes(q);
  });

  return (
    <Modal onClose={onClose} ancho={720}>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12}}>
        <h3 style={{margin: 0, fontSize: 17, fontWeight: 400}}>Pedidos eliminados</h3>
        <button onClick={onClose} style={{background: "none", border: "none", cursor: "pointer", fontSize: 22, color: T.inkLt}}>×</button>
      </div>

      {error ? <div style={{background: T.dangerLt, border: "1px solid " + T.danger, borderRadius: 2, padding: "10px 12px", fontSize: 12, color: T.danger}}>No se pudo cargar el registro. Verificá que exista la tabla <strong>pedidos_eliminados</strong> en Supabase.</div> : null}
      {!error && lista === null ? <div style={{fontSize: 13, color: T.inkLt, padding: "1rem"}}>Cargando…</div> : null}
      {msg ? <div style={{background: T.infoLt, border: "1px solid " + T.info, borderRadius: 2, padding: "8px 12px", marginBottom: 10, fontSize: 12, color: T.info}}>{msg}</div> : null}

      {lista !== null && lista.length === 0 ? <div style={{textAlign: "center", color: T.inkLt, fontSize: 13, padding: "2rem 1rem"}}>Todavía no se eliminó ningún pedido.</div> : null}

      {lista !== null && lista.length > 0 ? (
        <div>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder={"Buscar entre " + lista.length + " eliminados…"} style={{width: "100%", padding: "8px 12px", border: "1px solid " + T.border, borderRadius: 2, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 12}}/>
          {visibles.length === 0 ? <div style={{fontSize: 12, color: T.inkLt, padding: "1rem", textAlign: "center"}}>Sin resultados.</div> : null}
          {visibles.map(r => {
            const ped = r.pedido || {};
            return (
              <div key={r.id} style={{border: "1px solid " + T.border, borderLeft: "4px solid " + (r.restaurado ? T.ok : T.danger), borderRadius: 4, padding: "10px 12px", marginBottom: 10, background: T.bgCard}}>
                <div style={{display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "flex-start"}}>
                  <div style={{flex: 1, minWidth: 200}}>
                    <div style={{fontSize: 14, fontWeight: 500}}>{ped.cliente} — {ped.prenda}{ped.talle ? " (" + ped.talle + ")" : ""} ×{ped.cantidad}</div>
                    <div style={{fontSize: 11, color: T.inkMid, marginTop: 2}}>Artesana: {ped.artesana} · Estado al eliminar: {r.estadoAlEliminar || ped.estado} · Entrega: {ped.fechaEntrega} · Cobrado: {fmt(ped.pagado || 0)}</div>
                  </div>
                  {r.restaurado ? <span style={{fontSize: 10, padding: "2px 9px", borderRadius: 99, background: T.okLt, color: T.ok, whiteSpace: "nowrap"}}>Restaurado</span> : <Boton small onClick={() => restaurar(r)}>Restaurar</Boton>}
                </div>
                <div style={{marginTop: 8, fontSize: 12, background: T.bg, borderRadius: 2, padding: "7px 10px"}}>
                  <strong>Motivo:</strong> {r.motivo}{r.detalle ? " — " + r.detalle : ""}
                </div>
                <div style={{marginTop: 6, fontSize: 10, color: T.inkLt}}>
                  Eliminado el {fechaLocal(r.fecha)}{r.por ? " por " + r.por : ""}
                  {r.restaurado ? " · Restaurado el " + fechaLocal(r.restaurado.fecha) + (r.restaurado.por ? " por " + r.restaurado.por : "") : ""}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <div style={{display: "flex", justifyContent: "flex-end", marginTop: 12, paddingTop: 10, borderTop: "1px solid " + T.borderLt}}>
        <Boton onClick={onClose}>Cerrar</Boton>
      </div>
    </Modal>
  );
}
