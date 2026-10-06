const express = require('express');
const router = express.Router();

const ScrapeRequest = require('../models/scrapeRequests');
const { normalizar } = require('../models/scrapeRequests');


// ------------------------------------------------------------------
// Configuración (todo se puede cambiar con variables de entorno)
// ------------------------------------------------------------------

const MIN_CARACTERES = parseInt(process.env.SCRAPE_MIN_CARACTERES || '4', 10);
const MAX_CARACTERES = parseInt(process.env.SCRAPE_MAX_CARACTERES || '120', 10);
const MAX_PENDIENTES = parseInt(process.env.SCRAPE_MAX_PENDIENTES || '10', 10);
const COOLDOWN_MINUTOS = parseInt(process.env.SCRAPE_COOLDOWN_MINUTOS || '20', 10);
const MAX_INTENTOS = parseInt(process.env.SCRAPE_MAX_INTENTOS || '2', 10);


// ------------------------------------------------------------------
// Utilidades
// ------------------------------------------------------------------

/*
  Devuelve la IP real del visitante.

  OJO: en Railway, sin `app.set('trust proxy', 1)`, req.ip devuelve el proxy
  interno de la plataforma y NO el del visitante. Con eso, todos los usuarios
  del sitio compartirían la misma IP y el enfriamiento de 20 minutos se
  volvería global: bastaría con que uno lo activara para bloquear a todos.
*/
const ipDe = (req) => {
    return (req.headers['x-forwarded-for']?.split(',')[0] || req.ip || 'desconocida')
        .trim();
};

/*
  Milisegundos que le faltan a este usuario para poder volver a solicitar.

  Se consulta una sola vez por petición y se reutiliza en /estado y /solicitar.
*/
const esperaRestante = async (ip) => {
    const ultima = await ScrapeRequest.findOne({ solicitadoPor: ip })
        .sort({ creadoEn: -1 });

    if (!ultima) {
        return 0;
    }

    return Math.max(0, (COOLDOWN_MINUTOS * 60 * 1000) - (Date.now() - ultima.creadoEn.getTime()));
};


// ------------------------------------------------------------------
// 1. Consultar el estado de una canción
//
//    Lo llama el navegador cuando la búsqueda normal no da resultados,
//    para saber si muestra botón, aviso de "ya la pediste" o cuenta atrás.
// ------------------------------------------------------------------

router.get('/estado', async (req, res) => {
    try {
        const nombre = (req.query.nombre || '').trim();

        if (!nombre) {
            return res.status(400).json({ message: 'Falta el nombre de la partitura' });
        }

        const clave = normalizar(nombre);
        const solicitud = await ScrapeRequest.findOne({ clave });
        const esperaMs = await esperaRestante(ipDe(req));

        // Todavía nadie la pidió: se muestra el botón si no hay enfriamiento.
        if (!solicitud) {
            return res.json({
                estado: 'nunca_solicitada',
                encontradas: 0,
                puedeSolicitar: esperaMs === 0,
                esperaMs
            });
        }

        return res.json({
            estado: solicitud.estado,
            encontradas: solicitud.encontradas,
            // El enfriamiento manda sobre el botón: si faltan segundos, no se
            // puede solicitar aunque la canción no exista en la cola.
            puedeSolicitar: esperaMs === 0,
            esperaMs,
            detalle: solicitud.detalle || ''
        });
    } catch (error) {
        console.error('Error al consultar estado de búsqueda externa:', error);
        res.status(500).json({ message: 'Error al consultar el estado' });
    }
});


// ------------------------------------------------------------------
// 2. Registrar una solicitud
//
//    Lo llama el botón "Solicitar búsqueda" del navegador.
// ------------------------------------------------------------------

router.post('/solicitar', async (req, res) => {
    try {
        const nombre = (req.body.nombre || '').trim();
        const ip = ipDe(req);

        if (!nombre) {
            return res.status(400).json({ message: 'Escribe el nombre de la partitura' });
        }

        if (nombre.length < MIN_CARACTERES) {
            return res.status(400).json({
                message: `El nombre debe tener al menos ${MIN_CARACTERES} caracteres`
            });
        }

        if (nombre.length > MAX_CARACTERES) {
            return res.status(400).json({ message: 'El nombre es demasiado largo' });
        }

        const clave = normalizar(nombre);

        // --- Enfriamiento: una solicitud cada 20 minutos por usuario ---
        const faltan = await esperaRestante(ip);

        if (faltan > 0) {
            return res.status(429).json({
                message: 'Ya solicitaste una búsqueda hace poco',
                esperaMs: faltan
            });
        }

        // --- Si esta canción ya se pidió, no se vuelve a encolar ---
        // El índice único de `clave` lo garantiza aunque dos personas den
        // clic en el mismo instante.
        const existente = await ScrapeRequest.findOne({ clave });

        if (existente) {
            return res.json({
                message: 'Esa canción ya está en la lista de búsqueda',
                yaExistia: true,
                estado: existente.estado,
                encontradas: existente.encontradas
            });
        }

        // --- Evitar que la cola se desborde ---
        const pendientes = await ScrapeRequest.countDocuments({ estado: 'pendiente' });

        if (pendientes >= MAX_PENDIENTES) {
            return res.status(429).json({
                message: 'Ahora mismo hay muchas búsquedas en cola. Inténtalo más tarde.',
                colaLlena: true
            });
        }

        // --- Encolar ---
        let solicitud;

        try {
            solicitud = await ScrapeRequest.create({
                nombre,
                clave,
                estado: 'pendiente',
                solicitadoPor: ip
            });
        } catch (error) {
            // 11000 = índice único violado: alguien más se adelantó por
            // milisegundos. No es un error, solo se devuelve lo que ya existe.
            if (error.code === 11000) {
                const yaExiste = await ScrapeRequest.findOne({ clave });
                return res.json({
                    message: 'Esa canción ya está en la lista de búsqueda',
                    yaExistia: true,
                    estado: yaExiste.estado,
                    encontradas: yaExiste.encontradas
                });
            }
            throw error;
        }

        console.log(`📋 Búsqueda externa solicitada: "${nombre}" (desde ${ip})`);

        return res.status(201).json({
            message: 'Registrado. Buscaremos esa partitura en breve.',
            estado: solicitud.estado,
            encontrada: false
        });

    } catch (error) {
        console.error('Error al solicitar búsqueda externa:', error);
        res.status(500).json({ message: 'No se pudo registrar la solicitud' });
    }
});


