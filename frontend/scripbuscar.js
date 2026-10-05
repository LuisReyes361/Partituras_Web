document.addEventListener('DOMContentLoaded', () => {
    const { BACKEND_URL } = window.PARLH_CONFIG;

    const searchInput = document.getElementById('search');
    const resultadosContainer = document.getElementById('resultados');
    const mensajeError = (texto) => {
        resultadosContainer.innerHTML = `<div class="no-results">${texto}</div>`;
    };

    let timeoutId;

    /*
      descargarArchivo recibe el botón como parámetro explícito.
      Antes usaba el global `window.event`, que no existe en Firefox ni Safari.
    */
    const descargarArchivo = async (url, nombreArchivo, botonDescarga) => {
        const iconoOriginal = botonDescarga.innerHTML;

        try {
            botonDescarga.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            botonDescarga.disabled = true;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const blob = await response.blob();

            // createObjectURL y link.click() no existen en el elemento <a> de
            // algunos navegadores antiguos, pero en los actuales sí.
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = blobUrl;
            link.download = nombreArchivo.toLowerCase().endsWith('.pdf')
                ? nombreArchivo
                : `${nombreArchivo}.pdf`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Error al descargar:', error);

            // Si Cloudinary no devuelve CORS o el archivo falla, se abre en una
            // pestaña nueva. El usuario recibe el archivo de otra forma.
            window.open(url, '_blank');
        } finally {
            // finally se ejecuta también en el catch: antes, si fallaba el
            // fetch, el botón se quedaba con el spinner y deshabilitado.
            botonDescarga.innerHTML = iconoOriginal;
            botonDescarga.disabled = false;
        }
    };


    const mostrarResultados = (partituras) => {
        resultadosContainer.innerHTML = '';

        if (!partituras || partituras.length === 0) {
            mensajeError('No se encontraron partituras');
            return;
        }

        partituras.forEach((partitura) => {
            const card = document.createElement('div');
            card.className = 'partitura-card';

            const imagen = document.createElement('img');
            imagen.className = 'partitura-imagen';
            imagen.src = '/imagenes/20759%20copy.jpg';
            imagen.alt = `Vista previa de ${partitura.nombre}`;
            // Si la imagen no carga, el alt queda visible en su lugar.
            imagen.onerror = () => { imagen.style.display = 'none'; };

            const nombre = document.createElement('div');
            nombre.className = 'partitura-name';
            nombre.textContent = partitura.nombre;

            const acciones = document.createElement('div');
            acciones.className = 'partitura-actions';

            // Botón "Ver" (vista previa vía visor de Google)
            const verBtn = document.createElement('button');
            verBtn.className = 'action-btn view-btn';
            verBtn.title = 'Ver partitura';

            const verIcon = document.createElement('i');
            verIcon.className = 'fas fa-eye';
            verBtn.appendChild(verIcon);

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

            descargarBtn.onclick = () => {
                descargarArchivo(partitura.archivo, partitura.nombre, descargarBtn);
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
                throw new Error(`HTTP ${response.status}`);
            }

            const partituras = await response.json();
            mostrarResultados(partituras);
        } catch (error) {
            console.error('Error en la búsqueda:', error);

            // Distinguir "el servidor no respondió" de "no hay resultados":
            // antes ambos casos mostraban un texto que no explicaba el motivo.
            mensajeError(
                navigator.onLine === false
                    ? 'Sin conexión a internet. Revisa tu red.'
                    : 'No se pudo conectar con el servidor. Inténtalo de nuevo.'
            );
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
