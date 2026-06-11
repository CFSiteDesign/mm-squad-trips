import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Copy } from "lucide-react";
import { adminLogin, adminApi, getAdminToken, setAdminToken, type AdminTable } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

import { AdminWalkthrough } from "@/components/admin/AdminWalkthrough";
import SquadAdmin, { clearSquadCache } from "./SquadAdmin";

type TravelerInfo = {
  role: string;
  name: string;
  email: string;
  age: string;
  country: string;
  dietary: string;
  phone: string;
};

function getTravelerForRow(r: Record<string, unknown>, ctx: LookupCtx): TravelerInfo | null {
  const bt = String(r.booking_type ?? "");
  const isMember = bt === "Group member";
  const gid = r.group_id ? String(r.group_id) : "";
  const spot = Number(r.spot_number ?? 0);

  if (isMember && gid && ctx.groupLeaders[gid]) {
    const leader = ctx.groupLeaders[gid];
    const idx = Math.max(0, spot - 2);
    const add = Array.isArray(leader.additional_travelers) ? leader.additional_travelers[idx] : null;
    if (add) {
      return {
        role: `Traveler ${spot}`,
        name: String(add.name ?? ""),
        email: String(add.email ?? ""),
        age: add.age != null ? String(add.age) : "",
        country: String(add.country ?? ""),
        dietary: String(add.dietary ?? ""),
        phone: String(add.phone ?? ""),
      };
    }
  }

  return {
    role: bt || "Lead",
    name: String(r.lead_name ?? ""),
    email: String(r.lead_email ?? ""),
    age: r.lead_age != null ? String(r.lead_age) : "",
    country: String(r.lead_country ?? ""),
    dietary: "",
    phone: String(r.lead_phone ?? ""),
  };
}


type Row = Record<string, unknown>;

interface ColumnDef {
  key: string;
  label: string;
  tooltip?: string;
  type?: "text" | "number" | "boolean" | "date" | "json" | "textarea";
  readOnly?: boolean;
  hidden?: boolean;
  lookup?: "trip" | "departure" | "discount";
  format?: "date-only" | "ref8" | "travelers";
  compute?: (row: Row, ctx: LookupCtx) => unknown;
}

type LeaderInfo = {
  lead_name?: string;
  lead_email?: string;
  lead_phone?: string;
  lead_country?: string;
  lead_age?: number | string | null;
  additional_travelers?: Array<Record<string, unknown>> | null;
};

type LookupCtx = {
  trip: Record<string, string>;
  departure: Record<string, string>;
  discount: Record<string, string>;
  member: Record<string, string>;
  groupMembers: Record<string, string>; // group_id -> "Alice, Bob, Carol"
  groupLeaders: Record<string, LeaderInfo>; // group_id -> leader row data
};



