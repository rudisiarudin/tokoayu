"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  BadgePercent,
  BarChart3,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Droplet,
  Edit,
  FileDown,
  Minus,
  Package,
  PackagePlus,
  Plus,
  Printer,
  Search,
  Send,
  Settings,
  ShoppingBasket,
  Store,
  Type,
  Maximize2,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { customers, debts, products, promos, type Product } from "@/lib/dummy-data";
import { cn, rupiah } from "@/lib/utils";
import {
  getSupabaseProducts,
  getSupabaseCustomers,
  getSupabaseDebts,
  getSupabaseTransactions,
  saveSupabaseTransaction,
  updateSupabaseProduct,
  saveSupabaseCustomer,
  saveSupabaseDebt,
  saveSupabaseProduct,
  updateSupabaseDebtStatus,
  updateSupabaseProductFull,
  updateSupabaseDebt
} from "@/lib/supabase-sync";

function loadHtml5QrcodeScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject();
    if ((window as any).Html5Qrcode) return resolve();
    
    const existing = document.getElementById("html5-qrcode-script");
    if (existing) {
      if ((window as any).Html5Qrcode) {
        resolve();
      } else {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", (e) => reject(e));
      }
      return;
    }
    
    const script = document.createElement("script");
    script.id = "html5-qrcode-script";
    script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = (e) => reject(e);
    document.body.appendChild(script);
  });
}

const titles: Record<string, { title: string; desc: string }> = {
  kasir: { title: "Kasir", desc: "Cari barang, atur keranjang, pilih pembayaran, lalu cetak atau kirim struk." },
  barang: { title: "Barang", desc: "Kelola stok, harga, barcode, satuan, dan tanggal kadaluarsa." },
  pelanggan: { title: "Pelanggan", desc: "Lihat data pelanggan, jenis harga, riwayat belanja, dan limit hutang." },
  hutang: { title: "Hutang", desc: "Catat hutang, cicilan, jatuh tempo, dan kirim pengingat WhatsApp." },
  "belanja-stok": { title: "Belanja Stok", desc: "Daftar barang yang perlu dibeli ulang berdasarkan stok minimum." },
  promo: { title: "Promo", desc: "Buat promo sederhana dan kirim penawaran ke pelanggan." },
  laporan: { title: "Laporan", desc: "Pantau omzet, keuntungan, transaksi, barang laris, dan hutang belum dibayar." },
  pengaturan: { title: "Pengaturan", desc: "Atur warung, printer, backup, tampilan, dan hak akses pengguna." },
};

export default function SectionPage() {
  const params = useParams<{ section: string }>();
  const section = params.section;
  const meta = titles[section] ?? titles.kasir;

  return (
    <div className="grid gap-5">
      {section !== "kasir" && (
        <div className="rounded-2xl border bg-white px-5 py-4 pos-card">
          <h1 className="text-xl font-black tracking-tight">{meta.title}</h1>
          <p className="mt-1 max-w-2xl text-sm font-semibold text-muted-foreground">{meta.desc}</p>
        </div>
      )}
      {section === "kasir" && <KasirPage />}
      {section === "barang" && <BarangPage />}
      {section === "pelanggan" && <PelangganPage />}
      {section === "hutang" && <HutangPage />}
      {section === "belanja-stok" && <BelanjaStokPage />}
      {section === "promo" && <PromoPage />}
      {section === "laporan" && <LaporanPage />}
      {section === "pengaturan" && <PengaturanPage />}
    </div>
  );
}

