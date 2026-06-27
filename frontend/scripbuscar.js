document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search');
    const resultadosContainer = document.getElementById('resultados');
    let timeoutId;

    // TODO: CAMBIA ESTA URL cuando despliegues tu backend en Railway
    const BACKEND_URL = 'http://localhost:5000'; 

    const descargarArchivo = async (url, nombreArchivo) => {
        try {
            const botonDescarga = event.target.closest('.download-btn');
            const iconoOriginal = botonDescarga.innerHTML;
            botonDescarga.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            botonDescarga.disabled = true;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const blob = await response.blob();
            
            const link = document.createElement('a');
            const blobUrl = window.URL.createObjectURL(blob);
            
            link.href = blobUrl;

            const nombreConExtension = nombreArchivo.endsWith('.pdf') ? nombreArchivo : nombreArchivo + '.pdf';
            link.download = nombreConExtension;
            document.body.appendChild(link);
            
            link.click();
            document.body.removeChild(link);
            
            window.URL.revokeObjectURL(blobUrl);
            
            botonDescarga.innerHTML = iconoOriginal;
            botonDescarga.disabled = false;
            
        } catch (error) {
            console.error('Error al descargar:', error);
            
            window.open(url, '_blank');
            
            const botonDescarga = event.target.closest('.download-btn');
            botonDescarga.innerHTML = '<i class="fas fa-download"></i>';
            botonDescarga.disabled = false;
        }
    };

    const mostrarResultados = (partituras) => {
        resultadosContainer.innerHTML = '';
        
        if (!partituras || partituras.length === 0) {
            resultadosContainer.innerHTML = '<div class="no-results">No se encontraron partituras</div>';
            return;
        }

        partituras.forEach(partitura => {
            const card = document.createElement('div');
            card.className = 'partitura-card';

            const imagen = document.createElement('img');
            imagen.className = 'partitura-imagen'; 
            imagen.src = `../frontend/imagenes/20759 copy.jpg`;
            imagen.alt = `Vista previa de ${partitura.nombre}`;
            
            const nombre = document.createElement('div');
            nombre.className = 'partitura-name';
            nombre.textContent = partitura.nombre;
            
            const acciones = document.createElement('div');
            acciones.className = 'partitura-actions';
            
            // Botón "Ver" (Ver vista previa)
            const verBtn = document.createElement('button');
            verBtn.className = 'action-btn view-btn';
            verBtn.title = 'Ver partitura';
            
            const verIcon = document.createElement('i');
            verIcon.className = 'fas fa-eye';
            verBtn.appendChild(verIcon);
            
            // Lógica corregida: El botón "Ver" solo abre la URL en una nueva pestaña.
            //verBtn.onclick = () => window.open(partitura.archivo, '_blank');
            verBtn.onclick = () => {
                const urlVisor = `https://docs.google.com/viewer?url=${encodeURIComponent(partitura.archivo)}&embedded=true`;
                window.open(urlVisor, '_blank');
            };
            
            // Botón "Descargar"
            const descargarBtn = document.createElement('button');
            descargarBtn.className = 'action-btn download-btn';
            descargarBtn.title = 'Descargar partitura';
            
            const descargarIcon = document.createElement('i');
            descargarIcon.className = 'fas fa-download';
            descargarBtn.appendChild(descargarIcon);
            
            // Lógica corregida: El botón "Descargar" llama a la función de descarga
            // pasando la URL de Cloudinary y el nombre de la partitura.
            descargarBtn.onclick = (event) => {
                descargarArchivo(partitura.archivo, partitura.nombre);
            };
            
            acciones.appendChild(verBtn);
            acciones.appendChild(descargarBtn);
            card.appendChild(imagen);
            card.appendChild(nombre);
            card.appendChild(acciones);
            
            resultadosContainer.appendChild(card);
        });
    };

    const buscarPartituras = async (query) => {
        try {
            resultadosContainer.innerHTML = '<div class="no-results">Buscando partituras...</div>';
            
            const response = await fetch(`${BACKEND_URL}/api/partituras/buscar?q=${encodeURIComponent(query)}`);
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const partituras = await response.json();
            mostrarResultados(partituras);
        } catch (error) {
            console.error('Error en la búsqueda:', error);
            resultadosContainer.innerHTML = '<div class="no-results">Error al buscar partituras</div>';
        }
    };

    searchInput.addEventListener('input', () => {
        clearTimeout(timeoutId);
        const query = searchInput.value.trim();
        
        if (query.length < 1) {
            resultadosContainer.innerHTML = '';
            return;
        }
        
        timeoutId = setTimeout(() => buscarPartituras(query), 300);
    });
});