const COLUMNS: Record<AdminTable, ColumnDef[]> = {
  trips: [
    { key: "id", label: "ID", readOnly: true, hidden: true },
    { key: "code", label: "Code", tooltip: "Unique trip code used in URLs and references", type: "text" },
    { key: "name", label: "Name", tooltip: "Display name of the trip shown to customers", type: "text" },
    { key: "slug", label: "Slug", tooltip: "URL-friendly identifier for the trip page", type: "text" },
    { key: "days", label: "Days", tooltip: "Number of days the trip lasts", type: "number" },
    { key: "activity_count", label: "Activities", tooltip: "Total number of activities included in the trip", type: "number" },
    { key: "default_price", label: "Default Price", tooltip: "Standard trip price before any discounts or calendar pricing", type: "number" },
    { key: "default_strikethrough", label: "Strikethrough", tooltip: "Original price shown with a strikethrough to indicate a discount", type: "number" },
    { key: "active", label: "Active", tooltip: "Whether this trip is visible and bookable on the site", type: "boolean" },
    { key: "video_testimonial_url", label: "Testimonial Video URL", tooltip: "URL to a testimonial video for this trip", type: "text" },
    { key: "stops", label: "Stops (JSON)", tooltip: "Itinerary stops and locations in JSON format", type: "json" },
    { key: "testimonials", label: "Testimonials (JSON)", tooltip: "Customer testimonials in JSON format", type: "json" },
  ],
  departures: [
    { key: "id", label: "ID", readOnly: true, hidden: true },
    { key: "trip_id", label: "Trip ID", readOnly: true, hidden: true },
    { key: "departure_code", label: "Code", tooltip: "Unique code for this departure date", type: "text" },
    { key: "departure_date", label: "Date", tooltip: "The scheduled departure date for this trip run", type: "date" },
    { key: "total_spots", label: "Total Spots", tooltip: "Maximum number of travelers for this departure", type: "number" },
    { key: "spots_remaining", label: "Spots Remaining", tooltip: "Automatically calculated open spots left", type: "number", readOnly: true },
    { key: "bookable", label: "Bookable", tooltip: "Whether customers can currently book this departure", type: "boolean" },
  ],
  pricing_calendar: [
    { key: "id", label: "ID", readOnly: true, hidden: true },
    { key: "trip_id", label: "Trip", tooltip: "Which trip this pricing applies to", type: "text", lookup: "trip" },
    { key: "month", label: "Month (YYYY-MM)", tooltip: "Month this pricing is valid for, e.g. 2026-07", type: "text" },
    { key: "price", label: "Price", tooltip: "Trip price for this specific month", type: "number" },
    { key: "strikethrough", label: "Strikethrough", tooltip: "Original price shown with a strikethrough for this month", type: "number" },
    { key: "active", label: "Active", tooltip: "Whether this monthly pricing is currently enabled", type: "boolean" },
  ],
  discount_codes: [
    { key: "id", label: "ID", readOnly: true, hidden: true },
    { key: "code", label: "Code", tooltip: "The discount code customers enter at checkout", type: "text" },
    { key: "discount_amount", label: "Discount ($)", tooltip: "Fixed dollar amount subtracted from the trip price", type: "number" },
    { key: "active", label: "Active", tooltip: "Whether this code can currently be used", type: "boolean" },
    { key: "usage_limit", label: "Usage Limit", tooltip: "Maximum number of times this code can be redeemed", type: "number" },
    { key: "used_count", label: "Used Count", tooltip: "How many times this code has already been used", type: "number", readOnly: true },
    { key: "expiry_date", label: "Expiry", tooltip: "Date after which the code can no longer be used", type: "date" },
    { key: "applicable_to", label: "Applicable To (JSON array)", tooltip: "List of trip codes this discount can be applied to", type: "json" },
  ],
  bookings: [
    { key: "id", label: "ID", readOnly: true, hidden: true },
    { key: "booking_ref", label: "Booking Ref", tooltip: "Short reference code for this booking", readOnly: true, compute: (r) =>
        r.booking_ref ?? r.group_id ?? String(r.id ?? "").slice(0, 8).toUpperCase() },
    { key: "trip_id", label: "Trip", tooltip: "Which trip was booked", readOnly: true, lookup: "trip" },
    { key: "departure_id", label: "Departure", tooltip: "Which departure date was selected", readOnly: true, lookup: "departure" },
    { key: "booking_type", label: "Booking Type", tooltip: "Lead traveler or group member", readOnly: true },
    { key: "group_size", label: "Group Size", tooltip: "Total number of people in this booking group", readOnly: true },
    { key: "group_id", label: "Group ID", tooltip: "Internal ID linking travelers in the same group", readOnly: true },
    { key: "group_members", label: "Group Members", tooltip: "Names of all travelers in this group", readOnly: true, compute: (r, ctx) => {
        const gid = r.group_id ? String(r.group_id) : "";
        if (gid && ctx.groupMembers[gid]) return ctx.groupMembers[gid];
        // Solo or no group: derive from additional_travelers on this row (if any)
        const add = r.additional_travelers;
        if (Array.isArray(add) && add.length > 0) {
          const lead = r.lead_name ? [String(r.lead_name)] : [];
          const names = add
            .map((t: Record<string, unknown>) => (t?.name ? String(t.name) : ""))
            .filter(Boolean);
          return [...lead, ...names].join(", ");
        }
        return "";
      } },
    { key: "friend_names_mentioned", label: "Friend Names", tooltip: "Friends mentioned during booking for roommate pairing", readOnly: true },
    { key: "lead_name", label: "Lead Name", tooltip: "Full name of the primary traveler", readOnly: true, compute: (r, ctx) => getTravelerForRow(r, ctx)?.name ?? "" },
    { key: "lead_email", label: "Lead Email", tooltip: "Email address of the primary traveler", readOnly: true, compute: (r, ctx) => getTravelerForRow(r, ctx)?.email ?? "" },
    { key: "lead_phone", label: "Lead Phone", tooltip: "Phone number of the primary traveler", readOnly: true, compute: (r, ctx) => getTravelerForRow(r, ctx)?.phone ?? "" },
    { key: "lead_country", label: "Lead Country", tooltip: "Country the primary traveler is from", readOnly: true, compute: (r, ctx) => getTravelerForRow(r, ctx)?.country ?? "" },
    { key: "lead_age", label: "Lead Age", tooltip: "Age of the primary traveler", readOnly: true, compute: (r, ctx) => getTravelerForRow(r, ctx)?.age ?? "" },
    { key: "lead_solo", label: "Solo?", tooltip: "Whether the traveler is joining solo (no roommate preference)", readOnly: true, type: "boolean" },
    { key: "lead_source", label: "Source", tooltip: "How the traveler found the trip (e.g. Instagram, Google)", readOnly: true },

    { key: "payment_type", label: "Payment Type", tooltip: "Full payment or deposit booking", readOnly: true },
    { key: "original_price", label: "Original Price", tooltip: "Trip price before any discount was applied", readOnly: true, type: "number" },
    { key: "discount_code_id", label: "Discount Code", tooltip: "Code used to reduce the price, if any", readOnly: true, lookup: "discount" },
    { key: "discount_amount", label: "Discount Amount", tooltip: "Total dollar amount saved with the discount code", readOnly: true, type: "number" },
    { key: "final_price", label: "Final Price", tooltip: "Price after discount, before any payments", readOnly: true, type: "number" },
    { key: "amount_paid", label: "Amount Paid", tooltip: "Total money collected so far for this booking", readOnly: true, type: "number" },
    { key: "balance_due", label: "Balance Due", tooltip: "Remaining amount still owed by the traveler", readOnly: true, compute: (r) => {
      const fp = Number(r.final_price ?? 0); const ap = Number(r.amount_paid ?? 0);
      return Math.max(0, fp - ap);
    } },
    { key: "balance_status", label: "Balance Status", tooltip: "Current state of the balance payment (e.g. scheduled, paid, failed)", readOnly: true },
    { key: "balance_due_date", label: "Balance Due Date", tooltip: "Date the remaining balance must be paid by", readOnly: true, format: "date-only" },
    { key: "card_on_file", label: "Card on File", tooltip: "Whether a saved payment method exists for automatic charging", readOnly: true, compute: (r) => !!r.stripe_payment_method_id },
    { key: "status", label: "Status", tooltip: "Overall booking status (e.g. Confirmed, Cancelled)", readOnly: true },
    { key: "stripe_session_id", label: "Stripe Session ID", tooltip: "Stripe Checkout session ID for this payment", readOnly: true },
    { key: "utm_source", label: "UTM Source", tooltip: "Marketing traffic source (e.g. instagram, newsletter)", readOnly: true },
    { key: "utm_medium", label: "UTM Medium", tooltip: "Marketing medium (e.g. post, story, email)", readOnly: true },
    { key: "utm_campaign", label: "UTM Campaign", tooltip: "Name of the marketing campaign that drove this booking", readOnly: true },
    { key: "utm_content", label: "UTM Content", tooltip: "Specific content or ad variant that was clicked", readOnly: true },
    { key: "created_at", label: "Created", tooltip: "Date and time this booking was first created", readOnly: true, format: "date-only" },
  ],
};

