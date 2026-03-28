"use client";

import { useEffect } from "react";

// Enregistre le Service Worker PWA au montage côté client
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  return null;
}
