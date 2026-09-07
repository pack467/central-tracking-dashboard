# Worker Python Service

Direktori ini disiapkan untuk service background worker, telemetry collector, data sync, atau automated task runner berbasis Python yang akan dikembangkan oleh tim kolaborator.

## 📌 Rencana & Arsitektur
- **Tujuan**: Menjalankan proses background seperti polling status server, monitoring telemetri, pengolahan metrik berkala, serta alerting ke sistem dashboard.
- **Prasyarat Sistem**:
  - Python >= 3.10
  - Virtual Environment (`venv`)

## 🚀 Panduan Setup (Akan Dilengkapi)
```bash
# 1. Buat virtual environment
python -m venv venv

# 2. Aktifkan venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# 3. Pasang dependensi
pip install -r requirements.txt

# 4. Jalankan worker
python main.py
```
