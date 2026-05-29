"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Archive,
  BadgePercent,
  BarChart3,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Home,
  Menu,
  PackagePlus,
  Settings,
  ShoppingBasket,
  Store,
  Users,
  WalletCards,
  Search,
  Scan,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", shortLabel: "Home", icon: Home },
  { href: "/dashboard/kasir", label: "Kasir POS", shortLabel: "Kasir", icon: ShoppingBasket },
  { href: "/dashboard/barang", label: "Inventory", shortLabel: "Barang", icon: Archive },
  { href: "/dashboard/pelanggan", label: "Pelanggan", shortLabel: "Pelanggan", icon: Users },
  { href: "/dashboard/hutang", label: "Catatan Hutang", shortLabel: "Hutang", icon: WalletCards },
  { href: "/dashboard/belanja-stok", label: "Belanja Stok", shortLabel: "Stok", icon: PackagePlus },
  { href: "/dashboard/promo", label: "Promo & Diskon", shortLabel: "Promo", icon: BadgePercent },
  { href: "/dashboard/laporan", label: "Laporan Keuangan", shortLabel: "Laporan", icon: BarChart3 },
  { href: "/dashboard/pengaturan", label: "Pengaturan", shortLabel: "Setelan", icon: Settings },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-bg min-h-screen text-[#1a2e22]">
      {/* MOBILE OVERLAY */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm lg:hidden transition-all duration-300"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 border-r border-[#e8ece9] bg-white p-5 transition-all duration-300 ease-in-out flex flex-col",
          collapsed ? "lg:w-[82px] lg:px-3.5" : "w-[250px]",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* COLLAPSE TOGGLE BUTTON (DESKTOP) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-6 hidden h-6 w-6 rounded-full border border-[#e8ece9] bg-white shadow-sm hover:bg-emerald-50 hover:text-emerald-700 lg:grid place-items-center transition-all duration-200 text-muted-foreground z-50 cursor-pointer"
        >
          {collapsed ? <ChevronRight size={13} strokeWidth={2.5} /> : <ChevronLeft size={13} strokeWidth={2.5} />}
        </button>

        {/* LOGO */}
        <Link href="/dashboard" className="mb-8 flex items-center gap-3 px-2 shrink-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
            <Store size={22} className="animate-pulse" />
          </div>
          <div
            className={cn(
              "transition-all duration-300 whitespace-nowrap",
              collapsed && "lg:opacity-0 lg:w-0 lg:overflow-hidden lg:hidden"
            )}
          >
            <p className="text-base font-black tracking-tight text-foreground">
              Toko<span className="text-emerald-600">Ayu</span>
            </p>
            <p className="text-[10px] font-bold text-muted-foreground">Kasir Kelontong PWA</p>
          </div>
        </Link>

        {/* NAVIGATION LINKS */}
        <nav className="flex flex-col gap-1.5 flex-1 overflow-y-auto pr-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex min-h-[44px] items-center gap-3.5 rounded-2xl px-4 text-sm font-extrabold text-muted-foreground transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-700 shrink-0",
                  collapsed && "lg:justify-center lg:px-0 lg:w-11 lg:mx-auto",
                  active && "bg-emerald-600 text-white shadow-lg shadow-emerald-600/15 hover:bg-emerald-600 hover:text-white"
                )}
              >
                <item.icon size={19} className="shrink-0" />
                <span
                  className={cn(
                    "transition-all duration-300 whitespace-nowrap",
                    collapsed && "lg:opacity-0 lg:w-0 lg:overflow-hidden lg:hidden"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* BOTTOM USER PROFILE CARD */}
        <div
          className={cn(
            "rounded-2xl border border-[#e8ece9] bg-muted/30 p-3.5 mt-auto transition-all duration-300 shrink-0",
            collapsed && "lg:p-1.5 lg:border-transparent lg:bg-transparent"
          )}
        >
          <div className={cn("flex items-center gap-3", collapsed && "lg:justify-center")}>
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"
              className="h-10 w-10 rounded-xl object-cover ring-2 ring-emerald-50 shrink-0"
              alt="Avatar"
            />
            <div
              className={cn(
                "transition-all duration-300 whitespace-nowrap",
                collapsed && "lg:opacity-0 lg:w-0 lg:overflow-hidden lg:hidden"
              )}
            >
              <p className="text-sm font-black text-foreground">Bu Ayu</p>
              <p className="text-[10px] font-extrabold text-muted-foreground">Pemilik Warung</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN WRAPPER */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out min-h-screen flex flex-col",
          collapsed ? "lg:pl-[82px]" : "lg:pl-[250px]"
        )}
      >
        {/* FLOAT HEADER */}
        <header className="sticky top-0 z-20 bg-[#f4f7f5]/80 px-4 py-4 backdrop-blur-md sm:px-6 shrink-0">
          <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4">
            {/* SEARCH CONTAINER */}
            <div className="flex flex-1 items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl lg:hidden"
                onClick={() => setMobileOpen(true)}
              >
                <Menu size={22} />
              </Button>
              <div className="relative hidden max-w-md flex-1 md:block">
                <Search className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground/80" />
                <Input
                  placeholder="Cari barang, transaksi, pelanggan..."
                  className="h-11 w-full rounded-full border border-[#e2e8e4] bg-white pl-11 pr-4 text-xs font-semibold shadow-sm focus-visible:ring-emerald-500"
                />
              </div>
            </div>

            {/* ACTION ACTIONS & USER INFO */}
            <div className="flex items-center gap-2.5">
              <Button 
                onClick={() => window.dispatchEvent(new CustomEvent("trigger-global-scan"))}
                className="h-11 rounded-full bg-emerald-600 hover:bg-emerald-700 text-xs font-black shadow-md shadow-emerald-600/10 px-5 gap-2"
              >
                <Scan size={17} /> Scan Barcode
              </Button>

              <Button
                asChild
                variant="outline"
                className="h-11 rounded-full border-[#e2e8e4] bg-white hover:bg-emerald-50 text-xs font-black px-5 gap-1.5 hidden sm:inline-flex"
              >
                <Link href="/dashboard/kasir">
                  <Plus size={16} /> Buat Transaksi
                </Link>
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="relative h-11 w-11 rounded-full border-[#e2e8e4] bg-white shadow-sm hover:bg-emerald-50"
              >
                <Bell size={18} className="text-muted-foreground" />
                <span className="absolute right-3.5 top-3.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              </Button>

              {/* USER PROFILE BOX */}
              <div className="flex items-center gap-2.5 bg-white border border-[#e2e8e4] rounded-full p-1.5 pr-4 shadow-sm">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"
                  className="h-8 w-8 rounded-full object-cover"
                  alt="Bu Ayu Avatar"
                />
                <div className="hidden text-left xl:block">
                  <p className="text-xs font-black text-foreground">Bu Ayu</p>
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">
                    Kasir Utama
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* CONTAINER CONTENT */}
        <main className="mx-auto w-full max-w-[1240px] px-4 py-3 pb-24 sm:px-6 flex-1">
          {children}
        </main>

        {/* MOBILE BOTTOM NAVIGATION - scrollable, all items */}
        <nav className="fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t bg-white/95 px-1.5 py-1.5 shadow-2xl backdrop-blur lg:hidden gap-1 [&::-webkit-scrollbar]:hidden">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex min-w-[60px] flex-col items-center justify-center gap-0.5 rounded-xl px-2 min-h-[56px] text-[9.5px] font-black text-muted-foreground shrink-0 transition-colors",
                  active && "bg-emerald-600 text-white"
                )}
              >
                <item.icon size={20} />
                <span className="leading-tight text-center">{item.shortLabel}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
