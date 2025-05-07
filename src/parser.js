const fs = require('fs').promises;
const path = require('path');

/**
 * Lee y parsea el archivo de abreviaturas
 * @param {string} filePath - Ruta al archivo de abreviaturas
 * @returns {Promise<Object>} - Objeto con las abreviaturas y sus IDs
 */
async function leerAbreviaturas(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error al leer el archivo de abreviaturas: ${error.message}`);
    throw error;
  }
}

/**
 * Lee y parsea el archivo de artículos
 * @param {string} filePath - Ruta al archivo de artículos
 * @returns {Promise<Array>} - Array de objetos con información de artículos
 */
async function leerArticulos(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    const lineas = data.split('\n').filter(linea => linea.trim() !== '');
    
    return lineas.map(linea => {
      // Formato esperado: "Art. 51 CC" o similar
      const regex = /Art\.?\s+(\d+)\s+([A-Z]+)/i;
      const match = linea.match(regex);
      
      if (match) {
        return {
          numero: match[1],
          abreviatura: match[2],
          lineaOriginal: linea.trim()
        };
      } else {
        console.warn(`Formato no reconocido: ${linea}`);
        return null;
      }
    }).filter(Boolean); // Eliminar nulls
  } catch (error) {
    console.error(`Error al leer el archivo de artículos: ${error.message}`);
    throw error;
  }
}

module.exports = {
  leerAbreviaturas,
  leerArticulos
};
