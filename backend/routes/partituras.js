const express = require('express');
const router = express.Router();
const multer = require('multer');
const Partitura = require('../models/partituras');
const path = require('path');

// Configuración del almacenamiento de archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadsPath = path.join(__dirname, '..', 'uploads'); // Corrigiendo el destino de los archivos
        console.log(` Subiendo archivo a: ${uploadsPath}`);
        cb(null, uploadsPath);
    },
    filename: (req, file, cb) => {
        const filename = Date.now() + '-' + file.originalname;
        console.log(` Guardando archivo con el nombre: ${filename}`);
        cb(null, filename);
    },
});

const uploads = multer({ storage });

// Ruta para subir archivos
router.post('/uploads', uploads.single('archivo'), async (req, res) => {
    try {
        if (!req.file) {
            console.error(' No se ha recibido ningún archivo');
            return res.status(400).json({ message: 'No se ha enviado un archivo' });
        }

        console.log(`Archivo recibido: ${req.file.originalname}`);
        console.log(`Archivo guardado como: ${req.file.filename}`);

        const nueva = new Partitura({
            nombre: req.body.nombre,
            archivo: req.file.filename,
        });

        await nueva.save();
        console.log('✔️ Partitura guardada en la base de datos:', nueva);

        res.json({
            message: 'Archivo subido correctamente',
            partitura: nueva,
        });
    } catch (error) {
        console.error(' Error al subir la partitura:', error);
        res.status(500).json({ message: 'Error al subir la partitura', error: error.message });
    }
});

// Ruta para buscar partituras
router.get('/buscar', async (req, res) => {
    try {
        const query = req.query.q || '';
        console.log(` Buscando partituras con el término: ${query}`);
        
        const partituras = await Partitura.find({ nombre: { $regex: query, $options: 'i' } });

        if (partituras.length > 0) {
            console.log(` Se encontraron ${partituras.length} partituras`);
        } else {
            console.log(' No se encontraron partituras');
        }

        res.json(partituras);
    } catch (error) {
        console.error('Error al buscar partituras:', error);
        res.status(500).json({ message: 'Error al buscar partituras', error: error.message });
    }
});

module.exports = router;
