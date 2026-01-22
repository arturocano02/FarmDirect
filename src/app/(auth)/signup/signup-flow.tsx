"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { 
  Loader2, 
  ShoppingBag, 
  Store, 
  ArrowLeft, 
  ArrowRight,
  Check,
  Leaf,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import type { UserRole } from "@/types/database";
import { cn } from "@/lib/utils";

type Step = "role" | "form" | "success";

export function SignupFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedRole = searchParams.get("role") as UserRole | null;
  
  const [step, setStep] = useState<Step>(preselectedRole ? "form" : "role");
  const [selectedRole, setSelectedRole] = useState<UserRole>(preselectedRole || "customer");
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Discreet access code state
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [accessCodeError, setAccessCodeError] = useState<string | null>(null);

  function handleRoleSelect(role: UserRole) {
    setSelectedRole(role);
    setStep("form");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAccessCodeError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      
      // Create the user account with the selected role
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: selectedRole,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?role=${selectedRole}`,
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          setError("This email is already registered. Please sign in instead.");
        } else {
          setError(signUpError.message);
        }
        return;
      }

      // If an access code was provided, attempt to claim admin role
      if (accessCode.trim()) {
        try {
          const claimResponse = await fetch("/api/admin/claim", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: email.trim(),
              code: accessCode.trim(),
            }),
          });

          const claimResult = await claimResponse.json();

          if (!claimResponse.ok) {
            // Show the error but don't block signup
            // The account is created but won't be admin
            setAccessCodeError(claimResult.message || "Invalid access code.");
            // Don't return - continue to success step
          } else if (claimResult.success && !claimResult.pending) {
            // Successfully upgraded to admin
            // User will be redirected to /admin after email confirmation
            console.log("[signup] Admin role granted");
          }
        } catch {
          // Network error - don't block signup
          setAccessCodeError("Could not verify access code. Please try again later.");
        }
      }

      // If the user was created and auto-confirmed (no email verification needed)
      // we can check and redirect immediately
      if (data.session) {
        // User is already logged in (email verification disabled)
        const syncResponse = await fetch("/api/auth/sync-role", {
          method: "POST",
          credentials: "include",
        });

        if (syncResponse.ok) {
          const { redirectPath } = await syncResponse.json();
          router.push(redirectPath);
          router.refresh();
          return;
        }
      }

      setStep("success");
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // Step 1: Role Selection
  if (step === "role") {
    return (
      <div className="space-y-8">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-farm-100">
            <Leaf className="h-6 w-6 text-farm-600" />
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Join FairFarm
          </h1>
          <p className="text-sm text-muted-foreground">
            How would you like to use FairFarm?
          </p>
        </div>

        <div className="space-y-4">
          {/* Customer Option */}
          <button
            onClick={() => handleRoleSelect("customer")}
            className="group w-full rounded-xl border-2 border-input bg-card p-6 text-left transition-all hover:border-farm-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-farm-500 focus:ring-offset-2"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 group-hover:bg-blue-200 transition-colors">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg font-semibold">
                  I want to buy meat
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Browse local farms, discover premium cuts, and get fresh meat delivered to your door.
                </p>
                <div className="mt-3 flex items-center text-sm font-medium text-farm-600">
                  Continue as customer
                  <ArrowRight className="ml-1 h-4 w-4" />
                </div>
              </div>
            </div>
          </button>

          {/* Farm Option */}
          <button
            onClick={() => handleRoleSelect("farm")}
            className="group w-full rounded-xl border-2 border-input bg-card p-6 text-left transition-all hover:border-farm-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-farm-500 focus:ring-offset-2"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 group-hover:bg-amber-200 transition-colors">
                <Store className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg font-semibold">
                  I want to sell meat
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  List your farm, manage products, and reach customers looking for quality local meat.
                </p>
                <div className="mt-3 flex items-center text-sm font-medium text-farm-600">
                  Continue as farm seller
                  <ArrowRight className="ml-1 h-4 w-4" />
                </div>
              </div>
            </div>
          </button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  // Step 3: Success
  if (step === "success") {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-farm-100">
          <Check className="h-8 w-8 text-farm-600" />
        </div>
        <div className="space-y-2">
          <h2 className="font-display text-2xl font-semibold">Check your email</h2>
          <p className="text-muted-foreground">
            We&apos;ve sent a confirmation link to
          </p>
          <p className="font-medium">{email}</p>
        </div>
        
        {/* Show access code error if any (but account was still created) */}
        {accessCodeError && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
            {accessCodeError}
          </div>
        )}
        
        <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
          <p>
            Click the link in your email to verify your account.
            {selectedRole === "farm" && (
              <span className="block mt-2">
                After verification, you&apos;ll be guided through setting up your farm profile.
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => router.push("/login")}
          className="text-sm font-medium text-primary hover:underline"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  // Step 2: Signup Form
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <button
          onClick={() => setStep("role")}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            selectedRole === "customer" 
              ? "bg-blue-100 text-blue-600" 
              : "bg-amber-100 text-amber-600"
          )}>
            {selectedRole === "customer" ? (
              <ShoppingBag className="h-5 w-5" />
            ) : (
              <Store className="h-5 w-5" />
            )}
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold">
              {selectedRole === "customer" ? "Create Customer Account" : "Create Farm Account"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {selectedRole === "customer" 
                ? "Start shopping for premium local meat" 
                : "Set up your farm and start selling"}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            {selectedRole === "farm" ? "Your Name" : "Full Name"}
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={selectedRole === "farm" ? "Farm owner name" : "John Doe"}
            required
            disabled={isLoading}
            className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            disabled={isLoading}
            className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={8}
            disabled={isLoading}
            className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
          <p className="text-xs text-muted-foreground">
            Must be at least 8 characters
          </p>
        </div>

        {/* Discreet access code section */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowAccessCode(!showAccessCode)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAccessCode ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            Have an invite code?
          </button>
          
          {showAccessCode && (
            <div className="mt-2 space-y-2">
              <input
                id="accessCode"
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Enter code"
                disabled={isLoading}
                autoComplete="off"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground">
                Access code (optional)
              </p>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            "inline-flex h-11 w-full items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
            selectedRole === "customer"
              ? "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
              : "bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500"
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              Create {selectedRole === "customer" ? "Customer" : "Farm"} Account
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