// ==================================================================
//  RUTAS DEL SCRAPER
//  Estas NO son públicas: exigen el token compartido.
// ==================================================================

const verificarToken = (req, res, next) => {
    const token = req.headers['x-scraper-token'];
    const esperado = process.env.SCRAPER_TOKEN;

    if (!esperado) {
        return res.status(503).json({ message: 'SCRAPER_TOKEN no está configurado en el servidor' });
    }

    if (!token || token !== esperado) {
        return res.status(401).json({ message: 'Token inválido' });
    }

    next();
};


/*
  El scraper pide trabajo.

  Se queda con la solicitud más antigua que esté pendiente. El findOneAndUpdate
  es atómico: si algún día hay dos scrapers corriendo, no pueden tomar la
  misma canción.
*/
router.post('/scraper/claim', verificarToken, async (req, res) => {
    try {
        const solicitud = await ScrapeRequest.findOneAndUpdate(
            { estado: 'pendiente' },
            {
                $set: {
                    estado: 'procesando',
                    procesadoEn: new Date()
                },
                $inc: { intentos: 1 }
            },
            { sort: { creadoEn: 1 }, new: true }
        );

        if (!solicitud) {
            return res.status(204).send();
        }

        console.log(`🔧 El scraper tomó: "${solicitud.nombre}" (intento ${solicitud.intentos})`);

        return res.json({
            clave: solicitud.clave,
            nombre: solicitud.nombre,
            intento: solicitud.intentos
        });

    } catch (error) {
        console.error('Error en claim del scraper:', error);
        res.status(500).json({ message: 'Error al obtener trabajo' });
    }
});


/*
  Busca la solicitud por su clave.

  La clave que envía el scraper es la misma que devolvió /scraper/claim, y esa
  ya viene normalizada desde Mongo. Así que se busca tal cual, sin volver a
  normalizar: si se hiciera, un nombre con acentos podría dejar de coincidir.
*/
const buscarPorClave = (req) => {
    return ScrapeRequest.findOne({ clave: req.params.clave });
};


/*
  El scraper terminó. encontradas = 0 significa "no existe en la fuente",
  y eso queda guardado para no volver a buscarlo nunca.
*/
router.post('/scraper/:clave/completada', verificarToken, async (req, res) => {
    try {
        const solicitud = await buscarPorClave(req);

        if (!solicitud) {
            return res.status(404).json({ message: 'Solicitud no encontrada' });
        }

        const encontradas = parseInt(req.body.encontradas || '0', 10);

        solicitud.estado = 'completada';
        solicitud.encontradas = encontradas;
        solicitud.detalle = req.body.detalle || '';
        solicitud.procesadoEn = new Date();
        await solicitud.save();

        console.log(`✅ Completada: "${solicitud.nombre}" -> ${encontradas} partitura(s)`);

        return res.json({ message: 'Registrado', encontradas });

    } catch (error) {
        console.error('Error al completar búsqueda:', error);
        res.status(500).json({ message: 'Error al registrar el resultado' });
    }
});


/*
  El scraper falló.

  Si no gastó todos sus intentos, la solicitud vuelve a la cola. Si los gastó,
  queda como fallada para que el sitio lo explique en vez de dejarla colgada.
*/
router.post('/scraper/:clave/fallida', verificarToken, async (req, res) => {
    try {
        const solicitud = await buscarPorClave(req);

        if (!solicitud) {
            return res.status(404).json({ message: 'Solicitud no encontrada' });
        }

        solicitud.detalle = req.body.detalle || 'Error desconocido';
        solicitud.procesadoEn = new Date();

        if (solicitud.intentos < MAX_INTENTOS) {
            solicitud.estado = 'pendiente';
            console.log(`↩️  Reintentando: "${solicitud.nombre}" (intento ${solicitud.intentos}/${MAX_INTENTOS})`);
        } else {
            solicitud.estado = 'fallida';
            console.log(`❌ Fallida definitivamente: "${solicitud.nombre}" - ${solicitud.detalle}`);
        }

        await solicitud.save();

        return res.json({
            message: 'Registrado',
            estado: solicitud.estado,
            detalle: solicitud.detalle
        });

    } catch (error) {
        console.error('Error al marcar búsqueda como fallida:', error);
        res.status(500).json({ message: 'Error al registrar el fallo' });
    }
});


module.exports = router;
