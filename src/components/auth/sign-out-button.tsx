"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, LogOut } from "lucide-react";

interface SignOutButtonProps {
  className?: string;
  children?: React.ReactNode;
  variant?: "default" | "ghost" | "destructive";
}

export function SignOutButton({ 
  className = "", 
  children,
  variant = "ghost" 
}: SignOutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignOut() {
    setIsLoading(true);
    
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      
      // Force a full page refresh to clear any cached state
      router.push("/");
      router.refresh();
      
      // Also force window reload to ensure clean state
      window.location.href = "/";
    } catch (error) {
      console.error("Sign out error:", error);
      // Force reload anyway to clear state
      window.location.href = "/";
    } finally {
      setIsLoading(false);
    }
  }

  const baseStyles = "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  
  const variantStyles = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  };

  return (
    <button
      onClick={handleSignOut}
      disabled={isLoading}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Signing out...</span>
        </>
      ) : (
        <>
          {children || (
            <>
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </>
          )}
        </>
      )}
    </button>
  );
}
