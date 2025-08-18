
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search');
    const resultadosList = document.getElementById('resultados');

    if (searchInput) {
        searchInput.addEventListener('input', async () => {
            const query = searchInput.value.trim();

            if (query.length > 2) {
                try {
                    const response = await fetch(`http://localhost:5000/api/partituras/buscar?q=${query}`);
                    
                    if (!response.ok) {
                        throw new Error('Error al buscar partituras');
                    }

                    const partituras = await response.json();
                    resultadosList.innerHTML = '';

                    if (partituras.length > 0) {
                        partituras.forEach(partitura => {
                            const li = document.createElement('li');
                            li.textContent = partitura.nombre;
                            resultadosList.appendChild(li);
                        });
                    } else {
                        resultadosList.innerHTML = '<li>No se encontraron partituras.</li>';
                    }
                } catch (error) {
                    console.error('Error al buscar:', error);
                    resultadosList.innerHTML = '<li>Hubo un error al conectar con el servidor.</li>';
                }
            } else {
                resultadosList.innerHTML = '';
            }
        });
    }
});