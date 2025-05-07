const fs = require('fs').promises;
const path = require('path');
const { format } = require('date-fns');
const { es } = require('date-fns/locale');

/**
 * Genera un informe en formato markdown
 * @param {Array} resultados - Resultados de la verificación
 * @param {Date} fechaReferencia - Fecha de referencia utilizada
 * @param {string} outputPath - Ruta donde guardar el informe
 * @returns {Promise<string>} - Ruta del archivo generado
 */
async function generarInforme(resultados, fechaReferencia, outputPath) {
  const fechaFormateada = format(fechaReferencia, 'dd/MM/yyyy', { locale: es });
  const fechaInforme = format(new Date(), 'dd/MM/yyyy HH:mm:ss', { locale: es });
  
  let contenido = `# Informe de modificaciones de artículos legales\n\n`;
  contenido += `**Fecha de referencia:** ${fechaFormateada}\n`;
  contenido += `**Fecha del informe:** ${fechaInforme}\n\n`;
  
  // Contadores para el resumen
  let totalArticulos = resultados.length;
  let articulosModificados = 0;
  let articulosNoEncontrados = 0;
  let articulosConError = 0;
  
  // Clasificar resultados
  const modificados = [];
  const noModificados = [];
  const noEncontrados = [];
  const conError = [];
  
  resultados.forEach(resultado => {
    if (!resultado.encontrado) {
      if (resultado.error) {
        articulosConError++;
        conError.push(resultado);
      } else {
        articulosNoEncontrados++;
        noEncontrados.push(resultado);
      }
    } else if (resultado.modificado) {
      articulosModificados++;
      modificados.push(resultado);
    } else {
      noModificados.push(resultado);
    }
  });
  
  // Resumen
  contenido += `## Resumen\n\n`;
  contenido += `- **Total de artículos verificados:** ${totalArticulos}\n`;
  contenido += `- **Artículos modificados desde ${fechaFormateada}:** ${articulosModificados}\n`;
  contenido += `- **Artículos no modificados:** ${totalArticulos - articulosModificados - articulosNoEncontrados - articulosConError}\n`;
  contenido += `- **Artículos no encontrados:** ${articulosNoEncontrados}\n`;
  contenido += `- **Artículos con error en la consulta:** ${articulosConError}\n\n`;
  
  // Sección de artículos modificados
  if (modificados.length > 0) {
    contenido += `## Artículos modificados\n\n`;
    modificados.forEach(art => {
      contenido += `### ${art.lineaOriginal}\n\n`;
      contenido += `- **ID en el BOE:** ${art.docId}\n`;
      contenido += `- **Fecha última modificación:** ${art.fechaUltimaModificacion || 'No disponible'}\n`;
      
      if (art.detallesModificacion && art.detallesModificacion.length > 0) {
        contenido += `- **Detalles de las modificaciones:**\n`;
        art.detallesModificacion.forEach(mod => {
          contenido += `  - ${mod.fecha}: ${mod.texto} (Ref: ${mod.referencia})\n`;
        });
      }
      
      contenido += `\n`;
    });
  }
  
  // Sección de artículos no encontrados
  if (noEncontrados.length > 0) {
    contenido += `## Artículos no encontrados\n\n`;
    noEncontrados.forEach(art => {
      contenido += `- ${art.lineaOriginal} (${art.docId})\n`;
    });
    contenido += `\n`;
  }
  
  // Sección de artículos con error
  if (conError.length > 0) {
    contenido += `## Artículos con error en la consulta\n\n`;
    conError.forEach(art => {
      contenido += `- ${art.lineaOriginal} (${art.docId}): ${art.error}\n`;
    });
    contenido += `\n`;
  }
  
  // Guardar el informe
  const nombreArchivo = `informe_${format(new Date(), 'yyyyMMdd_HHmmss')}.md`;
  const rutaCompleta = path.join(outputPath, nombreArchivo);
  
  await fs.writeFile(rutaCompleta, contenido, 'utf8');
  console.log(`Informe generado en: ${rutaCompleta}`);
  
  return rutaCompleta;
}

module.exports = {
  generarInforme
};
