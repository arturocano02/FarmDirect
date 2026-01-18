/**
 * useMounted Hook
 * 
 * Returns true only after the component has mounted on the client.
 * Use this to guard browser-only code and prevent hydration mismatches.
 * 
 * Usage:
 *   const mounted = useMounted();
 *   if (!mounted) return <Skeleton />;
 *   return <ComponentThatNeedsBrowserAPIs />;
 * 
 * Why this is needed:
 * - Server renders with default/empty state
 * - Client hydrates expecting same HTML
 * - If client reads localStorage/auth immediately, HTML differs = error
 * - This hook ensures first client render matches server, then updates
 */

import { useEffect, useState } from "react";

export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
