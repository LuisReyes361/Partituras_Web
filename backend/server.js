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

const previewsPath = path.join(__dirname, 'previews');
if (!fs.existsSync(previewsPath)) {
    fs.mkdirSync(previewsPath);
    console.log('se creo la carpeta para guardar las imagnes');
}




app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/previews', express.static(previewsPath));


mongoose
  .connect("mongodb://localhost:27017/Partituras")
  .then(() => console.log("📦 Conectado a MongoDB"))
  .catch((err) => console.error("❌ Error al conectar MongoDB", err));


const partituras = require('./routes/partituras');
app.use('/api/partituras', partituras); 








const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
