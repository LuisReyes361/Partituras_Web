/*
  Pantalla de bienvenida.

  Se muestra al entrar al sitio y desaparece al presionar "Entrar". Aparece
  otra vez en la próxima visita: por eso guarda la marca en sessionStorage y
  no en localStorage (que recordaría para siempre).
*/
document.addEventListener('DOMContentLoaded', () => {
    const pantalla = document.getElementById('pantallaBienvenida');
    const boton = document.getElementById('btnEntrar');

    if (!pantalla || !boton) {
        return;
    }

    // Si ya se presionó en esta visita, no se vuelve a mostrar.
    try {
        if (sessionStorage.getItem('bienvenidaVista')) {
            pantalla.remove();
            return;
        }
        sessionStorage.setItem('bienvenidaVista', '1');
    } catch (error) {
        // En modo privado el navegador puede bloquear sessionStorage. En ese
        // caso se muestra siempre: es mejor que salga de más a que no salga.
    }

    const salir = () => {
        pantalla.classList.add('saliendo');
        setTimeout(() => pantalla.remove(), 400);
    };

    boton.addEventListener('click', salir);

    // Por si alguien tiene el teclado abierto: Enter también cierra.
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
            salir();
        }
    });
});
