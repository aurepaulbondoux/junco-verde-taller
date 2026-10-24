import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ljoalncaxjkkjkoclqsy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxqb2FsbmNheGpra2prb2NscXN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3MzI4ODUsImV4cCI6MjEwODMwODg4NX0.mVwVnvdKOqiMkdejSs3RKBu8LG8moDtK1HHNJK68X2M'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Helpers genéricos para leer y escribir tablas
export async function dbGet(tabla) {
  const { data, error } = await supabase.from(tabla).select('data').order('id').limit(1)
  if (error || !data || data.length === 0) return null
  return data[0].data
}

export async function dbSet(tabla, valor) {
  // Borra todo y guarda el nuevo estado
  await supabase.from(tabla).delete().neq('id', 0)
  const { error } = await supabase.from(tabla).insert({ data: valor })
  if (error) console.error(`Error guardando ${tabla}:`, error)
}
