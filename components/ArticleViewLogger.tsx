"use client";

import { useEffect, useRef } from "react";
import { logBehavior } from "@/src/lib/supabase/userBehavior";

/**
 * Invisible component that logs a `view` behavior event once per mount.
 * Drop this inside any server component article page — it handles the
 * client boundary so the parent can stay a server component.
 */
export default function ArticleViewLogger({ articleId }: { articleId: string }) {
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current || !articleId) return;
    logged.current = true;
    void logBehavior(articleId, "view");
  }, [articleId]);

  return null;
}
