/*
  Comportamiento del menú hamburguesa.

  Estas ~25 líneas estaban copiadas dentro de un <script> inline en las tres
  páginas, con tres copias que podían desincronizarse. Ahora hay una sola.
*/
document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.querySelector('.menu-toggle');
    const menuRight = document.querySelector('.menu-right');

    // La página puede no tener navbar; en ese caso no hay nada que hacer.
    if (!menuToggle || !menuRight) {
        return;
    }

    const actualizarIcono = () => {
        const icon = menuToggle.querySelector('i');

        if (!icon) {
            return;
        }

        const abierto = menuRight.classList.contains('active');
        icon.classList.toggle('fa-times', abierto);
        icon.classList.toggle('fa-bars', !abierto);
    };

    menuToggle.addEventListener('click', () => {
        menuRight.classList.toggle('active');
        actualizarIcono();
    });

    // Cerrar el menú al navegar solo importa en móvil (en escritorio el menú
    // hamburguesa está oculto y los enlaces se ven siempre).
    document.querySelectorAll('.nav-links a').forEach((link) => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 900) {
                menuRight.classList.remove('active');
                actualizarIcono();
            }
        });
    });

    // El menú móvil es una capa a pantalla completa: Escape debería cerrarlo.
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menuRight.classList.contains('active')) {
            menuRight.classList.remove('active');
            actualizarIcono();
        }
    });
});
