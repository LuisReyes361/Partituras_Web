const form = document.getElementById('uploadForm');
const nombreInput = document.getElementById('nombre');

document.getElementById('archivo').addEventListener('change', function() {
    if (this.files && this.files[0]) {
        nombreInput.value = this.files[0].name.replace(/\.[^/.]+$/, "");
    }
});


const verificarNombreExistente = async (nombre) => {
    try {
        const response = await fetch(`http://localhost:5000/api/partituras/check-name?nombre=${encodeURIComponent(nombre)}`);
        const data = await response.json();
        return data.exists; 
    } catch (error) {
        console.error('Error en verificación:', error);
        return false; 
    }
};

form.addEventListener('submit', async (e) => { 
    e.preventDefault();
    const formData = new FormData(form);
    const nombrePartitura = formData.get('nombre'); 
    const submitBtn = form.querySelector(`button[type="submit"]`);
    const originalBtnText = submitBtn.textContent;
    
    
    const nombreExiste = await verificarNombreExistente(nombrePartitura);
    if (nombreExiste) {
        Swal.fire({
            title: '¡La partitura ya existe!',
            text: 'Ya existe esa partitura. Por favor, eliga otra.',
            icon: 'error',
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#4B2F6D',
        });
        return; 
    }
    
    
    submitBtn.textContent =`subiendo`
    submitBtn.disabled = true
    
    fetch('http://localhost:5000/api/partituras/uploads', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error en la subida: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.message) {
            console.log(data.message); 
            
             Swal.fire({
                title: '¡Éxito!',
                text: 'Partitura agregada correctamente',
                icon: 'success',
                confirmButtonText: 'Aceptar',
                confirmButtonColor: '#4B2F6D',
                background: '#f8f9fa',
                iconColor: '#28a745'
            });
            
            form.reset();
          }
        
    })
    .catch(error => {
        console.error('Error al subir la partitura:', error.message);
    })
    .finally(() => {
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
    });
});