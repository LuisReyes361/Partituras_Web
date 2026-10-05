document.addEventListener('DOMContentLoaded', () => {
    const { BACKEND_URL, MAX_FILE_SIZE_MB } = window.PARLH_CONFIG;

    const form = document.getElementById('uploadForm');
    const nombreInput = document.getElementById('nombre');
    const archivoInput = document.getElementById('archivo');
    const submitBtn = form.querySelector('button[type="submit"]');

    const COLOR_BOTON = '#4B2F6D';

    const mostrarError = (titulo, texto) => {
        Swal.fire({
            title: titulo,
            text: texto,
            icon: 'error',
            confirmButtonText: 'Entendido',
            confirmButtonColor: COLOR_BOTON,
        });
    };

    // Autocompleta el nombre con el del archivo y descarta lo que no sea válido.
    // Antes se aceptaba cualquier cosa y el error (si lo había) no se veía
    // hasta que el backend lo rechazaba.
    archivoInput.addEventListener('change', function () {
        const archivo = this.files && this.files[0];

        if (!archivo) {
            return;
        }

        if (archivo.type !== 'application/pdf') {
            this.value = '';
            nombreInput.value = '';
            mostrarError('Archivo no válido', 'Solo se permiten archivos PDF.');
            return;
        }

        if (archivo.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            this.value = '';
            nombreInput.value = '';
            mostrarError('Archivo demasiado grande', `El archivo no puede superar los ${MAX_FILE_SIZE_MB} MB.`);
            return;
        }

        nombreInput.value = archivo.name.replace(/\.[^/.]+$/, '');
    });


    /*
      Devuelve:
        true  -> ya existe
        false -> no existe
        null  -> no se pudo comprobar (servidor caído, error de red)

      Antes devolvía `false` ante cualquier error, es decir "no existe", y la
      subida continuaba. Así un fallo de red creaba duplicados silenciosamente.
    */
    const verificarNombreExistente = async (nombre) => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/partituras/check-name?nombre=${encodeURIComponent(nombre)}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            return data.exists === true;
        } catch (error) {
            console.error('Error al verificar el nombre:', error);
            return null;
        }
    };


    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const nombrePartitura = (formData.get('nombre') || '').trim();
        const textoBoton = submitBtn.textContent;

        if (!nombrePartitura) {
            mostrarError('Falta el nombre', 'Escribe un nombre para la partitura.');
            return;
        }

        // El botón se bloquea ya, antes de la comprobación, para que un doble
        // clic no dispare dos subidas.
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verificando...';

        const existe = await verificarNombreExistente(nombrePartitura);

        if (existe === null) {
            // Fallo cerrado: si no podemos comprobar, no subimos. Es preferible
            // a subir un duplicado sin avisar.
            submitBtn.textContent = textoBoton;
            submitBtn.disabled = false;
            mostrarError(
                'No se pudo conectar',
                'No pudimos verificar si la partitura ya existe. Revisa tu conexión e inténtalo de nuevo.'
            );
            return;
        }

        if (existe) {
            submitBtn.textContent = textoBoton;
            submitBtn.disabled = false;
            mostrarError('¡La partitura ya existe!', 'Ya existe esa partitura. Por favor, elige otro nombre.');
            return;
        }

        submitBtn.textContent = 'Subiendo...';

        try {
            const response = await fetch(`${BACKEND_URL}/api/partituras/uploads`, {
                method: 'POST',
                body: formData
            });

            // El backend siempre responde JSON, pero si se cae a mitad de la
            // subida puede llegar HTML o texto vacío.
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.message || `El servidor respondió con el estado ${response.status}`);
            }

            await Swal.fire({
                title: '¡Éxito!',
                text: 'Partitura agregada correctamente',
                icon: 'success',
                confirmButtonText: 'Aceptar',
                confirmButtonColor: COLOR_BOTON,
                background: '#f8f9fa',
                iconColor: '#28a745'
            });

            form.reset();
        } catch (error) {
            console.error('Error al subir la partitura:', error);
            // Antes este error solo llegaba a la consola: el usuario veía el
            // botón pulsar y no pasar nada, sin ninguna explicación.
            mostrarError('No se pudo subir la partitura', error.message);
        } finally {
            submitBtn.textContent = textoBoton;
            submitBtn.disabled = false;
        }
    });
});
