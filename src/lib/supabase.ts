import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pmaecycitwzwjwrxtgjn.supabase.co'
const supabaseAnonKey = 'sb_publishable_wpaCsABx72Ot07V6UftCoQ_GNfS35N0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)