const mongoose = require('mongoose');

const PartituraSchema = new mongoose.Schema({
    nombre: String,
    archivo: String,
    
    fecha: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('Partituras', PartituraSchema);