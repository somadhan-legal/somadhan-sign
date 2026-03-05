import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!)

async function run() {
  const { data: docs } = await supabase.from('documents').select('id, title').limit(1)
  if (!docs || docs.length === 0) return console.log('no docs')
  
  const docId = docs[0].id
  console.log('Doc ID:', docId)
  
  const { data: placements, error } = await supabase
    .from('signature_placements')
    .select(`
      signature_id,
      signature_fields (
        field_type,
        page_number,
        x_position,
        y_position,
        width,
        height
      )
    `)
    .eq('document_id', docId)
    
  console.log('Error:', error)
  console.log('Placements:', JSON.stringify(placements, null, 2))
}
run()
