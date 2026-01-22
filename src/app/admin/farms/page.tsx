import Link from "next/link";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { createClient } from "@/lib/supabase/server";
import { formatDistanceToNow } from "@/lib/utils/date";
import { 
  Store, 
  MapPin, 
  ExternalLink, 
  Search,
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
  Mail
} from "lucide-react";
import { getFarmFallbackImage } from "@/lib/utils/image-fallbacks";

export const metadata = {
  title: "Farms",
};

export const dynamic = "force-dynamic";

const FARM_STATUSES = [
  { value: "pending", label: "Pending", icon: Clock, color: "amber" },
  { value: "approved", label: "Approved", icon: CheckCircle, color: "green" },
  { value: "suspended", label: "Suspended", icon: XCircle, color: "red" },
] as const;

interface PageProps {
  searchParams: Promise<{ status?: string; search?: string }>;
}

export default async function AdminFarmsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  // Build query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("farms")
    .select(`
      id,
      name,
      slug,
      status,
      hero_image_url,
      postcode,
      short_description,
      contact_email,
      postcode_rules,
      created_at,
      profiles!inner(name, id)
    `)
    .order("created_at", { ascending: false });

  // Apply status filter
  if (params.status && FARM_STATUSES.map(s => s.value).includes(params.status as typeof FARM_STATUSES[number]["value"])) {
    query = query.eq("status", params.status);
  }

  const { data: farmsData, error } = await query.limit(100);

  if (error) {
    console.error("[admin/farms] Error fetching farms:", error);
  }

  let farms = (farmsData || []) as Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    hero_image_url: string | null;
    postcode: string | null;
    short_description: string | null;
    contact_email: string | null;
    postcode_rules: string | null;
    created_at: string;
    profiles: { id: string; name: string | null };
  }>;

  // Apply search filter
  if (params.search) {
    const searchLower = params.search.toLowerCase();
    farms = farms.filter(farm =>
      farm.name.toLowerCase().includes(searchLower) ||
      farm.slug.toLowerCase().includes(searchLower) ||
      (farm.contact_email?.toLowerCase().includes(searchLower)) ||
      (farm.postcode?.toLowerCase().includes(searchLower))
    );
  }

  // Get status counts for all farms
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allFarms } = await (supabase as any)
    .from("farms")
    .select("status");
  
  const statusCounts: Record<string, number> = { pending: 0, approved: 0, suspended: 0 };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (allFarms || []).forEach((farm: any) => {
    statusCounts[farm.status] = (statusCounts[farm.status] || 0) + 1;
  });

  const totalFarms = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-700 border-green-200";
      case "pending":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "suspended":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Farms</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage farm registrations and approvals
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <form method="GET" className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              name="search"
              defaultValue={params.search || ""}
              placeholder="Search farms..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            {params.status && <input type="hidden" name="status" value={params.status} />}
          </form>

          {/* Status tabs */}
          <div className="flex gap-2">
            <Link
              href={`/admin/farms${params.search ? `?search=${params.search}` : ""}`}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                !params.status
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              All
              <span className={`rounded-full px-1.5 py-0.5 ${!params.status ? "bg-white/20" : "bg-slate-100"}`}>
                {totalFarms}
              </span>
            </Link>
            {FARM_STATUSES.map((status) => {
              const count = statusCounts[status.value] || 0;
              const isActive = params.status === status.value;
              return (
                <Link
                  key={status.value}
                  href={`/admin/farms?status=${status.value}${params.search ? `&search=${params.search}` : ""}`}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? "border-slate-900 bg-slate-900 text-white"
                      : status.value === "pending" && count > 0
                        ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {status.label}
                  <span className={`rounded-full px-1.5 py-0.5 ${isActive ? "bg-white/20" : status.value === "pending" && count > 0 ? "bg-amber-200" : "bg-slate-100"}`}>
                    {count}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing <span className="font-medium text-slate-900">{farms.length}</span> farms
          {params.search && (
            <> matching &quot;<span className="font-medium text-slate-900">{params.search}</span>&quot;</>
          )}
        </p>
      </div>

      {/* Farms grid */}
      {farms.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <Store className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-900">No farms found</p>
          <p className="mt-1 text-sm text-slate-500">
            Try adjusting your filters or search term
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {farms.map((farm) => (
            <div 
              key={farm.id} 
              className="group rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Image */}
              <div className="relative h-36 bg-slate-100">
                <ImageWithFallback
                  src={farm.hero_image_url}
                  fallbackSrc={getFarmFallbackImage()}
                  alt={farm.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                {/* Status badge */}
                <div className="absolute top-3 right-3">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${getStatusBadge(farm.status)}`}>
                    {farm.status}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-slate-900">{farm.name}</h3>
                {farm.short_description && (
                  <p className="text-sm text-slate-500 line-clamp-2 mt-1">
                    {farm.short_description}
                  </p>
                )}
                
                {/* Meta info */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-slate-500">
                  {farm.postcode && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {farm.postcode}
                    </span>
                  )}
                  {farm.contact_email && (
                    <span className="flex items-center gap-1 truncate max-w-[150px]">
                      <Mail className="h-3 w-3" />
                      {farm.contact_email}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Registered {formatDistanceToNow(new Date(farm.created_at))} ago
                </p>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <Link
                    href={`/admin/farms/${farm.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    Manage
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                  {farm.status === "approved" && (
                    <Link
                      href={`/farm/${farm.slug}`}
                      target="_blank"
                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
