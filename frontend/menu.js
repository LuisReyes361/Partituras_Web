document.addEventListener('DOMContentLoaded', () => {

    /*
      Encabezado y pie idénticos en las tres páginas.
      Se generan con JS para no reescribirlos a mano en cada archivo: antes
      cada página tenía su propia copia y terminaban desincronizadas.
    */
    const PAGINA_ACTUAL = document.body.dataset.pagina || '';

    const RUTAS = {
        portada: '/',
        explorar: '/buscarPartitura.html',
        subir: '/subirPartitura.html'
    };

    const MENU = [
        { texto: 'Inicio', href: RUTAS.portada, clave: 'portada' },
        { texto: 'Explorar', href: RUTAS.explorar, clave: 'explorar' },
        { texto: 'Subir partitura', href: RUTAS.subir, clave: 'subir', destacado: true },
        { texto: 'Soporte', href: 'https://wa.me/7716841976?text=Hola,%20necesito%20soporte%20t%C3%A9cnico', clave: 'soporte', externo: true }
    ];

    const REDES = [
        { icono: 'fa-facebook', etiqueta: 'Facebook', href: 'https://www.facebook.com/share/16mJE6cVK3/' },
        { icono: 'fa-instagram', etiqueta: 'Instagram', href: '#' },
        { icono: 'fa-whatsapp', etiqueta: 'WhatsApp', href: 'https://wa.me/7716841976?text=Hola,%20me%20interesa%20saber%20m%C3%A1s%20sobre%20sus%20servicios' }
    ];

    const PIE_COLUMNAS = [
        {
            titulo: 'Explorar',
            links: [
                { texto: 'Buscar partituras', href: RUTAS.explorar },
                { texto: 'Tienda', href: RUTAS.explorar },
                { texto: 'Soporte', href: 'https://wa.me/7716841976?text=Hola,%20necesito%20soporte%20t%C3%A9cnico' }
            ]
        },
        {
            titulo: 'Creadores de contenido',
            links: [
                { texto: 'Subir partituras', href: RUTAS.subir },
                { texto: 'Iniciar sesión', href: RUTAS.subir },
                { texto: 'Crear cuenta', href: RUTAS.subir }
            ]
        },
        {
            titulo: 'Acuerdo de servicio',
            links: [
                { texto: 'Términos de uso', href: '#' },
                { texto: 'Privacidad', href: '#' },
                { texto: 'Derechos de autor', href: '#' }
            ]
        }
    ];

    const el = (tag, clase, texto) => {
        const n = document.createElement(tag);
        if (clase) n.className = clase;
        if (texto !== undefined) n.textContent = texto;
        return n;
    };


    /* ------------------------------ Encabezado ------------------------------ */

    const montarNavbar = () => {
        const nav = el('header', 'navbar');
        nav.innerHTML = '<div class="contenedor" style="display:flex;align-items:center;justify-content:space-between;gap:24px;width:100%">';

        const logo = el('a', 'logo', 'arill');
        logo.href = RUTAS.portada;
        nav.firstChild.appendChild(logo);

        const toggle = el('button', 'menu-toggle');
        toggle.type = 'button';
        toggle.setAttribute('aria-label', 'Abrir menú');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.innerHTML = '<i class="fas fa-bars"></i>';
        nav.firstChild.appendChild(toggle);

        const derecha = el('div', 'menu-right');

        const lista = el('ul', 'nav-links');
        MENU.forEach((item) => {
            const li = el('li', item.destacado ? 'nav-destacado' : null);
            const a = el('a', item.clave === PAGINA_ACTUAL ? 'activo' : null, item.texto);
            a.href = item.href;
            if (item.externo) {
                a.target = '_blank';
                a.rel = 'noopener';
            }
            li.appendChild(a);
            lista.appendChild(li);
        });
        derecha.appendChild(lista);

        const redes = el('ul', 'social-icons');
        REDES.forEach((red) => {
            const li = el('li');
            const a = el('a');
            a.href = red.href;
            a.setAttribute('aria-label', red.etiqueta);
            a.innerHTML = `<i class="fa-brands ${red.icono}"></i>`;
            if (red.href === '#') a.addEventListener('click', (e) => e.preventDefault());
            li.appendChild(a);
            redes.appendChild(li);
        });
        derecha.appendChild(redes);

        nav.firstChild.appendChild(derecha);
        return nav;
    };


    /* ------------------------------ Pie ------------------------------ */

    const montarPie = () => {
        const pie = el('footer', 'pie');
        pie.innerHTML = '<div class="contenedor">';

        const grid = el('div', 'pie-grid');

        const marca = el('div');
        marca.appendChild(el('div', 'pie-marca', 'arill'));
        marca.appendChild(el('p', 'pie-desc',
            'Una biblioteca abierta para músicos. Comparte lo que sabes y encuentra lo que necesitas.'));
        grid.appendChild(marca);

        PIE_COLUMNAS.forEach((columna) => {
            const bloque = el('div');
            bloque.appendChild(el('h4', null, columna.titulo));
            const ul = el('ul');
            columna.links.forEach((link) => {
                const li = el('li');
                const a = el('a', null, link.texto);
                a.href = link.href;
                if (link.href.startsWith('http')) {
                    a.target = '_blank';
                    a.rel = 'noopener';
                }
                li.appendChild(a);
                ul.appendChild(li);
            });
            bloque.appendChild(ul);
            grid.appendChild(bloque);
        });

        pie.firstChild.appendChild(grid);

        const legal = el('div', 'pie-legal');
        legal.appendChild(el('span', null, '© 2026 arill. Todos los derechos reservados.'));
        legal.appendChild(el('span', null, 'Hecho con ♪ por músicos'));
        pie.firstChild.appendChild(legal);

        return pie;
    };


    document.body.prepend(montarNavbar());
    document.body.appendChild(montarPie());


    /* ------------------------------ Menú móvil ------------------------------ */

    const toggle = document.querySelector('.menu-toggle');
    const derecha = document.querySelector('.menu-right');

    if (toggle && derecha) {
        const pintarIcono = () => {
            const icono = toggle.querySelector('i');
            const abierto = derecha.classList.contains('activo');
            icono.classList.toggle('fa-times', abierto);
            icono.classList.toggle('fa-bars', !abierto);
            toggle.setAttribute('aria-expanded', String(abierto));
        };

        toggle.addEventListener('click', () => {
            derecha.classList.toggle('activo');
            pintarIcono();
        });

        document.querySelectorAll('.nav-links a').forEach((a) => {
            a.addEventListener('click', () => {
                if (window.innerWidth <= 900) {
                    derecha.classList.remove('activo');
                    pintarIcono();
                }
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && derecha.classList.contains('activo')) {
                derecha.classList.remove('activo');
                pintarIcono();
            }
        });
    }

});
