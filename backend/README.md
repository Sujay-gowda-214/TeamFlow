# TeamFlow backend

## Local development (SQLite)

From this directory, install dependencies and initialize the database:

```powershell
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py check
python manage.py runserver 127.0.0.1:8000
```

The backend uses SQLite by default and serves the API under `/api/`.

## Optional MySQL setup

Install `requirements-mysql.txt` and configure `USE_MYSQL=True` plus the `DB_*`
settings in `.env`. On Windows, `mysqlclient` may require Microsoft C++ Build
Tools if a compatible wheel is unavailable.

## Tests

```powershell
python manage.py test
```
