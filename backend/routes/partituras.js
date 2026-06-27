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


const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'partituras', 
    resource_type: 'raw', 
    public_id: (req, file) => Date.now() + '-' + file.originalname.split('.')[0]
  },
});

const upload = multer({ storage: storage });


router.post('/uploads', upload.single('archivo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No se ha enviado un archivo' });
        }
        
        
        const nueva = new Partitura({
            nombre: req.body.nombre,
            archivo: req.file.path, 
        });

        await nueva.save();
        res.json({
            message: 'Archivo subido correctamente',
            partitura: nueva,
        });
    } catch (error) {
        console.error('Error al subir la partitura:', error);
        res.status(500).json({ message: 'Error al subir la partitura', error: error.message });
    }
});


router.get('/buscar', async (req, res) => {
    try {
        const query = req.query.q || '';
        const partituras = await Partitura.find({ nombre: { $regex: query, $options: 'i' } });
        res.json(partituras);
    } catch (error) {
        console.error('Error al buscar partituras:', error);
        res.status(500).json({ message: 'Error al buscar partituras', error: error.message });
    }
});


router.get('/check-name', async (req, res) => {
    try {
        const { nombre } = req.query;
        if (!nombre) {
            return res.status(400).json({ error: 'Parámetro "nombre" requerido.' });
        }
        const partituraExistente = await Partitura.findOne({ nombre: nombre });
        res.json({ exists: !!partituraExistente });
    } catch (error) {
        console.error('Error al verificar nombre:', error);
        res.status(500).json({ error: 'Error interno al verificar el nombre.' });
    }
});

router.post('/uploads-url', async (req, res) => {
    try {
        const { nombre, archivo } = req.body;

        if (!nombre || !archivo) {
            return res.status(400).json({ message: 'Nombre y archivo son requeridos' });
        }

        const nueva = new Partitura({
            nombre: nombre,
            archivo: archivo, 
        });

        await nueva.save();
        res.json({
            message: 'Partitura subida correctamente',
            partitura: nueva,
        });
    } catch (error) {
        console.error('Error al subir la partitura:', error);
        res.status(500).json({ message: 'Error al subir la partitura', error: error.message });
    }
});

module.exports = router;