document.addEventListener('DOMContentLoaded', () => {
    const { BACKEND_URL } = window.PARLH_CONFIG;

    const searchInput = document.getElementById('search');
    const resultadosContainer = document.getElementById('resultados');

    // Temporizadores que hay que cancelar cuando el usuario escribe otra cosa.
    // Sin esto, la cuenta atrás del enfriamiento seguiría corriendo en
    // segundo plano y el aviso de la búsqueda anterior se quedaría pegado.
    let temporizadores = [];

    const limpiarTemporizadores = () => {
        temporizadores.forEach((t) => clearInterval(t));
        temporizadores = [];
    };

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


    /*
      Formatea los milisegundos que faltan como "19:32".
    */
    const formatearEspera = (ms) => {
        const total = Math.max(0, Math.ceil(ms / 1000));
        const minutos = Math.floor(total / 60);
        const segundos = total % 60;
        return `${minutos}:${segundos.toString().padStart(2, '0')}`;
    };


    /*
      Pide el estado de una canción al backend para saber qué mostrar:
      botón de solicitar, aviso de "ya la pediste", o "ya está disponible".

      Si el backend no responde, se muestra un aviso simple. La función de
      búsqueda nunca debe romperse por culpa de este extra.
    */
    const consultarEstado = async (nombre) => {
        try {
            const response = await fetch(
                `${BACKEND_URL}/api/partituras/estado?nombre=${encodeURIComponent(nombre)}`
            );

            if (!response.ok) {
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error('Error al consultar el estado de búsqueda externa:', error);
            return null;
        }
    };


    /*
      Envía la solicitud. Devuelve lo que respondió el servidor.
    */
    const solicitarBusqueda = async (nombre) => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/partituras/solicitar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre })
            });

            return { status: response.status, data: await response.json().catch(() => ({})) };
        } catch (error) {
            console.error('Error al solicitar la búsqueda:', error);
            return { status: 0, data: { message: 'No se pudo conectar con el servidor.' } };
        }
    };


    /*
      Cuando la búsqueda normal no da resultados, se consulta el estado y se
      ofrece pedir la canción en la fuente externa.
    */
    const mostrarAvisoBusquedaExterna = async (query) => {
        resultadosContainer.innerHTML = '';

        const aviso = document.createElement('div');
        aviso.className = 'aviso-busqueda';

        const titulo = document.createElement('p');
        titulo.className = 'aviso-titulo';
        titulo.textContent = 'No encontramos esa partitura.';
        aviso.appendChild(titulo);

        const estado = await consultarEstado(query);
        resultadosContainer.appendChild(aviso);

        // Sin respuesta del backend: no se puede ofrecer nada más.
        if (!estado) {
            const texto = document.createElement('p');
            texto.className = 'avivo-texto';
            texto.textContent = 'Prueba con otra parte del nombre.';
            aviso.appendChild(texto);
            return;
        }

        // --- Ya está en la cola o siendo trabajada ---
        if (estado.estado === 'pendiente' || estado.estado === 'procesando') {
            const texto = document.createElement('p');
            texto.className = 'aviso-texto';
            texto.textContent = estado.estado === 'procesando'
                ? 'Ya la estamos buscando.'
                : 'Ya la pediste. La buscaremos en breve.';
            aviso.appendChild(texto);
            return;
        }

        // --- Terminó y sí encontró ---
        if (estado.estado === 'completada' && estado.encontradas > 0) {
            const texto = document.createElement('p');
            texto.className = 'aviso-texto aviso-exito';
            texto.textContent = `Ya hay ${estado.encontradas} version(es) de "${query}". Ya deberías verlas arriba.`;
            aviso.appendChild(texto);
            return;
        }

        // --- Terminó y no encontró nada ---
        if (estado.estado === 'completada' && estado.encontradas === 0) {
            const texto = document.createElement('p');
            texto.className = 'aviso-texto';
            texto.textContent = 'Buscamos esa canción en la fuente externa y no la encontramos.';
            aviso.appendChild(texto);
            return;
        }

        // --- Falló ---
        if (estado.estado === 'fallida') {
            const texto = document.createElement('p');
            texto.className = 'aviso-texto';
            texto.textContent = 'No pudimos completar esa búsqueda. Inténtalo más tarde.';
            aviso.appendChild(texto);
            return;
        }

        // --- Nunca solicitada ---
        if (!estado.puedeSolicitar) {
            // Enfriamiento: cuenta atrás en vivo.
            const espera = document.createElement('p');
            espera.className = 'aviso-texto';

            const pintarCuenta = () => {
                if (estado.esperaMs <= 0) {
                    espera.textContent = 'Ya puedes solicitar una búsqueda.';
                    clearTimeout(temporizadorEspera);
                    return;
                }
                espera.textContent = `Podrás solicitar otra búsqueda en ${formatearEspera(estado.esperaMs)}.`;
            };

            pintarCuenta();

            // Se actualiza cada segundo sin volver a preguntar al servidor.
            const temporizadorEspera = setInterval(() => {
                estado.esperaMs -= 1000;
                pintarCuenta();
            }, 1000);

            temporizadores.push(temporizadorEspera);

            aviso.appendChild(espera);
            return;
        }

        // --- Botón para solicitar ---
        const explicacion = document.createElement('p');
        explicacion.className = 'aviso-texto';
        explicacion.textContent = 'Podemos buscarla en nuestra fuente externa y añadirla al sitio.';
        aviso.appendChild(explicacion);

        const boton = document.createElement('button');
        boton.className = 'btn-solicitar';
        boton.textContent = 'Solicitar búsqueda';
        boton.addEventListener('click', async () => {
            boton.disabled = true;
            boton.textContent = 'Enviando...';

            const { status, data } = await solicitarBusqueda(query);

            if (status === 201 || status === 200) {
                aviso.innerHTML = '';
                const ok = document.createElement('p');
                ok.className = 'aviso-texto aviso-exito';
                ok.textContent = '¡Listo! La buscaremos en breve. Puedes seguir buscando mientras tanto.';
                aviso.appendChild(ok);
                return;
            }

            if (status === 429) {
                aviso.innerHTML = '';
                boton.disabled = false;
                boton.textContent = 'Solicitar búsqueda';
                mostrarAvisoBusquedaExterna(query);
                return;
            }

            aviso.innerHTML = '';
            const errorTexto = document.createElement('p');
            errorTexto.className = 'aviso-texto';
            errorTexto.textContent = data.message || 'No se pudo registrar la solicitud.';
            aviso.appendChild(errorTexto);
        });

        aviso.appendChild(boton);
    };


    const buscarPartituras = async (query) => {
        try {
            resultadosContainer.innerHTML = '<div class="no-results">Buscando partituras...</div>';

            const response = await fetch(`${BACKEND_URL}/api/partituras/buscar?q=${encodeURIComponent(query)}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const partituras = await response.json();

            // Si el usuario ya escribió otra cosa mientras esperábamos, esta
            // respuesta es vieja y no debe pintarse.
            if (searchInput.value.trim() !== query) {
                return;
            }

            if (partituras.length === 0) {
                // No hay nada en nuestra base: en vez de un "no encontramos"
                // seco, se ofrece pedir la búsqueda en la fuente externa.
                await mostrarAvisoBusquedaExterna(query);
                return;
            }

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
        // Cada búsqueda nueva cancela la cuenta atrás de la anterior.
        limpiarTemporizadores();

        const query = searchInput.value.trim();

        if (query.length < 1) {
            resultadosContainer.innerHTML = '';
            return;
        }

        timeoutId = setTimeout(() => buscarPartituras(query), 300);
    });
});
