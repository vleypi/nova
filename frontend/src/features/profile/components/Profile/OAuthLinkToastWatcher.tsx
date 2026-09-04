"use client";
import { Suspense } from "react";
import { useOAuthLinkToast } from "../../hooks/useOAuthLinkToast";

// Suspense обязателен для useSearchParams в Next.
function Watcher() {
  useOAuthLinkToast();
  return null;
}

export function OAuthLinkToastWatcher() {
  return (
    <Suspense fallback={null}>
      <Watcher />
    </Suspense>
  );
}
