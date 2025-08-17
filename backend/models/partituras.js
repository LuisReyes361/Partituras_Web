const mongoose = require('mongoose');

const PartituraSchema = new mongoose.Schema({
    nombre: String,
    archivo: String,
    fecha: { 
        type: Date, 
        default: Date.now  // ✅ Fecha actual al crear el documento
    }
});

module.exports = mongoose.model('Partituras', PartituraSchema);