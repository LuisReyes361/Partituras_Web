const mongoose = require('mongoose');

/*
  Cola de solicitudes "busca esta canción en la fuente externa".

  Cada vez que un usuario busca algo y no lo encuentra, deja una nota aquí.
  El scraper (partituraSS.py) lee esta lista y la va vaciando. Así el usuario
  no tiene que esperar a que un navegador automatizado termine de trabajar.
*/
const ScrapeRequestSchema = new mongoose.Schema({
    // Lo que escribió el usuario, tal cual.
    nombre: {
        type: String,
        required: true,
        trim: true
    },

    // Versión normalizada para comparar. Solo minúsculas y espacios
    // colapsados; NO se quitan los acentos, para que "ñ" y "n" sigan
    // siendo canciones distintas (decisión del dueño del sitio).
    clave: {
        type: String,
        required: true,
        unique: true
    },

    // pendiente  -> en la cola, esperando que el scraper la tome
    // procesando -> el scraper la está trabajando ahora
    // completada -> terminó (encontradas = 0 significa "no existe")
    // fallida    -> no se pudo completar
    estado: {
        type: String,
        enum: ['pendiente', 'procesando', 'completada', 'fallida'],
        default: 'pendiente'
    },

    // Cuántas partituras subió el scraper. Si termina en 0, la canción no
    // existe en la fuente y no se vuelve a pedir.
    encontradas: {
        type: Number,
        default: 0
    },

    intentos: {
        type: Number,
        default: 0
    },

    // Texto para diagnosticar cuando algo falla.
    detalle: {
        type: String,
        default: ''
    },

    // IP de quien pidió, para el enfriamiento de 20 minutos.
    solicitadoPor: {
        type: String,
        default: ''
    },

    creadoEn: {
        type: Date,
        default: Date.now
    },

    procesadoEn: {
        type: Date,
        default: null
    }
});

// El scraper busca constantly "la más antigua que esté pendiente".
ScrapeRequestSchema.index({ estado: 1, creadoEn: 1 });

// Para saber si a este usuario hay que pedirle que espere.
ScrapeRequestSchema.index({ solicitadoPor: 1, creadoEn: -1 });

// Las notas viejas se borran solas para que la colección no crezca infinito.
ScrapeRequestSchema.index({ creadoEn: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });


/*
  Normaliza un nombre para poder compararlo.

  Solo quita espacios sobrantes y pasa a minúsculas. Los acentos y la ñ se
  respetan a propósito: "Mi Deseo", "mi deseo " y "MI DESEO" son la misma
  canción, pero "enganarte" y "engañarte" son búsquedas distintas.
*/
const normalizar = (nombre) => nombre
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();


module.exports = mongoose.model('ScrapeRequests', ScrapeRequestSchema);
module.exports.normalizar = normalizar;
