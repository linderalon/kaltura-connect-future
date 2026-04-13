/**
 * Supabase client utility for kaltura-future-teller.
 *
 * Required env vars (add to .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
 *
 * Required SQL (run once in your Supabase project):
 * ─────────────────────────────────────────────────
 * CREATE TABLE public.sessions (
 *   id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   visitor_name      TEXT NOT NULL,
 *   persona           TEXT NOT NULL,
 *   prediction        TEXT NOT NULL,
 *   card_summary      TEXT NOT NULL,
 *   linkedin_caption  TEXT,
 *   pain_point        TEXT,
 *   vision            TEXT,
 *   personality_choice TEXT,
 *   ambition_level    INTEGER,
 *   risk_tolerance    TEXT,
 *   created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 *
 * -- Allow anyone with the anon key to read sessions (for shareable links)
 * ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
 *
 * CREATE POLICY "public_read" ON public.sessions
 *   FOR SELECT USING (true);
 *
 * CREATE POLICY "anon_insert" ON public.sessions
 *   FOR INSERT WITH CHECK (true);
 * ─────────────────────────────────────────────────
 */

import { createClient } from "@supabase/supabase-js";
import type { Persona } from "./personaEngine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SessionData {
  id: string;
  visitor_name: string;
  persona: Persona;
  prediction: string;
  card_summary: string;
  linkedin_caption: string | null;
  pain_point: string | null;
  vision: string | null;
  personality_choice: string | null;
  ambition_level: number | null;
  risk_tolerance: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Client factory (lightweight — creates a new client per call, which is
// safe in Server Components and avoids module-level singleton issues)
// ---------------------------------------------------------------------------

function makeClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

/** Fetch a single session by its UUID. Returns null if not found or Supabase
 *  is not configured. */
export async function getSessionById(
  id: string
): Promise<SessionData | null> {
  const supabase = makeClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("sessions")
    .select(
      "id, visitor_name, persona, prediction, card_summary, linkedin_caption, pain_point, vision, personality_choice, ambition_level, risk_tolerance, created_at"
    )
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as SessionData;
}

/** Persist a completed prediction session. Returns the new row's UUID or null on failure. */
export async function saveSession(
  payload: Omit<SessionData, "id" | "created_at">
): Promise<string | null> {
  const supabase = makeClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("sessions")
    .insert(payload)
    .select("id")
    .single();

  if (error || !data) return null;
  return data.id as string;
}