const TABS: { id: AdminTable; label: string }[] = [
  { id: "trips", label: "Trips" },
  { id: "departures", label: "Departures" },
  { id: "pricing_calendar", label: "Pricing" },
  { id: "discount_codes", label: "Discounts" },
  { id: "bookings", label: "Bookings" },
];

export default function Admin() {
  const [authed, setAuthed] = useState<boolean>(() => !!getAdminToken());
  const [view, setView] = useState<"database" | "squad">("database");
  const [refreshKey, setRefreshKey] = useState(0);

  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;

  function handleRefresh() {
    // Clear all module-level caches
    for (const k of Object.keys(tableCache) as AdminTable[]) {
      delete tableCache[k];
    }
    lookupCache.trip = undefined;
    lookupCache.departure = undefined;
    clearSquadCache();
    setRefreshKey((k) => k + 1);
    toast.success("Data refreshed");
  }

  return (
    <TooltipProvider delayDuration={300}>
      <main className="min-h-screen bg-mm-paper px-4 py-8 text-mm-black md:px-8">
        <AdminWalkthrough />
        <header className="mx-auto mb-6 flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl md:text-4xl">ADMIN</h1>
            <div className="flex border-[2px] border-mm-black">
              <button
                onClick={() => setView("database")}
                className={`px-3 py-1.5 font-sticker text-[10px] tracking-[0.15em] ${view === "database" ? "bg-mm-pink text-mm-bone" : "bg-mm-bone text-mm-black"}`}
              >
                DATABASE
              </button>
              <button
                onClick={() => setView("squad")}
                className={`border-l-[2px] border-mm-black px-3 py-1.5 font-sticker text-[10px] tracking-[0.15em] ${view === "squad" ? "bg-mm-pink text-mm-bone" : "bg-mm-bone text-mm-black"}`}
              >
                SQUAD LEADERS
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              className="rounded-none border-[2px] border-mm-black"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              REFRESH
            </Button>
            <Button
              variant="outline"
              onClick={() => { setAdminToken(null); setAuthed(false); }}
              className="rounded-none border-[2px] border-mm-black"
            >
              LOG OUT
            </Button>
          </div>
        </header>

        {view === "squad" ? (
          <div className="mx-auto max-w-7xl">
            <SquadAdmin refreshKey={refreshKey} />
          </div>
        ) : (
          <Tabs defaultValue="trips" className="mx-auto max-w-7xl">
            <TabsList className="flex flex-wrap gap-1 rounded-none border-[2px] border-mm-black bg-mm-bone p-1">
              {TABS.map((t) => (
                <TabsTrigger key={t.id} value={t.id} className="rounded-none data-[state=active]:bg-mm-pink data-[state=active]:text-mm-bone">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {TABS.map((t) => (
              <TabsContent key={t.id} value={t.id} className="mt-4">
                <TableEditor table={t.id} refreshKey={refreshKey} />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </main>
    </TooltipProvider>
  );
}

function Login({ onSuccess }: { onSuccess: () => void }) {
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await adminLogin(pw);
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-mm-black px-5 text-mm-bone">
      <form onSubmit={submit} className="w-full max-w-sm border-[3px] border-mm-bone bg-mm-paper p-6 text-mm-black shadow-mm-lg md:p-8">
        <h1 className="font-display text-3xl">ADMIN LOGIN</h1>
        <p className="mt-2 text-sm text-mm-black/70">Enter the admin password.</p>
        <Label className="mt-5 block font-sticker text-[10px] tracking-[0.15em]">PASSWORD</Label>
        <Input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoFocus
          className="mt-1 h-11 rounded-none border-[3px] border-mm-black bg-mm-paper font-medium"
        />
        <Button
          type="submit"
          disabled={loading}
          className="mt-5 h-12 w-full rounded-none border-[3px] border-mm-black bg-mm-pink font-display text-mm-bone hover:bg-mm-pink shadow-mm"
        >
          {loading ? "CHECKING…" : "LOG IN"}
        </Button>
      </form>
    </main>
  );
}


// Module-level cache: persists across tab switches (and component unmount/remount)
const tableCache: Partial<Record<AdminTable, Row[]>> = {};
const lookupCache: {
  trip?: Record<string, string>;
  departure?: Record<string, string>;
  discount?: Record<string, string>;
  member?: Record<string, string>;
  groupMembers?: Record<string, string>;
  groupLeaders?: Record<string, LeaderInfo>;
} = {};

function TableEditor({ table, refreshKey }: { table: AdminTable; refreshKey?: number }) {
  const cols = COLUMNS[table];
  const visibleCols = useMemo(() => cols.filter((c) => !c.hidden), [cols]);
  const needsTripLookup = useMemo(() => cols.some((c) => c.lookup === "trip"), [cols]);
  const needsDepartureLookup = useMemo(() => cols.some((c) => c.lookup === "departure"), [cols]);
  const needsDiscountLookup = useMemo(() => cols.some((c) => c.lookup === "discount"), [cols]);
  const needsMemberLookup = table === "bookings";
  const [rows, setRows] = useState<Row[]>(() => tableCache[table] ?? []);
  const [tripMap, setTripMap] = useState<Record<string, string>>(() => lookupCache.trip ?? {});
  const [departureMap, setDepartureMap] = useState<Record<string, string>>(() => lookupCache.departure ?? {});
  const [discountMap, setDiscountMap] = useState<Record<string, string>>(() => lookupCache.discount ?? {});
  const [memberMap, setMemberMap] = useState<Record<string, string>>(() => lookupCache.member ?? {});
  const [groupMembersMap, setGroupMembersMap] = useState<Record<string, string>>(() => lookupCache.groupMembers ?? {});
  const [groupLeadersMap, setGroupLeadersMap] = useState<Record<string, LeaderInfo>>(() => lookupCache.groupLeaders ?? {});
  const [loading, setLoading] = useState(() => !tableCache[table]);
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  async function reload(force = true) {
    const hasCached = !!tableCache[table];
    if (!force && hasCached) return;
    if (!hasCached) setLoading(true);
    try {
      const tasks: Promise<unknown>[] = [
        adminApi.list<Row>(table, { orderBy: "created_at", ascending: false, limit: 1000 }).then((r) => {
          tableCache[table] = r;
          setRows(r);
          if (needsMemberLookup) {
            const m: Record<string, string> = { ...(lookupCache.member ?? {}) };
            const gm: Record<string, string> = {};
            const gl: Record<string, LeaderInfo> = {};
            for (const b of r) {
              if (b.id) m[String(b.id)] = String(b.lead_name ?? String(b.id).slice(0, 8).toUpperCase());
              const gid = b.group_id ? String(b.group_id) : "";
              const add = b.additional_travelers;
              // Leader rows carry additional_travelers — index by group_id
              if (gid && Array.isArray(add)) {
                gl[gid] = {
                  lead_name: b.lead_name as string | undefined,
                  lead_email: b.lead_email as string | undefined,
                  lead_phone: b.lead_phone as string | undefined,
                  lead_country: b.lead_country as string | undefined,
                  lead_age: b.lead_age as number | string | null | undefined,
                  additional_travelers: add as Array<Record<string, unknown>>,
                };
                if (add.length > 0) {
                  const lead = b.lead_name ? [String(b.lead_name)] : [];
                  const names = add
                    .map((t: Record<string, unknown>) => (t?.name ? String(t.name) : ""))
                    .filter(Boolean);
                  gm[gid] = [...lead, ...names].join(", ");
                }
              }
            }
            lookupCache.member = m;
            lookupCache.groupMembers = gm;
            lookupCache.groupLeaders = gl;
            setMemberMap(m);
            setGroupMembersMap(gm);
            setGroupLeadersMap(gl);
          }
        }),
      ];
      if (needsTripLookup && (force || !lookupCache.trip)) {
        tasks.push(adminApi.list<Row>("trips", { limit: 1000 }).then((ts) => {
          const m: Record<string, string> = {};
          for (const t of ts) m[String(t.id)] = String(t.code ?? t.name ?? t.id);
          lookupCache.trip = m;
          setTripMap(m);
        }));
      }
      if (needsDepartureLookup && (force || !lookupCache.departure)) {
        tasks.push(adminApi.list<Row>("departures", { limit: 1000 }).then((ds) => {
          const m: Record<string, string> = {};
          for (const d of ds) m[String(d.id)] = String(d.departure_code ?? d.departure_date ?? d.id);
          lookupCache.departure = m;
          setDepartureMap(m);
        }));
      }
      if (needsDiscountLookup && (force || !lookupCache.discount)) {
        tasks.push(adminApi.list<Row>("discount_codes", { limit: 1000 }).then((ds) => {
          const m: Record<string, string> = {};
          for (const d of ds) m[String(d.id)] = String(d.code ?? d.id);
          lookupCache.discount = m;
          setDiscountMap(m);
        }));
      }
      await Promise.all(tasks);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }


  const ctx: LookupCtx = useMemo(
    () => ({ trip: tripMap, departure: departureMap, discount: discountMap, member: memberMap, groupMembers: groupMembersMap, groupLeaders: groupLeadersMap }),
    [tripMap, departureMap, discountMap, memberMap, groupMembersMap, groupLeadersMap],
  );

  useEffect(() => {
    // Show cached data instantly; only fetch if no cache yet for this table
    if (tableCache[table]) {
      setRows(tableCache[table]!);
      setLoading(false);
      // Still fetch lookups if missing (no spinner)
      if (
        (needsTripLookup && !lookupCache.trip) ||
        (needsDepartureLookup && !lookupCache.departure) ||
        (needsDiscountLookup && !lookupCache.discount)
      ) {
        reload(false);
      }
    } else {
      reload(true);
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [table, refreshKey]);


  const filtered = useMemo(() => {
    if (!search) return rows;
    const s = search.toLowerCase();
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(s));
  }, [rows, search]);

  // For bookings, keep rows sorted so members of the same group sit together (leader first)
  const displayRows = useMemo(() => {
    if (table !== "bookings") return filtered;
    const groupOrder = new Map<string, number>();
    filtered.forEach((r, i) => {
      const gid = r.group_id ? String(r.group_id) : "";
      if (gid && !groupOrder.has(gid)) groupOrder.set(gid, i);
    });
    return [...filtered].sort((a, b) => {
      const ga = a.group_id ? String(a.group_id) : "";
      const gb = b.group_id ? String(b.group_id) : "";
      const oa = ga ? groupOrder.get(ga)! : filtered.indexOf(a);
      const ob = gb ? groupOrder.get(gb)! : filtered.indexOf(b);
      if (oa !== ob) return oa - ob;
      // Inside the same group: leader first, then by created_at
      const la = String(a.booking_type ?? "").toLowerCase().includes("lead") ? 0 : 1;
      const lb = String(b.booking_type ?? "").toLowerCase().includes("lead") ? 0 : 1;
      if (la !== lb) return la - lb;
      return String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""));
    });
  }, [filtered, table]);



  async function handleDelete(id: string) {
    if (!confirm("Delete this row?")) return;
    try {
      await adminApi.remove(table, id);
      toast.success("Deleted");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  function exportCsv() {
    const headers = visibleCols.map((c) => c.label);
    const lines = [headers.join(",")];
    for (const r of filtered) {
      lines.push(visibleCols.map((c) => {
        let v: unknown = c.compute ? c.compute(r, ctx) : r[c.key];
        if (c.lookup === "trip" && v) v = tripMap[String(v)] ?? v;
        else if (c.lookup === "departure" && v) v = departureMap[String(v)] ?? v;
        else if (c.lookup === "discount" && v) v = discountMap[String(v)] ?? v;
        const s = renderCell(v, c);
        return `"${s.replace(/"/g, '""')}"`;
      }).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${table}.csv`; a.click();
    URL.revokeObjectURL(url);
  }


  const canCreate = table !== "bookings";

  return (
    <div className="border-[2px] border-mm-black bg-mm-bone">
      <div className="flex flex-wrap items-center gap-2 border-b-[2px] border-mm-black p-3">
        <Input
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 max-w-xs rounded-none border-[2px] border-mm-black bg-mm-paper"
        />
        <span className="text-xs text-mm-black/60">{filtered.length} row{filtered.length === 1 ? "" : "s"}</span>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={exportCsv} className="rounded-none border-[2px] border-mm-black">
            EXPORT CSV
          </Button>
          <Button variant="outline" onClick={() => reload(true)} className="rounded-none border-[2px] border-mm-black">
            REFRESH
          </Button>
          {canCreate && (
            <Button
              onClick={() => setCreating(true)}
              className="rounded-none border-[2px] border-mm-black bg-mm-pink text-mm-bone hover:bg-mm-pink"
            >
              + NEW
            </Button>
          )}
        </div>
      </div>


      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-mm-paper">
            <tr>
              {visibleCols.map((c) => (
                <th key={c.key} className="border-b border-mm-black/30 px-3 py-2 text-left font-sticker text-[10px] tracking-[0.1em]">
                  {c.label}
                </th>
              ))}
              <th className="border-b border-mm-black/30 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={visibleCols.length + 1} className="p-6 text-center text-mm-black/60">Loading…</td></tr>
            ) : displayRows.length === 0 ? (
              <tr><td colSpan={visibleCols.length + 1} className="p-6 text-center text-mm-black/60">No rows.</td></tr>
            ) : displayRows.map((r, idx) => {
              const isBookings = table === "bookings";
              const gid = isBookings && r.group_id ? String(r.group_id) : "";
              const prev = idx > 0 ? displayRows[idx - 1] : null;
              const next = idx < displayRows.length - 1 ? displayRows[idx + 1] : null;
              const prevGid = prev?.group_id ? String(prev.group_id) : "";
              const nextGid = next?.group_id ? String(next.group_id) : "";
              const inGroup = !!gid;
              const isLead = isBookings && String(r.booking_type ?? "").toLowerCase().includes("lead");
              const isExpanded = inGroup && !!expandedGroups[gid];
              // Hide non-leader group rows unless their group is expanded
              if (inGroup && !isLead && !isExpanded) return null;
              const isFirstInGroup = inGroup && (prevGid !== gid || !isExpanded);
              const isLastInGroup = inGroup && (nextGid !== gid || !isExpanded);
              const rowClass = [
                "border-b border-mm-black/10 hover:bg-mm-paper/50",
                inGroup ? (isLead ? "bg-mm-pink/10" : "bg-mm-pink/5") : "",
                isFirstInGroup ? "border-t-[3px] border-t-mm-pink" : "",
                isLastInGroup ? "border-b-[3px] border-b-mm-pink" : "",
              ].filter(Boolean).join(" ");
              // Count rows in this group for the expand button label
              let groupCount = 0;
              if (inGroup && isLead) {
                for (const row of displayRows) {
                  if (row.group_id && String(row.group_id) === gid) groupCount++;
                }
              }
              return (
                <tr key={String(r.id)} className={rowClass}>
                  {visibleCols.map((c, ci) => {
                    const raw = c.compute ? c.compute(r, ctx) : r[c.key];
                    let val: unknown = raw;
                    if (c.lookup === "trip" && raw) val = tripMap[String(raw)] ?? raw;
                    else if (c.lookup === "departure" && raw) val = departureMap[String(raw)] ?? raw;
                    else if (c.lookup === "discount" && raw) val = discountMap[String(raw)] ?? raw;
                    const display = renderCell(val, c);
                    const showLeadTag = isBookings && inGroup && c.key === "booking_type" && isLead;
                    const showExpandBtn = isBookings && inGroup && isLead && ci === 0;
                    return (
                      <td key={c.key} className="max-w-[240px] truncate px-3 py-2 align-top" title={c.key === "traveler_info" ? undefined : (typeof val === "string" ? val : (display || undefined))}>
                        {showExpandBtn ? (
                          <button
                            onClick={() => setExpandedGroups((s) => ({ ...s, [gid]: !s[gid] }))}
                            className="mr-2 inline-flex items-center gap-1 rounded-sm border-[1.5px] border-mm-black bg-mm-bone px-1.5 py-0.5 font-sticker text-[9px] tracking-[0.1em] text-mm-black hover:bg-mm-pink hover:text-mm-bone"
                            aria-expanded={isExpanded}
                            title={isExpanded ? "Collapse group" : "Expand group"}
                          >
                            <span className="inline-block w-2 text-center leading-none">{isExpanded ? "−" : "+"}</span>
                            <span>{groupCount}</span>
                          </button>
                        ) : ci === 0 && inGroup ? (
                          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-mm-pink align-middle" aria-hidden />
                        ) : null}
                        {c.key === "stripe_session_id" && display ? (
                          <span className="inline-flex items-center gap-1">
                            <button
                              onClick={() => { navigator.clipboard.writeText(display); toast.success("Copied to clipboard"); }}
                              className="inline-flex items-center text-mm-black/60 hover:text-mm-pink"
                              title="Copy session ID"
                            >
                              <Copy size={14} />
                            </button>
                            {display}
                          </span>
                        ) : display}
                        {showLeadTag && (
                          <span className="ml-2 rounded-sm bg-mm-pink px-1.5 py-0.5 font-sticker text-[9px] tracking-[0.1em] text-mm-bone">LEAD</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => setEditing(r)} className="mr-3 underline">edit</button>
                    <button onClick={() => handleDelete(String(r.id))} className="text-red-600 underline">del</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>



      {(editing || creating) && (
        <RowEditor
          table={table}
          row={editing ?? {}}
          isNew={creating}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); reload(); }}
        />
      )}
    </div>
  );
}

function renderCell(v: unknown, c?: ColumnDef): string {
  if (v == null || v === "") return "";
  if (c?.format === "ref8" && v) return String(v).slice(0, 8).toUpperCase();
  if (c?.format === "date-only" && v) {
    const s = String(v);
    return s.length >= 10 ? s.slice(0, 10) : s;
  }
  if (c?.format === "travelers") {
    if (!Array.isArray(v)) return "";
    return v.map((t: Record<string, unknown>) => {
      const parts: string[] = [];
      if (t?.name) parts.push(String(t.name));
      if (t?.age != null && t?.age !== "") parts.push(`age ${t.age}`);
      if (t?.email) parts.push(String(t.email));
      if (t?.dietary) parts.push(`diet: ${t.dietary}`);
      return parts.join(" · ");
    }).join(" | ");
  }
  if (typeof v === "boolean") return v ? "✓" : "✗";
  if (Array.isArray(v)) {
    if (v.length === 0) return "";
    if (v.every((x) => typeof x === "string" || typeof x === "number")) return v.join(", ");
    return v.map((x) => {
      if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        return Object.entries(o)
          .filter(([, val]) => val != null && val !== "")
          .map(([k, val]) => `${k}: ${val}`)
          .join(" · ");
      }
      return String(x);
    }).join(" | ");
  }
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    return Object.entries(o)
      .filter(([, val]) => val != null && val !== "")
      .map(([k, val]) => `${k}: ${typeof val === "object" ? JSON.stringify(val) : val}`)
      .join(" · ");
  }
  return String(v);
}

function RowEditor({ table, row, isNew, onClose, onSaved }: {
  table: AdminTable; row: Row; isNew: boolean; onClose: () => void; onSaved: () => void;
}) {
  const cols = COLUMNS[table].filter((c) => !c.hidden);
  const [values, setValues] = useState<Row>(() => ({ ...row }));
  const [saving, setSaving] = useState(false);

  function setVal(k: string, v: unknown) { setValues((s) => ({ ...s, [k]: v })); }

  async function save() {
    setSaving(true);
    try {
      // Clean up empty values + JSON parse
      const out: Row = {};
      for (const c of cols) {
        if (c.readOnly) continue;
        let v = values[c.key];
        if (v === "" || v === undefined) { out[c.key] = null; continue; }
        if (c.type === "number") v = v === null ? null : Number(v);
        if (c.type === "json" && typeof v === "string") {
          try { v = JSON.parse(v); } catch { throw new Error(`${c.label}: invalid JSON`); }
        }
        out[c.key] = v;
      }
      if (isNew) await adminApi.create(table, out);
      else await adminApi.update(table, String(row.id), out);
      toast.success("Saved");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-mm-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border-[3px] border-mm-black bg-mm-paper p-5 shadow-mm-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl">{isNew ? "NEW" : "EDIT"} · {table}</h2>
          <button onClick={onClose} className="text-mm-black/60 hover:text-mm-black">✕</button>
        </div>
        <div className="space-y-3">
          {cols.map((c) => {
            const v = values[c.key];
            const display = c.type === "json" && typeof v === "object" && v !== null
              ? JSON.stringify(v, null, 2)
              : v == null ? "" : String(v);
            return (
              <div key={c.key}>
                <Label className="font-sticker text-[10px] tracking-[0.15em]">
                  {c.label}{c.readOnly ? " (read-only)" : ""}
                </Label>
                {c.type === "boolean" ? (
                  <div className="mt-1">
                    <input
                      type="checkbox"
                      checked={!!v}
                      disabled={c.readOnly}
                      onChange={(e) => setVal(c.key, e.target.checked)}
                    />
                  </div>
                ) : c.type === "json" ? (
                  <textarea
                    value={display}
                    onChange={(e) => setVal(c.key, e.target.value)}
                    readOnly={c.readOnly}
                    rows={4}
                    className="mt-1 w-full rounded-none border-[2px] border-mm-black bg-mm-paper p-2 font-mono text-xs"
                  />
                ) : (
                  <Input
                    type={c.type === "number" ? "number" : c.type === "date" ? "date" : "text"}
                    value={display}
                    onChange={(e) => setVal(c.key, e.target.value)}
                    readOnly={c.readOnly}
                    className="mt-1 h-10 rounded-none border-[2px] border-mm-black bg-mm-paper"
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-none border-[2px] border-mm-black">CANCEL</Button>
          <Button
            onClick={save}
            disabled={saving}
            className="rounded-none border-[2px] border-mm-black bg-mm-pink text-mm-bone hover:bg-mm-pink"
          >
            {saving ? "SAVING…" : "SAVE"}
          </Button>
        </div>
      </div>
    </div>
  );
}
