"use client";

import { useEffect, useRef } from "react";
import { logBehavior } from "@/src/lib/supabase/userBehavior";
import { useAuth } from "@/components/AuthProvider";

/**
 * Invisible component that logs a `view` behavior event once per mount.
 */
export default function ArticleViewLogger({ articleId }: { articleId: string }) {
  const { userId } = useAuth();
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current || !articleId || !userId) return;
    logged.current = true;
    void logBehavior(userId, articleId, "view");
  }, [articleId, userId]);

  return null;
}
