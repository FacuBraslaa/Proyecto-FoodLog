# Proyecto-FoodLog

Estructura en dos carpetas:

```
Proyecto-FoodLog/
  frontend/   # React + Vite
  backend/    # API Express + Postgres
```

## Cómo levantar

Backend:
1. `cd backend`
2. `npm install` (primera vez)
3. `npm run dev` (http://localhost:3000)

Frontend:
1. `cd frontend`
2. `npm install` (primera vez)
3. `npm run dev` (http://localhost:5173)

Configura variables en `backend/.env` para la base de datos y en `frontend/.env` `VITE_API_BASE` si no usas la API local.
