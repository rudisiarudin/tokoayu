"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  BarChart3,
  Box,
  ClipboardList,
  Droplet,
  History,
  Package,
  ShoppingCart,
  Layers,
  ChevronRight,
  MoreVertical,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { stockHistory } from "@/lib/dummy-data";
import { rupiah } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  getSupabaseProducts,
  getSupabaseDebts,
  getSupabaseTransactions,
} from "@/lib/supabase-sync";

export default function DashboardPage() {
  const [productsList, setProductsList] = useState<any[]>([]);
  const [transactionsList, setTransactionsList] = useState<any[]>([]);
  const [debtsList, setDebtsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [prods, txs, dbts] = await Promise.all([
          getSupabaseProducts(),
          getSupabaseTransactions(),
          getSupabaseDebts(),
        ]);
        setProductsList(prods);
        setTransactionsList(txs);
        setDebtsList(dbts);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  // Compute metrics from live database data
  const todayStr = new Date().toISOString().split("T")[0];
  
  const todayTransactions = transactionsList.filter(tx => {
    if (!tx.created_at) return false;
    return tx.created_at.startsWith(todayStr);
  });

  const todaySales = todayTransactions.reduce((sum, tx) => sum + (Number(tx.total) || 0), 0);
  const todayProfit = todayTransactions.reduce((sum, tx) => sum + (Number(tx.profit) || 0), 0);
  
  const unpaidDebt = debtsList
    .filter(d => d.status !== "lunas")
    .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  const lowStockProducts = productsList.filter(p => p.stock <= p.min_stock || p.stock <= (p.minStock ?? 5));

  return (
    <div className="grid gap-6">
      
      {/* METRIC CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard 
          title="Penjualan Hari Ini" 
          value={loading ? "..." : rupiah(todaySales)} 
          note={loading ? "Memuat..." : `${todayTransactions.length} transaksi`} 
          tone="green" 
          loading={loading}
        />
        <MetricCard 
          title="Perkiraan Untung" 
          value={loading ? "..." : rupiah(todayProfit)} 
          note={loading ? "Memuat..." : "Hari ini"} 
          tone="green" 
          loading={loading}
        />
        <MetricCard 
          title="Hutang Belum Lunas" 
          value={loading ? "..." : rupiah(unpaidDebt)} 
          note={loading ? "Memuat..." : `${debtsList.filter(d => d.status !== "lunas").length} pelanggan`} 
          tone="orange" 
          loading={loading}
        />
        <MetricCard 
          title="Stok Hampir Habis" 
          value={loading ? "..." : `${lowStockProducts.length} Barang`} 
          note={loading ? "Memuat..." : "Perlu restock"} 
          tone="red" 
          loading={loading}
        />
      </div>

      {/* QUICK ACTIONS */}
      <section className="grid gap-3">
        <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-1">
          Aksi Cepat Warung
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Action href="/dashboard/kasir" icon={ShoppingCart} title="Mulai Jualan" description="Kasir cepat" primary />
          <Action href="/dashboard/barang" icon={Box} title="Urus Barang" description="Inventory barang" />
          <Action href="/dashboard/hutang" icon={ClipboardList} title="Catat Hutang" description="Tagihan warung" orange />
          <Action href="/dashboard/laporan" icon={BarChart3} title="Lihat Laporan" description="Grafik keuangan" blue />
        </div>
      </section>

      {/* TWO COLUMN GRID FROM REFERENCE */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        
        {/* LEFT COLUMN: PRODUCT LIST & STOCK */}
        <Card className="rounded-[24px] border border-[#e8ece9] bg-white shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between border-b border-[#e8ece9] px-6 py-4.5">
            <CardTitle className="text-base font-black text-foreground flex items-center gap-2">
              <Layers size={19} className="text-emerald-600" /> Daftar Produk & Stok
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" className="h-8 rounded-xl text-xs font-bold text-emerald-700 hover:bg-emerald-50">
                <Link href="/dashboard/barang">Semua Barang</Link>
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <MoreVertical size={16} />
              </Button>
            </div>
          </CardHeader>
          <div className="p-5 flex flex-col gap-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-2xl border border-[#e8ece9] bg-slate-50 animate-pulse" />
              ))
            ) : (
              productsList.slice(0, 5).map((product) => {
                const minS = product.min_stock ?? product.minStock ?? 5;
                const isOut = product.stock <= 0;
                const isLow = product.stock <= minS;
                let statusText = "In Stock";
                let statusTone = "green";
                if (isOut) {
                  statusText = "Out of Stock";
                  statusTone = "red";
                } else if (isLow) {
                  statusText = "Low Stock";
                  statusTone = "orange";
                }

                return (
                  <div key={product.id} className={cn(
                    "flex items-center justify-between gap-4 rounded-2xl border border-[#e8ece9] bg-white p-3.5 transition-all duration-300 hover:border-emerald-500/35 hover:shadow-sm",
                    isLow && "bg-amber-50/5 border-amber-100"
                  )}>
                    <div className="flex items-center gap-3.5">
                      <ProductThumb name={product.name} category={product.category} />
                      <div>
                        <p className="text-sm font-black text-foreground">{product.name}</p>
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">{product.category}</p>
                      </div>
                    </div>
                    
                    <div className="hidden sm:block text-center">
                      <p className="text-[10px] font-bold text-muted-foreground">Stok Tersedia</p>
                      <p className="text-xs font-black text-foreground">{product.stock} {product.unit}</p>
                    </div>

                    <div className="hidden md:block text-center">
                      <p className="text-[10px] font-bold text-muted-foreground">Sisa Min</p>
                      <p className="text-xs font-extrabold text-foreground">{minS} {product.unit}</p>
                    </div>

                    <div>
                      {statusTone === "green" && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full ring-1 ring-emerald-100/50">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> In Stock
                        </span>
                      )}
                      {statusTone === "orange" && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full ring-1 ring-amber-100/50">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" /> Low Stock
                        </span>
                      )}
                      {statusTone === "red" && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-red-700 bg-red-50 px-2.5 py-1 rounded-full ring-1 ring-red-100/50">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Out of Stock
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* RIGHT COLUMN: ORDERS & EXPIRY */}
        <div className="grid gap-6">
          
          {/* CARD 1: RESTOCK & ACTIVITY LOG */}
          <Card className="rounded-[24px] border border-[#e8ece9] bg-white shadow-sm overflow-hidden flex flex-col h-fit">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[#e8ece9] px-6 py-4.5">
              <CardTitle className="text-base font-black text-foreground flex items-center gap-2">
                <History size={19} className="text-emerald-600" /> Riwayat Restock & Mutasi
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <MoreVertical size={16} />
              </Button>
            </CardHeader>
            <div className="p-5 flex flex-col gap-3">
              {stockHistory.map((history, i) => {
                const isMasuk = history.type === "Masuk";
                return (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-2xl border border-[#e8ece9] bg-white p-3.5 hover:border-emerald-500/25 transition-all">
                    <div className="grid gap-0.5">
                      <span className="text-xs font-black text-foreground">#TRX-{1000 + i}</span>
                      <span className="text-[10px] font-extrabold text-muted-foreground">{history.product}</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground text-center">Jumlah</p>
                      <p className="text-xs font-extrabold text-foreground text-center">{history.qty} pcs</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground text-right">Tanggal</p>
                      <p className="text-[10px] font-extrabold text-foreground text-right">{history.date}</p>
                    </div>
                    <div>
                      {isMasuk ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                          Masuk
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-blue-700 bg-blue-50 px-2 py-1 rounded-full border border-blue-100">
                          Keluar
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* CARD 2: EXPIRY & WASTE MANAGEMENT OR RECENT TRANSACTION */}
          <Card className="rounded-[24px] border border-[#e8ece9] bg-white shadow-sm overflow-hidden flex flex-col h-fit">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[#e8ece9] px-6 py-4.5">
              <CardTitle className="text-base font-black text-foreground flex items-center gap-2">
                <ArrowRightLeft size={19} className="text-emerald-600" /> Transaksi Terbaru Hari Ini
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <MoreVertical size={16} />
              </Button>
            </CardHeader>
            <div className="p-5 flex flex-col gap-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-2xl border border-[#e8ece9] bg-slate-50 animate-pulse" />
                ))
              ) : (
                transactionsList.slice(0, 4).map((trx) => (
                  <div key={trx.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[#e8ece9] bg-white p-3.5 hover:border-emerald-500/25 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700 font-black text-xs border border-emerald-100">
                        {trx.method[0]}
                      </div>
                      <div>
                        <p className="text-xs font-black text-foreground">{trx.id}</p>
                        <p className="text-[10px] font-extrabold text-muted-foreground">{trx.customer} · {trx.time}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-foreground">{rupiah(trx.total)}</p>
                      <p className="text-[10px] font-bold text-emerald-600">Untung {rupiah(trx.profit)}</p>
                    </div>
                    <div>
                      <Button asChild variant="ghost" className="h-8 rounded-xl text-[10px] font-extrabold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3">
                        <Link href="/dashboard/laporan">Detail</Link>
                      </Button>
                    </div>
                  </div>
                ))
              )}
              {!loading && transactionsList.length === 0 && (
                <div className="rounded-xl border border-dashed p-6 text-center font-bold text-muted-foreground">
                  Belum ada transaksi hari ini.
                </div>
              )}
            </div>
          </Card>

        </div>

      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  note,
  tone,
  loading,
}: {
  title: string;
  value: string;
  note: string;
  tone: "green" | "orange" | "red";
  loading?: boolean;
}) {
  const style = {
    green: "border-[#e8ece9] bg-white text-emerald-700 shadow-sm",
    orange: "border-[#e8ece9] bg-white text-orange-600 shadow-sm",
    red: "border-[#e8ece9] bg-white text-red-600 shadow-sm",
  };
  
  const iconStyle = {
    green: "bg-emerald-500/10 text-emerald-700",
    orange: "bg-orange-500/10 text-orange-700",
    red: "bg-red-500/10 text-red-700",
  };

  return (
    <Card className={cn(
      `rounded-[22px] border transition-all duration-300 hover:shadow-md hover:scale-[1.01] ${style[tone]}`,
      loading && "animate-pulse"
    )}>
      <div className="grid min-h-[120px] content-between p-6">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-foreground">{value}</p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-muted-foreground">{note}</p>
          <div className={`grid h-8 w-8 place-items-center rounded-xl ${iconStyle[tone]}`}>
            {tone === "red" ? <AlertTriangle size={17} /> : <BarChart3 size={17} />}
          </div>
        </div>
      </div>
    </Card>
  );
}

function Action({
  href,
  icon: Icon,
  title,
  description,
  primary,
  orange,
  blue,
}: {
  href: string;
  icon: typeof ShoppingCart;
  title: string;
  description: string;
  primary?: boolean;
  orange?: boolean;
  blue?: boolean;
}) {
  return (
    <Button
      asChild
      variant="outline"
      className={cn(
        "group h-[84px] rounded-2xl bg-white border border-[#e8ece9] p-4 shadow-sm text-left justify-start items-center gap-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-md hover:border-emerald-500/25",
        primary && "hover:border-emerald-500/40 hover:bg-emerald-50/20"
      )}
    >
      <Link href={href} className="w-full flex">
        <div className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-all duration-300 group-hover:scale-105",
          primary ? "bg-emerald-100 text-emerald-700" : 
          orange ? "bg-orange-100 text-orange-600" :
          blue ? "bg-sky-100 text-sky-700" : "bg-emerald-100 text-emerald-700"
        )}>
          <Icon size={22} />
        </div>
        <div className="grid gap-0.5">
          <p className="text-sm font-black text-foreground">{title}</p>
          <p className="text-[10px] font-semibold text-muted-foreground">{description}</p>
        </div>
      </Link>
    </Button>
  );
}

function ProductThumb({ name, category }: { name: string; category?: string }) {
  const isMinyak = name.includes("Minyak") || category === "Minuman";
  const isBeras = name.includes("Beras") || category === "Sembako";
  const isGula = name.includes("Gula");
  const isKopi = name.includes("Kopi") || category === "Kopi";
  
  let Icon = Package;
  let bgClass = "bg-emerald-50 text-emerald-600 ring-emerald-100";
  
  if (isMinyak) {
    Icon = Droplet;
    bgClass = "bg-sky-50 text-sky-600 ring-sky-100";
  } else if (isBeras) {
    bgClass = "bg-amber-50 text-amber-600 ring-amber-100";
  } else if (isGula) {
    bgClass = "bg-purple-50 text-purple-600 ring-purple-100";
  } else if (isKopi) {
    bgClass = "bg-rose-50 text-rose-600 ring-rose-100";
  }

  return (
    <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1", bgClass)}>
      <Icon size={19} />
    </div>
  );
}
