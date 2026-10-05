/*
  Configuración compartida por todos los scripts del frontend.

  Antes la URL del backend estaba escrita a mano en script.js y en
  scripbuscar.js. Si una cambiaba y la otra no, el buscador y el formulario de

  Apuntaban a servidores distintos y la app parecía medio desconectada.

  Se carga antes que el resto de scripts en cada página.
*/

window.PARLH_CONFIG = {
    BACKEND_URL: 'https://partiturasweb-production.up.railway.app',
    MAX_FILE_SIZE_MB: 25
};
