"use client";

import { useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, ShoppingBag, LogIn, UserPlus } from "lucide-react";

interface AuthRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export function AuthRequiredModal({
  isOpen,
  onClose,
  title = "Create an account to order",
  description = "Sign in or create an account to add items to your cart and place orders.",
}: AuthRequiredModalProps) {
  const pathname = usePathname();
  
  // Create redirect URL to return user to current page after auth
  const redirectUrl = encodeURIComponent(pathname);

  // Handle escape key
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-md rounded-2xl bg-card p-6 shadow-xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-farm-100 mb-4">
            <ShoppingBag className="h-8 w-8 text-farm-600" />
          </div>

          {/* Content */}
          <div className="text-center mb-6">
            <h2
              id="auth-modal-title"
              className="font-display text-xl font-semibold mb-2"
            >
              {title}
            </h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href={`/signup?redirect=${redirectUrl}`}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              onClick={onClose}
            >
              <UserPlus className="h-4 w-4" />
              Create Account
            </Link>

            <Link
              href={`/login?redirect=${redirectUrl}`}
              className="flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium hover:bg-accent transition-colors"
              onClick={onClose}
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </Link>
          </div>

          {/* Footer note */}
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Browse farms and products without an account.
            <br />
            Sign in when you&apos;re ready to order.
          </p>
        </div>
      </div>
    </>
  );
}
