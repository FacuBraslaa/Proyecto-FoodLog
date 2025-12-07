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

### Un solo comando
- Desde la raíz: `npm run dev:all`
- Requiere tener las variables del backend en `backend/.env` o exportadas en la terminal.
- Si no defines `VITE_API_BASE`, usa `http://localhost:3000/api` por defecto para el frontend.
- Para acceso en red: el script detecta tu IP local y usa `http://<tu-ip>:3000/api` por defecto. Abre desde otro dispositivo `http://<tu-ip>:5173`. Si quieres forzar una URL, exporta `VITE_API_BASE=http://<tu-ip>:3000/api` antes de correrlo.
