import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ljoalncaxjkkjkoclqsy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxqb2FsbmNheGpra2prb2NscXN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3MzI4ODUsImV4cCI6MjEwODMwODg4NX0.mVwVnvdKOqiMkdejSs3RKBu8LG8moDtK1HHNJK68X2M'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export async function dbGet(tabla) {
  try {
    const { data, error } = await supabase
      .from(tabla)
      .select('data')
      .order('id', { ascending: false })
      .limit(1)
    if (error || !data || data.length === 0) return null
    return data[0].data
  } catch (e) {
    console.error(`dbGet error en ${tabla}:`, e)
    return null
  }
}

export async function dbSet(tabla, valor) {
  try {
    // Primero leemos los IDs existentes
    const { data: filas } = await supabase
      .from(tabla)
      .select('id')

    // Borramos fila por fila si hay datos
    if (filas && filas.length > 0) {
      for (const fila of filas) {
        await supabase.from(tabla).delete().eq('id', fila.id)
      }
    }

    // Insertamos el nuevo estado
    const { error } = await supabase
      .from(tabla)
      .insert({ data: valor })

    if (error) console.error(`dbSet error en ${tabla}:`, error)
  } catch (e) {
    console.error(`dbSet exception en ${tabla}:`, e)
  }
}
