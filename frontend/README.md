# FoodLog Frontend (React + Vite)

## Scripts
- `npm install`
- `npm run dev` (por defecto en http://localhost:5173)
- `npm run build` / `npm run preview`

## Configuración
La app se conecta por defecto a `http://localhost:3000` en modo desarrollo. Si usas otra URL, defínela en `.env`:
```
VITE_API_BASE=http://localhost:3000
```
Si lo despliegas en Vercel apuntando a la API pública, actualiza ese valor.

## Funcionalidad
- Registro con contraseña (valida duplicados y longitudes) y login.
- Búsqueda de alimentos, alta de alimentos.
- Alta, edición y eliminación de comidas; muestra calorías totales del día.
- Persistencia de sesión en `localStorage`.
