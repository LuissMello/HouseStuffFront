"use client";

import { useEffect } from "react";

function resolveLocalTarget(hash: string) {
  const route = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!route.startsWith("/") || route.startsWith("//")) return null;

  const target = new URL(route, window.location.origin);
  const section = target.pathname === "/" ? target.searchParams.get("section") : null;
  if (section) return `/#${encodeURIComponent(section)}`;

  return `${target.pathname}${target.search}`;
}

export default function LocalHashNavigation() {
  useEffect(() => {
    const navigate = () => {
      const target = resolveLocalTarget(window.location.hash);
      if (!target) return;

      const current = `${window.location.pathname}${window.location.search}`;
      if (target === current) {
        window.history.replaceState(null, "", current);
        return;
      }

      window.location.assign(target);
    };

    window.addEventListener("hashchange", navigate);
    navigate();
    return () => window.removeEventListener("hashchange", navigate);
  }, []);

  return null;
}
