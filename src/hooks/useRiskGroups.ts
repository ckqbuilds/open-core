import { useCallback, useEffect, useState } from "react";
import { RISK_GROUPS, type RiskGroupId } from "@/data/symptoms";

const KEY = "opencore.riskGroups";

const VALID = new Set<string>(RISK_GROUPS.map((g) => g.id));

function load(): RiskGroupId[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Drop anything not in the current group list, so a renamed or removed
    // group can't resurrect stale guidance from an old visit.
    return parsed.filter((v): v is RiskGroupId => typeof v === "string" && VALID.has(v));
  } catch {
    return [];
  }
}

/**
 * The conditions a user has selected, persisted locally. This never leaves the
 * browser — it is not sent to the server, the chat provider, or any API.
 */
export function useRiskGroups() {
  const [groups, setGroups] = useState<RiskGroupId[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(groups));
    } catch {
      // Private-browsing quota errors shouldn't break the page.
    }
  }, [groups]);

  const toggle = useCallback((id: RiskGroupId) => {
    setGroups((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  }, []);

  const clear = useCallback(() => setGroups([]), []);

  return { groups, selected: new Set(groups), toggle, clear };
}
