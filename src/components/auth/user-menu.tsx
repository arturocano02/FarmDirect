"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SignOutButton } from "./sign-out-button";
import { User, ChevronDown, Shield, Store, Package } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

type UserRole = "customer" | "farm" | "admin";

export function UserMenu() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function fetchUserAndRole() {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Fetch role from profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        
        // Determine effective role
        // Note: Admin email allowlist is checked server-side, but we can check metadata
        const profileRole = (profile as { role?: string } | null)?.role;
        const metadataRole = session.user.user_metadata?.role;
        const effectiveRole = (profileRole || metadataRole || "customer") as UserRole;
        setRole(effectiveRole);
      }
      
      setIsLoading(false);
    }

    fetchUserAndRole();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();
          const profileRole = (profile as { role?: string } | null)?.role;
          const metadataRole = session.user.user_metadata?.role;
          setRole((profileRole || metadataRole || "customer") as UserRole);
        } else {
          setRole(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Element;
      if (!target.closest("[data-user-menu]")) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign In
        </Link>
        <Link
          href="/signup"
          className="hidden sm:inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          Get Started
        </Link>
      </div>
    );
  }

  const userEmail = user.email || "User";
  const userInitial = userEmail.charAt(0).toUpperCase();

  return (
    <div className="relative" data-user-menu>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-farm-100 text-farm-700 text-xs font-medium">
          {userInitial}
        </div>
        <span className="hidden sm:inline max-w-[120px] truncate">
          {userEmail}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border bg-background shadow-lg z-50">
          <div className="p-2 border-b">
            <p className="text-xs text-muted-foreground">Signed in as</p>
            <p className="text-sm font-medium truncate">{userEmail}</p>
          </div>
          
          <div className="p-1">
            {/* Admin link - only show for admins */}
            {role === "admin" && (
              <Link
                href="/admin"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Shield className="h-4 w-4" />
                Admin Console
              </Link>
            )}
            
            {/* Farm portal link - only show for farm users */}
            {role === "farm" && (
              <Link
                href="/farm-portal"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Store className="h-4 w-4" />
                Seller Portal
              </Link>
            )}

            <Link
              href="/account"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <User className="h-4 w-4" />
              Account
            </Link>
            <Link
              href="/orders"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Package className="h-4 w-4" />
              My Orders
            </Link>
          </div>

          <div className="border-t p-1">
            <SignOutButton className="w-full justify-start" />
          </div>
        </div>
      )}
    </div>
  );
}
