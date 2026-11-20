YAHATA PRODUCTION & DOWNTIME MONITORING SYSTEM

CARA MENJALANKAN (React + Vite)
1. Butuh Node.js 18+.
2. npm install
3. npm run dev      -> buka http://localhost:5173
4. npm run build    -> hasil siap pakai di folder dist/ (npm run preview untuk mencoba)
5. npm run check    -> self-check logika perhitungan KPI.

STRUKTUR
- src/config.js     : shift, target, kategori downtime (dulu data.js).
- src/lib.js        : perhitungan KPI, format, LocalStorage.
- src/pages/*.jsx   : Dashboard, Production, Downtime, Shift & PIC, Reports.
- legacy/           : versi HTML/JS lama, hapus jika versi React sudah dipastikan benar.

FITUR PROTOTYPE
- Dashboard dinamis: status mesin, shift aktif, PIC, actual, productivity, efficiency, downtime.
- Input satu catatan per tanggal dan shift: PIC saat awal shift, Actual saat akhir shift (edit catatan yang sama).
- Grafik Target vs Actual per Shift dan tren produksi 7 hari.
- Riwayat produksi harian.
- Pencatatan downtime dengan kategori, durasi, filter, edit, dan hapus.
- Reports berdasarkan rentang tanggal, export CSV, dan cetak.
- Data tersimpan di LocalStorage browser dan tidak dihapus saat tanggal berganti.

ATURAN SEMENTARA YANG DIGUNAKAN
- Shift 1: 06:00-15:00.
- Shift 2: 14:00-23:00.
- Handover/briefing: 14:00-14:15; downtime dalam periode briefing dibebankan ke Shift 1.
- Mesin di luar jadwal: sebelum 06:00 dan mulai 23:00.
- Break total 60 menit dan waktu efektif 480 menit per shift.
- Target 10.000 pcs/shift masih asumsi prototype (1.250 pcs/jam x 8 jam efektif), perlu konfirmasi PIC.
- Efficiency baru dihitung setelah Actual shift tersebut diinput, agar tidak tampil 100% palsu saat shift belum selesai.
- Kategori 1 Running Production tidak dihitung sebagai downtime.

CATATAN
- Ini prototype lokal satu browser/perangkat. LocalStorage tidak menyinkronkan data ke komputer lain.
- Data pada browser disimpan terpisah menurut profil browser. Jangan gunakan data produksi perusahaan sungguhan tanpa izin perusahaan.
- Jadwal hari Jumat, aturan detail overlap 14:15-15:00, target produksi, dan kategori downtime perlu dikonfirmasi dengan PIC.
- Tidak ada integrasi langsung ke mesin/PLC. Angka produksi dimasukkan manual dari counter bawaan mesin.
