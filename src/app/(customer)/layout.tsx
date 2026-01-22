import Link from "next/link";
import { Leaf } from "lucide-react";
import { CartBadge } from "@/components/cart/cart-badge";
import { CustomerAccountMenu } from "@/components/customer/account-menu";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation - Marketplace Branding */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-farm-100">
              <Leaf className="h-4 w-4 text-farm-600" />
            </div>
            <span className="font-display text-xl font-bold text-farm-700">
              FairFarm
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Browse Farms
            </Link>
            <Link
              href="/orders"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              My Orders
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <CartBadge />
            <CustomerAccountMenu />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t py-12 mt-auto bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="font-display text-lg font-bold text-farm-700">
                FairFarm
              </span>
              <p className="text-sm text-muted-foreground">
                Premium meat, straight from local farms
              </p>
            </div>
            <nav className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/sell" className="hover:text-foreground transition-colors">
                Sell on FairFarm
              </Link>
              <span>© {new Date().getFullYear()}</span>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
