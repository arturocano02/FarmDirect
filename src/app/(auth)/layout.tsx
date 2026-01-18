import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-earth-50 via-background to-farm-50/30">
      <div className="container mx-auto flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <Link
          href="/"
          className="mb-8 font-display text-2xl font-bold text-farm-700"
        >
          Farmlink
        </Link>
        <div className="w-full max-w-md">
          <div className="rounded-xl border bg-card p-8 shadow-sm">
            {children}
          </div>
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-foreground">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
