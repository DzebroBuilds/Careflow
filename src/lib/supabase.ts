import { createClient } from '@supabase/supabase-js';
export const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const productionEnabled = process.env.NEXT_PUBLIC_CAREFLOW_LIVE_ENABLED === 'true';
export const sampleDataOnly = process.env.NEXT_PUBLIC_CAREFLOW_DATA_MODE !== 'production';
export const authReturnType = typeof window === 'undefined' ? null : new URLSearchParams(window.location.hash.slice(1)).get('type');
export const supabase = configured ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}) : null;
