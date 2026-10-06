const express = require('express');
const router = express.Router();
const multer = require('multer');
const Partitura = require('../models/partituras');

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});


// Tope de tamaño por archivo. Sin este límite, un usuario podría subir un
// archivo de varios GB y agotar la memoria del proceso.
const MAX_FILE_SIZE_MB = 25;

// Cuántos resultados devuelve como máximo la búsqueda. Evita respuestas
// gigantes (y bloqueos de RAM) cuando la consulta coincide con casi todo.
const MAX_RESULTADOS = 100;


const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'partituras', 
    resource_type: 'raw', 
    public_id: (req, file) => Date.now() + '-' + file.originalname.split('.')[0]
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'));
    }
  }
});


// Los errores de multer (archivo muy grande, tipo no permitido) NO llegan al
// try/catch de la ruta, sino a next(). Por eso envolvemos el middleware para
// traducirlos a respuestas claras en lugar de un 500 genérico.
const procesarArchivo = (req, res, next) => {
    upload.single('archivo')(req, res, (err) => {
        if (!err) {
            return next();
        }

        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                message: `El archivo supera el límite de ${MAX_FILE_SIZE_MB} MB`
            });
        }

        if (err.message) {
            return res.status(400).json({ message: err.message });
        }

        return res.status(400).json({ message: 'No se pudo procesar el archivo' });
    });
};


// Escapa los metacaracteres de regex para que el usuario pueda buscar texto
// literal como "(" o "+" sin que MongoDB lo interprete como sintaxis.
// Sin esto, un busqueda con un metacarácter desbalanceado devuelve 500
// y un patron tipo (a+)+$ puede tumbar el servicio (ReDoS).
const escapeRegex = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');


router.post('/uploads', procesarArchivo, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No se ha enviado un archivo' });
        }

        const nombre = (req.body.nombre || '').trim();

        if (!nombre) {
            return res.status(400).json({ message: 'El nombre de la partitura es obligatorio' });
        }
        
        
        /*
  Evita duplicados.

  El scraper antes se apoyaba en su archivo historial_descargas.txt para no
  repetir. Ese archivo se pierde en cada redeploy de Railway, así que al
  reiniciar el scraper subiría de nuevo las mismas 105 canciones. Además,
  /check-name solo lo consultaba el navegador, no el scraper.

  Ahora la comparación se hace aquí, en el servidor, para todos los que suben
  (formulario web o scraper). Si ya existe, se devuelve 200 con creada:false y
  se descarta el archivo nuevo: así Cloudinary no se llena de copias.
*/
const clave = nombre.toLowerCase().replace(/\s+/g, ' ');

const existente = await Partitura.findOne({
    nombre: new RegExp(`^${escapeRegex(clave)}$`, 'i')
});

if (existente) {
    return res.status(200).json({
        message: 'Esa partitura ya estaba subida',
        creada: false,
        partitura: existente
    });
}

const nueva = new Partitura({
    nombre: nombre,
    archivo: req.file.path, 
});

await nueva.save();
res.status(201).json({
    message: 'Archivo subido correctamente',
    creada: true,
    partitura: nueva,
});
    } catch (error) {
        console.error('Error al subir la partitura:', error);
        res.status(500).json({ message: 'Error al subir la partitura', error: error.message });
    }
});


router.get('/buscar', async (req, res) => {
    try {
        const query = (req.query.q || '').trim();

        if (!query) {
            return res.json([]);
        }

        const partituras = await Partitura.find({
            nombre: { $regex: new RegExp(escapeRegex(query), 'i') }
        }).limit(MAX_RESULTADOS);

        res.json(partituras);
    } catch (error) {
        console.error('Error al buscar partituras:', error);
        res.status(500).json({ message: 'Error al buscar partituras', error: error.message });
    }
});


router.get('/check-name', async (req, res) => {
    try {
        const nombre = (req.query.nombre || '').trim();

        if (!nombre) {
            return res.status(400).json({ error: 'Parámetro "nombre" requerido.' });
        }

        // Búsqueda exacta pero insensible a mayúsculas/minúsculas, para que
        // "El torO" y "el toro" se consideren la misma partitura.
        const partituraExistente = await Partitura.findOne({
            nombre: new RegExp(`^${escapeRegex(nombre)}$`, 'i')
        });

        res.json({ exists: !!partituraExistente });
    } catch (error) {
        console.error('Error al verificar nombre:', error);
        res.status(500).json({ error: 'Error interno al verificar el nombre.' });
    }
});

/*
  Ruta eliminada: POST /uploads-url

  No la usaba ningún cliente y permitia insertar una URL arbitraria en la base
  de datos sin autenticación. Como esa URL luego se abre en el visor de Google
  o se descarga desde el navegador, cualquiera podía meter un enlace malicioso
  que luego se ejecutaría en el nombre de tu sitio. El archivo real se sube
  por POST /uploads con multer + Cloudinary, que sí valida el tipo.
*/

module.exports = router;