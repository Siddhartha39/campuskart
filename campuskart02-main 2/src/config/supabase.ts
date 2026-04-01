import { createClient } from '@supabase/supabase-js';

// You need to replace these with your actual Supabase credentials
const supabaseUrl = 'https://zhiarsgzdwfshjhrmhox.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoaWFyc2d6ZHdmc2hqaHJtaG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MDEzNjUsImV4cCI6MjA3MDQ3NzM2NX0.fH3iSBSe71Mi4Efsm0M6HB4_sZq_PLpYsYirXW6bW_8';

export const supabase = createClient(supabaseUrl, supabaseKey);