function QRISTimer() {
  const [seconds, setSeconds] = useState(120);
  
  useEffect(() => {
    setSeconds(120);
    const interval = setInterval(() => {
      setSeconds((prev) => (prev > 0 ? prev - 1 : 120));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return (
    <span className="font-extrabold text-foreground">
      {minutes.toString().padStart(2, "0")}:{remainingSeconds.toString().padStart(2, "0")}
    </span>
  );
}

function KasirPage() {
  type CartLine = { product: (typeof products)[number]; qty: number };
  type Receipt = { total: number; method: string; change: number };

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [method, setMethod] = useState("Tunai");
  const [cashText, setCashText] = useState("100000");
  const [search, setSearch] = useState("");
  const [stockProducts, setStockProducts] = useState(products);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [lastReceipt, setLastReceipt] = useState<Receipt | null>(null);
  const [priceMode, setPriceMode] = useState<"retail" | "wholesale">("retail");

  const [scannerOpen, setScannerOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [scanStatus, setScanStatus] = useState<"ready" | "scanning" | "success" | "error">("ready");
  const [scannedProductName, setScannedProductName] = useState("");
  const [cameraErrorReason, setCameraErrorReason] = useState<"denied" | "missing" | "other" | "busy" | null>(null);
  const [rawCameraError, setRawCameraError] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isOpeningRef = useRef(false);
  const html5QrcodeRef = useRef<any>(null);

  useEffect(() => {
    if (scanStatus === "scanning" && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(e => console.log("Kasir video play failed:", e));
    }
  }, [scanStatus]);

  useEffect(() => {
    async function loadDbData() {
      const dbProducts = await getSupabaseProducts();
      setStockProducts(dbProducts);
    }
    loadDbData();

    const handleGlobalScan = () => {
      setScannerOpen(true);
    };
    window.addEventListener("trigger-global-scan", handleGlobalScan);
    return () => window.removeEventListener("trigger-global-scan", handleGlobalScan);
  }, []);

  const playBeepSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = "sine";
      oscillator.frequency.value = 1450;
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.15);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.log("Audio play failed:", e);
    }
  };

  const closeScanner = () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      html5QrcodeRef.current.stop().catch((e: any) => console.log(e));
      html5QrcodeRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScannerOpen(false);
    setScanStatus("ready");
    setCameraErrorReason(null);
  };

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let scanningActive = true;
    let timerId: any = null;
    
    const enableCamera = async () => {
      if (scannerOpen) {
        timerId = setTimeout(async () => {
          if (!scanningActive) return;
          if (isOpeningRef.current || streamRef.current || html5QrcodeRef.current) return;
          isOpeningRef.current = true;
          setCameraErrorReason(null);
          
          const hasNative = typeof window !== "undefined" && "BarcodeDetector" in window;
          
          if (hasNative) {
            try {
              setCameraLoading(true);
              const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: "environment" } }
              });
              activeStream = stream;
              streamRef.current = stream;
              setCameraLoading(false);
              setScanStatus("scanning");
              isOpeningRef.current = false;
              
              const detectLoop = async () => {
                if (!scanningActive) return;
                
                if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                  try {
                    const detector = new (window as any).BarcodeDetector({
                      formats: ["ean_13", "ean_8", "code_128", "qr_code", "upc_a"]
                    });
                    const barcodes = await detector.detect(videoRef.current);
                    if (barcodes.length > 0) {
                      const scannedValue = barcodes[0].rawValue;
                      console.log("Real barcode scanned in KasirPage:", scannedValue);
                      playBeepSound();
                      
                      const matched = stockProducts.find(p => p.barcode === scannedValue || p.sku === scannedValue);
                      if (matched) {
                        setCart((current) => {
                          const existing = current.find((item) => item.product.id === matched.id);
                          if (existing) {
                            if (existing.qty >= matched.stock) return current;
                            return current.map((item) => (item.product.id === matched.id ? { ...item, qty: item.qty + 1 } : item));
                          }
                          return [...current, { product: matched, qty: 1 }];
                        });
                        setScannedProductName(matched.name);
                        setScanStatus("success");
                      } else {
                        setScannedProductName(`Barcode Baru: ${scannedValue} (Belum Terdaftar)`);
                        setScanStatus("success");
                      }
                      
                      scanningActive = false;
                      setTimeout(() => {
                        if (activeStream) {
                          activeStream.getTracks().forEach((track) => track.stop());
                        }
                        setScannerOpen(false);
                        setScanStatus("ready");
                      }, 2000);
                      return;
                    }
                  } catch (e) {
                    console.warn("Native detection error:", e);
                  }
                }
                
                if (scanningActive) {
                  requestAnimationFrame(detectLoop);
                }
              };
              
              requestAnimationFrame(detectLoop);
              
            } catch (err: any) {
              isOpeningRef.current = false;
              console.warn("Camera access failed:", err);
              setCameraLoading(false);
              
              const errStr = String(err).toLowerCase();
              let reason: "denied" | "missing" | "busy" | "other" = "other";
              if (errStr.includes("allow") || errStr.includes("permission") || errStr.includes("denied")) {
                reason = "denied";
              } else if (errStr.includes("readable") || errStr.includes("trackstart") || errStr.includes("source") || errStr.includes("busy") || errStr.includes("use")) {
                reason = "busy";
              } else if (errStr.includes("notfound") || errStr.includes("missing") || errStr.includes("device")) {
                reason = "missing";
              }
              setCameraErrorReason(reason);
              setRawCameraError(errStr);
              setScanStatus("error");
            }
          } else {
            // Fallback to html5-qrcode from CDN
            try {
              setCameraLoading(true);
              await loadHtml5QrcodeScript();
              
              if (!scanningActive) {
                isOpeningRef.current = false;
                return;
              }
              
              const Html5Qrcode = (window as any).Html5Qrcode;
              if (!Html5Qrcode) {
                throw new Error("Html5Qrcode not loaded");
              }
              
              const html5QrcodeInstance = new Html5Qrcode("kasir-reader");
              html5QrcodeRef.current = html5QrcodeInstance;
              isOpeningRef.current = false;
              
              const config = {
                fps: 15,
                qrbox: (width: number, height: number) => {
                  const minSize = Math.min(width, height);
                  const boxSize = Math.floor(minSize * 0.7);
                  return { width: boxSize, height: boxSize / 2 };
                }
              };
              
              const onSuccess = (decodedText: string) => {
                console.log("Decoded text via Html5Qrcode in KasirPage:", decodedText);
                playBeepSound();
                
                const matched = stockProducts.find(p => p.barcode === decodedText || p.sku === decodedText);
                if (matched) {
                  setCart((current) => {
                    const existing = current.find((item) => item.product.id === matched.id);
                    if (existing) {
                      if (existing.qty >= matched.stock) return current;
                      return current.map((item) => (item.product.id === matched.id ? { ...item, qty: item.qty + 1 } : item));
                    }
                    return [...current, { product: matched, qty: 1 }];
                  });
                  setScannedProductName(matched.name);
                  setScanStatus("success");
                } else {
                  setScannedProductName(`Barcode Baru: ${decodedText} (Belum Terdaftar)`);
                  setScanStatus("success");
                }
                
                scanningActive = false;
                
                if (html5QrcodeInstance && html5QrcodeInstance.isScanning) {
                  html5QrcodeInstance.stop().then(() => {
                    html5QrcodeRef.current = null;
                    setScannerOpen(false);
                    setScanStatus("ready");
                  }).catch(console.error);
                }
              };
              
              const onError = (errorMessage: string) => {};
              
              try {
                await html5QrcodeInstance.start({ facingMode: "environment" }, config, onSuccess, onError);
              } catch (startErr) {
                console.warn("Environment camera failed in Kasir, falling back to user camera...", startErr);
                await html5QrcodeInstance.start({ facingMode: "user" }, config, onSuccess, onError);
              }
              
              setCameraLoading(false);
              setScanStatus("scanning");
              
            } catch (err: any) {
              isOpeningRef.current = false;
              console.warn("Html5Qrcode start failed:", err);
              setCameraLoading(false);
              
              const errStr = String(err).toLowerCase();
              let reason: "denied" | "missing" | "busy" | "other" = "other";
              if (errStr.includes("allow") || errStr.includes("permission") || errStr.includes("denied")) {
                reason = "denied";
              } else if (errStr.includes("readable") || errStr.includes("trackstart") || errStr.includes("source") || errStr.includes("busy") || errStr.includes("use")) {
                reason = "busy";
              } else if (errStr.includes("notfound") || errStr.includes("missing") || errStr.includes("device")) {
                reason = "missing";
              }
              setCameraErrorReason(reason);
              setRawCameraError(errStr);
              setScanStatus("error");
            }
          }
        }, 250);
      }
    };
    
    enableCamera();
    
    return () => {
      scanningActive = false;
      if (timerId) clearTimeout(timerId);
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        html5QrcodeRef.current.stop().catch((e: any) => console.log(e));
        html5QrcodeRef.current = null;
      }
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [scannerOpen]);


  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return [...stockProducts]
      .sort((a, b) => b.sold - a.sold)
      .filter((product) => {
        if (!keyword) return true;
        return (
          product.name.toLowerCase().includes(keyword) ||
          product.barcode.includes(keyword) ||
          product.sku.toLowerCase().includes(keyword)
        );
      });
  }, [search, stockProducts]);
  const subtotal = cart.reduce((sum, item) => sum + (priceMode === "wholesale" ? item.product.wholesalePrice : item.product.retailPrice) * item.qty, 0);
  const discount = 0;
  const total = subtotal;
  const cash = useMemo(() => Number(cashText.replace(/\D/g, "")) || 0, [cashText]);
  const change = Math.max(cash - total, 0);
  const canPay = cart.length > 0 && (method !== "Tunai" || cash >= total);

  function addToCart(product: (typeof products)[number]) {
    if (product.stock <= 0) return;
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return current;
        return current.map((item) => (item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item));
      }
      return [...current, { product, qty: 1 }];
    });
  }

  function increaseQty(productId: string) {
    const product = stockProducts.find((item) => item.id === productId);
    if (!product) return;
    setCart((current) =>
      current.map((item) =>
        item.product.id === productId && item.qty < product.stock ? { ...item, qty: item.qty + 1 } : item
      )
    );
  }

  function decreaseQty(productId: string) {
    setCart((current) =>
      current.flatMap((item) => {
        if (item.product.id !== productId) return [item];
        if (item.qty <= 1) return [];
        return [{ ...item, qty: item.qty - 1 }];
      })
    );
  }

  function clearCart() {
    setCart([]);
    setPaymentOpen(false);
  }

  const shareToWhatsApp = () => {
    const text = `*TokoAyu - Struk Belanja*\nTanggal: ${new Date().toLocaleDateString("id-ID")}\nTotal: ${rupiah(lastReceipt?.total ?? total)}\nMetode: ${lastReceipt?.method ?? method}\n${(lastReceipt?.method ?? method) === "Tunai" ? `Kembalian: ${rupiah(lastReceipt?.change ?? change)}\n` : ""}Terima kasih telah berbelanja di TokoAyu!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  function completeTransaction() {
    setLastReceipt({ total, method, change });
    
    // Calculate and trigger background Supabase stock updates
    const updatedProducts = stockProducts.map((product) => {
      const line = cart.find((item) => item.product.id === product.id);
      if (!line) return product;
      const updated = { ...product, stock: Math.max(product.stock - line.qty, 0), sold: product.sold + line.qty };
      
      updateSupabaseProduct(updated);
      return updated;
    });

    setStockProducts(updatedProducts);

    // Async save transaction record to Supabase
    saveSupabaseTransaction({
      customer: "Umum",
      itemsCount: cart.reduce((sum, item) => sum + item.qty, 0),
      total,
      profit: cart.reduce((sum, item) => {
        const sellPrice = priceMode === "wholesale" ? item.product.wholesalePrice : item.product.retailPrice;
        return sum + (sellPrice - item.product.buyPrice) * item.qty;
      }, 0) - discount,
      method,
      status: "Terbayar"
    });

    setCart([]);
    setPaymentOpen(false);
    setSuccessOpen(true);
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid auto-rows-max gap-5">
        <Card className="pos-card h-fit rounded-2xl bg-white">
          <div className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_152px]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={21} />
              <Input
                className="h-12 rounded-xl border-emerald-100 bg-white pl-12 text-base shadow-none focus-visible:ring-2"
                placeholder="Cari barang atau barcode"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Button
              size="lg"
              variant="outline"
              className="h-12 whitespace-nowrap rounded-xl border-emerald-100 bg-white text-sm shadow-none font-bold"
              onClick={() => setScannerOpen(true)}
            >
              <Camera size={20} /> Scan Barcode
            </Button>
          </div>
        </Card>

        <Card className="pos-card h-fit rounded-2xl bg-white">
          <CardHeader className="p-4 pb-2">
            <div className="grid grid-cols-2 rounded-xl bg-muted p-1.5">
              <Button
                variant={priceMode === "retail" ? "default" : "ghost"}
                onClick={() => setPriceMode("retail")}
                className="h-10 rounded-lg text-sm"
              >
                Harga Eceran
              </Button>
              <Button
                variant={priceMode === "wholesale" ? "default" : "ghost"}
                onClick={() => setPriceMode("wholesale")}
                className="h-10 rounded-lg text-sm"
              >
                Harga Grosir
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 pt-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {filteredProducts.map((product) => {
              const inCart = cart.find((item) => item.product.id === product.id)?.qty ?? 0;
              const isOut = product.stock <= 0;
              return (
                <button
                  key={product.id}
                  disabled={isOut || inCart >= product.stock}
                  onClick={() => addToCart(product)}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-2xl border bg-white p-3.5 text-left shadow-sm transition-all duration-300 hover:border-primary/50 hover:shadow-md hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 disabled:hover:shadow-sm disabled:hover:border-border",
                    inCart > 0 && "border-primary bg-emerald-50/20 ring-1 ring-primary/40"
                  )}
                >
                  <div className="w-full">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                        {product.category}
                      </span>
                      {product.stock <= product.minStock && !isOut && (
                        <span className="text-[9px] font-extrabold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md ring-1 ring-red-100 animate-pulse">
                          Tipis
                        </span>
                      )}
                    </div>
                    <ProductTileThumb name={product.name} category={product.category} />
                    <p className="mt-3.5 line-clamp-2 min-h-[38px] text-sm font-extrabold leading-tight text-foreground group-hover:text-primary transition-colors">
                      {product.name}
                    </p>
                  </div>
                  <div className="mt-3 w-full border-t border-dashed pt-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground">
                        {priceMode === "wholesale" ? "Harga Grosir" : "Harga Ecer"}
                      </p>
                      <p className="text-base font-black text-foreground">
                        {rupiah(priceMode === "wholesale" ? product.wholesalePrice : product.retailPrice)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-muted-foreground">Stok</p>
                      <p className={cn("text-xs font-black", product.stock <= product.minStock ? "text-red-600" : "text-emerald-700")}>
                        {product.stock} {product.unit}
                      </p>
                    </div>
                  </div>
                  {inCart > 0 && (
                    <div className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-black text-white shadow-md ring-2 ring-white">
                      {inCart}
                    </div>
                  )}
                </button>
              );
            })}
            {filteredProducts.length === 0 && (
              <div className="rounded-xl border border-dashed p-6 text-center font-bold text-muted-foreground sm:col-span-2 lg:col-span-3">
                Barang tidak ditemukan.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="pos-card h-fit rounded-2xl bg-white lg:sticky lg:top-24">
        <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
          <CardTitle className="text-base">Keranjang</CardTitle>
          <Button variant="ghost" size="icon" className="text-red-500" onClick={clearCart} disabled={cart.length === 0}>
            <Minus size={18} />
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 pt-2">
          {cart.length === 0 && (
            <div className="rounded-2xl border border-dashed bg-muted/40 p-6 text-center">
              <ShoppingBasket className="mx-auto text-muted-foreground" size={34} />
              <p className="mt-3 font-black">Keranjang kosong</p>
              <p className="text-sm font-semibold text-muted-foreground">Klik barang untuk mulai jualan.</p>
            </div>
          )}
          {cart.map((item) => (
            <div key={item.product.id} className="grid grid-cols-[40px_1fr_auto] items-center gap-3 border-b pb-3">
              <ProductTileThumb name={item.product.name} small />
              <div>
                <p className="text-sm font-black">{item.product.name}</p>
                <p className="text-xs font-semibold text-muted-foreground">
                  {rupiah(priceMode === "wholesale" ? item.product.wholesalePrice : item.product.retailPrice)}
                </p>
              </div>
              <div className="grid gap-1 text-right">
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7 rounded-lg"
                    aria-label={`Kurangi ${item.product.name}`}
                    onClick={() => decreaseQty(item.product.id)}
                  >
                    <Minus size={15} />
                  </Button>
                  <span className="min-w-4 text-center text-sm font-black">{item.qty}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7 rounded-lg"
                    aria-label={`Tambah ${item.product.name}`}
                    onClick={() => increaseQty(item.product.id)}
                  >
                    <Plus size={15} />
                  </Button>
                </div>
                <p className="text-sm font-black">{rupiah(item.product.retailPrice * item.qty)}</p>
              </div>
            </div>
          ))}

          <div className="grid gap-2 pt-1 text-sm font-bold">
            <Row label="Total bayar" value={rupiah(total)} strong />
          </div>

          <Button size="lg" className="h-14 rounded-xl text-base" onClick={() => setPaymentOpen(true)} disabled={cart.length === 0}>
            Bayar Sekarang
          </Button>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" className="rounded-xl">
              <Printer size={19} /> Cetak
            </Button>
            <Button variant="outline" className="rounded-xl">
              <Send size={19} /> WA
            </Button>
            <Button variant="outline" className="rounded-xl">
              <CheckCircle2 size={19} /> Simpan
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={paymentOpen}>
        <DialogContent onClose={() => setPaymentOpen(false)}>
          <div className="grid gap-4 p-5 pt-1">
            <div>
              <p className="text-2xl font-black tracking-tight">Pembayaran</p>
              <p className="font-semibold text-muted-foreground">Pilih cara bayar dan cek total belanja.</p>
            </div>
            <div className="rounded-2xl bg-muted p-4">
              <Row label="Total belanja" value={rupiah(total)} strong />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {["Tunai", "QRIS", "Transfer", "Hutang"].map((item) => (
                <Button
                  key={item}
                  variant={method === item ? "default" : "outline"}
                  className="rounded-xl"
                  onClick={() => setMethod(item)}
                >
                  {item}
                </Button>
              ))}
            </div>
            {method === "Tunai" && (
              <div className="grid gap-2">
                <Label>Uang diterima</Label>
                <Input
                  inputMode="numeric"
                  value={cashText}
                  onChange={(event) => setCashText(event.target.value)}
                  className="text-xl font-black rounded-xl"
                />
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <Button
                    variant="outline"
                    className="h-8 text-xs font-bold rounded-lg px-2.5 bg-emerald-50 hover:bg-emerald-100 text-primary border-emerald-200"
                    onClick={() => setCashText(total.toString())}
                  >
                    Uang Pas
                  </Button>
                  {[10000, 20000, 50000, 100000, 200000].map((val) => (
                    <Button
                      key={val}
                      variant="outline"
                      className="h-8 text-xs font-bold rounded-lg px-2.5"
                      onClick={() => setCashText(val.toString())}
                    >
                      {rupiah(val)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {method === "Hutang" && (
              <Label className="grid gap-2">
                Pilih pelanggan
                <SelectField defaultValue="Bu Sari">
                  {customers.map((customer) => (
                    <option key={customer.id}>{customer.name}</option>
                  ))}
                </SelectField>
              </Label>
            )}
            {method === "QRIS" && (
              <div className="grid gap-3 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 text-center relative overflow-hidden">
                {(() => {
                  const getCRC16 = (str: string) => {
                    let crc = 0xFFFF;
                    for (let c = 0; c < str.length; c++) {
                      let code = str.charCodeAt(c);
                      crc ^= (code << 8);
                      for (let i = 0; i < 8; i++) {
                        if (crc & 0x8000) {
                          crc = (crc << 1) ^ 0x1021;
                        } else {
                          crc = crc << 1;
                        }
                      }
                    }
                    crc &= 0xFFFF;
                    return crc.toString(16).toUpperCase().padStart(4, "0");
                  };

                  // Parse, reconstruct, and inject dynamic transaction amount (Tag 54) into user's raw QRIS string
                  const base1 = "00020101021226610014COM.GO-JEK.WWW01189360091436043572810210G6043572810303UMI51440014ID.CO.QRIS.WWW0215ID10243504796540303UMI520476295303360";
                  const amtStr = String(total);
                  const amtTag = "54" + amtStr.length.toString().padStart(2, "0") + amtStr;
                  const base2 = "5802ID5922IT PALUGADA , MMPNG PR6015JAKARTA SELATAN61051279062070703A016304";
                  
                  const qrisPayload = base1 + amtTag + base2 + getCRC16(base1 + amtTag + base2);
                  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrisPayload)}`;

                  return (
                    <>
                      {/* QRIS Header */}
                      <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-1.5">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span className="text-xs font-black text-emerald-800 tracking-wider uppercase">QRIS Dinamis</span>
                        </div>
                        <span className="text-[10px] font-black text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-100 shadow-sm">
                          IT PALUGADA
                        </span>
                      </div>
                      
                      {/* QR Code Container */}
                      <div className="relative mx-auto bg-white p-3 rounded-2xl border shadow-md w-48 h-48 flex items-center justify-center">
                        <img
                          src={qrUrl}
                          alt="QRIS TokoAyu Dinamis"
                          className="w-full h-full object-contain rounded-lg"
                        />
                        {/* Subtle dynamic green scan overlay */}
                        <div className="absolute inset-0 bg-emerald-500/5 animate-pulse rounded-2xl pointer-events-none" />
                      </div>
                      
                      {/* Nominal Text */}
                      <div className="bg-white rounded-xl p-3 border shadow-sm flex flex-col items-center">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Pembayaran</p>
                        <p className="text-2xl font-black text-emerald-600 tracking-tight mt-0.5">
                          {rupiah(total)}
                        </p>
                        <p className="text-[10px] font-bold text-muted-foreground mt-1 flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full">
                          ⏱️ Masa Berlaku: <QRISTimer />
                        </p>
                      </div>
                      
                      {/* Helper text */}
                      <p className="text-[11px] font-semibold text-muted-foreground leading-relaxed px-4">
                        Scan QRIS di atas dengan m-Banking atau E-Wallet. Nominal pembayaran akan terisi otomatis.
                      </p>
                    </>
                  );
                })()}
              </div>
            )}
            <div className="rounded-2xl border bg-white p-4">
              <Row label="Metode" value={method} />
              {method === "Tunai" && <Row label="Kembalian" value={rupiah(change)} strong />}
              {method === "Tunai" && !canPay && <p className="mt-2 text-sm font-bold text-red-600">Uang diterima masih kurang.</p>}
            </div>
            <Button
              size="lg"
              disabled={!canPay}
              className="h-14 rounded-xl text-base"
              onClick={completeTransaction}
            >
              Simpan Transaksi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={successOpen}>
        <DialogContent onClose={() => setSuccessOpen(false)}>
          <div className="grid gap-4 p-5 pt-1 text-center">
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center mb-1">
              {/* Expanding Ripple Rings */}
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ripple-1" />
              <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ripple-2" />
              
              {/* Elastic Spring Icon Container */}
              <div className="relative z-10 grid h-16 w-16 place-items-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-md animate-scale-spring border border-emerald-200">
                <svg
                  className="h-8 w-8 text-emerald-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline
                    points="20 6 9 17 4 12"
                    className="animate-draw-check"
                  />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-2xl font-black tracking-tight">Transaksi Berhasil</p>
              <p className="mt-1 font-semibold text-muted-foreground">Stok barang sudah dikurangi dan keranjang sudah dikosongkan.</p>
            </div>
            <div className="rounded-2xl bg-muted p-4 text-left">
              <Row label="Total" value={rupiah(lastReceipt?.total ?? total)} strong />
              <Row label="Metode" value={lastReceipt?.method ?? method} />
              {(lastReceipt?.method ?? method) === "Tunai" && <Row label="Kembalian" value={rupiah(lastReceipt?.change ?? change)} />}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" className="rounded-xl"><Printer size={18} /> Cetak</Button>
              <Button variant="outline" className="rounded-xl" onClick={shareToWhatsApp}><Send size={18} /> WA</Button>
              <Button className="rounded-xl" onClick={() => setSuccessOpen(false)}>Selesai</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={scannerOpen}>
        <DialogContent onClose={closeScanner}>
          <div className="grid gap-4 p-5 pt-1 text-center">
            <div>
              <p className="text-2xl font-black tracking-tight flex items-center justify-center gap-2">
                <Camera className="text-primary animate-pulse" size={24} /> Barcode Scanner
              </p>
              <p className="text-xs font-semibold text-muted-foreground mt-1">
                Dekatkan barcode produk kelontong ke depan kamera.
              </p>
            </div>
            
            {/* Viewfinder area */}
            <div className="relative mx-auto aspect-video w-full max-w-sm overflow-hidden rounded-2xl bg-slate-950 border border-emerald-500/30 shadow-inner flex items-center justify-center">
              {cameraLoading && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-950 text-white p-4">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
                  <p className="text-xs font-black tracking-wide text-emerald-400">MEMBUKA SENSOR KAMERA...</p>
                </div>
              )}
              
              {cameraErrorReason === "denied" && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/95 text-white p-5 text-center gap-2">
                  <p className="text-3xl animate-bounce">🔒</p>
                  <p className="text-sm font-black text-amber-400">IZIN KAMERA DITOLAK</p>
                  <p className="text-[11px] text-slate-300 font-semibold leading-relaxed px-4">
                    Silakan klik ikon **gembok (lock)** di sebelah URL browser Anda, ubah Kamera menjadi <span className="text-emerald-400 font-bold bg-slate-950 px-1.5 py-0.5 rounded">Izinkan (Allow)</span>, lalu tutup & buka kembali scanner.
                  </p>
                </div>
              )}

              {cameraErrorReason === "missing" && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/95 text-white p-5 text-center gap-2">
                  <p className="text-3xl animate-pulse">📷</p>
                  <p className="text-sm font-black text-sky-400">KAMERA TIDAK DETEKSI</p>
                  <p className="text-[11px] text-slate-300 font-semibold leading-relaxed px-4">
                    Webcam tidak dideteksi pada PC/Laptop Anda.
                  </p>
                </div>
              )}

              {cameraErrorReason === "busy" && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/95 text-white p-5 text-center gap-2">
                  <p className="text-3xl animate-pulse">📷</p>
                  <p className="text-sm font-black text-rose-400">KAMERA SEDANG DIGUNAKAN</p>
                  <p className="text-[11px] text-slate-300 font-semibold leading-relaxed px-4">
                    Kamera sedang digunakan/dikunci oleh aplikasi lain (seperti Zoom, Teams, WhatsApp, atau tab browser lain).
                  </p>
                  <p className="text-[10px] text-emerald-400 font-bold mt-1 bg-emerald-950/50 border border-emerald-900/40 px-3 py-1 rounded-lg">
                    💡 Tutup tab/aplikasi lain tersebut, lalu coba buka kembali!
                  </p>
                </div>
              )}

              {scanStatus === "error" && !cameraLoading && !cameraErrorReason && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-950 text-white p-4">
                  <p className="text-3xl">⚠️</p>
                  <p className="text-xs font-black text-red-400 uppercase tracking-wider">Akses Kamera Gagal</p>
                  <div className="w-full bg-black/50 p-2 rounded border border-red-900/50 max-h-20 overflow-y-auto">
                    <p className="text-[9px] text-red-200 font-mono text-left break-words">
                      {rawCameraError || "Unknown Error"}
                    </p>
                  </div>
                  <p className="text-[10px] text-muted-foreground px-4 text-center mt-1">
                    Jika Anda menggunakan HP, pastikan URL menggunakan HTTPS atau jaringan localhost.
                  </p>
                </div>
              )}

              {typeof window !== "undefined" && !("BarcodeDetector" in window) && (
                <div id="kasir-reader" className="absolute inset-0 h-full w-full object-cover overflow-hidden [&>video]:h-full [&>video]:w-full [&>video]:object-cover z-0" />
              )}

              {scanStatus === "scanning" && typeof window !== "undefined" && "BarcodeDetector" in window && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover scale-x-[-1] lg:scale-x-1"
                />
              )}
            </div>
            
            {/* Status messages */}
            <div className="min-h-[50px] flex items-center justify-center px-2 py-1.5 rounded-xl bg-muted/50 border">
              {scanStatus === "scanning" && (
                <p className="text-xs font-bold text-muted-foreground flex items-center gap-2 animate-pulse">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                  Mencari barcode dalam jangkauan laser...
                </p>
              )}
              {scanStatus === "success" && (
                <div className="text-center animate-scale-spring">
                  <p className="text-xs font-black text-emerald-700 flex items-center justify-center gap-1.5">
                    🎉 BEEP! Berhasil Memindai
                  </p>
                  <p className="text-sm font-black text-foreground mt-0.5">{scannedProductName}</p>
                </div>
              )}
              {scanStatus === "error" && (
                <p className="text-xs font-bold text-red-600">
                  Gagal memindai. Coba sejajarkan kembali.
                </p>
              )}
            </div>
            
            <Button variant="outline" className="rounded-xl mt-1.5 h-11" onClick={closeScanner}>
              Batal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductTileThumb({ name, category, small = false }: { name: string; category?: string; small?: boolean }) {
  const isMinyak = name.includes("Minyak");
  const isBeras = name.includes("Beras");
  const isGula = name.includes("Gula");
  const isKopi = name.includes("Kopi");
  const isTelur = name.includes("Telur");

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
  } else if (isTelur) {
    bgClass = "bg-orange-50 text-orange-600 ring-orange-100";
  }

  return (
    <div
      className={cn(
        "grid place-items-center rounded-xl ring-1 transition-transform group-hover:scale-105 shrink-0",
        bgClass,
        small ? "h-10 w-10" : "h-14 w-full"
      )}
    >
      <Icon size={small ? 20 : 26} />
    </div>
  );
}

function BarangPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [localProducts, setLocalProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);
  
  // Scanner states for adding product
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [scanStatus, setScanStatus] = useState<"ready" | "scanning" | "success" | "error">("ready");
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [cameraErrorReason, setCameraErrorReason] = useState<"denied" | "missing" | "other" | "busy" | null>(null);
  const [rawCameraError, setRawCameraError] = useState<string>("");
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isOpeningRef = useRef(false);
  const html5QrcodeRef = useRef<any>(null);

  useEffect(() => {
    if (scanStatus === "scanning" && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(e => console.log("Barang video play failed:", e));
    }
  }, [scanStatus]);

  useEffect(() => {
    async function load() {
      const dbProducts = await getSupabaseProducts();
      setLocalProducts(dbProducts);
    }
    load();

    const handleGlobalScan = () => {
      setScannedBarcode("");
      setAddOpen(true);
      setTimeout(() => {
        setScannerOpen(true);
      }, 250);
    };
    window.addEventListener("trigger-global-scan", handleGlobalScan);
    return () => window.removeEventListener("trigger-global-scan", handleGlobalScan);
  }, []);

  const playBeepSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = "sine";
      oscillator.frequency.value = 1450;
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.15);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.log("Audio failed:", e);
    }
  };

  const closeScanner = () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      html5QrcodeRef.current.stop().catch((e: any) => console.log(e));
      html5QrcodeRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScannerOpen(false);
    setScanStatus("ready");
    setCameraErrorReason(null);
  };

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let scanningActive = true;
    let timerId: any = null;
    
    const enableCamera = async () => {
      if (scannerOpen) {
        timerId = setTimeout(async () => {
          if (!scanningActive) return;
          if (isOpeningRef.current || streamRef.current || html5QrcodeRef.current) return;
          isOpeningRef.current = true;
          setCameraErrorReason(null);
          
          const hasNative = typeof window !== "undefined" && "BarcodeDetector" in window;
          
          if (hasNative) {
            try {
              setCameraLoading(true);
              const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: "environment" } }
              });
              activeStream = stream;
              streamRef.current = stream;
              setCameraLoading(false);
              setScanStatus("scanning");
              isOpeningRef.current = false;
              
              const detectLoop = async () => {
                if (!scanningActive) return;
                
                if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                  try {
                    const detector = new (window as any).BarcodeDetector({
                      formats: ["ean_13", "ean_8", "code_128", "qr_code", "upc_a"]
                    });
                    const barcodes = await detector.detect(videoRef.current);
                    if (barcodes.length > 0) {
                      const scannedValue = barcodes[0].rawValue;
                      console.log("Real barcode scanned in BarangPage:", scannedValue);
                      playBeepSound();
                      
                      setScannedBarcode(scannedValue);
                      setScanStatus("success");
                      
                      scanningActive = false;
                      setTimeout(() => {
                        if (activeStream) {
                          activeStream.getTracks().forEach((track) => track.stop());
                        }
                        setScannerOpen(false);
                        setScanStatus("ready");
                      }, 1200);
                      return;
                    }
                  } catch (e) {
                    console.warn("Native detection error in BarangPage:", e);
                  }
                }
                
                if (scanningActive) {
                  requestAnimationFrame(detectLoop);
                }
              };
              
              requestAnimationFrame(detectLoop);
              
            } catch (err: any) {
              isOpeningRef.current = false;
              console.warn("Camera failed in BarangPage:", err);
              setCameraLoading(false);
              
              const errStr = String(err).toLowerCase();
              let reason: "denied" | "missing" | "busy" | "other" = "other";
              if (errStr.includes("allow") || errStr.includes("permission") || errStr.includes("denied")) {
                reason = "denied";
              } else if (errStr.includes("readable") || errStr.includes("trackstart") || errStr.includes("source") || errStr.includes("busy") || errStr.includes("use")) {
                reason = "busy";
              } else if (errStr.includes("notfound") || errStr.includes("missing") || errStr.includes("device")) {
                reason = "missing";
              }
              setCameraErrorReason(reason);
              setRawCameraError(errStr);
              setScanStatus("error");
            }
          } else {
            // Fallback to html5-qrcode from CDN
            try {
              setCameraLoading(true);
              await loadHtml5QrcodeScript();
              
              if (!scanningActive) {
                isOpeningRef.current = false;
                return;
              }
              
              const Html5Qrcode = (window as any).Html5Qrcode;
              if (!Html5Qrcode) {
                throw new Error("Html5Qrcode not loaded");
              }
              
              const html5QrcodeInstance = new Html5Qrcode("barang-reader");
              html5QrcodeRef.current = html5QrcodeInstance;
              isOpeningRef.current = false;
              
              const config = {
                fps: 15,
                qrbox: (width: number, height: number) => {
                  const minSize = Math.min(width, height);
                  const boxSize = Math.floor(minSize * 0.7);
                  return { width: boxSize, height: boxSize / 2 };
                }
              };
              
              const onSuccess = (decodedText: string) => {
                console.log("Decoded text via Html5Qrcode in BarangPage:", decodedText);
                playBeepSound();
                
                setScannedBarcode(decodedText);
                setScanStatus("success");
                
                scanningActive = false;
                
                if (html5QrcodeInstance && html5QrcodeInstance.isScanning) {
                  html5QrcodeInstance.stop().then(() => {
                    html5QrcodeRef.current = null;
                    setScannerOpen(false);
                    setScanStatus("ready");
                  }).catch(console.error);
                }
              };
              
              const onError = (errorMessage: string) => {};
              
              try {
                await html5QrcodeInstance.start({ facingMode: "environment" }, config, onSuccess, onError);
              } catch (startErr) {
                console.warn("Environment camera failed in Barang, falling back to user camera...", startErr);
                await html5QrcodeInstance.start({ facingMode: "user" }, config, onSuccess, onError);
              }
              
              setCameraLoading(false);
              setScanStatus("scanning");
              
            } catch (err: any) {
              isOpeningRef.current = false;
              console.warn("Html5Qrcode start failed in BarangPage:", err);
              setCameraLoading(false);
              
              const errStr = String(err).toLowerCase();
              let reason: "denied" | "missing" | "busy" | "other" = "other";
              if (errStr.includes("allow") || errStr.includes("permission") || errStr.includes("denied")) {
                reason = "denied";
              } else if (errStr.includes("readable") || errStr.includes("trackstart") || errStr.includes("source") || errStr.includes("busy") || errStr.includes("use")) {
                reason = "busy";
              } else if (errStr.includes("notfound") || errStr.includes("missing") || errStr.includes("device")) {
                reason = "missing";
              }
              setCameraErrorReason(reason);
              setRawCameraError(errStr);
              setScanStatus("error");
            }
          }
        }, 250);
      }
    };
    
    enableCamera();
    
    return () => {
      scanningActive = false;
      if (timerId) clearTimeout(timerId);
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        html5QrcodeRef.current.stop().catch((e: any) => console.log(e));
        html5QrcodeRef.current = null;
      }
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [scannerOpen]);

  const handleSave = async (newProduct: Product) => {
    setLocalProducts((prev) => [newProduct, ...prev]);
    await saveSupabaseProduct(newProduct);
    setAddOpen(false);
    setScannedBarcode(""); // Reset
  };

  const handleSaveEdit = async (updatedProduct: Product) => {
    setLocalProducts((prev) => prev.map((p) => p.id === updatedProduct.id ? updatedProduct : p));
    await updateSupabaseProductFull(updatedProduct);
    setEditingProduct(null);
    setScannedBarcode(""); // Reset
  };

  const filtered = localProducts.filter(p => {
    const kw = search.trim().toLowerCase();
    if (!kw) return true;
    return p.name.toLowerCase().includes(kw) || p.barcode.includes(kw) || p.sku.toLowerCase().includes(kw);
  });

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedProducts = filtered.slice(startIndex, endIndex);

  return (
    <div className="grid gap-5">
      <Card className="rounded-2xl border bg-white shadow-sm">
        <div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto_auto]">
          <Input 
            placeholder="Cari barang cepat..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="rounded-xl border-emerald-100 bg-white shadow-none" 
          />
          <Button variant="outline" className="rounded-xl border-emerald-100 bg-white text-sm shadow-none">
            <FileDown size={20} /> Import Excel
          </Button>
          <Button className="rounded-xl shadow-md text-sm font-extrabold" onClick={() => {
            setScannedBarcode("");
            setAddOpen(true);
          }}>
            <PackagePlus size={20} /> Tambah Barang
          </Button>
        </div>
      </Card>
      <Card className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Barang</TableHead>
                <TableHead>Harga</TableHead>
                <TableHead>Stok</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px] text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProducts.map((product) => {
                const low = product.stock <= product.minStock;
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <p className="text-lg font-black text-foreground">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.sku} · {product.barcode}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-extrabold">{rupiah(product.retailPrice)}</p>
                      <p className="text-sm text-muted-foreground">Grosir {rupiah(product.wholesalePrice)}</p>
                    </TableCell>
                    <TableCell>
                      <span className={cn("text-2xl font-black", low ? "text-red-700 animate-pulse" : "text-primary")}>{product.stock}</span>{" "}
                      <span className="text-xs font-semibold text-muted-foreground">{product.unit}</span>
                    </TableCell>
                    <TableCell>{low ? <Badge variant="danger">Stok menipis</Badge> : <Badge variant="success">Aman</Badge>}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl border border-emerald-50 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700"
                        onClick={() => setEditingProduct(product)}
                      >
                        <Edit size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="p-6 text-center font-bold text-muted-foreground">
                    Barang tidak ditemukan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* Pagination Footer Controls */}
        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t bg-slate-50/40">
            {/* Pagination Info */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 text-xs font-semibold text-muted-foreground">
              <span>
                Menampilkan <span className="font-extrabold text-foreground">{totalItems === 0 ? 0 : startIndex + 1}</span> - <span className="font-extrabold text-foreground">{endIndex}</span> dari <span className="font-extrabold text-foreground">{totalItems}</span> barang
              </span>
              
              {/* Dropdown Page Size */}
              <div className="flex items-center gap-1.5">
                <span>Baris per halaman:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 py-1 font-bold text-foreground focus-visible:ring-emerald-500 text-xs cursor-pointer outline-none hover:border-slate-300"
                >
                  {[5, 10, 25, 50].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Page Navigation Controls */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg border-slate-200 text-foreground hover:bg-slate-50 disabled:opacity-50"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={15} />
              </Button>

              {/* Numbered Page Buttons */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, idx) => {
                  const pageNum = idx + 1;
                  // Handle large total pages pagination ellipsis contracture
                  if (
                    totalPages > 5 &&
                    pageNum !== 1 &&
                    pageNum !== totalPages &&
                    Math.abs(pageNum - currentPage) > 1
                  ) {
                    if (pageNum === 2 && currentPage > 3) {
                      return <span key="dots-start" className="text-slate-300 px-1 text-xs">...</span>;
                    }
                    if (pageNum === totalPages - 1 && currentPage < totalPages - 2) {
                      return <span key="dots-end" className="text-slate-300 px-1 text-xs">...</span>;
                    }
                    return null;
                  }

                  const isCurrent = currentPage === pageNum;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        "h-8 min-w-[32px] px-2 rounded-lg text-xs font-black transition duration-150 active:scale-[0.97]",
                        isCurrent
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "border border-slate-200 bg-white text-muted-foreground hover:text-foreground hover:border-slate-300"
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg border-slate-200 text-foreground hover:bg-slate-50 disabled:opacity-50"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={15} />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={addOpen}>
        <DialogContent onClose={() => setAddOpen(false)} className="max-w-2xl">
          <FormBarang 
            onSave={handleSave} 
            onScanTrigger={() => setScannerOpen(true)} 
            scannedBarcode={scannedBarcode} 
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingProduct}>
        <DialogContent onClose={() => {
          setEditingProduct(null);
          setScannedBarcode("");
        }} className="max-w-2xl">
          <FormBarang 
            key={editingProduct?.id || "edit-none"}
            editingProduct={editingProduct}
            onSave={handleSaveEdit} 
            onScanTrigger={() => setScannerOpen(true)} 
            scannedBarcode={scannedBarcode} 
          />
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner Dialog for Add Product Form */}
      <Dialog open={scannerOpen}>
        <DialogContent onClose={closeScanner}>
          <div className="grid gap-4 p-5 pt-1 text-center">
            <div>
              <p className="text-2xl font-black tracking-tight flex items-center justify-center gap-2">
                <Camera className="text-primary animate-pulse" size={24} /> Scan Barcode Barang
              </p>
              <p className="text-xs font-semibold text-muted-foreground mt-1">
                Dekatkan barcode produk baru ke depan kamera.
              </p>
            </div>
            
            {/* Viewfinder area */}
            <div className="relative mx-auto aspect-video w-full max-w-sm overflow-hidden rounded-2xl bg-slate-950 border border-emerald-500/30 shadow-inner flex items-center justify-center">
              {cameraLoading && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-950 text-white p-4">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
                  <p className="text-xs font-black tracking-wide text-emerald-400">MEMBUKA SENSOR KAMERA...</p>
                </div>
              )}
              
              {cameraErrorReason === "denied" && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/95 text-white p-5 text-center gap-2">
                  <p className="text-3xl animate-bounce">🔒</p>
                  <p className="text-sm font-black text-amber-400">IZIN KAMERA DITOLAK</p>
                  <p className="text-[11px] text-slate-300 font-semibold leading-relaxed px-4">
                    Silakan klik ikon **gembok (lock)** di sebelah URL browser Anda, ubah Kamera menjadi <span className="text-emerald-400 font-bold bg-slate-950 px-1.5 py-0.5 rounded">Izinkan (Allow)</span>, lalu tutup & buka kembali scanner.
                  </p>
                </div>
              )}

              {cameraErrorReason === "missing" && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/95 text-white p-5 text-center gap-2">
                  <p className="text-3xl animate-pulse">📷</p>
                  <p className="text-sm font-black text-sky-400">KAMERA TIDAK DETEKSI</p>
                  <p className="text-[11px] text-slate-300 font-semibold leading-relaxed px-4">
                    Webcam tidak dideteksi pada PC/Laptop Anda.
                  </p>
                </div>
              )}

              {cameraErrorReason === "busy" && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/95 text-white p-5 text-center gap-2">
                  <p className="text-3xl animate-pulse">📷</p>
                  <p className="text-sm font-black text-rose-400">KAMERA SEDANG DIGUNAKAN</p>
                  <p className="text-[11px] text-slate-300 font-semibold leading-relaxed px-4">
                    Kamera sedang digunakan/dikunci oleh aplikasi lain (seperti Zoom, Teams, WhatsApp, atau tab browser lain).
                  </p>
                  <p className="text-[10px] text-emerald-400 font-bold mt-1 bg-emerald-950/50 border border-emerald-900/40 px-3 py-1 rounded-lg">
                    💡 Tutup tab/aplikasi lain tersebut, lalu coba buka kembali!
                  </p>
                </div>
              )}

              {typeof window !== "undefined" && !("BarcodeDetector" in window) && (
                <div id="barang-reader" className="absolute inset-0 h-full w-full object-cover overflow-hidden [&>video]:h-full [&>video]:w-full [&>video]:object-cover z-0" />
              )}

              {scanStatus === "error" && !cameraLoading && !cameraErrorReason && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-950 text-white p-4">
                  <p className="text-3xl">⚠️</p>
                  <p className="text-xs font-black text-red-400 uppercase tracking-wider">Akses Kamera Gagal</p>
                  <div className="w-full bg-black/50 p-2 rounded border border-red-900/50 max-h-20 overflow-y-auto">
                    <p className="text-[9px] text-red-200 font-mono text-left break-words">
                      {rawCameraError || "Unknown Error"}
                    </p>
                  </div>
                  <p className="text-[10px] text-muted-foreground px-4 text-center mt-1">
                    Jika Anda menggunakan HP, pastikan URL menggunakan HTTPS atau jaringan localhost.
                  </p>
                </div>
              )}

              {scanStatus === "scanning" && typeof window !== "undefined" && "BarcodeDetector" in window && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover scale-x-[-1] lg:scale-x-1"
                />
              )}
            </div>
            
            {/* Status messages */}
            <div className="min-h-[50px] flex items-center justify-center px-2 py-1.5 rounded-xl bg-muted/50 border">
              {scanStatus === "scanning" && (
                <p className="text-xs font-bold text-muted-foreground flex items-center gap-2 animate-pulse">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                  Memindai barcode produk baru...
                </p>
              )}
              {scanStatus === "success" && (
                <div className="text-center animate-scale-spring">
                  <p className="text-xs font-black text-emerald-700 flex items-center justify-center gap-1.5">
                    🎉 BEEP! Barcode Terbaca
                  </p>
                  <p className="text-sm font-black text-foreground mt-0.5">{scannedBarcode}</p>
                </div>
              )}
            </div>
            
            <Button variant="outline" className="rounded-xl mt-1.5 h-11" onClick={closeScanner}>
              Batal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PelangganPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [localCustomers, setLocalCustomers] = useState(customers);

  useEffect(() => {
    getSupabaseCustomers().then(data => { if (data.length > 0) setLocalCustomers(data); });
  }, []);

  return (
    <div className="grid gap-5">
      <Card className="rounded-2xl border bg-white shadow-sm">
        <div className="flex items-center justify-between p-5">
          <div>
            <p className="text-base font-black text-foreground">Data Pelanggan</p>
            <p className="text-xs font-semibold text-muted-foreground">Kelola pelanggan setia TokoAyu.</p>
          </div>
          <Button className="rounded-xl shadow-md text-sm font-extrabold" onClick={() => setAddOpen(true)}>
            <Plus size={20} /> Tambah Pelanggan
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {localCustomers.map((customer) => (
          <Card key={customer.id} className="rounded-2xl border bg-white shadow-sm transition hover:shadow-md hover:scale-[1.01]">
            <div className="grid gap-4 p-6">
              <div className="flex items-start justify-between gap-3 border-b border-dashed pb-2.5">
                <div>
                  <p className="text-xl font-black text-foreground tracking-tight">{customer.name}</p>
                  <p className="text-xs font-semibold text-muted-foreground">{customer.whatsapp}</p>
                </div>
                <Badge variant={customer.type === "grosir" ? "info" : "success"}>{customer.type}</Badge>
              </div>
              <p className="text-sm font-semibold text-muted-foreground min-h-10">{customer.address}</p>
              <div className="grid gap-2 border-t pt-2.5">
                <Row label="Total belanja" value={rupiah(customer.totalSpend)} />
                <Row label="Limit hutang" value={rupiah(customer.debtLimit)} />
              </div>
              <Button variant="outline" className="rounded-xl border-emerald-100 hover:bg-emerald-50 text-sm font-bold mt-2 h-11">Lihat Detail</Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={addOpen}>
        <DialogContent onClose={() => setAddOpen(false)}>
          <FormPelanggan onSave={() => {
            getSupabaseCustomers().then(data => { if (data.length > 0) setLocalCustomers(data); });
            setAddOpen(false);
          }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HutangPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [localDebts, setLocalDebts] = useState(debts);
  const [liveCustomers, setLiveCustomers] = useState<any[]>([]);

  // installment states
  const [cicilDebt, setCicilDebt] = useState<any | null>(null);
  const [cicilAmount, setCicilAmount] = useState("");
  const [cicilNote, setCicilNote] = useState("");

  useEffect(() => {
    getSupabaseDebts().then(data => { if (data.length > 0) setLocalDebts(data); });
    getSupabaseCustomers().then(data => { if (data.length > 0) setLiveCustomers(data); });
  }, []);

  const reload = () => {
    getSupabaseDebts().then(data => { if (data.length > 0) setLocalDebts(data); });
    getSupabaseCustomers().then(data => { if (data.length > 0) setLiveCustomers(data); });
  };

  const handleSettleDebt = async (id: string) => {
    setLocalDebts(prev => prev.map(d => d.id === id ? { ...d, status: "lunas" } : d));
    await updateSupabaseDebtStatus(id, "lunas");
    reload();
  };

  const handleCicilPayment = async () => {
    if (!cicilDebt || !cicilAmount) return;
    const payVal = Number(cicilAmount);
    if (payVal <= 0) {
      alert("Nominal pembayaran cicilan harus lebih besar dari 0!");
      return;
    }
    if (payVal > cicilDebt.amount) {
      alert("Nominal pembayaran cicilan melebihi sisa hutang saat ini!");
      return;
    }

    const remaining = cicilDebt.amount - payVal;
    const newStatus = remaining <= 0 ? ("lunas" as const) : ("belum lunas" as const);
    
    // Create detailed note
    const payStr = `Cicil ${rupiah(payVal)}`;
    const addedNote = cicilNote ? ` - ${cicilNote}` : "";
    const newNote = cicilDebt.note 
      ? `${cicilDebt.note} (${payStr}${addedNote})` 
      : `${payStr}${addedNote}`;

    // Optimistic UI update
    setLocalDebts(prev => prev.map(d => d.id === cicilDebt.id ? { ...d, amount: remaining, status: newStatus, note: newNote } : d));
    
    await updateSupabaseDebt(cicilDebt.id, remaining, newStatus, newNote);
    
    setCicilDebt(null);
    setCicilAmount("");
    setCicilNote("");
    reload();
    alert(`Pembayaran cicilan sebesar ${rupiah(payVal)} berhasil dicatat!`);
  };

  const sendDebtReminder = (customerName: string, amount: number, dueDate: string) => {
    const customer = liveCustomers.find(c => c.name === customerName) || customers.find(c => c.name === customerName);
    const phone = customer ? customer.whatsapp : "";
    if (!phone) {
      alert(`Nomor WhatsApp untuk ${customerName} tidak ditemukan. Silakan tambahkan pelanggan dengan nomor WhatsApp terlebih dahulu.`);
      return;
    }
    const text = `*PENGINGAT TAGIHAN TOKOAYU*\nHalo, Kak *${customerName}*.\n\nKami ingin menginformasikan sisa tagihan belanja Anda di TokoAyu sebesar *${rupiah(amount)}* yang jatuh tempo pada *${dueDate}*.\n\nMohon untuk melakukan penyelesaian pembayaran. Terima kasih banyak atas kepercayaan Anda berbelanja di TokoAyu! 🙏🛒`;
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const finalPhone = cleanPhone.startsWith("0") ? "62" + cleanPhone.slice(1) : cleanPhone;
    window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="grid gap-5">
      <Card className="rounded-2xl border bg-white shadow-sm">
        <div className="flex items-center justify-between p-5">
          <div>
            <p className="text-base font-black text-foreground">Catat & tagih hutang pelanggan</p>
            <p className="text-xs font-semibold text-muted-foreground">Kirim pengingat WhatsApp, bayar cicilan, atau tandai lunas.</p>
          </div>
          <Button className="rounded-xl shadow-md text-sm font-extrabold" onClick={() => setAddOpen(true)}>
            <Plus size={20} /> Catat Hutang
          </Button>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {localDebts.map((debt) => {
          const isLunas = debt.status === "lunas";
          return (
            <Card key={debt.id} className={cn(
              "rounded-2xl border bg-white shadow-sm transition hover:shadow-md hover:scale-[1.01] overflow-hidden flex flex-col justify-between",
              isLunas && "border-emerald-100 bg-emerald-50/5"
            )}>
              <div className="grid gap-4 p-5">
                <div className="flex items-start justify-between gap-2 border-b border-dashed pb-2.5">
                  <div>
                    <p className="text-lg font-black text-foreground">{debt.customer}</p>
                    <p className="text-xs font-semibold text-muted-foreground">Jatuh tempo {debt.dueDate}</p>
                  </div>
                  <Badge variant={isLunas ? "success" : "danger"}>
                    {debt.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground">Sisa Hutang</p>
                  <p className={cn(
                    "text-3xl font-black tracking-tight",
                    isLunas ? "text-emerald-600 line-through opacity-75" : "text-red-600"
                  )}>{rupiah(debt.amount)}</p>
                </div>
                {debt.note && (
                  <p className="text-xs font-semibold text-muted-foreground bg-slate-50 border border-slate-100 p-2.5 rounded-xl leading-relaxed">
                    Catatan: {debt.note}
                  </p>
                )}
                
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {!isLunas ? (
                    <>
                      <Button
                        className="rounded-xl h-11 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm col-span-2"
                        onClick={() => handleSettleDebt(debt.id)}
                      >
                        Tandai Lunas
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-xl h-11 text-xs font-extrabold border-slate-200 text-foreground hover:bg-slate-50"
                        onClick={() => setCicilDebt(debt)}
                      >
                        Bayar Cicilan
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-xl h-11 text-xs font-extrabold border-slate-200 text-slate-700 hover:bg-slate-50"
                        onClick={() => sendDebtReminder(debt.customer, debt.amount, debt.dueDate)}
                      >
                        <Send size={14} /> Ingatkan WA
                      </Button>
                    </>
                  ) : (
                    <Button
                      disabled
                      className="rounded-xl h-11 text-xs font-extrabold bg-emerald-100 text-emerald-700 border-none shadow-none cursor-default opacity-85 col-span-2"
                    >
                      ✓ Sudah Lunas
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
        {localDebts.length === 0 && (
          <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-dashed p-10 text-center font-bold text-muted-foreground">
            Belum ada catatan hutang.
          </div>
        )}
      </div>

      <Dialog open={addOpen}>
        <DialogContent onClose={() => setAddOpen(false)}>
          <FormHutang liveCustomers={liveCustomers} onSave={() => { reload(); setAddOpen(false); }} />
        </DialogContent>
      </Dialog>

      {/* dialog cicilan */}
      <Dialog open={!!cicilDebt}>
        <DialogContent onClose={() => { setCicilDebt(null); setCicilAmount(""); setCicilNote(""); }} className="max-w-md">
          <div className="flex flex-col gap-0">
            <div className="px-5 pb-3">
              <p className="text-xl font-black tracking-tight text-foreground">Bayar Cicilan Hutang</p>
              <p className="text-xs font-semibold text-muted-foreground mt-0.5">Catat pembayaran angsuran dari pelanggan.</p>
            </div>
            <div className="px-5 grid gap-4">
              <div className="rounded-xl bg-slate-50 border p-3.5 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Pelanggan</span>
                <span className="text-base font-extrabold text-foreground">{cicilDebt?.customer}</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase mt-2">Sisa Hutang Saat Ini</span>
                <span className="text-2xl font-black text-red-600">{rupiah(cicilDebt?.amount ?? 0)}</span>
              </div>
              <Label className="grid gap-1.5 text-sm font-extrabold text-muted-foreground">
                Nominal Pembayaran Cicilan
                <Input 
                  type="number"
                  inputMode="numeric" 
                  placeholder="Masukkan nominal (contoh: 20000)" 
                  value={cicilAmount} 
                  onChange={e => setCicilAmount(e.target.value)} 
                  className="rounded-xl h-11 font-semibold focus-visible:ring-emerald-500" 
                />
              </Label>
              <Label className="grid gap-1.5 text-sm font-extrabold text-muted-foreground">
                Catatan Tambahan (opsional)
                <Input 
                  placeholder="Contoh: Titip lewat Bu RT, Bayar ke-2" 
                  value={cicilNote} 
                  onChange={e => setCicilNote(e.target.value)} 
                  className="rounded-xl h-11 font-semibold focus-visible:ring-emerald-500" 
                />
              </Label>
            </div>
            <div className="px-5 pt-4 pb-5 mt-4 border-t bg-white sticky bottom-0 flex gap-2.5">
              <Button variant="outline" className="rounded-xl h-12 text-sm font-black flex-1" onClick={() => { setCicilDebt(null); setCicilAmount(""); setCicilNote(""); }}>
                Batal
              </Button>
              <Button className="rounded-xl h-12 text-sm font-black flex-1" onClick={handleCicilPayment}>
                Bayar Cicilan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BelanjaStokPage() {
  const [allProducts, setAllProducts] = useState(products);

  useEffect(() => {
    getSupabaseProducts().then(data => { if (data.length > 0) setAllProducts(data); });
  }, []);

  const lowStock = allProducts.filter((item) => item.stock <= item.minStock);

  function StockRestockCard({ product, onUpdated }: { product: any, onUpdated: (p: any) => void }) {
    const [stok, setStok] = useState("");
    const [harga, setHarga] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
      setLoading(true);
      const updated = { ...product, stock: product.stock + Number(stok), buyPrice: Number(harga) || product.buyPrice };
      await updateSupabaseProduct(updated);
      onUpdated(updated);
      setLoading(false);
    };

    return (
      <Card className="rounded-2xl border bg-white shadow-sm">
        <div className="grid gap-4 p-6 md:grid-cols-[1fr_280px] md:items-center">
          <div>
            <p className="text-xl font-black text-foreground">{product.name}</p>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              Stok {product.stock}, minimum {product.minStock}. Saran beli <span className="font-extrabold text-foreground">{Math.max(product.minStock * 2 - product.stock, product.minStock)} {product.unit}</span>.
            </p>
          </div>
          <div className="grid gap-2 border-t pt-3 md:border-t-0 md:pt-0">
            <Input type="number" placeholder="Stok masuk" value={stok} onChange={(e) => setStok(e.target.value)} className="rounded-xl" />
            <Input type="number" placeholder="Harga beli baru" value={harga} onChange={(e) => setHarga(e.target.value)} className="rounded-xl" />
            <Button disabled={loading || !stok} onClick={handleSave} className="rounded-xl text-sm font-black">
              {loading ? "Menyimpan..." : "Tandai Sudah Dibeli"}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {lowStock.length === 0 && (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <p className="text-2xl mb-2">✅</p>
          <p className="font-black text-foreground">Semua stok aman!</p>
          <p className="text-sm font-semibold text-muted-foreground mt-1">Tidak ada barang yang perlu dibeli ulang saat ini.</p>
        </div>
      )}
      {lowStock.map((product) => (
        <StockRestockCard
          key={product.id}
          product={product}
          onUpdated={(updated) =>
            setAllProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
          }
        />
      ))}
    </div>
  );
}

function PromoPage() {
  const [localPromos, setLocalPromos] = useState(promos);
  const [addOpen, setAddOpen] = useState(false);
  const [newPromo, setNewPromo] = useState({ name: "", type: "Diskon", price: "" });

  const sharePromo = (name: string, price: number) => {
    const text = `*PROMO MENARIK TOKOAYU!* 🎉\nDapatkan *${name}* seharga hanya *${rupiah(price)}*!\n\nBuruan belanja sekarang di TokoAyu sebelum kehabisan! 🛒`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleAddPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromo.name || !newPromo.price) return;
    setLocalPromos([
      ...localPromos,
      {
        name: newPromo.name,
        type: newPromo.type,
        price: Number(newPromo.price),
        active: true,
      },
    ]);
    setNewPromo({ name: "", type: "Diskon", price: "" });
    setAddOpen(false);
  };

  return (
    <div className="grid gap-5">
      <Card className="pos-card rounded-2xl bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-foreground">Promo Aktif Warung</h2>
            <p className="text-xs font-semibold text-muted-foreground mt-0.5">Sebarkan promo barang via WhatsApp ke pelanggan setia.</p>
          </div>
          <Button className="rounded-xl shadow-md text-sm font-extrabold" onClick={() => setAddOpen(true)}>
            <Plus size={20} /> Buat Promo Baru
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {localPromos.map((promo) => (
          <Card key={promo.name} className="rounded-2xl border bg-white shadow-sm transition hover:shadow-md hover:scale-[1.01] overflow-hidden">
            <div className="grid gap-4 p-6">
              <div className="flex items-center justify-between border-b pb-2.5">
                <Badge variant="success">Aktif</Badge>
                <BadgePercent className="text-primary" size={24} />
              </div>
              <div>
                <p className="text-xl font-black text-foreground">{promo.name}</p>
                <p className="text-xs font-semibold text-muted-foreground">{promo.type}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground">Harga Promo</p>
                <p className="text-2xl font-black text-primary">{rupiah(promo.price)}</p>
              </div>
              <Button
                variant="outline"
                className="rounded-xl border-emerald-100 text-sm font-bold hover:bg-emerald-50 mt-2"
                onClick={() => sharePromo(promo.name, promo.price)}
              >
                <Send size={18} /> Kirim WhatsApp
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={addOpen}>
        <DialogContent onClose={() => setAddOpen(false)}>
          <form onSubmit={handleAddPromo} className="grid gap-4 p-5 pt-1">
            <div>
              <p className="text-2xl font-black tracking-tight">Buat Promo Baru</p>
              <p className="font-semibold text-muted-foreground">Isi detail promo barang untuk disebarkan.</p>
            </div>
            
            <div className="grid gap-3">
              <Label className="grid gap-1.5">
                Nama Promo / Barang
                <Input
                  required
                  placeholder="Contoh: Indomie Soto 1 Kardus"
                  value={newPromo.name}
                  onChange={(e) => setNewPromo({ ...newPromo, name: e.target.value })}
                  className="rounded-xl"
                />
              </Label>

              <Label className="grid gap-1.5">
                Tipe Promo
                <SelectField
                  value={newPromo.type}
                  onChange={(e) => setNewPromo({ ...newPromo, type: e.target.value })}
                >
                  <option value="Diskon">Diskon</option>
                  <option value="Paket">Paket Hemat</option>
                  <option value="Grosir">Grosir</option>
                  <option value="Bonus">Bonus</option>
                </SelectField>
              </Label>

              <Label className="grid gap-1.5">
                Harga Promo (Rupiah)
                <Input
                  required
                  type="number"
                  placeholder="Contoh: 110000"
                  value={newPromo.price}
                  onChange={(e) => setNewPromo({ ...newPromo, price: e.target.value })}
                  className="rounded-xl"
                />
              </Label>
            </div>

            <Button type="submit" className="rounded-xl h-12 text-sm font-black mt-2">
              Simpan & Aktifkan Promo
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LaporanPage() {
  const [txData, setTxData] = useState<any[]>([]);
  const [localDebts, setLocalDebts] = useState(debts);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [txs, dbtData] = await Promise.all([
        getSupabaseTransactions(),
        getSupabaseDebts(),
      ]);
      setTxData(txs);
      if (dbtData.length > 0) setLocalDebts(dbtData);
      setLoading(false);
    }
    load();
  }, []);

  // Compute stats from real data
  const totalOmzet = txData.reduce((sum, tx) => sum + (Number(tx.total) || 0), 0);
  const totalProfit = txData.reduce((sum, tx) => sum + (Number(tx.profit) || 0), 0);
  const totalDebt = localDebts.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  // Build last 7 days chart + table from real transactions
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toISOString().split("T")[0];
    const dayLabel = date.toLocaleDateString("id-ID", { weekday: "short" });
    const fullLabel = date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" });
    const dayTxs = txData.filter(tx => (tx.created_at || "").startsWith(dateStr));
    const omzet = dayTxs.reduce((s, tx) => s + (Number(tx.total) || 0), 0);
    const untung = dayTxs.reduce((s, tx) => s + (Number(tx.profit) || 0), 0);
    return { day: dayLabel, fullLabel, omzet, untung, transactions: dayTxs.length };
  });

  return (
    <div className="grid gap-5">
      {loading ? (
        <div className="rounded-2xl border bg-white p-10 text-center animate-pulse">
          <p className="font-black text-muted-foreground">⏳ Memuat data laporan dari database...</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <MiniStat title="Total Omzet" value={rupiah(totalOmzet)} />
            <MiniStat title="Total Keuntungan" value={rupiah(totalProfit)} tone="warning" />
            <MiniStat title="Hutang Belum Lunas" value={rupiah(totalDebt)} tone="danger" />
          </div>

          <Card className="rounded-2xl border bg-white shadow-sm overflow-hidden">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-b">
              <CardTitle className="flex items-center gap-2 text-base font-black">
                <BarChart3 size={22} className="text-primary" /> Grafik 7 Hari Terakhir
              </CardTitle>
              <p className="text-xs font-semibold text-muted-foreground">{txData.length} transaksi tercatat</p>
            </CardHeader>
            <CardContent className="h-80 p-5">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last7}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis tickFormatter={(v) => `${Number(v) / 1000}rb`} />
                  <Tooltip formatter={(v) => rupiah(Number(v))} />
                  <Legend />
                  <Bar dataKey="omzet" fill="#147a47" name="Omzet" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="untung" fill="#f59e0b" name="Untung" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border bg-white shadow-sm overflow-hidden">
            <CardHeader className="px-5 py-4 border-b">
              <CardTitle className="text-base font-black text-foreground flex items-center gap-2">
                <Users size={19} className="text-emerald-600" /> Rincian Penjualan 7 Hari Terakhir
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 font-extrabold text-muted-foreground uppercase text-[10px] tracking-wider">
                    <th className="px-5 py-4">Tanggal</th>
                    <th className="px-5 py-4 text-center">Transaksi</th>
                    <th className="px-5 py-4 text-right">Omzet</th>
                    <th className="px-5 py-4 text-right">Keuntungan</th>
                    <th className="px-5 py-4 text-center">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {last7.map((row) => {
                    const margin = row.omzet > 0 ? ((row.untung / row.omzet) * 100).toFixed(1) : "0.0";
                    return (
                      <tr key={row.fullLabel} className="hover:bg-muted/10 transition-colors">
                        <td className="px-5 py-4 font-black text-foreground">{row.fullLabel}</td>
                        <td className="px-5 py-4 text-center font-bold text-muted-foreground">
                          {row.transactions > 0 ? `${row.transactions} kali` : <span className="text-muted-foreground/50">—</span>}
                        </td>
                        <td className="px-5 py-4 text-right font-black text-foreground">
                          {row.omzet > 0 ? rupiah(row.omzet) : <span className="text-muted-foreground/50">—</span>}
                        </td>
                        <td className="px-5 py-4 text-right font-black text-emerald-600">
                          {row.untung > 0 ? rupiah(row.untung) : <span className="text-muted-foreground/50">—</span>}
                        </td>
                        <td className="px-5 py-4 text-center font-extrabold text-muted-foreground">{margin}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}



function PengaturanPage() {
  const [activeTab, setActiveTab] = useState<"store" | "display">("store");

  // Warung Settings
  const [shopName, setShopName] = useState("TokoAyu");
  const [shopAddress, setShopAddress] = useState("Jl. Anggrek Raya No. 42");
  const [shopPhone, setShopPhone] = useState("08123456789");
  const [printerName, setPrinterName] = useState("Thermal 58mm");
  const [taxRate, setTaxRate] = useState("0");

  // Display Settings
  const [activeFontFamily, setActiveFontFamily] = useState("default");
  const [activeFontSize, setActiveFontSize] = useState("16px");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShopName(localStorage.getItem("tokoayu-shop-name") || "TokoAyu");
      setShopAddress(localStorage.getItem("tokoayu-shop-address") || "Jl. Anggrek Raya No. 42");
      setShopPhone(localStorage.getItem("tokoayu-shop-phone") || "08123456789");
      setPrinterName(localStorage.getItem("tokoayu-printer-name") || "Thermal 58mm");
      setTaxRate(localStorage.getItem("tokoayu-tax-rate") || "0");

      setActiveFontFamily(localStorage.getItem("tokoayu-font-family-name") || "default");
      setActiveFontSize(localStorage.getItem("tokoayu-font-size") || "16px");
    }
  }, []);

  const saveWarungSettings = () => {
    localStorage.setItem("tokoayu-shop-name", shopName);
    localStorage.setItem("tokoayu-shop-address", shopAddress);
    localStorage.setItem("tokoayu-shop-phone", shopPhone);
    localStorage.setItem("tokoayu-printer-name", printerName);
    localStorage.setItem("tokoayu-tax-rate", taxRate);
    
    // Dispatch a global event so layout shell can sync if needed
    window.dispatchEvent(new Event("tokoayu-settings-saved"));
    alert("✓ Pengaturan operasional toko berhasil disimpan secara aman!");
  };

  const fonts = [
    { 
      name: "Modern Jakarta (Default)", 
      value: "default", 
      css: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
      desc: "Font bawaan dengan gaya semi-rounded modern yang profesional." 
    },
    { 
      name: "Sleek Sans (Inter)", 
      value: "inter", 
      css: "'Inter', sans-serif",
      desc: "Font sans-serif paling populer. Karakter bersih, profesional, dan sangat tajam." 
    },
    { 
      name: "Geometric (Outfit)", 
      value: "outfit", 
      css: "'Outfit', sans-serif",
      desc: "Gaya geometris modern dengan lengkungan elegan, memberikan kesan premium." 
    },
    { 
      name: "Soft Rounded (Quicksand)", 
      value: "quicksand", 
      css: "'Quicksand', sans-serif",
      desc: "Karakter membulat yang lembut dan ramah, nyaman dipandang berjam-jam." 
    },
    { 
      name: "Playful Store (Fredoka)", 
      value: "fredoka", 
      css: "'Fredoka', sans-serif",
      desc: "Sangat kasual dan ramah. Memberikan vibes warung kekinian yang akrab." 
    },
    { 
      name: "Traditional Serif (Lora)", 
      value: "lora", 
      css: "'Lora', serif",
      desc: "Tipe huruf serif yang artistik dengan detail sapuan pen yang indah." 
    },
    { 
      name: "Elegant Display (Playfair)", 
      value: "playfair", 
      css: "'Playfair Display', serif",
      desc: "Font luxury/butik kelas atas dengan kontras garis tebal-tipis yang tajam." 
    },
    { 
      name: "Developer Mono (JetBrains)", 
      value: "jetbrains", 
      css: "'JetBrains Mono', monospace",
      desc: "Teks seragam bergaya koding. Sangat presisi untuk membaca deretan angka." 
    },
    { 
      name: "Tech Cashier (Fira Code)", 
      value: "firacode", 
      css: "'Fira Code', monospace",
      desc: "Teks monospaced modern dengan tingkat keterbacaan data kasir yang super tinggi." 
    }
  ];

  const fontSizes = [
    { name: "Kecil (14px)", value: "14px", desc: "Sangat ringkas untuk memuat banyak data transaksi sekaligus." },
    { name: "Normal (16px)", value: "16px", desc: "Ukuran standar bawaan aplikasi yang optimal untuk layar medium." },
    { name: "Besar (18px)", value: "18px", desc: "Ukuran besar yang nyaman dibaca dengan cepat saat melayani antrean." },
    { name: "Sangat Besar (20px)", value: "20px", desc: "Super kontras dan tebal. Sangat ramah untuk pengguna lanjut usia." }
  ];

  const changeFontFamily = (val: string) => {
    const selected = fonts.find(f => f.value === val);
    if (!selected) return;
    setActiveFontFamily(val);
    localStorage.setItem("tokoayu-font-family-name", val);
    localStorage.setItem("tokoayu-font-family", selected.css);
    document.documentElement.style.setProperty("--app-font-family", selected.css);
  };

  const changeFontSize = (val: string) => {
    setActiveFontSize(val);
    localStorage.setItem("tokoayu-font-size", val);
    document.documentElement.style.setProperty("--app-font-size", val);
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      
      {/* TABS HEADER NAVIGATION */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50 w-full sm:w-fit self-center">
        <button
          onClick={() => setActiveTab("store")}
          className={cn(
            "flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-black text-xs transition duration-200 flex items-center justify-center gap-2",
            activeTab === "store" 
              ? "bg-white text-emerald-700 shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Store size={16} /> Operasional Warung
        </button>
        <button
          onClick={() => setActiveTab("display")}
          className={cn(
            "flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-black text-xs transition duration-200 flex items-center justify-center gap-2",
            activeTab === "display" 
              ? "bg-white text-emerald-700 shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Type size={16} /> Tampilan & Font
        </button>
      </div>

      {/* TAB CONTENT: STORE & OPERATIONAL SETTINGS */}
      {activeTab === "store" && (
        <Card className="rounded-2xl border bg-white shadow-sm overflow-hidden animate-scale-spring">
          <CardHeader className="px-6 py-5 border-b bg-slate-50/50">
            <CardTitle className="flex items-center gap-2.5 text-base font-black text-foreground">
              <Store size={20} className="text-emerald-600 animate-pulse" /> Konfigurasi Profil & Struk Warung
            </CardTitle>
            <p className="text-xs font-semibold text-muted-foreground mt-0.5">Atur informasi warung Anda yang akan dicetak di kertas struk dan nota belanja.</p>
          </CardHeader>
          <div className="grid gap-6 p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <Label className="grid gap-1.5 text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                Nama Warung / Usaha
                <Input 
                  value={shopName} 
                  onChange={e => setShopName(e.target.value)} 
                  placeholder="Contoh: TokoAyu Kelontong" 
                  className="rounded-xl h-12 border-slate-200 text-foreground font-semibold placeholder:font-normal placeholder:text-muted-foreground/60 focus-visible:ring-emerald-500 text-sm" 
                />
              </Label>
              <Label className="grid gap-1.5 text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                Nomor WhatsApp (untuk Kirim Nota)
                <Input 
                  value={shopPhone} 
                  onChange={e => setShopPhone(e.target.value)} 
                  placeholder="Contoh: 08123456789" 
                  className="rounded-xl h-12 border-slate-200 text-foreground font-semibold placeholder:font-normal placeholder:text-muted-foreground/60 focus-visible:ring-emerald-500 text-sm" 
                />
              </Label>
              <Label className="grid gap-1.5 text-xs font-extrabold text-slate-500 uppercase tracking-wider sm:col-span-2">
                Alamat Fisik Warung
                <Input 
                  value={shopAddress} 
                  onChange={e => setShopAddress(e.target.value)} 
                  placeholder="Alamat lengkap jalan, RT/RW, kota, kecamatan" 
                  className="rounded-xl h-12 border-slate-200 text-foreground font-semibold placeholder:font-normal placeholder:text-muted-foreground/60 focus-visible:ring-emerald-500 text-sm" 
                />
              </Label>
              <Label className="grid gap-1.5 text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                Printer Struk Thermal (Default)
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Printer size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input 
                      value={printerName} 
                      onChange={e => setPrinterName(e.target.value)} 
                      placeholder="Contoh: Thermal 58mm Bluetooth" 
                      className="rounded-xl h-12 border-slate-200 pl-11 text-foreground font-semibold placeholder:font-normal placeholder:text-muted-foreground/60 focus-visible:ring-emerald-500 text-sm" 
                    />
                  </div>
                </div>
              </Label>
              <Label className="grid gap-1.5 text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                Pajak Penjualan / Charge Kasir (%)
                <div className="relative">
                  <BadgePercent size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    type="number"
                    value={taxRate} 
                    onChange={e => setTaxRate(e.target.value)} 
                    placeholder="Pajak dalam persen (contoh: 0)" 
                    className="rounded-xl h-12 border-slate-200 pl-11 text-foreground font-semibold placeholder:font-normal placeholder:text-muted-foreground/60 focus-visible:ring-emerald-500 text-sm" 
                  />
                </div>
              </Label>
            </div>
            <div className="flex justify-end pt-4 border-t mt-2">
              <Button 
                onClick={saveWarungSettings} 
                className="rounded-xl px-6 h-12 font-black text-sm shadow-md shadow-emerald-600/10 flex gap-2 items-center"
              >
                <CheckCircle2 size={18} /> Simpan Pengaturan Warung
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* TAB CONTENT: DISPLAY & FONTS ACCESSIBILITY */}
      {activeTab === "display" && (
        <Card className="rounded-2xl border bg-white shadow-sm overflow-hidden animate-scale-spring">
          <CardHeader className="px-6 py-5 border-b bg-slate-50/50">
            <CardTitle className="flex items-center gap-2.5 text-base font-black text-foreground">
              <Type size={20} className="text-emerald-600" /> Kustomisasi Huruf & Aksesibilitas Layar
            </CardTitle>
            <p className="text-xs font-semibold text-muted-foreground mt-0.5">Ubah kenyamanan keterbacaan huruf dan skala teks kasir secara langsung.</p>
          </CardHeader>
          <div className="grid gap-6 p-6">
            
            {/* GRID OF 9 SELECTABLE FONTS */}
            <div className="grid gap-3">
              <div>
                <p className="text-sm font-black text-foreground">Pilih Font Premium ({fonts.length} Pilihan)</p>
                <p className="text-xs font-semibold text-muted-foreground mt-0.5">Setiap font langsung dimuat dari Google Fonts untuk tampilan visual premium.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {fonts.map((f) => {
                  const isSelected = activeFontFamily === f.value;
                  return (
                    <button
                      key={f.value}
                      onClick={() => changeFontFamily(f.value)}
                      style={{ fontFamily: f.css }}
                      className={cn(
                        "text-left p-4 rounded-2xl border transition duration-200 hover:border-emerald-500 hover:shadow-sm active:scale-[0.98] flex flex-col justify-between min-h-[110px] group relative overflow-hidden",
                        isSelected 
                          ? "border-emerald-600 bg-emerald-50/20 ring-1 ring-emerald-600/30" 
                          : "border-slate-200 bg-white"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-extrabold text-sm text-foreground group-hover:text-emerald-700 leading-tight">
                          {f.name}
                        </span>
                        {isSelected && <span className="h-2 w-2 rounded-full bg-emerald-600 shrink-0" />}
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground mt-2 leading-relaxed" style={{ fontFamily: "var(--font-jakarta), sans-serif" }}>
                        {f.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SEGMENTED FONT SIZES */}
            <div className="grid gap-3 border-t pt-5">
              <div>
                <p className="text-sm font-black text-foreground">Pilih Skala Ukuran Teks (Aksesibilitas)</p>
                <p className="text-xs font-semibold text-muted-foreground mt-0.5">Seluruh tombol, form, dan teks kasir akan membesar/mengecil secara harmonis.</p>
              </div>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                {fontSizes.map((fs) => {
                  const isSelected = activeFontSize === fs.value;
                  return (
                    <button
                      key={fs.value}
                      onClick={() => changeFontSize(fs.value)}
                      className={cn(
                        "p-4 rounded-2xl border transition duration-200 hover:border-emerald-500 hover:shadow-sm active:scale-[0.98] flex flex-col items-center justify-center text-center gap-1.5 min-h-[96px] group",
                        isSelected 
                          ? "border-emerald-600 bg-emerald-50/20 ring-1 ring-emerald-600/30" 
                          : "border-slate-200 bg-white"
                      )}
                    >
                      <span className={cn(
                        "font-black text-base text-foreground leading-none flex items-center gap-0.5",
                        fs.value === "14px" && "text-sm",
                        fs.value === "18px" && "text-lg",
                        fs.value === "20px" && "text-xl"
                      )}>
                        Aa <Maximize2 size={12} className="opacity-40" />
                      </span>
                      <span className="text-[10px] font-black text-muted-foreground group-hover:text-emerald-700 leading-tight">
                        {fs.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LIVE CHECKOUT PREVIEW PANEL */}
            <div className="mt-2 p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b pb-2">
                <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" /> Simulasi Tampilan POS Kasir
                </p>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">Preview Aktif</span>
              </div>
              
              <div className="grid gap-3.5 p-4 rounded-xl bg-white border border-slate-100 shadow-sm transition-all duration-300">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md uppercase tracking-wider">Kategori: Bumbu Dapur</span>
                    <p className="text-lg font-black text-foreground leading-tight mt-1">Kecap Manis ABC Refill 520ml</p>
                    <p className="text-xs font-semibold text-muted-foreground mt-0.5">Barcode: 899002231201</p>
                  </div>
                  <Badge variant="success" className="rounded-lg shrink-0">Stok: 48 pcs</Badge>
                </div>

                <div className="flex items-center justify-between border-t border-dashed pt-3 mt-1">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-muted-foreground">Harga Jual Eceran</span>
                    <span className="text-2xl font-black text-emerald-600">Rp 21.500</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-slate-200 text-foreground font-black hover:bg-slate-50">-</Button>
                    <span className="w-6 text-center font-black text-sm">1</span>
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-slate-200 text-foreground font-black hover:bg-slate-50">+</Button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </Card>
      )}

    </div>
  );
}

function FormBarang({ 
  onSave, 
  onScanTrigger, 
  scannedBarcode,
  editingProduct 
}: { 
  onSave: (prod: Product) => void; 
  onScanTrigger: () => void; 
  scannedBarcode: string;
  editingProduct?: Product | null;
}) {
  const [name, setName] = useState(editingProduct?.name ?? "");
  const [category, setCategory] = useState(editingProduct?.category ?? "Sembako");
  const [barcode, setBarcode] = useState(editingProduct?.barcode ?? "");
  const [buyPrice, setBuyPrice] = useState(editingProduct?.buyPrice ? String(editingProduct.buyPrice) : "");
  const [retailPrice, setRetailPrice] = useState(editingProduct?.retailPrice ? String(editingProduct.retailPrice) : "");
  const [wholesalePrice, setWholesalePrice] = useState(editingProduct?.wholesalePrice ? String(editingProduct.wholesalePrice) : "");
  const [stock, setStock] = useState(editingProduct?.stock ? String(editingProduct.stock) : "");
  const [minStock, setMinStock] = useState(editingProduct?.minStock ? String(editingProduct.minStock) : "");
  const [expiry, setExpiry] = useState(editingProduct?.expiry ?? "");
  const [unit, setUnit] = useState(editingProduct?.unit ?? "pcs");

  // Sync barcode field if scanner successfully scans
  useEffect(() => {
    if (scannedBarcode) {
      setBarcode(scannedBarcode);
    }
  }, [scannedBarcode]);

  const handleSubmit = () => {
    if (!name || !barcode) {
      alert("Nama barang dan barcode/SKU wajib diisi!");
      return;
    }
    const newProduct: Product = {
      id: editingProduct?.id || `p-${Math.floor(1000 + Math.random() * 9000)}`,
      name,
      category,
      sku: barcode.slice(0, 8),
      barcode,
      buyPrice: Number(buyPrice) || 0,
      retailPrice: Number(retailPrice) || 0,
      wholesalePrice: Number(wholesalePrice) || 0,
      specialPrice: Number(wholesalePrice) * 0.95, 
      stock: Number(stock) || 0,
      minStock: Number(minStock) || 5,
      unit,
      expiry: expiry || new Date().toISOString().split("T")[0],
      sold: editingProduct?.sold ?? 0
    };
    onSave(newProduct);
  };

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="px-5 pb-3">
        <p className="text-xl font-black tracking-tight text-foreground">
          {editingProduct ? "Edit Detail Barang" : "Tambah Barang Baru"}
        </p>
        <p className="text-xs font-semibold text-muted-foreground mt-0.5">
          {editingProduct ? "Perbarui informasi detail barang kelontong." : "Masukkan info barang kelontong dengan lengkap."}
        </p>
      </div>
      {/* Form fields - scrolls independently */}
      <div className="px-5 grid gap-3 sm:grid-cols-2">
        <Label className="grid gap-1.5">
          Nama Barang
          <Input placeholder="Beras Ramos 5kg" value={name} onChange={e => setName(e.target.value)} className="rounded-xl h-11" />
        </Label>
        <Label className="grid gap-1.5">
          Kategori
          <SelectField value={category} onChange={e => setCategory(e.target.value)}>
            {["Sembako", "Minuman", "Makanan", "Sabun", "Rokok", "Bumbu", "Lainnya"].map((cat) => (
              <option key={cat}>{cat}</option>
            ))}
          </SelectField>
        </Label>

        {/* Barcode input with scan trigger */}
        <Label className="grid gap-1.5">
          Barcode / SKU
          <div className="flex gap-2">
            <Input placeholder="899..." value={barcode} onChange={e => setBarcode(e.target.value)} className="rounded-xl h-11" />
            <Button type="button" variant="outline" className="rounded-xl border-emerald-100 hover:bg-emerald-50 px-3 font-bold h-11 flex gap-1 items-center shrink-0" onClick={onScanTrigger}>
              <Camera size={16} /> Scan
            </Button>
          </div>
        </Label>

        <Label className="grid gap-1.5">
          Satuan
          <SelectField value={unit} onChange={e => setUnit(e.target.value)}>
            {["pcs", "dus", "pack", "kg", "liter", "botol", "sachet"].map((u) => (
              <option key={u}>{u}</option>
            ))}
          </SelectField>
        </Label>
        <Label className="grid gap-1.5">
          Harga Beli (Modal)
          <Input type="number" inputMode="numeric" placeholder="Harga beli" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} className="rounded-xl h-11" />
        </Label>
        <Label className="grid gap-1.5">
          Harga Jual Eceran
          <Input type="number" inputMode="numeric" placeholder="Harga eceran" value={retailPrice} onChange={e => setRetailPrice(e.target.value)} className="rounded-xl h-11" />
        </Label>
        <Label className="grid gap-1.5">
          Harga Jual Grosir
          <Input type="number" inputMode="numeric" placeholder="Harga grosir" value={wholesalePrice} onChange={e => setWholesalePrice(e.target.value)} className="rounded-xl h-11" />
        </Label>
        <Label className="grid gap-1.5">
          Stok Awal
          <Input type="number" inputMode="numeric" placeholder="Stok awal" value={stock} onChange={e => setStock(e.target.value)} className="rounded-xl h-11" />
        </Label>
        <Label className="grid gap-1.5">
          Batas Stok Minimum
          <Input type="number" inputMode="numeric" placeholder="Batas minimum" value={minStock} onChange={e => setMinStock(e.target.value)} className="rounded-xl h-11" />
        </Label>
        <Label className="grid gap-1.5 sm:col-span-2">
          Tanggal Kadaluarsa
          <Input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} className="rounded-xl h-11" />
        </Label>
      </div>
      {/* Sticky save button */}
      <div className="px-5 pt-4 pb-5 mt-2 border-t bg-white sticky bottom-0">
        <Button size="lg" className="w-full rounded-xl h-12 text-sm font-black" onClick={handleSubmit}>
          {editingProduct ? "Simpan Perubahan" : "Simpan Barang"}
        </Button>
      </div>
    </div>
  );
}

function FormHutang({ liveCustomers, onSave }: { liveCustomers: any[]; onSave: () => void }) {
  const [customer, setCustomer] = useState(liveCustomers[0]?.name ?? "");
  const [product, setProduct] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");

  const handleSubmit = async () => {
    if (!customer || !amount) {
      alert("Nama pelanggan dan total hutang wajib diisi!");
      return;
    }
    const newDebt = {
      id: `D-${Math.floor(1000 + Math.random() * 9000)}`,
      customer,
      amount: Number(amount) || 0,
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("id-ID"),
      status: "belum lunas" as const,
      note,
    };
    await saveSupabaseDebt(newDebt as any);
    onSave();
  };


  return (
    <div className="flex flex-col gap-0">
      <div className="px-5 pb-3">
        <p className="text-xl font-black tracking-tight text-foreground">Catat Hutang Baru</p>
        <p className="text-xs font-semibold text-muted-foreground mt-0.5">Rekam belanja hutang dari pelanggan.</p>
      </div>
      <div className="px-5 grid gap-3">
        <Label className="grid gap-1.5">
          Pilih Pelanggan
          <SelectField value={customer} onChange={e => setCustomer(e.target.value)}>
            {liveCustomers.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </SelectField>
        </Label>
        <Label className="grid gap-1.5">
          Barang (opsional)
          <SelectField value={product} onChange={e => setProduct(e.target.value)}>
            <option value="">-- Pilih Barang --</option>
            {products.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
          </SelectField>
        </Label>
        <Label className="grid gap-1.5">
          Total Hutang
          <Input inputMode="numeric" placeholder="Rp 0" value={amount} onChange={e => setAmount(e.target.value)} className="rounded-xl h-11" />
        </Label>
        <Label className="grid gap-1.5">
          Jatuh Tempo
          <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="rounded-xl h-11" />
        </Label>
        <Label className="grid gap-1.5">
          Catatan
          <Textarea placeholder="Catatan tambahan..." value={note} onChange={e => setNote(e.target.value)} className="rounded-xl" />
        </Label>
      </div>
      <div className="px-5 pt-4 pb-5 mt-2 border-t bg-white sticky bottom-0">
        <Button size="lg" className="w-full rounded-xl h-12 text-sm font-black" onClick={handleSubmit}>
          Simpan Hutang
        </Button>
      </div>
    </div>
  );
}

function FormPelanggan({ onSave }: { onSave: () => void }) {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [type, setType] = useState("eceran");
  const [address, setAddress] = useState("");
  const [debtLimit, setDebtLimit] = useState("500000");

  const handleSubmit = async () => {
    if (!name || !whatsapp) {
      alert("Nama dan nomor WhatsApp wajib diisi!");
      return;
    }
    const raw = whatsapp.replace(/[^0-9]/g, "");
    const phone = raw.startsWith("0") ? `+62${raw.slice(1)}` : `+62${raw}`;
    const newCustomer = {
      id: `C-${Math.floor(1000 + Math.random() * 9000)}`,
      name,
      whatsapp: phone,
      type,
      address,
      debtLimit: Number(debtLimit) || 500000,
      totalSpend: 0,
    };
    await saveSupabaseCustomer(newCustomer as any);
    onSave();
  };

  return (
    <div className="flex flex-col gap-0">
      <div className="px-5 pb-3">
        <p className="text-xl font-black tracking-tight text-foreground">Tambah Pelanggan</p>
        <p className="text-xs font-semibold text-muted-foreground mt-0.5">Daftarkan pelanggan baru ke TokoAyu.</p>
      </div>
      <div className="px-5 grid gap-3">
        <Label className="grid gap-1.5">
          Nama Pelanggan
          <Input placeholder="Bu Sari" value={name} onChange={e => setName(e.target.value)} className="rounded-xl h-11" />
        </Label>
        <Label className="grid gap-1.5">
          Nomor WhatsApp
          <Input inputMode="tel" placeholder="081234567890" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="rounded-xl h-11" />
        </Label>
        <Label className="grid gap-1.5">
          Tipe Pelanggan
          <SelectField value={type} onChange={e => setType(e.target.value)}>
            <option value="eceran">Eceran (Retail)</option>
            <option value="grosir">Grosir (Wholesale)</option>
          </SelectField>
        </Label>
        <Label className="grid gap-1.5">
          Alamat
          <Textarea placeholder="Jl. Merpati No. 12..." value={address} onChange={e => setAddress(e.target.value)} className="rounded-xl" />
        </Label>
        <Label className="grid gap-1.5">
          Limit Hutang (Rp)
          <Input type="number" inputMode="numeric" placeholder="500000" value={debtLimit} onChange={e => setDebtLimit(e.target.value)} className="rounded-xl h-11" />
        </Label>
      </div>
      <div className="px-5 pt-4 pb-5 mt-2 border-t bg-white sticky bottom-0">
        <Button size="lg" className="w-full rounded-xl h-12 text-sm font-black" onClick={handleSubmit}>
          Simpan Pelanggan
        </Button>
      </div>
    </div>
  );
}

function MiniStat({ title, value, tone = "success" }: { title: string; value: string; tone?: "success" | "warning" | "danger" }) {
  const tones = {
    success: "bg-emerald-50 text-emerald-900",
    warning: "bg-yellow-50 text-yellow-950",
    danger: "bg-red-50 text-red-900",
  };
  return (
    <Card className={cn("rounded-2xl", tones[tone])}>
      <div className="p-5">
        <p className="font-black">{title}</p>
        <p className="mt-2 text-3xl font-black tracking-tight">{value}</p>
      </div>
    </Card>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 py-1", strong && "text-xl font-black text-primary")}>
      <span>{label}</span>
      <span className="text-right font-black">{value}</span>
    </div>
  );
}
