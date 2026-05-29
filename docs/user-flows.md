# User Flow

## Alur Kasir

1. Kasir membuka halaman Kasir.
2. Kasir mencari barang atau scan barcode.
3. Barang masuk ke keranjang.
4. Kasir mengatur jumlah dengan tombol plus dan minus besar.
5. Sistem menghitung subtotal, diskon, total, dan kembalian.
6. Kasir memilih Tunai, QRIS, Transfer, atau Hutang.
7. Jika Tunai, kasir input uang diterima.
8. Jika Hutang, kasir memilih pelanggan.
9. Transaksi disimpan.
10. Stok barang otomatis berkurang.
11. Struk bisa dicetak, dikirim ke WhatsApp, atau disimpan.

## Alur Stok

1. Owner atau Admin Stok menambahkan barang.
2. Sistem menyimpan harga beli, harga jual, stok, stok minimum, satuan, barcode, dan kadaluarsa.
3. Saat transaksi terjadi, stok berkurang otomatis.
4. Jika stok berada di bawah stok minimum, sistem menampilkan peringatan.
5. Barang muncul di halaman Belanja Stok.
6. Saat stok baru dibeli, owner input stok masuk dan harga beli baru.
7. Jika harga beli naik, sistem memberi saran penyesuaian harga jual.

## Alur Hutang

1. Pelanggan membeli barang dengan metode Hutang.
2. Sistem membuat transaksi dan catatan hutang.
3. Owner melihat daftar pelanggan yang punya hutang.
4. Pelanggan bisa bayar sebagian atau lunas.
5. Sistem mencatat riwayat pembayaran.
6. Owner bisa kirim pengingat WhatsApp dengan template otomatis.

## Alur Offline

1. Saat internet putus, transaksi sederhana tetap bisa dibuat.
2. Data disimpan di IndexedDB/local storage sebagai antrean sinkronisasi.
3. Saat internet kembali, aplikasi mengirim transaksi, perubahan stok, dan pembayaran hutang ke backend.
4. Jika ada konflik stok atau harga, aplikasi memberi tanda untuk dicek owner.

## Hak Akses

Owner:

- Bisa akses semua fitur.
- Bisa melihat laporan keuntungan.
- Bisa mengatur harga, pengguna, backup, dan pengaturan warung.

Kasir:

- Bisa transaksi.
- Bisa mencatat hutang.
- Tidak bisa melihat keuntungan detail.
- Tidak bisa mengubah harga modal.

Admin Stok:

- Bisa mengelola barang dan stok.
- Bisa input belanja stok.
- Tidak bisa mengubah laporan keuangan.
