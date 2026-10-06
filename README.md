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
| `SCRAPER_TOKEN` | Secreto compartido con el scraper. **Obligatoria** para que las rutas `/scraper/*` funcionen. |
| `CLIENT_URL` | *(opcional)* Orígenes CORS extra, separados por comas. |
| `PORT` | Lo asigna Railway automáticamente. |

### Nota sobre el nombre de la base de datos

`MONGO_URI` puede omitir el nombre de la base; en ese caso el driver usa una
que se llama `test` por defecto. Funciona, pero conviene escribirla
explícitamente para que no sea un accidente:

```
mongodb://<user>:<pass>@cluster....mongodb.net/test?retryWrites=true&w=majority
```

Si alguna herramienta se conecta sin nombrar base, acabaría en tu catálogo
real. Este cambio **no mueve ningún dato**.

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
| `GET` | `/api/partituras/estado?nombre=texto` | Estado de una búsqueda en la fuente externa |
| `POST` | `/api/partituras/solicitar` | Pide buscar `{ "nombre": "..." }` |

Las rutas del scraper exigen la cabecera `X-Scraper-Token`:

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/partituras/scraper/claim` | Pide trabajo. `204` si no hay nada |
| `POST` | `/api/partituras/scraper/:clave/completada` | Reporta `{ "encontradas": N }` |
| `POST` | `/api/partituras/scraper/:clave/fallida` | Reporta un error |

La búsqueda escapa los metacaracteres de regex antes de consultar MongoDB, de
modo que `(` o `+` se buscan como texto literal y no rompen la consulta.

## Búsqueda automática en fuente externa

Cuando el buscador no encuentra nada, el sitio ofrece un botón **Solicitar
búsqueda**. Eso deja una nota en la colección `scrape_requests` y el scraper la
toma cuando puede. **El usuario no espera**: sigue buscando libremente.

| Regla | Valor | Variable |
|---|---|---|
| Enfriamiento por usuario | 20 min | `SCRAPE_COOLDOWN_MINUTOS` |
| Cola máxima | 10 pendientes | `SCRAPE_MAX_PENDIENTES` |
| Longitud mínima | 4 caracteres | `SCRAPE_MIN_CARACTERES` |
| Reintentos | 2 | `SCRAPE_MAX_INTENTOS` |

Si el scraper termina con `encontradas: 0`, la solicitud queda cacheada: esa
canción no se vuelve a buscar nunca.

> El backend usa `app.set('trust proxy', 1)`, sin el cual `req.ip` devuelve el
> proxy interno de Railway y el enfriamiento de 20 minutos sería global para
> todo el sitio.
