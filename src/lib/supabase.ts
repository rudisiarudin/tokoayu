import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://qbqsjcttipjalgigqqmx.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFicXNqY3R0aXBqYWxnaWdxcW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNTcyNjYsImV4cCI6MjA5NTYzMzI2Nn0.w4LIUNvJYzTl7ayBw8fNB_SWTpYplg6vxJkEFjWBUeE";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
