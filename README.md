# ParLH — Biblioteca de partituras

Aplicación para guardar partituras en PDF y buscarlas/descargarlas después.
Frontend estático en **Vercel** + API Express en **Railway** + archivos en
**Cloudinary** + datos en **MongoDB Atlas**.

## Estructura

```
frontend/              Sitio estático (lo sirve Vercel)
  index.html           Subir partitura
  buscarPartitura.html Buscador
  inicio.html          Portada con reglas de la comunidad
  config.js            URL del backend y límites (fuente única)
  menu.js              Comportamiento del menú hamburguesa
  script.js            Formulario de subida
  scripbuscar.js       Lógica del buscador
  css/navbar.css       Navbar compartida por las 3 páginas
  css/styles.css       Estilos de la página de subida
  css/estilosBuscador.css
  css/estilosPagina.css
  imagenes/

backend/               API Express (lo despliega Railway)
  server.js            Servidor, CORS, conexión a Mongo
  routes/partituras.js Endpoints y subida a Cloudinary
  models/partituras.js Esquema de Mongoose
  .env                 Variables locales (NO se sube a git)
```

## Puntos importantes de configuración

### Vercel

El proyecto es un sitio estático y **el Output Directory debe ser `frontend`**.

Con esa opción, el contenido de `frontend/` se sirve en la raíz del dominio, así
que el navbar se carga en `/config.js`, `/script.js`, `/css/navbar.css`, etc. —
**sin** el prefijo `/frontend/`. Por eso los `<script>` y `<link>` de las páginas
usan rutas como `config.js` y `css/navbar.css`, no `/frontend/config.js`.

Si alguna vez cambias el Output Directory a `.`, hay que volver a prefixar todas
las rutas de los HTML.

`vercel.json` solo mantiene la redirección `/inicio` → `/`. Ya no lleva `rewrites`
porque con Output Directory = `frontend` nunca se aplicaban: Vercel resuelve
primero el sistema de archivos y servía los archivos reales, dejando los rewrites
como código muerto que solo podía convertir 404 en rutas inexistentes.

### Railway (variables de entorno)

| Variable | Para qué sirve |
|---|---|
| `MONGO_URI` | Conexión a MongoDB Atlas. **Obligatoria**: si falta, el servidor cierra al arrancar. |
| `CLOUDINARY_CLOUD_NAME` | Cuenta de Cloudinary |
| `CLOUDINARY_API_KEY` | Cuenta de Cloudinary |
| `CLOUDINARY_API_SECRET` | Cuenta de Cloudinary |
| `CLIENT_URL` | *(opcional)* Orígenes CORS extra, separados por comas. Útil para previews de Vercel o un dominio propio. |
| `PORT` | Lo asigna Railway automáticamente |

El dominio de producción (`https://partituras-web-mpt.vercel.app`) ya viene
incluido en la lista de orígenes permitidos, así que el sitio funciona sin
configurar `CLIENT_URL`.

### Límites

- Archivos: solo PDF, máximo 25 MB (validado en el navegador *y* en el servidor).
- Búsqueda: máximo 100 resultados por consulta.

## Desarrollo local

```bash
# Terminal 1 — API en http://localhost:5000
cd backend
npm install
npm run dev

# Terminal 2 — frontend
# Sirve frontend/ como raíz, igual que hace Vercel
cd frontend
npx serve .
```

Si pruebas con `localhost`, los puertos 5500 y 3000 ya están permitidos por CORS.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/` | Información del servicio |
| `GET` | `/api/partituras/buscar?q=texto` | Busca por subcadena, sin distinguir mayúsculas |
| `GET` | `/api/partituras/check-name?nombre=texto` | Indica si el nombre ya existe |
| `POST` | `/api/partituras/uploads` | Sube un PDF (`multipart/form-data`: `nombre`, `archivo`) |

La búsqueda escapa los metacaracteres de regex antes de consultar MongoDB, de
modo que `(` o `+` se buscan como texto literal y no rompen la consulta.
