# AutiGaze

AutiGaze adalah platform pembelajaran dan pendampingan untuk anak dengan spektrum autisme. Aplikasi ini menyediakan materi belajar interaktif, kuis, pencatatan progres, screening indikatif, berita, profil anak, serta panel admin untuk mengelola kursus dan berita.

> Screening di dalam aplikasi bersifat indikatif dan bukan pengganti diagnosis atau konsultasi tenaga medis/profesional.

## Fitur Utama

- Registrasi, login, dan autentikasi berbasis JWT.
- Profil anak dan pencatatan hasil tes/autism screening.
- Kategori dan kursus pembelajaran.
- Materi dengan avatar VRM, animasi, dan fitur estimasi gerakan tubuh.
- Kuis visual dan emosi beserta penyimpanan nilai.
- Pelacakan progres lesson, fokus, aktivitas harian, dan streak.
- Screening Gaze dan M-CHAT.
- Halaman berita edukatif.
- Panel admin untuk CRUD kursus dan berita.

## Teknologi

### Frontend

- React 19 dan React Router.
- Create React App dengan CRACO.
- Tailwind CSS, Radix UI, Lucide React, Framer Motion.
- Three.js dan `@pixiv/three-vrm` untuk avatar 3D.
- MediaPipe Tasks Vision untuk estimasi tubuh.
- Axios untuk komunikasi dengan backend.

### Backend

- Python, FastAPI, dan Uvicorn.
- MySQL dengan `aiomysql`.
- JWT untuk autentikasi dan Passlib untuk hashing password.
- Pydantic untuk validasi request.

## Struktur Project

```text
autigaze/
├── backend/
│   ├── server.py          # Aplikasi FastAPI dan seluruh route API
│   ├── database.sql       # Schema dan seed data awal MySQL
│   ├── requirements.txt   # Dependensi Python
│   └── .env               # Konfigurasi lokal backend, jangan di-commit
├── frontend/
│   ├── src/               # Komponen, halaman, context, asset, dan utilitas React
│   ├── public/            # Asset publik
│   ├── package.json       # Script dan dependensi frontend
│   └── .env               # Konfigurasi URL backend lokal
├── backend_test.py        # Smoke test API berbasis requests
└── README.md
```

## Prasyarat

Pastikan perangkat sudah memiliki:

- Python 3.10 atau lebih baru.
- Node.js 18 atau lebih baru dan npm/yarn.
- MySQL Server 8 atau kompatibel.
- Git, bila project diambil dari repository.

Pada Windows, MySQL dapat dijalankan melalui MySQL80 service atau aplikasi seperti XAMPP. Pastikan port `3306` tidak sedang digunakan aplikasi lain.

## Instalasi

### 1. Clone dan masuk ke project

```powershell
git clone <URL_REPOSITORY>
cd autigaze
```

Jika source code sudah tersedia, cukup jalankan `cd` ke folder project ini.

### 2. Siapkan database MySQL

Buat atau pastikan user MySQL yang digunakan memiliki izin untuk membuat database. Backend akan membuat database `autigaze`, tabel, dan seed data secara otomatis saat pertama kali dijalankan.

Konfigurasi default:

```text
Host:     127.0.0.1
Port:     3306
User:     root
Password: kosong
Database: autigaze
```

Jika konfigurasi MySQL berbeda, ubah nilai di `backend/.env`. Jangan memasukkan password atau JWT secret ke repository publik.

Untuk menjalankan schema secara manual, gunakan MySQL client:

```powershell
mysql -u root -p < backend/database.sql
```

Perintah manual tersebut opsional karena `server.py` juga menjalankan inisialisasi schema dan seed data.

### 3. Instal dependensi backend

PowerShell:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Jika PowerShell memblokir aktivasi environment, jalankan PowerShell sebagai user yang sesuai atau gunakan perintah langsung dari `.venv\Scripts\python.exe`.

Linux/macOS:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Instal dependensi frontend

Buka terminal baru dari root project:

```powershell
cd frontend
npm install
```

Project juga menyediakan `yarn.lock`. Bila menggunakan Yarn, gunakan satu package manager secara konsisten:

```powershell
yarn install
```

## Menjalankan Aplikasi

Jalankan MySQL terlebih dahulu, lalu buka dua terminal.

### Terminal 1: Backend

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

Backend tersedia di:

- API: `http://localhost:8000/api`
- Dokumentasi Swagger: `http://localhost:8000/docs`
- Dokumentasi ReDoc: `http://localhost:8000/redoc`

Gunakan `server:app`, bukan `main:app`, karena file aplikasi backend adalah `server.py`.

