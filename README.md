# Smart-Emergency-Dispatch-Optimization-System

## Backend setup

This project uses Django (the backend lives in the `backend/project` folder). The instructions below cover a typical local development setup on Windows PowerShell.

Prerequisites
- Python 3.10+ installed and on PATH
- MySQL server running (default port 3306)

Quick steps (PowerShell)

1. Open a PowerShell terminal in the repository root.

2. Create and activate a virtual environment and navigate to backend directory:


```powershell
python -m venv .venv
# activate the venv in PowerShell
.\.venv\Scripts\Activate.ps1
cd backend
```

If you see an execution policy error when activating, run PowerShell as administrator and run:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

3. Upgrade pip and install dependencies. You can install directly from the included `requirements.txt` or install the packages manually:

install from requirements.txt (recommended):

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```





## Environment Setup

For security, sensitive data like database credentials and the Django secret key should be stored in environment variables or a `.env` file (not in version control). The project includes a `.env.example` file you can use as a template:

1. Copy the example file to create your `.env`:

```powershell
# From the backend directory
Copy-Item .env.example .env
```

2. Edit `.env` with your actual values:
```ini
# Django settings
DEBUG=True

# Database configuration
DB_NAME=emergency_dispatcher
DB_USER=youruser
DB_PASSWORD=yourpassword
DB_HOST=localhost
DB_PORT=3306
```

3. Install python-dotenv if not already installed:
```powershell
pip install python-dotenv
```
##  Running the backend Server
1. Run migrations if any change to apps

```powershell
# from root directory
cd backend/project
python manage.py migrate

```
2. Run backend srever

```powershell
# from backend/project directory
python manage.py runserver
```


3. Visit http://127.0.0.1:8000/ to see the running backend.

Notes
- The project settings currently list `django==5.2.8` and use `django.db.backends.mysql`. Adjust package versions as needed.
- Never commit `.env` files containing real credentials. The `.env` file is included in `.gitignore`.
- For production deployment, use secure methods to manage environment variables appropriate for your hosting platform.

