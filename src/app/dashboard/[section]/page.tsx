"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  BadgePercent,
  BarChart3,
  Camera,
  CheckCircle2,
  Droplet,
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
  Users,
  WalletCards,
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
import { customers, debts, products, promos, reportChart, transactions, type Product } from "@/lib/dummy-data";
import { cn, rupiah } from "@/lib/utils";
import {
  getSupabaseProducts,
  getSupabaseCustomers,
  getSupabaseDebts,
  saveSupabaseTransaction,
  updateSupabaseProduct,
  saveSupabaseCustomer,
  saveSupabaseDebt,
  saveSupabaseProduct
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
  const discount = subtotal > 15000 ? 5000 : 0;
  const total = Math.max(subtotal - discount, 0);
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
            <Row label="Subtotal" value={rupiah(subtotal)} />
            <Row label="Diskon" value={`-${rupiah(discount)}`} />
            <Separator className="my-2" />
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

  const filtered = localProducts.filter(p => {
    const kw = search.trim().toLowerCase();
    if (!kw) return true;
    return p.name.toLowerCase().includes(kw) || p.barcode.includes(kw) || p.sku.toLowerCase().includes(kw);
  });

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
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((product) => {
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
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="p-6 text-center font-bold text-muted-foreground">
                    Barang tidak ditemukan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
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
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {customers.map((customer) => (
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
  );
}

function HutangPage() {
  const [addOpen, setAddOpen] = useState(false);

  const sendDebtReminder = (customerName: string, amount: number, dueDate: string) => {
    const customer = customers.find(c => c.name === customerName);
    const phone = customer ? customer.whatsapp : "";
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
            <p className="text-xs font-semibold text-muted-foreground">Kirim pengingat langsung ke nomor WhatsApp.</p>
          </div>
          <Button className="rounded-xl shadow-md text-sm font-extrabold" onClick={() => setAddOpen(true)}>
            <Plus size={20} /> Catat Hutang
          </Button>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {debts.map((debt) => (
          <Card key={debt.id} className="rounded-2xl border bg-white shadow-sm transition hover:shadow-md hover:scale-[1.01]">
            <div className="grid gap-4 p-5">
              <div className="flex items-start justify-between gap-2 border-b border-dashed pb-2.5">
                <div>
                  <p className="text-lg font-black text-foreground">{debt.customer}</p>
                  <p className="text-xs font-semibold text-muted-foreground">Jatuh tempo {debt.dueDate}</p>
                </div>
                <Badge variant={debt.status === "belum lunas" ? "danger" : "warning"}>{debt.status}</Badge>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground">Total Hutang</p>
                <p className="text-3xl font-black tracking-tight text-red-600">{rupiah(debt.amount)}</p>
              </div>
              {debt.note && (
                <p className="text-xs font-semibold text-muted-foreground bg-muted p-2 rounded-lg">
                  Catatan: {debt.note}
                </p>
              )}
              <Button
                className="rounded-xl h-11 text-xs font-extrabold bg-emerald-500/10 text-primary border-emerald-100 hover:bg-emerald-100 mt-2"
                onClick={() => sendDebtReminder(debt.customer, debt.amount, debt.dueDate)}
              >
                <Send size={16} /> Ingatkan WhatsApp
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={addOpen}>
        <DialogContent onClose={() => setAddOpen(false)}>
          <FormHutang onSave={() => setAddOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BelanjaStokPage() {
  const lowStock = products.filter((item) => item.stock <= item.minStock);
  return (
    <div className="grid gap-4">
      {lowStock.map((product) => (
        <Card key={product.id} className="rounded-2xl border bg-white shadow-sm">
          <div className="grid gap-4 p-6 md:grid-cols-[1fr_280px] md:items-center">
            <div>
              <p className="text-xl font-black text-foreground">{product.name}</p>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                Stok {product.stock}, minimum {product.minStock}. Saran beli <span className="font-extrabold text-foreground">{Math.max(product.minStock * 2 - product.stock, product.minStock)} {product.unit}</span>.
              </p>
              <Badge variant="warning" className="mt-3">Cek harga jual jika harga beli naik</Badge>
            </div>
            <div className="grid gap-2 border-t pt-3 md:border-t-0 md:pt-0">
              <Input placeholder="Stok masuk" className="rounded-xl" />
              <Input placeholder="Harga beli baru" className="rounded-xl" />
              <Button className="rounded-xl text-sm font-black">Tandai Sudah Dibeli</Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function PromoPage() {
  const sharePromo = (name: string, price: number) => {
    const text = `*PROMO MENARIK TOKOAYU!* 🎉\nDapatkan *${name}* seharga hanya *${rupiah(price)}*!\n\nBuruan belanja sekarang di TokoAyu sebelum kehabisan! 🛒`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {promos.map((promo) => (
        <Card key={promo.name} className="rounded-2xl border bg-white shadow-sm transition hover:shadow-md hover:scale-[1.01]">
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
  );
}

function LaporanPage() {
  const totalDebt = debts.reduce((sum, debt) => sum + debt.amount, 0);
  
  const reportTable = [
    { day: "Senin", omzet: 820000, untung: 112000, transactions: 42, status: "Tercapai" },
    { day: "Selasa", omzet: 940000, untung: 132000, transactions: 48, status: "Tercapai" },
    { day: "Rabu", omzet: 760000, untung: 98000, transactions: 35, status: "Kurang" },
    { day: "Kamis", omzet: 1210000, untung: 176000, transactions: 61, status: "Melampaui" },
    { day: "Jumat", omzet: 1080000, untung: 151000, transactions: 54, status: "Tercapai" },
    { day: "Sabtu", omzet: 1340000, untung: 203000, transactions: 72, status: "Melampaui" },
    { day: "Minggu", omzet: 690000, untung: 87000, transactions: 29, status: "Kurang" },
  ];

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-3">
        <MiniStat title="Omzet minggu ini" value={rupiah(6840000)} />
        <MiniStat title="Keuntungan" value={rupiah(959000)} tone="warning" />
        <MiniStat title="Hutang belum dibayar" value={rupiah(totalDebt)} tone="danger" />
      </div>
      
      <Card className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-b">
          <CardTitle className="flex items-center gap-2 text-base font-black">
            <BarChart3 size={22} className="text-primary" /> Grafik Penjualan
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl border-emerald-100 text-xs font-bold h-9 shadow-none"><FileDown size={16} /> Excel</Button>
            <Button variant="outline" className="rounded-xl border-emerald-100 text-xs font-bold h-9 shadow-none"><FileDown size={16} /> PDF</Button>
          </div>
        </CardHeader>
        <CardContent className="h-80 p-5">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={reportChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis tickFormatter={(value) => `${Number(value) / 1000}rb`} />
              <Tooltip formatter={(value) => rupiah(Number(value))} />
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
            <Users size={19} className="text-emerald-600" /> Rincian Penjualan Harian
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b bg-muted/40 font-extrabold text-muted-foreground uppercase text-[10px] tracking-wider">
                <th className="px-6 py-4">Hari</th>
                <th className="px-6 py-4 text-center">Transaksi</th>
                <th className="px-6 py-4 text-right">Omzet</th>
                <th className="px-6 py-4 text-right">Keuntungan</th>
                <th className="px-6 py-4 text-center">Margin %</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reportTable.map((row) => {
                const margin = ((row.untung / row.omzet) * 100).toFixed(1);
                return (
                  <tr key={row.day} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4 font-black text-foreground">{row.day}</td>
                    <td className="px-6 py-4 text-center font-bold text-muted-foreground">{row.transactions} kali</td>
                    <td className="px-6 py-4 text-right font-black text-foreground">{rupiah(row.omzet)}</td>
                    <td className="px-6 py-4 text-right font-black text-emerald-600">{rupiah(row.untung)}</td>
                    <td className="px-6 py-4 text-center font-extrabold text-muted-foreground">{margin}%</td>
                    <td className="px-6 py-4 text-center">
                      {row.status === "Melampaui" && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full ring-1 ring-emerald-100">
                          🔥 Melampaui
                        </span>
                      )}
                      {row.status === "Tercapai" && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full ring-1 ring-blue-100">
                          ✅ Tercapai
                        </span>
                      )}
                      {row.status === "Kurang" && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full ring-1 ring-amber-100">
                          ⚠️ Kurang
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function PengaturanPage() {
  return (
    <div className="grid gap-5">
      <Card className="rounded-2xl border bg-white shadow-sm">
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          {["Nama warung", "Logo warung", "Alamat warung", "Nomor WhatsApp", "Printer struk", "Pajak / diskon"].map((label) => (
            <Label key={label} className="grid gap-2">
              {label}
              <Input placeholder={label} className="rounded-xl" />
            </Label>
          ))}
        </div>
      </Card>
      <Card className="rounded-2xl border bg-white shadow-sm">
        <CardHeader className="px-5 py-4 border-b">
          <CardTitle className="flex items-center gap-2 text-base font-black"><Settings size={20} className="text-primary" /> Tampilan dan Akses</CardTitle>
        </CardHeader>
        <div className="grid gap-4 sm:grid-cols-3 p-6">
          {["Font normal", "Font besar", "Font sangat besar"].map((label, index) => (
            <Button key={label} variant={index === 1 ? "default" : "outline"} className="rounded-xl font-bold h-11">{label}</Button>
          ))}
        </div>
      </Card>
    </div>
  );
}

function FormBarang({ onSave, onScanTrigger, scannedBarcode }: { onSave: (prod: Product) => void; onScanTrigger: () => void; scannedBarcode: string }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Sembako");
  const [barcode, setBarcode] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [retailPrice, setRetailPrice] = useState("");
  const [wholesalePrice, setWholesalePrice] = useState("");
  const [stock, setStock] = useState("");
  const [minStock, setMinStock] = useState("");
  const [expiry, setExpiry] = useState("");
  const [unit, setUnit] = useState("pcs");

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
      id: `p-${Math.floor(1000 + Math.random() * 9000)}`,
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
      sold: 0
    };
    onSave(newProduct);
  };

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="px-5 pb-3">
        <p className="text-xl font-black tracking-tight text-foreground">Tambah Barang Baru</p>
        <p className="text-xs font-semibold text-muted-foreground mt-0.5">Masukkan info barang kelontong dengan lengkap.</p>
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
          Simpan Barang
        </Button>
      </div>
    </div>
  );
}

function FormHutang({ onSave }: { onSave: () => void }) {
  return (
    <div className="grid gap-4 p-5 pt-0">
      <div>
        <p className="text-2xl font-black tracking-tight text-foreground">Catat Hutang Baru</p>
        <p className="text-sm font-semibold text-muted-foreground">Rekam belanja hutang dari pelanggan.</p>
      </div>
      <div className="grid gap-4">
        <Label className="grid gap-2">
          Pilih pelanggan
          <SelectField defaultValue="Bu Sari">{customers.map((customer) => <option key={customer.id}>{customer.name}</option>)}</SelectField>
        </Label>
        <Label className="grid gap-2">
          Pilih barang
          <SelectField defaultValue="Beras Ramos 5kg">{products.map((product) => <option key={product.id}>{product.name}</option>)}</SelectField>
        </Label>
        <Label className="grid gap-2">
          Total hutang
          <Input placeholder="Rp0" className="rounded-xl" />
        </Label>
        <Label className="grid gap-2">
          Jatuh tempo
          <Input type="date" className="rounded-xl" />
        </Label>
        <Label className="grid gap-2">
          Catatan
          <Textarea placeholder="Catatan tambahan" className="rounded-xl" />
        </Label>
      </div>
      <Button size="lg" className="rounded-xl h-12 text-sm font-black mt-2" onClick={onSave}>
        Simpan Hutang
      </Button>
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
