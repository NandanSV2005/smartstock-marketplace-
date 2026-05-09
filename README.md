# SmartStock Platform

SmartStock is a B2B wholesale marketplace and AI-driven inventory intelligence platform for small retailers and wholesalers. This codebase contains a Django backend and a React frontend (to be added) designed with a modular, scalable architecture.

## Backend (Django)

- Project: `smartstock_backend`
- Apps: `accounts`, `catalog`, `marketplace`, `orders`, `inventory`, `ai_engine`, `analytics`, `payments`, `notifications`, `admin_panel`, `common`
- Database: MySQL (configured via `DATABASES` in `smartstock_backend/settings.py`)

### Setup

1. Backend (Django)
Open a terminal in the root directory (Smartstock_Marketplace):
# 1. Activate the virtual environment
.venv\Scripts\activate

# 2. Navigate to the backend folder
cd smartstock_backend

# 3. (Optional) Run migrations to ensure the database is up to date
python manage.py migrate

# 4. Start the server
python manage.py runserver


2. Frontend (React/Vite)
Open a new terminal in the root directory:
# 1. Navigate to the frontend folder
cd frontend

# 2. (If not already installed) Install dependencies
# npm install

# 3. Start the development server
npm run dev


