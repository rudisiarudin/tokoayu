# Rekomendasi Pengembangan

## MVP 1

- Login sederhana dan role Owner/Kasir/Admin Stok.
- CRUD barang.
- Kasir dengan pencarian barang dan keranjang.
- Metode pembayaran Tunai, QRIS, Transfer, Hutang.
- Transaksi mengurangi stok otomatis.
- Catat hutang dan pembayaran sebagian.
- Dashboard harian.
- Laporan harian sederhana.
- PWA installable dan cache halaman utama.

## MVP 2

- Barcode scanner kamera.
- Print struk thermal.
- Kirim struk dan tagihan via WhatsApp.
- Import barang dari Excel.
- Export laporan ke Excel dan PDF.
- Reminder stok minimum.
- Reminder hutang jatuh tempo.
- Harga eceran, grosir, dan pelanggan khusus.

## Versi Lanjutan

- Sinkronisasi offline penuh dengan IndexedDB.
- Multi cabang atau multi perangkat kasir.
- Promo otomatis di kasir.
- Paket sembako dan bundling barang.
- Analisis barang laris, lambat laku, sering habis.
- Backup otomatis ke cloud.
- Integrasi Laravel API, Supabase, atau MySQL.
- Audit log untuk perubahan harga dan stok.
- Dashboard owner dengan perbandingan mingguan dan bulanan.

## Backend yang Disarankan

Laravel API + MySQL cocok bila warung ingin backend sendiri, role pengguna detail, dan printer/WhatsApp gateway lokal.

Supabase cocok bila ingin cepat online, auth siap pakai, realtime sync, dan database PostgreSQL tanpa banyak setup server.

## Catatan UX Penting

- Jangan memakai istilah teknis seperti inventory, receivable, settlement, atau sync conflict di tampilan utama.
- Gunakan kata sederhana: barang, stok, hutang, bayar, simpan, cetak, kirim WA.
- Konfirmasi sebelum hapus data.
- Pesan sukses harus jelas, misalnya "Transaksi berhasil disimpan".
- Peringatan besar untuk stok habis, hutang jatuh tempo, dan transaksi offline belum terkirim.
