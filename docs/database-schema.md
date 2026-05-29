# Database Schema Sederhana

Schema ini bisa dipakai sebagai dasar untuk Laravel API, Supabase, atau MySQL.

## users

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| id | uuid / bigint | Primary key |
| name | varchar | Nama pengguna |
| phone | varchar | Nomor WhatsApp |
| role | enum | owner, kasir, admin_stok |
| password_hash | varchar | Untuk login |
| is_active | boolean | Status pengguna |
| created_at | timestamp |  |
| updated_at | timestamp |  |

## stores

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| id | uuid / bigint | Primary key |
| name | varchar | Nama warung |
| logo_url | varchar | Logo |
| address | text | Alamat |
| whatsapp | varchar | Nomor WA warung |
| printer_name | varchar | Printer struk |
| tax_percent | decimal | Pajak opsional |
| default_discount | decimal | Diskon default |

## products

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| id | uuid / bigint | Primary key |
| name | varchar | Nama barang |
| category_id | uuid / bigint | Relasi kategori |
| sku | varchar | SKU |
| barcode | varchar | Barcode |
| buy_price | decimal | Harga beli |
| retail_price | decimal | Harga eceran |
| wholesale_price | decimal | Harga grosir |
| stock | decimal | Stok saat ini |
| min_stock | decimal | Stok minimum |
| unit | enum | pcs, dus, pack, kg, liter, botol, sachet |
| expiry_date | date | Kadaluarsa |
| photo_url | varchar | Foto barang |
| is_active | boolean | Status |

## customers

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| id | uuid / bigint | Primary key |
| name | varchar | Nama pelanggan |
| whatsapp | varchar | Nomor WA |
| address | text | Alamat |
| type | enum | biasa, langganan, grosir |
| debt_limit | decimal | Limit hutang |
| special_price_enabled | boolean | Harga khusus |
| is_active | boolean | Status |

## transactions

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| id | uuid / bigint | Primary key |
| invoice_number | varchar | Nomor struk |
| customer_id | uuid / bigint | Nullable |
| cashier_id | uuid / bigint | User kasir |
| subtotal | decimal | Sebelum diskon |
| discount | decimal | Diskon manual |
| total | decimal | Total akhir |
| paid_amount | decimal | Uang diterima |
| change_amount | decimal | Kembalian |
| payment_method | enum | tunai, qris, transfer, hutang |
| status | enum | selesai, hutang, batal |
| created_at | timestamp | Waktu transaksi |

## transaction_items

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| id | uuid / bigint | Primary key |
| transaction_id | uuid / bigint | Relasi transaksi |
| product_id | uuid / bigint | Relasi barang |
| qty | decimal | Jumlah |
| unit_price | decimal | Harga saat transaksi |
| buy_price | decimal | Harga modal saat transaksi |
| discount | decimal | Diskon item |
| total | decimal | Total item |

## stock_movements

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| id | uuid / bigint | Primary key |
| product_id | uuid / bigint | Relasi barang |
| type | enum | masuk, keluar, koreksi |
| qty | decimal | Jumlah |
| old_stock | decimal | Stok sebelum |
| new_stock | decimal | Stok sesudah |
| note | text | Catatan |
| reference_type | varchar | transaksi, belanja_stok, koreksi |
| reference_id | uuid / bigint | ID asal |
| created_by | uuid / bigint | User |
| created_at | timestamp |  |

## debts

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| id | uuid / bigint | Primary key |
| customer_id | uuid / bigint | Pelanggan |
| transaction_id | uuid / bigint | Nullable |
| amount | decimal | Total hutang |
| paid_amount | decimal | Total dibayar |
| due_date | date | Jatuh tempo |
| status | enum | belum_lunas, sebagian, lunas |
| note | text | Catatan |
| created_at | timestamp |  |

## debt_payments

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| id | uuid / bigint | Primary key |
| debt_id | uuid / bigint | Relasi hutang |
| amount | decimal | Pembayaran |
| payment_method | enum | tunai, qris, transfer |
| note | text | Catatan |
| created_by | uuid / bigint | User |
| created_at | timestamp |  |

## promotions

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| id | uuid / bigint | Primary key |
| name | varchar | Nama promo |
| type | enum | diskon_barang, beli_gratis, paket, harga_grosir |
| start_date | date | Mulai |
| end_date | date | Selesai |
| config_json | json | Detail aturan promo |
| is_active | boolean | Status |

## offline_queue

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| id | uuid / bigint | Primary key |
| action | varchar | create_transaction, update_stock, debt_payment |
| payload_json | json | Data yang belum tersinkron |
| status | enum | pending, synced, failed |
| created_at | timestamp |  |
| synced_at | timestamp | Nullable |