### Terminal 2: Frontend

```powershell
cd frontend
npm start
```

Frontend tersedia di `http://localhost:3000`.

Frontend membaca URL backend dari `frontend/.env`:

```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

Setelah mengubah file `.env`, restart dev server frontend agar nilai environment terbaca kembali.

## Konfigurasi Environment

### `backend/.env`

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=autigaze
CORS_ORIGINS=http://localhost:3000
JWT_SECRET=ganti-dengan-secret-random-yang-kuat
```

`CORS_ORIGINS` dapat berisi beberapa origin yang dipisahkan koma, misalnya `http://localhost:3000,http://127.0.0.1:3000`.

### `frontend/.env`

```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

Variabel React yang diawali `REACT_APP_` akan ikut masuk ke bundle browser. Jangan menyimpan credential rahasia di frontend.

## Alur Penggunaan Singkat

1. Buka `http://localhost:3000`.
2. Buat akun melalui halaman Sign Up atau login melalui Sign In.
3. Isi profil anak pada halaman Profile.
4. Pilih kategori dan kursus, lalu buka lesson.
5. Kerjakan kuis atau screening dan lihat hasilnya pada Progress.
6. Akun dengan `role=admin` dapat membuka `/admin` untuk mengelola kursus dan berita.

## API Utama

Semua endpoint berada di bawah prefix `/api`.

| Kelompok | Endpoint |
| --- | --- |
| Health/status | `GET /`, `GET /status`, `POST /status` |
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| Profil | `PUT /users/child-data`, `PUT /users/autism-test` |
| Konten | `GET /categories`, `GET /courses`, `GET /courses/{course_id}/chapters`, `GET /news` |
| Kuis | `GET /quizzes/{quiz_id}`, `POST /quizzes/{quiz_id}/attempts` |
| Progres | `POST /lessons/{lesson_id}/progress`, `GET /progress` |
| Screening | `GET /screening/definitions`, `POST /screening/sessions`, `GET /screening/sessions` |
| Admin kursus | `GET/POST /admin/courses`, `PUT/DELETE /admin/courses/{course_id}` |
| Admin berita | `GET/POST /admin/news`, `PUT/DELETE /admin/news/{article_id}` |

Endpoint yang membutuhkan login menggunakan header:

```http
Authorization: Bearer <JWT_TOKEN>
```

Endpoint `/admin/*` membutuhkan user dengan role `admin`.

## Testing dan Quality Check

### Test backend

Dari folder `backend` dan dalam virtual environment:

```powershell
pytest
```

Konfigurasi `backend/pytest.ini` menjalankan pytest dengan dua worker. Untuk menjalankan secara serial:

```powershell
pytest -n 0
```

`backend_test.py` adalah smoke test berbasis HTTP. Pastikan backend yang diuji sedang aktif dan periksa nilai `BASE_URL` di file tersebut sebelum menjalankannya.

### Test dan build frontend

```powershell
cd frontend
npm test
npm run build
```

Build production akan dibuat di `frontend/build`.

## Troubleshooting

### `Error loading ASGI app. Could not import module "main"`

Jalankan Uvicorn dari folder `backend` dengan:

```powershell
uvicorn server:app --reload
```

### Backend gagal terhubung ke MySQL

Periksa bahwa MySQL aktif, port sesuai, user memiliki izin, dan nilai `MYSQL_*` di `backend/.env` benar. Backend melakukan koneksi saat startup, sehingga error database akan menghentikan proses Uvicorn.

### Frontend menampilkan Network Error

Pastikan backend aktif di port `8000`, nilai `REACT_APP_BACKEND_URL` benar, dan frontend sudah direstart setelah `.env` diubah.

### Port sudah digunakan

Frontend dapat dijalankan di port lain dengan `set PORT=3001` sebelum `npm start` pada Windows. Untuk backend, gunakan misalnya `uvicorn server:app --reload --port 8001`, kemudian sesuaikan `REACT_APP_BACKEND_URL`.

### Data awal tidak muncul

Pastikan `backend/database.sql` dapat dibaca dan user MySQL memiliki izin `CREATE`, `ALTER`, `INSERT`, dan `SELECT` pada database. Seed data memakai `INSERT IGNORE`, sehingga data yang sudah ada tidak ditimpa.

## Catatan Keamanan

- Ganti `JWT_SECRET` untuk setiap environment selain development.
- Jangan commit file `.env`, password database, token, atau data pengguna.
- Gunakan `CORS_ORIGINS` yang spesifik saat deployment; hindari wildcard `*` untuk production.
- Screening dan hasil aplikasi tidak boleh diposisikan sebagai diagnosis medis.
