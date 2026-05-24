import { supabase } from "./client";

const USER_ID = "local-user";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DigestFrequency = "daily" | "weekly" | "off";
export type RiskThreshold   = "high" | "medium" | "low";

export interface UserPreferences {
  // Topics to follow (maps to user_interests)
  topics: string[];

  // Notification flags
  notifyCritical:   boolean;   // banner / alert when critical threat appears
  notifyNewThreats: boolean;   // toast on realtime article insert
  notifyDigest:     boolean;   // reminder to check daily digest

  // Digest
  digestFrequency: DigestFrequency;

  // Realtime feed
  realtimeEnabled: boolean;

  // Risk threshold — minimum risk level to surface in feed
  riskThreshold: RiskThreshold;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  topics:           [],
  notifyCritical:   true,
  notifyNewThreats: true,
  notifyDigest:     true,
  digestFrequency:  "daily",
  realtimeEnabled:  true,
  riskThreshold:    "low",
};

type PrefRow = {
  topics:             string[] | null;
  notify_critical:    boolean | null;
  notify_new_threats: boolean | null;
  notify_digest:      boolean | null;
  digest_frequency:   string  | null;
  realtime_enabled:   boolean | null;
  risk_threshold:     string  | null;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getUserPreferences(): Promise<UserPreferences> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select(
      "topics, notify_critical, notify_new_threats, notify_digest, " +
      "digest_frequency, realtime_enabled, risk_threshold"
    )
    .eq("user_id", USER_ID)
    .maybeSingle();

  if (error) {
    console.error("[getUserPreferences] Query failed:", error.message);
    return { ...DEFAULT_PREFERENCES };
  }
  if (!data) return { ...DEFAULT_PREFERENCES };

  const row = data as unknown as PrefRow;
  return {
    topics:           row.topics            ?? [],
    notifyCritical:   row.notify_critical   ?? true,
    notifyNewThreats: row.notify_new_threats ?? true,
    notifyDigest:     row.notify_digest     ?? true,
    digestFrequency:  (row.digest_frequency as DigestFrequency) ?? "daily",
    realtimeEnabled:  row.realtime_enabled  ?? true,
    riskThreshold:    (row.risk_threshold   as RiskThreshold)   ?? "low",
  };
}

export async function saveUserPreferences(
  prefs: UserPreferences
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id:            USER_ID,
        topics:             prefs.topics,
        notify_critical:    prefs.notifyCritical,
        notify_new_threats: prefs.notifyNewThreats,
        notify_digest:      prefs.notifyDigest,
        digest_frequency:   prefs.digestFrequency,
        realtime_enabled:   prefs.realtimeEnabled,
        risk_threshold:     prefs.riskThreshold,
        updated_at:         new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) {
    console.error("[saveUserPreferences] Upsert failed:", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
