import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Faltan las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(SUPABASE_URL || 'http://localhost', SUPABASE_ANON_KEY || 'missing')

// Devuelve: el valor guardado, null si la tabla está vacía, undefined si hubo error
export async function dbGet(tabla) {
  try {
    const { data, error } = await supabase
      .from(tabla)
      .select('id, data')
      .order('id', { ascending: true })
      .limit(1)
    if (error) {
      console.error('dbGet error en ' + tabla + ':', error)
      return undefined
    }
    if (!data || data.length === 0) return null
    return data[0].data
  } catch (e) {
    console.error('dbGet exception en ' + tabla + ':', e)
    return undefined
  }
}

async function guardar(tabla, valor) {
  try {
    const { data: filas, error: errSel } = await supabase
      .from(tabla)
      .select('id')
      .order('id', { ascending: true })

    if (errSel) {
      console.error('dbSet select error en ' + tabla + ':', errSel)
      return false
    }

    if (filas && filas.length > 0) {
      const idPrincipal = filas[0].id
      const { error } = await supabase
        .from(tabla)
        .update({ data: valor, updated_at: new Date().toISOString() })
        .eq('id', idPrincipal)
      if (error) {
        console.error('dbSet update error en ' + tabla + ':', error)
        return false
      }
      // Limpia filas duplicadas si las hubiera
      for (let i = 1; i < filas.length; i++) {
        await supabase.from(tabla).delete().eq('id', filas[i].id)
      }
    } else {
      const { error } = await supabase.from(tabla).insert({ data: valor })
      if (error) {
        console.error('dbSet insert error en ' + tabla + ':', error)
        return false
      }
    }
    return true
  } catch (e) {
    console.error('dbSet exception en ' + tabla + ':', e)
    return false
  }
}

// Cola por tabla: los guardados se hacen de a uno, en orden
const colas = {}
export function dbSet(tabla, valor) {
  const previa = colas[tabla] || Promise.resolve()
  const siguiente = previa.then(() => guardar(tabla, valor))
  colas[tabla] = siguiente.catch(() => false)
  return siguiente
}
