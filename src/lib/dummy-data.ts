export type Product = {
  id: string;
  name: string;
  category: string;
  sku: string;
  barcode: string;
  buyPrice: number;
  retailPrice: number;
  wholesalePrice: number;
  specialPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  expiry: string;
  sold: number;
};

export const products: Product[] = [
  {
    id: "p1",
    name: "Beras Ramos 5kg",
    category: "Sembako",
    sku: "BR-5KG",
    barcode: "8991001122334",
    buyPrice: 65000,
    retailPrice: 72000,
    wholesalePrice: 69000,
    specialPrice: 68000,
    stock: 8,
    minStock: 10,
    unit: "pack",
    expiry: "2026-12-20",
    sold: 38,
  },
  {
    id: "p2",
    name: "Minyak Goreng 1L",
    category: "Sembako",
    sku: "MYK-1L",
    barcode: "8992002233445",
    buyPrice: 14200,
    retailPrice: 17000,
    wholesalePrice: 16000,
    specialPrice: 15500,
    stock: 18,
    minStock: 12,
    unit: "botol",
    expiry: "2026-09-12",
    sold: 45,
  },
  {
    id: "p3",
    name: "Gula Pasir 1kg",
    category: "Sembako",
    sku: "GL-1KG",
    barcode: "8993003344556",
    buyPrice: 15000,
    retailPrice: 18000,
    wholesalePrice: 17000,
    specialPrice: 16500,
    stock: 6,
    minStock: 15,
    unit: "kg",
    expiry: "2027-01-18",
    sold: 29,
  },
  {
    id: "p4",
    name: "Kopi Sachet",
    category: "Minuman",
    sku: "KOP-SCT",
    barcode: "8994004455667",
    buyPrice: 1200,
    retailPrice: 2000,
    wholesalePrice: 1800,
    specialPrice: 1700,
    stock: 72,
    minStock: 40,
    unit: "sachet",
    expiry: "2026-07-03",
    sold: 61,
  },
  {
    id: "p5",
    name: "Telur Ayam 1kg",
    category: "Segar",
    sku: "TLR-1KG",
    barcode: "8995005566778",
    buyPrice: 26500,
    retailPrice: 31000,
    wholesalePrice: 29500,
    specialPrice: 29000,
    stock: 4,
    minStock: 8,
    unit: "kg",
    expiry: "2026-06-04",
    sold: 24,
  },
];

export const customers = [
  {
    id: "c1",
    name: "Bu Sari",
    whatsapp: "081234567890",
    address: "Jl. Mawar 12",
    type: "langganan",
    totalSpend: 2450000,
    debtLimit: 500000,
    active: true,
  },
  {
    id: "c2",
    name: "Pak Budi",
    whatsapp: "081298765432",
    address: "Kios Pasar Blok C",
    type: "grosir",
    totalSpend: 7100000,
    debtLimit: 1500000,
    active: true,
  },
  {
    id: "c3",
    name: "Mbak Rina",
    whatsapp: "081377788899",
    address: "Gang Melati",
    type: "biasa",
    totalSpend: 640000,
    debtLimit: 200000,
    active: true,
  },
];

export const debts = [
  {
    id: "d1",
    customer: "Bu Sari",
    amount: 182000,
    dueDate: "2026-05-31",
    status: "sebagian",
    note: "Sudah bayar Rp50.000",
  },
  {
    id: "d2",
    customer: "Mbak Rina",
    amount: 76000,
    dueDate: "2026-05-29",
    status: "belum lunas",
    note: "Belanja sembako",
  },
];

export const transactions = [
  { id: "TRX-1028", time: "08:12", customer: "Umum", total: 84000, profit: 13500, method: "Tunai" },
  { id: "TRX-1029", time: "09:30", customer: "Pak Budi", total: 241000, profit: 28000, method: "QRIS" },
  { id: "TRX-1030", time: "10:08", customer: "Bu Sari", total: 132000, profit: 18000, method: "Hutang" },
];

export const stockHistory = [
  { product: "Beras Ramos 5kg", type: "Masuk", qty: 20, date: "2026-05-25" },
  { product: "Gula Pasir 1kg", type: "Keluar", qty: 9, date: "2026-05-28" },
  { product: "Telur Ayam 1kg", type: "Keluar", qty: 6, date: "2026-05-28" },
];

export const promos = [
  { name: "Paket Hemat Sembako", type: "Paket", price: 124000, active: true },
  { name: "Beli 10 Kopi Gratis 1", type: "Bonus", price: 20000, active: true },
  { name: "Diskon Minyak Grosir", type: "Grosir", price: 16000, active: true },
];

export const reportChart = [
  { day: "Sen", omzet: 820000, untung: 112000 },
  { day: "Sel", omzet: 940000, untung: 132000 },
  { day: "Rab", omzet: 760000, untung: 98000 },
  { day: "Kam", omzet: 1210000, untung: 176000 },
  { day: "Jum", omzet: 1080000, untung: 151000 },
  { day: "Sab", omzet: 1340000, untung: 203000 },
  { day: "Min", omzet: 690000, untung: 87000 },
];
