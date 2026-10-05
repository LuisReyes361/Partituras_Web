const mongoose = require('mongoose');

const PartituraSchema = new mongoose.Schema({
    nombre: String,
    archivo: String,
    
    fecha: { 
        type: Date, 
        default: Date.now 
    }
});

/*
  Nota sobre índices: la búsqueda usa un $regex sin anclar (coincidencia de
  subcadena). MongoDB no puede aprovechar un índice B-tree para ese tipo de
  patrón, así que un índice en "nombre" NO ayudaría y solo consumiría espacio
  y ralentizaría las escrituras. Por eso no se declara ninguno; la protección
  real contra consultas costosas es el .limit(MAX_RESULTADOS) en la ruta de
  búsqueda.
*/

module.exports = mongoose.model('Partituras', PartituraSchema);
