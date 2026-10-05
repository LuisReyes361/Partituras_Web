const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');


dotenv.config();

const app = express();


/*
  Orígenes permitidos para CORS.

  El dominio de producción está incluido por defecto para que el sitio
  funcione sin configurar nada. Si algún día cambia el dominio de Vercel o
  quieres habilitar previews, añade la variable de entorno CLIENT_URL en
  Railway separada por comas:

      CLIENT_URL=https://partituras-web-mpt.vercel.app,https://otro-dominio.com

  Nota: NO se usa `credentials: true` porque el frontend no envía cookies
  (no llama a fetch con credentials: 'include'). Mantenerlo obligaría a que
  CORS siempre devuelva un origen explícito, limitando el wildcard.
*/
const origenesPermitidos = [
    'https://partituras-web-mpt.vercel.app',
    'http://localhost:5500',
    'http://localhost:3000',
    ...(process.env.CLIENT_URL
        ? process.env.CLIENT_URL.split(',').map((origen) => origen.trim()).filter(Boolean)
        : [])
];

app.use(cors({
    origin: origenesPermitidos,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.use(express.json({ limit: '1mb' }));


// Evita el 404 al abrir la URL de Railway directamente en el navegador.
app.get('/', (req, res) => {
    res.json({
        servicio: 'ParLH API',
        estado: 'activo',
        endpoints: {
            buscar: '/api/partituras/buscar?q=texto',
            verificarNombre: '/api/partituras/check-name?nombre=texto',
            subir: '/api/partituras/uploads (multipart/form-data: nombre, archivo)'
        }
    });
});


// Falla rápido y con un mensaje claro si falta la configuración, en lugar de
// levantar un servidor que responde 500 en cada petición.
if (!process.env.MONGO_URI) {
    console.error('❌ Falta la variable de entorno MONGO_URI. Revisa las variables del servicio.');
    process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('📦 Conectado a MongoDB Atlas ☁️'))
  .catch((err) => {
    console.error('❌ Error al conectar MongoDB', err);
    process.exit(1);
  });

const partituras = require('./routes/partituras');
app.use('/api/partituras', partituras); 


// Red de seguridad para errores no controlados.
app.use((err, req, res, next) => {
    console.error('❌ Error no controlado:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`   Orígenes permitidos: ${origenesPermitidos.join(', ')}`);
});
