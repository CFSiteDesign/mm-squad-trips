import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { adminLogin, adminApi, getAdminToken, setAdminToken, type AdminTable } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SquadAdmin, { clearSquadCache } from "./SquadAdmin";

type Row = Record<string, unknown>;

interface ColumnDef {
  key: string;
  label: string;
  type?: "text" | "number" | "boolean" | "date" | "json" | "textarea";
  readOnly?: boolean;
  hidden?: boolean;
  lookup?: "trip" | "departure" | "discount";
  format?: "date-only" | "ref8" | "travelers";
  compute?: (row: Row, ctx: LookupCtx) => unknown;
}

type LookupCtx = {
  trip: Record<string, string>;
  departure: Record<string, string>;
  discount: Record<string, string>;
  member: Record<string, string>;
};

const COLUMNS: Record<AdminTable, ColumnDef[]> = {
  trips: [
    { key: "id", label: "ID", readOnly: true, hidden: true },
    { key: "code", label: "Code", type: "text" },
    { key: "name", label: "Name", type: "text" },
    { key: "slug", label: "Slug", type: "text" },
    { key: "days", label: "Days", type: "number" },
    { key: "activity_count", label: "Activities", type: "number" },
    { key: "default_price", label: "Default Price", type: "number" },
    { key: "default_strikethrough", label: "Strikethrough", type: "number" },
    { key: "active", label: "Active", type: "boolean" },
    { key: "video_testimonial_url", label: "Testimonial Video URL", type: "text" },
    { key: "stops", label: "Stops (JSON)", type: "json" },
    { key: "testimonials", label: "Testimonials (JSON)", type: "json" },
  ],
  departures: [
    { key: "id", label: "ID", readOnly: true, hidden: true },
    { key: "trip_id", label: "Trip ID", readOnly: true, hidden: true },
    { key: "departure_code", label: "Code", type: "text" },
    { key: "departure_date", label: "Date", type: "date" },
    { key: "total_spots", label: "Total Spots", type: "number" },
    { key: "spots_remaining", label: "Spots Remaining", type: "number", readOnly: true },
    { key: "bookable", label: "Bookable", type: "boolean" },
  ],
  pricing_calendar: [
    { key: "id", label: "ID", readOnly: true, hidden: true },
    { key: "trip_id", label: "Trip", type: "text", lookup: "trip" },
    { key: "month", label: "Month (YYYY-MM)", type: "text" },
    { key: "price", label: "Price", type: "number" },
    { key: "strikethrough", label: "Strikethrough", type: "number" },
    { key: "active", label: "Active", type: "boolean" },
  ],
  discount_codes: [
    { key: "id", label: "ID", readOnly: true, hidden: true },
    { key: "code", label: "Code", type: "text" },
    { key: "discount_amount", label: "Discount ($)", type: "number" },
    { key: "active", label: "Active", type: "boolean" },
    { key: "usage_limit", label: "Usage Limit", type: "number" },
    { key: "used_count", label: "Used Count", type: "number", readOnly: true },
    { key: "expiry_date", label: "Expiry", type: "date" },
    { key: "applicable_to", label: "Applicable To (JSON array)", type: "json" },
  ],
  bookings: [
    { key: "id", label: "ID", readOnly: true, hidden: true },
    { key: "booking_ref", label: "Booking Ref", readOnly: true, compute: (r) =>
        r.group_id ? String(r.group_id) : String(r.id ?? "").slice(0, 8).toUpperCase() },
    { key: "trip_id", label: "Trip", readOnly: true, lookup: "trip" },
    { key: "departure_id", label: "Departure", readOnly: true, lookup: "departure" },
    { key: "booking_type", label: "Booking Type", readOnly: true },
    { key: "group_size", label: "Group Size", readOnly: true },
    { key: "group_id", label: "Group ID", readOnly: true },
    { key: "group_members", label: "Group Members", readOnly: true, compute: (r, ctx) => {
        const v = r.group_members;
        if (!Array.isArray(v) || v.length === 0) return "";
        return v.map((id) => ctx.member[String(id)] ?? String(id).slice(0, 8).toUpperCase()).join(", ");
      } },
    { key: "friend_names_mentioned", label: "Friend Names", readOnly: true },
    { key: "lead_name", label: "Lead Name", readOnly: true },
    { key: "lead_email", label: "Lead Email", readOnly: true },
    { key: "lead_phone", label: "Lead Phone", readOnly: true },
    { key: "lead_country", label: "Lead Country", readOnly: true },
    { key: "lead_age", label: "Lead Age", readOnly: true },
    { key: "lead_solo", label: "Solo?", readOnly: true, type: "boolean" },
    { key: "lead_source", label: "Source", readOnly: true },
    { key: "additional_travelers", label: "Additional Travelers", readOnly: true, format: "travelers" },
    { key: "payment_type", label: "Payment Type", readOnly: true },
    { key: "original_price", label: "Original Price", readOnly: true, type: "number" },
    { key: "discount_code_id", label: "Discount Code", readOnly: true, lookup: "discount" },
    { key: "discount_amount", label: "Discount Amount", readOnly: true, type: "number" },
    { key: "final_price", label: "Final Price", readOnly: true, type: "number" },
    { key: "amount_paid", label: "Amount Paid", readOnly: true, type: "number" },
    { key: "balance_due", label: "Balance Due", readOnly: true, compute: (r) => {
      const fp = Number(r.final_price ?? 0); const ap = Number(r.amount_paid ?? 0);
      return Math.max(0, fp - ap);
    } },
    { key: "status", label: "Status", readOnly: true },
    { key: "stripe_session_id", label: "Stripe Session ID", readOnly: true },
    { key: "utm_source", label: "UTM Source", readOnly: true },
    { key: "utm_medium", label: "UTM Medium", readOnly: true },
    { key: "utm_campaign", label: "UTM Campaign", readOnly: true },
    { key: "utm_content", label: "UTM Content", readOnly: true },
    { key: "created_at", label: "Created", readOnly: true, format: "date-only" },
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
    <main className="min-h-screen bg-mm-paper px-4 py-8 text-mm-black md:px-8">
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
  const [loading, setLoading] = useState(() => !tableCache[table]);
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

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
            for (const b of r) {
              if (b.id) m[String(b.id)] = String(b.lead_name ?? String(b.id).slice(0, 8).toUpperCase());
            }
            lookupCache.member = m;
            setMemberMap(m);
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
    () => ({ trip: tripMap, departure: departureMap, discount: discountMap, member: memberMap }),
    [tripMap, departureMap, discountMap, memberMap],
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
        {table === "bookings" && groupView ? (
          <table className="w-full text-sm">
            <thead className="bg-mm-paper">
              <tr>
                <th className="w-8 border-b border-mm-black/30 px-2 py-2" />
                <th className="border-b border-mm-black/30 px-3 py-2 text-left font-sticker text-[10px] tracking-[0.1em]">BOOKING REF</th>
                <th className="border-b border-mm-black/30 px-3 py-2 text-left font-sticker text-[10px] tracking-[0.1em]">TRIP</th>
                <th className="border-b border-mm-black/30 px-3 py-2 text-left font-sticker text-[10px] tracking-[0.1em]">DEPARTURE</th>
                <th className="border-b border-mm-black/30 px-3 py-2 text-left font-sticker text-[10px] tracking-[0.1em]">LEADER</th>
                <th className="border-b border-mm-black/30 px-3 py-2 text-left font-sticker text-[10px] tracking-[0.1em]">CONTACT</th>
                <th className="border-b border-mm-black/30 px-3 py-2 text-left font-sticker text-[10px] tracking-[0.1em]">TRAVELERS</th>
                <th className="border-b border-mm-black/30 px-3 py-2 text-right font-sticker text-[10px] tracking-[0.1em]">PAID / TOTAL</th>
                <th className="border-b border-mm-black/30 px-3 py-2 text-left font-sticker text-[10px] tracking-[0.1em]">STATUS</th>
                <th className="border-b border-mm-black/30 px-3 py-2 text-left font-sticker text-[10px] tracking-[0.1em]">CREATED</th>
                <th className="border-b border-mm-black/30 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="p-6 text-center text-mm-black/60">Loading…</td></tr>
              ) : grouped.length === 0 ? (
                <tr><td colSpan={11} className="p-6 text-center text-mm-black/60">No bookings.</td></tr>
              ) : grouped.flatMap((g) => {
                const isOpen = !!expanded[g.key];
                const allRows = [g.leader, ...g.members];
                const ref = g.isGroup ? g.key : String(g.leader.id ?? "").slice(0, 8).toUpperCase();
                const trip = tripMap[String(g.leader.trip_id ?? "")] ?? "";
                const dep = departureMap[String(g.leader.departure_id ?? "")] ?? "";
                const totalPaid = allRows.reduce((sum, r) => sum + Number(r.amount_paid ?? 0), 0);
                const totalFinal = allRows.reduce((sum, r) => sum + Number(r.final_price ?? 0), 0);
                const travelerCount = allRows.length;
                const created = String(g.leader.created_at ?? "").slice(0, 10);
                const rows: React.ReactNode[] = [
                  <tr key={g.key} className="border-b border-mm-black/10 hover:bg-mm-paper/50">
                    <td className="px-2 py-2 align-top">
                      {g.isGroup ? (
                        <button
                          onClick={() => setExpanded((s) => ({ ...s, [g.key]: !isOpen }))}
                          className="font-mono text-sm leading-none"
                          aria-label={isOpen ? "Collapse" : "Expand"}
                        >
                          {isOpen ? "▼" : "▶"}
                        </button>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 align-top font-mono text-xs">{ref}</td>
                    <td className="max-w-[160px] truncate px-3 py-2 align-top" title={trip}>{trip}</td>
                    <td className="max-w-[140px] truncate px-3 py-2 align-top" title={dep}>{dep}</td>
                    <td className="px-3 py-2 align-top">
                      <div className="font-medium">{String(g.leader.lead_name ?? "")}</div>
                      {g.isGroup && (
                        <div className="text-[10px] uppercase tracking-wider text-mm-black/50">Group lead</div>
                      )}
                    </td>
                    <td className="max-w-[200px] truncate px-3 py-2 align-top text-xs" title={`${g.leader.lead_email ?? ""} · ${g.leader.lead_phone ?? ""}`}>
                      <div>{String(g.leader.lead_email ?? "")}</div>
                      <div className="text-mm-black/60">{String(g.leader.lead_phone ?? "")}</div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      {g.isGroup ? `${travelerCount} travelers` : "Solo"}
                    </td>
                    <td className="px-3 py-2 text-right align-top font-mono text-xs">
                      ${totalPaid.toFixed(2)}
                      <div className="text-mm-black/50">of ${totalFinal.toFixed(2)}</div>
                    </td>
                    <td className="px-3 py-2 align-top">{String(g.leader.status ?? "")}</td>
                    <td className="px-3 py-2 align-top text-xs">{created}</td>
                    <td className="px-3 py-2 text-right align-top">
                      <button onClick={() => setEditing(g.leader)} className="mr-3 underline">edit</button>
                      <button onClick={() => handleDelete(String(g.leader.id))} className="text-red-600 underline">del</button>
                    </td>
                  </tr>,
                ];
                if (g.isGroup && isOpen) {
                  rows.push(
                    <tr key={`${g.key}-members`} className="border-b border-mm-black/10 bg-mm-paper/40">
                      <td />
                      <td colSpan={10} className="px-3 py-3">
                        <div className="mb-2 font-sticker text-[10px] tracking-[0.15em] text-mm-black/70">GROUP MEMBERS ({allRows.length})</div>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-mm-black/60">
                              <th className="py-1 pr-3">#</th>
                              <th className="py-1 pr-3">Role</th>
                              <th className="py-1 pr-3">Name</th>
                              <th className="py-1 pr-3">Email</th>
                              <th className="py-1 pr-3">Phone</th>
                              <th className="py-1 pr-3">Age</th>
                              <th className="py-1 pr-3">Country</th>
                              <th className="py-1 pr-3 text-right">Paid</th>
                              <th className="py-1 pr-3">Status</th>
                              <th className="py-1 pr-3" />
                            </tr>
                          </thead>
                          <tbody>
                            {allRows.map((m, idx) => (
                              <tr key={String(m.id)} className="border-t border-mm-black/10">
                                <td className="py-1 pr-3 font-mono">{idx + 1}</td>
                                <td className="py-1 pr-3">{String(m.booking_type ?? "")}</td>
                                <td className="py-1 pr-3 font-medium">{String(m.lead_name ?? "")}</td>
                                <td className="py-1 pr-3">{String(m.lead_email ?? "")}</td>
                                <td className="py-1 pr-3">{String(m.lead_phone ?? "")}</td>
                                <td className="py-1 pr-3">{m.lead_age != null ? String(m.lead_age) : ""}</td>
                                <td className="py-1 pr-3">{String(m.lead_country ?? "")}</td>
                                <td className="py-1 pr-3 text-right font-mono">${Number(m.amount_paid ?? 0).toFixed(2)}</td>
                                <td className="py-1 pr-3">{String(m.status ?? "")}</td>
                                <td className="py-1 pr-3 text-right">
                                  <button onClick={() => setEditing(m)} className="underline">edit</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>,
                  );
                }
                return rows;
              })}
            </tbody>
          </table>
        ) : (
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
            ) : filtered.length === 0 ? (
              <tr><td colSpan={visibleCols.length + 1} className="p-6 text-center text-mm-black/60">No rows.</td></tr>
            ) : filtered.map((r) => (
              <tr key={String(r.id)} className="border-b border-mm-black/10 hover:bg-mm-paper/50">
                {visibleCols.map((c) => {
                  const raw = c.compute ? c.compute(r, ctx) : r[c.key];
                  let val: unknown = raw;
                  if (c.lookup === "trip" && raw) val = tripMap[String(raw)] ?? raw;
                  else if (c.lookup === "departure" && raw) val = departureMap[String(raw)] ?? raw;
                  else if (c.lookup === "discount" && raw) val = discountMap[String(raw)] ?? raw;
                  return (
                    <td key={c.key} className="max-w-[260px] truncate px-3 py-2 align-top" title={typeof val === "string" ? val : undefined}>
                      {renderCell(val, c)}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-right">
                  <button onClick={() => setEditing(r)} className="mr-3 underline">edit</button>
                  <button onClick={() => handleDelete(String(r.id))} className="text-red-600 underline">del</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
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
  if (typeof v === "object") return JSON.stringify(v);
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
