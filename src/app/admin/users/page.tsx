import { createClient } from "@/lib/supabase/server";
import { formatDistanceToNow } from "@/lib/utils/date";
import { 
  Search,
  User,
  Store,
  Shield,
  ShoppingBag,
  ChevronRight,
  Users
} from "lucide-react";

export const metadata = {
  title: "Users",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ role?: string; search?: string }>;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  // Build query for profiles
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("profiles")
    .select("id, name, role, created_at")
    .order("created_at", { ascending: false });

  // Apply role filter
  if (params.role && ["customer", "farm", "admin"].includes(params.role)) {
    query = query.eq("role", params.role);
  }

  const { data: profilesData, error } = await query.limit(200);

  if (error) {
    console.error("[admin/users] Error fetching profiles:", error);
  }

  let profiles = (profilesData || []) as Array<{
    id: string;
    name: string | null;
    role: string;
    created_at: string;
  }>;

  // Apply search filter
  if (params.search) {
    const searchLower = params.search.toLowerCase();
    profiles = profiles.filter(profile =>
      (profile.name?.toLowerCase().includes(searchLower)) ||
      profile.id.toLowerCase().includes(searchLower)
    );
  }

  // Get role counts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allProfiles } = await (supabase as any)
    .from("profiles")
    .select("role");
  
  const roleCounts: Record<string, number> = { customer: 0, farm: 0, admin: 0 };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (allProfiles || []).forEach((profile: any) => {
    roleCounts[profile.role] = (roleCounts[profile.role] || 0) + 1;
  });

  const totalUsers = Object.values(roleCounts).reduce((a, b) => a + b, 0);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "farm":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "customer":
      default:
        return "bg-blue-100 text-blue-700 border-blue-200";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return Shield;
      case "farm":
        return Store;
      case "customer":
      default:
        return ShoppingBag;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <p className="mt-1 text-sm text-slate-500">
          View and manage platform users
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
              placeholder="Search by name or ID..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            {params.role && <input type="hidden" name="role" value={params.role} />}
          </form>

          {/* Role tabs */}
          <div className="flex gap-2">
            <a
              href={`/admin/users${params.search ? `?search=${params.search}` : ""}`}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                !params.role
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              All
              <span className={`rounded-full px-1.5 py-0.5 ${!params.role ? "bg-white/20" : "bg-slate-100"}`}>
                {totalUsers}
              </span>
            </a>
            {[
              { value: "customer", label: "Customers", icon: ShoppingBag },
              { value: "farm", label: "Farms", icon: Store },
              { value: "admin", label: "Admins", icon: Shield },
            ].map((role) => {
              const count = roleCounts[role.value] || 0;
              const isActive = params.role === role.value;
              return (
                <a
                  key={role.value}
                  href={`/admin/users?role=${role.value}${params.search ? `&search=${params.search}` : ""}`}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {role.label}
                  <span className={`rounded-full px-1.5 py-0.5 ${isActive ? "bg-white/20" : "bg-slate-100"}`}>
                    {count}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing <span className="font-medium text-slate-900">{profiles.length}</span> users
          {params.search && (
            <> matching &quot;<span className="font-medium text-slate-900">{params.search}</span>&quot;</>
          )}
        </p>
      </div>

      {/* Users table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  User
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Role
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  User ID
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Registered
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <Users className="mx-auto h-12 w-12 text-slate-300" />
                    <p className="mt-3 text-sm font-medium text-slate-900">No users found</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Try adjusting your filters or search term
                    </p>
                  </td>
                </tr>
              ) : (
                profiles.map((profile) => {
                  const RoleIcon = getRoleIcon(profile.role);
                  return (
                    <tr key={profile.id} className="hover:bg-slate-50 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-full ${
                            profile.role === "admin" ? "bg-purple-100" :
                            profile.role === "farm" ? "bg-amber-100" : "bg-blue-100"
                          }`}>
                            <User className={`h-4 w-4 ${
                              profile.role === "admin" ? "text-purple-600" :
                              profile.role === "farm" ? "text-amber-600" : "text-blue-600"
                            }`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {profile.name || "No name"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${getRoleBadge(profile.role)}`}>
                          <RoleIcon className="h-3 w-3" />
                          {profile.role}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="text-xs font-mono text-slate-500">
                          {profile.id.slice(0, 8)}...
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <span className="text-xs text-slate-500">
                          {formatDistanceToNow(new Date(profile.created_at))} ago
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button className="text-slate-400 hover:text-slate-600">
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note about admin management */}
      <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
        <p className="text-sm text-slate-600">
          <strong className="text-slate-900">Note:</strong> Admin roles are managed via the ADMIN_EMAILS environment variable. 
          Users with emails in this list are automatically promoted to admin on login.
        </p>
      </div>
    </div>
  );
}
