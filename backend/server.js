const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');


dotenv.config();

const app = express();
app.use(cors());



const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath);
    console.log(' Carpeta "uploads" creada');
}

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Conexión a MongoDB
mongoose
  .connect("mongodb://localhost:27017/Partituras")
  .then(() => console.log("📦 Conectado a MongoDB"))
  .catch((err) => console.error("❌ Error al conectar MongoDB", err));

// Rutas
const partituras = require('./routes/partituras');
app.use('/api/partituras', partituras); // ✅ Usando la variable correcta

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
