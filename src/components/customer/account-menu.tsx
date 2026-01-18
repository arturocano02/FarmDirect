"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  User, 
  LogOut, 
  Package, 
  MapPin, 
  ChevronDown,
  Loader2
} from "lucide-react";
import { useMounted } from "@/lib/hooks/use-mounted";
import { cn } from "@/lib/utils";

export function CustomerAccountMenu() {
  const router = useRouter();
  const mounted = useMounted();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<{ email: string; name?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await (supabase as any)
          .from("profiles")
          .select("name")
          .eq("id", user.id)
          .single();
        setUser({
          email: user.email || "",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          name: (profile as any)?.name || user.user_metadata?.name,
        });
      }
      setIsLoading(false);
    }
    if (mounted) {
      getUser();
    }
  }, [mounted]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setIsOpen(false);
    router.push("/");
    router.refresh();
  }

  // Loading state
  if (!mounted || isLoading) {
    return (
      <div className="h-10 w-10 flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Sign in
      </Link>
    );
  }

  // Logged in - show dropdown
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm hover:bg-accent transition-colors"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-farm-100 text-farm-700">
          <User className="h-3.5 w-3.5" />
        </div>
        <span className="hidden sm:inline font-medium max-w-[100px] truncate">
          {user.name || "Account"}
        </span>
        <ChevronDown className={cn(
          "h-4 w-4 text-muted-foreground transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-lg border bg-card shadow-lg">
            <div className="p-3 border-b">
              <p className="font-medium truncate">{user.name || "Customer"}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <div className="p-1">
              <Link
                href="/account"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <User className="h-4 w-4" />
                Account Settings
              </Link>
              <Link
                href="/orders"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <Package className="h-4 w-4" />
                My Orders
              </Link>
              <Link
                href="/account/addresses"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <MapPin className="h-4 w-4" />
                Saved Addresses
              </Link>
            </div>
            <div className="border-t p-1">
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
