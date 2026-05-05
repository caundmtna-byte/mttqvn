/**
 * Supabase Database types (schema for typed client).
 *
 * Placeholder: allows createClient<Database> to type-check. When you connect
 * to a real project, generate types and replace this file:
 *
 *   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/database.types.ts
 *
 * Or with local Supabase:
 *   npx supabase gen types typescript --local > lib/supabase/database.types.ts
 *
 * Generated file will export type Database = { public: { Tables: { ... }, Views: {}, Enums: {} } }
 *
 * --- ID column (int8) ---
 * On Supabase, create tables with: id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY
 * (or bigserial). PostgREST returns bigint as string in JSON; the app keeps id: string
 * in TypeScript. Do not send id on insert so the DB generates it.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      [key: string]: {
        Row: Record<string, Json>;
        Insert: Record<string, Json>;
        Update: Record<string, Json>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
