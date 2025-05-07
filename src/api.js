const axios = require('axios');

const BASE_URL = 'https://www.boe.es/datosabiertos/api';

/**
 * Obtiene el análisis de una ley consolidada
 * @param {string} docId - ID del documento (ej: BOE-A-1889-4763)
 * @returns {Promise<Object>} - Datos del análisis
 */
async function obtenerAnalisisLey(docId) {
  try {
    const url = `${BASE_URL}/legislacion-consolidada/id/${docId}/analisis`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener análisis para ${docId}: ${error.message}`);
    if (error.response) {
      console.error(`Estado: ${error.response.status}, Datos: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

/**
 * Obtiene la información de un bloque específico (artículo)
 * @param {string} docId - ID del documento
 * @param {string} idBloque - ID del bloque (artículo)
 * @returns {Promise<Object>} - Datos del bloque
 */
async function obtenerBloque(docId, idBloque) {
  try {
    const url = `${BASE_URL}/legislacion-consolidada/id/${docId}/texto/bloque/${idBloque}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener bloque ${idBloque} del documento ${docId}: ${error.message}`);
    if (error.response) {
      console.error(`Estado: ${error.response.status}, Datos: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

/**
 * Obtiene el índice de una ley
 * @param {string} docId - ID del documento
 * @returns {Promise<Object>} - Índice del documento
 */
async function obtenerIndice(docId) {
  try {
    const url = `${BASE_URL}/legislacion-consolidada/id/${docId}/texto/indice`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener índice para ${docId}: ${error.message}`);
    if (error.response) {
      console.error(`Estado: ${error.response.status}, Datos: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

/**
 * Comprueba si un artículo ha sido modificado desde una fecha dada
 * @param {string} docId - ID del documento (ej: BOE-A-1889-4763)
 * @param {string} numeroArticulo - Número del artículo (ej: "51")
 * @param {Date} fechaReferencia - Fecha desde la que comprobar modificaciones
 * @returns {Promise<Object>} - Información sobre modificaciones
 */
async function comprobarModificacionArticulo(docId, numeroArticulo, fechaReferencia) {
  try {
    // Primero obtenemos el índice para encontrar el ID del bloque del artículo
    const indice = await obtenerIndice(docId);
    
    // Buscamos el artículo en el índice
    const articulo = buscarArticuloEnIndice(indice, numeroArticulo);
    
    if (!articulo) {
      return {
        encontrado: false,
        mensaje: `No se encontró el artículo ${numeroArticulo} en el documento ${docId}`
      };
    }
    
    // Obtenemos el análisis de la ley para ver las modificaciones
    const analisis = await obtenerAnalisisLey(docId);
    
    // Comprobamos si hay modificaciones para este artículo después de la fecha de referencia
    const modificaciones = buscarModificacionesArticulo(analisis, articulo.id, fechaReferencia);
    
    return {
      encontrado: true,
      articuloId: articulo.id,
      titulo: articulo.titulo,
      modificado: modificaciones.modificado,
      fechaUltimaModificacion: modificaciones.fechaUltimaModificacion,
      detallesModificacion: modificaciones.detalles
    };
    
  } catch (error) {
    console.error(`Error al comprobar modificaciones del artículo ${numeroArticulo} en ${docId}: ${error.message}`);
    return {
      encontrado: false,
      error: error.message
    };
  }
}

/**
 * Busca un artículo en el índice de la ley
 * @param {Object} indice - Objeto de índice de la ley
 * @param {string} numeroArticulo - Número del artículo a buscar
 * @returns {Object|null} - Información del artículo encontrado o null
 */
function buscarArticuloEnIndice(indice, numeroArticulo) {
  const buscarEnItems = (items) => {
    for (const item of items || []) {
      // Verificamos si es un artículo con el número buscado
      if (item.tipo === 'articulo' && item.titulo && item.titulo.includes(`Artículo ${numeroArticulo}`)) {
        return item;
      }
      
      // Si tiene subitems, buscamos recursivamente
      if (item.items && item.items.length > 0) {
        const encontrado = buscarEnItems(item.items);
        if (encontrado) return encontrado;
      }
    }
    return null;
  };
  
  return buscarEnItems(indice.items);
}

/**
 * Busca modificaciones de un artículo después de una fecha
 * @param {Object} analisis - Objeto de análisis de la ley
 * @param {string} articuloId - ID del artículo a verificar
 * @param {Date} fechaReferencia - Fecha desde la que comprobar modificaciones
 * @returns {Object} - Información sobre modificaciones
 */
function buscarModificacionesArticulo(analisis, articuloId, fechaReferencia) {
  // Inicializamos resultado
  const resultado = {
    modificado: false,
    fechaUltimaModificacion: null,
    detalles: []
  };
  
  // Verificamos si hay análisis de modificaciones
  if (!analisis.analisis || !analisis.analisis.modificaciones) {
    return resultado;
  }
  
  // Buscamos modificaciones para este artículo
  for (const modificacion of analisis.analisis.modificaciones) {
    // Verificamos si esta modificación afecta al artículo buscado
    if (modificacion.afectado && modificacion.afectado.includes(articuloId)) {
      const fechaMod = new Date(modificacion.fecha);
      
      // Si la modificación es posterior a la fecha de referencia
      if (fechaMod >= fechaReferencia) {
        resultado.modificado = true;
        
        // Actualizar fecha de última modificación si es necesario
        if (!resultado.fechaUltimaModificacion || fechaMod > new Date(resultado.fechaUltimaModificacion)) {
          resultado.fechaUltimaModificacion = modificacion.fecha;
        }
        
        // Añadir detalles de la modificación
        resultado.detalles.push({
          fecha: modificacion.fecha,
          referencia: modificacion.referencia || 'No disponible',
          texto: modificacion.texto || 'No disponible'
        });
      }
    }
  }
  
  return resultado;
}

module.exports = {
  obtenerAnalisisLey,
  obtenerBloque,
  obtenerIndice,
  comprobarModificacionArticulo
};
