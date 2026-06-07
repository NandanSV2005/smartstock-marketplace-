# SmartStock Platform

SmartStock is a B2B wholesale marketplace and AI-driven inventory intelligence platform for small retailers and wholesalers. This codebase contains a Django backend and a React frontend (to be added) designed with a modular, scalable architecture.

## Backend (Django)

- Project: `smartstock_backend`
- Apps: `accounts`, `catalog`, `marketplace`, `orders`, `inventory`, `ai_engine`, `analytics`, `payments`, `notifications`, `admin_panel`, `common`
- Database: MySQL (configured via `DATABASES` in `smartstock_backend/settings.py`)

## 🚀 Getting Started

To run the project locally, you will need to start both the backend and the frontend in separate terminals.

### 1. Backend (Django)
Ensure you have Python installed and your MySQL database is running.

```bash
# Navigate to root and activate virtual environment
.venv\Scripts\activate

# Move to backend directory
cd smartstock_backend

# Run migrations (if needed)
python manage.py migrate

# Start the Django server
python manage.py runserver
```
*Backend URL: `http://127.0.0.1:8000/`*

---

### 2. Frontend (React + Vite)
Ensure you have Node.js installed.

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (only required the first time)
npm install

# Start the development server
npm run dev
```
*Frontend URL: `http://localhost:5173/`*

