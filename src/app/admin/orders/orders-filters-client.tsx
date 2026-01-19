"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Filter } from "lucide-react";

interface Farm {
  id: string;
  name: string;
}

interface OrdersFiltersClientProps {
  farms: Farm[];
  currentFarmId: string | undefined;
}

export function FarmFilterSelect({ farms, currentFarmId }: OrdersFiltersClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleFarmChange = (farmId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (farmId) {
      params.set("farm", farmId);
    } else {
      params.delete("farm");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Filter className="h-4 w-4 text-slate-400" />
      <select
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        value={currentFarmId || ""}
        onChange={(e) => handleFarmChange(e.target.value)}
      >
        <option value="">All Farms</option>
        {farms.map((farm) => (
          <option key={farm.id} value={farm.id}>
            {farm.name}
          </option>
        ))}
      </select>
    </div>
  );
}
