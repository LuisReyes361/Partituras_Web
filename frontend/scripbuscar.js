document.addEventListener('DOMContentLoaded', () => {
    const { BACKEND_URL } = window.PARLH_CONFIG;

    const searchInput = document.getElementById('search');
    const resultadosContainer = document.getElementById('resultados');
    const cabecera = document.getElementById('resultadosCabecera');
    const conteo = document.getElementById('resultadosConteo');
    const selectorOrden = document.getElementById('orden');
    const formBusqueda = document.getElementById('formBusqueda');

    // Temporizadores a cancelar cuando el usuario escribe otra cosa. Sin esto
    // la cuenta atrás del enfriamiento seguía corriendo en segundo plano.
    let temporizadores = [];

    const limpiarTemporizadores = () => {
        temporizadores.forEach((t) => clearInterval(t));
        temporizadores = [];
    };

    const mensajeError = (texto) => {
        resultadosContainer.innerHTML = `<div class="no-results">${texto}</div>`;
    };

    let timeoutId;

    // Imagen de las tarjetas: 52 KB en vez de los 885 KB que pesaba antes.
    const IMAGEN_PARTITURA = '/imagenes/partitura-preview.webp';

    // Última búsqueda hecha, para poder reordenar sin volver a preguntar al
    // servidor (el orden es solo de presentación).
    let ultimosResultados = [];


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


    /* ------------------------------ Tarjetas ------------------------------ */

    const crearTarjeta = (partitura) => {
        const card = document.createElement('article');
        card.className = 'partitura-card';

        const imagen = document.createElement('img');
        imagen.className = 'partitura-imagen';
        imagen.src = IMAGEN_PARTITURA;
        imagen.alt = `Partitura de ${partitura.nombre}`;
        // Carga diferida: solo baja la foto cuando la vas viendo al bajar.
        imagen.loading = 'lazy';
        imagen.decoding = 'async';
        imagen.width = 1200;
        imagen.height = 900;
        imagen.onerror = () => { imagen.style.display = 'none'; };

        const cuerpo = document.createElement('div');
        cuerpo.className = 'partitura-cuerpo';

        const nombre = document.createElement('h3');
        nombre.className = 'partitura-name';
        nombre.textContent = partitura.nombre;

        const meta = document.createElement('p');
        meta.className = 'partitura-meta';
        meta.textContent = 'Partitura completa · PDF';

        const acciones = document.createElement('div');
        acciones.className = 'partitura-actions';

        // Botón "Ver"
        const verBtn = document.createElement('button');
        verBtn.className = 'action-btn view-btn';
        verBtn.type = 'button';
        verBtn.title = 'Ver partitura';
        verBtn.innerHTML = '<i class="fas fa-eye"></i> Ver';
        verBtn.addEventListener('click', () => {
            const urlVisor = `https://docs.google.com/viewer?url=${encodeURIComponent(partitura.archivo)}&embedded=true`;
            window.open(urlVisor, '_blank');
        });

        // Botón "Descargar"
        const descargarBtn = document.createElement('button');
        descargarBtn.className = 'action-btn';
        descargarBtn.type = 'button';
        descargarBtn.title = 'Descargar partitura';
        descargarBtn.innerHTML = '<i class="fas fa-download"></i> Descargar';
        descargarBtn.addEventListener('click', () => {
            descargarArchivo(partitura.archivo, partitura.nombre, descargarBtn);
        });

        acciones.appendChild(verBtn);
        acciones.appendChild(descargarBtn);

        cuerpo.appendChild(nombre);
        cuerpo.appendChild(meta);
        cuerpo.appendChild(acciones);

        card.appendChild(imagen);
        card.appendChild(cuerpo);

        return card;
    };


    const mostrarResultados = (partituras) => {
        resultadosContainer.innerHTML = '';

        ultimosResultados = partituras;

        if (!partituras || partituras.length === 0) {
            cabecera.hidden = true;
            resultadosContainer.innerHTML =
                '<div class="sin-resultados">No se encontraron partituras</div>';
            return;
        }

        cabecera.hidden = false;

        const total = partituras.length;

        // Se construye con nodos en vez de innerHTML. Es más seguro (el nombre
        // viene de la base y no se interpreta como HTML) y de paso el texto
        // queda en el nodo, no solo en el markup.
        conteo.textContent = '';
        const numero = document.createElement('strong');
        numero.textContent = String(total);
        conteo.appendChild(numero);
        conteo.appendChild(document.createTextNode(
            ` ${total === 1 ? 'resultado' : 'resultados'} para esta búsqueda`
        ));

        // Todas las coincidencias de golpe, sin paginación: buscando por
        // nombre de canción, ver 9 de 47 sería hacer que el usuario vaya
        // pasando de página en página para saber qué versiones hay.
        const fragmento = document.createDocumentFragment();
        partituras.forEach((partitura) => fragmento.appendChild(crearTarjeta(partitura)));
        resultadosContainer.appendChild(fragmento);
    };


    /* ------------------------------ Orden ------------------------------ */

    const ordenar = () => {
        if (ultimosResultados.length === 0) {
            return;
        }

        const copia = [...ultimosResultados];
        if (selectorOrden.value === 'nombre') {
            copia.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
        } else {
            copia.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        }

        mostrarResultados(copia);
    };

    if (selectorOrden) {
        selectorOrden.addEventListener('change', ordenar);
    }


    /* ------------------------------ Aviso de búsqueda externa ------------------------------ */

    const formatearEspera = (ms) => {
        const total = Math.max(0, Math.ceil(ms / 1000));
        const minutos = Math.floor(total / 60);
        const segundos = total % 60;
        return `${minutos}:${segundos.toString().padStart(2, '0')}`;
    };


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

        if (!estado) {
            const texto = document.createElement('p');
            texto.className = 'aviso-texto';
            texto.textContent = 'Prueba con otra parte del nombre.';
            aviso.appendChild(texto);
            return;
        }

        if (estado.estado === 'pendiente' || estado.estado === 'procesando') {
            const texto = document.createElement('p');
            texto.className = 'aviso-texto';
            texto.textContent = estado.estado === 'procesando'
                ? 'Ya la estamos buscando.'
                : 'Ya la pediste. La buscaremos en breve.';
            aviso.appendChild(texto);
            return;
        }

        if (estado.estado === 'completada' && estado.encontradas > 0) {
            const texto = document.createElement('p');
            texto.className = 'aviso-texto aviso-exito';
            texto.textContent = `Ya hay ${estado.encontradas} version(es) de "${query}".`;
            aviso.appendChild(texto);
            return;
        }

        if (estado.estado === 'completada' && estado.encontradas === 0) {
            const texto = document.createElement('p');
            texto.className = 'aviso-texto';
            texto.textContent = 'Buscamos esa canción en la fuente externa y no la encontramos.';
            aviso.appendChild(texto);
            return;
        }

        if (estado.estado === 'fallida') {
            const texto = document.createElement('p');
            texto.className = 'aviso-texto';
            texto.textContent = 'No pudimos completar esa búsqueda. Inténtalo más tarde.';
            aviso.appendChild(texto);
            return;
        }

        if (!estado.puedeSolicitar) {
            const espera = document.createElement('p');
            espera.className = 'aviso-texto';

            const pintarCuenta = () => {
                if (estado.esperaMs <= 0) {
                    espera.textContent = 'Ya puedes solicitar una búsqueda.';
                    clearInterval(temporizadorEspera);
                    return;
                }
                espera.textContent = `Podrás solicitar otra búsqueda en ${formatearEspera(estado.esperaMs)}.`;
            };

            pintarCuenta();

            const temporizadorEspera = setInterval(() => {
                estado.esperaMs -= 1000;
                pintarCuenta();
            }, 1000);

            temporizadores.push(temporizadorEspera);
            aviso.appendChild(espera);
            return;
        }

        const explicacion = document.createElement('p');
        explicacion.className = 'aviso-texto';
        explicacion.textContent = 'Podemos buscarla en nuestra fuente externa y añadirla al sitio.';
        aviso.appendChild(explicacion);

        const boton = document.createElement('button');
        boton.className = 'btn-solicitar';
        boton.type = 'button';
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
                await mostrarAvisoBusquedaExterna(query);
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


    /* ------------------------------ Búsqueda ------------------------------ */

    const buscarPartituras = async (query) => {
        try {
            resultadosContainer.innerHTML = '<div class="sin-resultados">Buscando partituras...</div>';

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
                cabecera.hidden = true;
                await mostrarAvisoBusquedaExterna(query);
                return;
            }

            mostrarResultados(partituras);
        } catch (error) {
            console.error('Error en la búsqueda:', error);
            cabecera.hidden = true;

            mensajeError(
                navigator.onLine === false
                    ? 'Sin conexión a internet. Revisa tu red.'
                    : 'No se pudo conectar con el servidor. Inténtalo de nuevo.'
            );
        }
    };


    /* ------------------------------ Eventos ------------------------------ */

    searchInput.addEventListener('input', () => {
        clearTimeout(timeoutId);
        // Cada búsqueda nueva cancela la cuenta atrás de la anterior.
        limpiarTemporizadores();

        const query = searchInput.value.trim();

        if (query.length < 1) {
            resultadosContainer.innerHTML = '';
            cabecera.hidden = true;
            return;
        }

        // 300 ms como siempre: no se lanza una petición por tecla.
        timeoutId = setTimeout(() => buscarPartituras(query), 300);
    });


    // El botón "Buscar" del formulario: obliga a buscar sin esperar los 300 ms.
    if (formBusqueda) {
        formBusqueda.addEventListener('submit', (e) => {
            e.preventDefault();
            clearTimeout(timeoutId);
            limpiarTemporizadores();
            const query = searchInput.value.trim();

            if (query.length < 1) {
                return;
            }

            buscarPartituras(query);
        });
    }


    // Si alguien llega con ?q=algo desde el buscador de la portada.
    const queryInicial = new URLSearchParams(window.location.search).get('q');
    if (queryInicial) {
        searchInput.value = queryInicial;
        buscarPartituras(queryInicial.trim());
    }
});
