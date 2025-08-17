const form = document.getElementById('uploadForm');
form.addEventListener('submit', (e) => {
  e.preventDefault();

  const formData = new FormData(form);

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
    }
  })
  .catch(error => {
    console.error('Error al subir la partitura:', error.message);
  });
});
