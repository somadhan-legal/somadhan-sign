import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: docs } = await supabase.from('documents').select('id, title').limit(5)
  console.log('Docs:', docs)
  
  if (docs && docs.length > 0) {
    const docId = docs[0].id
    const { data: audit } = await supabase.from('audit_trail').select('*').eq('document_id', docId)
    console.log(`Audit for doc ${docId}:`, audit?.length)
    
    const { data: placements } = await supabase.from('signature_placements').select('*').eq('document_id', docId)
    console.log(`Placements for doc ${docId}:`, placements)
  }
}
run()
