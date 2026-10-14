"use client";

import { useEffect, useState } from "react";
import { enterApixisUrl } from "@/lib/apixis-world";

/**
 * "Enter the Apixis world" link (https://www.apixis.dev/enter?from=contentbot). Apixis.dev signs the
 * person in with Apixis ID and creates their agent if needed, so the link works even before
 * provisioning. Once per tab it asks /api/world/agent to make sure the agent exists and, when it
 * does, reads "Your agent is ready". Same look as the wallet chip's sign-in link.
 */
export function ApixisWorldLink() {
  const [href, setHref] = useState(enterApixisUrl("contentbot"));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch("/api/world/agent", { method: "POST", credentials: "same-origin", cache: "no-store" })
      .then((r) => r.json().catch(() => null))
      .then((d: { ready?: boolean; enterUrl?: string } | null) => {
        if (!alive || !d) return;
        if (typeof d.enterUrl === "string" && d.enterUrl.startsWith("https://www.apixis.dev/")) setHref(d.enterUrl);
        setReady(d.ready === true);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return (
    <a
      className="apx-world-link"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: "inherit", fontSize: 11, textDecoration: "underline", whiteSpace: "nowrap", opacity: 0.85 }}
    >
      {ready ? "Your agent is ready · Enter the Apixis world" : "Enter the Apixis world"}
    </a>
  );
}
