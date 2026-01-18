"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Package, 
  ShoppingBag, 
  Settings, 
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FarmPortalNavProps {
  farmSlug?: string | null;
}

export function FarmPortalNav({ farmSlug }: FarmPortalNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/farm-portal",
      icon: Home,
      label: "Dashboard",
      exact: true,
    },
    {
      href: "/farm-portal/orders",
      icon: ShoppingBag,
      label: "Orders",
    },
    {
      href: "/farm-portal/products",
      icon: Package,
      label: "Products",
    },
    {
      href: "/farm-portal/profile",
      icon: Settings,
      label: "Farm Profile",
    },
    // Future: Payouts
    // {
    //   href: "/farm-portal/payouts",
    //   icon: CreditCard,
    //   label: "Payouts",
    //   disabled: true,
    // },
  ];

  return (
    <nav className="p-4 space-y-1">
      {navItems.map((item) => {
        const isActive = item.exact 
          ? pathname === item.href
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-amber-50 text-amber-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}

      {/* View store link */}
      {farmSlug && (
        <Link
          href={`/farm/${farmSlug}`}
          target="_blank"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors mt-4 border-t pt-4"
        >
          <Eye className="h-4 w-4" />
          View My Store
        </Link>
      )}
    </nav>
  );
}
