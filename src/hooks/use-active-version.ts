"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { fetchVersions } from "@/lib/versions";

const FALLBACK_VERSION = "0.1";

export function useActiveVersion() {
  const [version, setVersion] = useState(FALLBACK_VERSION);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    fetchVersions(supabase)
      .then((versions) => {
        const active = versions.find((v) => v.isActive);
        if (active) setVersion(active.id);
      })
      .catch(() => undefined); // Offline or not migrated yet: keep the fallback.
  }, []);

  return version;
}
