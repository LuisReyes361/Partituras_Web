document.addEventListener('DOMContentLoaded', () => {
    const { BACKEND_URL } = window.PARLH_CONFIG;

    const COLOR_BOTON = '#1D4ED8';

    // El botón "Buscar" del hero lleva a la página de explorar con la
    // búsqueda ya escrita, en vez de buscar sin resultado visible.
    const formPortada = document.getElementById('formPortada');
    const inputPortada = document.getElementById('busquedaPortada');

    if (formPortada && inputPortada) {
        formPortada.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = inputPortada.value.trim();

            if (query.length === 0) {
                inputPortada.focus();
                return;
            }

            window.location.href = `buscarPartitura.html?q=${encodeURIComponent(query)}`;
        });
    }


    /*
      Cuatro partituras en la portada. Se piden al backend para que sean reales
      y cambien con el catálogo; si el servidor no responde, la sección queda
      vacía en vez de romper la página.
    */
    const IMAGEN_PARTITURA = '/imagenes/partitura-preview.webp';
    const CUANTAS = 4;

    const mostrarDestacadas = (partituras) => {
        const contenedor = document.getElementById('destacadas');

        if (!contenedor || partituras.length === 0) {
            return;
        }

        contenedor.innerHTML = '';

        const fragmento = document.createDocumentFragment();

        partituras.slice(0, CUANTAS).forEach((partitura) => {
            const tarjeta = document.createElement('a');
            tarjeta.className = 'tarjeta-catalogo';
            tarjeta.href = `buscarPartitura.html?q=${encodeURIComponent(partitura.nombre)}`;

            const imagen = document.createElement('img');
            imagen.className = 'partitura-imagen';
            imagen.src = IMAGEN_PARTITURA;
            imagen.alt = `Partitura de ${partitura.nombre}`;
            imagen.loading = 'lazy';
            imagen.decoding = 'async';
            imagen.width = 1200;
            imagen.height = 900;

            const cuerpo = document.createElement('div');
            cuerpo.className = 'tarjeta-catalogo-cuerpo';

            const nombre = document.createElement('h3');
            nombre.className = 'partitura-name';
            nombre.textContent = partitura.nombre;

            const meta = document.createElement('p');
            meta.className = 'tarjeta-catalogo-meta';
            meta.textContent = 'Partitura completa · PDF';

            cuerpo.appendChild(nombre);
            cuerpo.appendChild(meta);

            tarjeta.appendChild(imagen);
            tarjeta.appendChild(cuerpo);
            fragmento.appendChild(tarjeta);
        });

        contenedor.appendChild(fragmento);
    };


    const cargarDestacadas = async () => {
        // Se usa una letra muy común porque la búsqueda es por subcadena: trae
        // resultados casi siempre y las tarjetas se ven variadas.
        try {
            const response = await fetch(`${BACKEND_URL}/api/partituras/buscar?q=a`);

            if (!response.ok) {
                return;
            }

            const partituras = await response.json();

            // Las más recientes primero.
            partituras.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            mostrarDestacadas(partituras);
        } catch (error) {
            // Sin conexión la portada se sigue viendo igual, solo sin las
            // tarjetas. Mejor eso que un error en pantalla.
            console.warn('No se pudieron cargar las partituras destacadas:', error);
        }
    };

    cargarDestacadas();
});
