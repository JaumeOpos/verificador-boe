const path = require('path');
const readline = require('readline-sync');
const { format, parse } = require('date-fns');
const { es } = require('date-fns/locale');

const { leerAbreviaturas, leerArticulos } = require('./parser');
const { comprobarModificacionArticulo } = require('./api');
const { generarInforme } = require('./reporter');

// Rutas de archivos
const DATA_DIR = path.join(__dirname, '..', 'data');
const ABREVIATURAS_PATH = path.join(DATA_DIR, 'abreviaturas.json');
const ARTICULOS_PATH = path.join(DATA_DIR, 'articulos.txt');
const OUTPUT_DIR = path.join(__dirname, '..', 'informes');

/**
 * Función principal
 */
async function main() {
  try {
    console.log('=== Verificador de modificaciones de artículos legales ===\n');
    
    // Solicitar fecha de referencia
    const fechaStr = readline.question('Introduce la fecha de referencia (DD/MM/YYYY): ');
    let fechaReferencia;
    
    try {
      fechaReferencia = parse(fechaStr, 'dd/MM/yyyy', new Date(), { locale: es });
      if (isNaN(fechaReferencia)) throw new Error('Fecha inválida');
    } catch (error) {
      console.error('Formato de fecha incorrecto. Usando fecha actual.');
      fechaReferencia = new Date();
    }
    
    console.log(`\nVerificando modificaciones posteriores a: ${format(fechaReferencia, 'dd/MM/yyyy', { locale: es })}`);
    
    // Cargar abreviaturas y artículos
    console.log('\nCargando datos...');
    const abreviaturas = await leerAbreviaturas(ABREVIATURAS_PATH);
    const articulos = await leerArticulos(ARTICULOS_PATH);
    
    console.log(`Se han cargado ${Object.keys(abreviaturas).length} abreviaturas y ${articulos.length} artículos.`);
    
    // Verificar cada artículo
    console.log('\nVerificando modificaciones en los artículos...');
    const resultados = [];
    
    for (let i = 0; i < articulos.length; i++) {
      const articulo = articulos[i];
      console.log(`[${i+1}/${articulos.length}] Verificando ${articulo.lineaOriginal}...`);
      
      // Verificar que la abreviatura existe
      if (!abreviaturas[articulo.abreviatura]) {
        console.warn(`  ⚠️ Abreviatura no reconocida: ${articulo.abreviatura}`);
        resultados.push({
          ...articulo,
          encontrado: false,
          mensaje: `Abreviatura no reconocida: ${articulo.abreviatura}`
        });
        continue;
      }
      
      const docId = abreviaturas[articulo.abreviatura].id;
      
      try {
        // Consultar a la API del BOE
        const resultado = await comprobarModificacionArticulo(docId, articulo.numero, fechaReferencia);
        
        // Añadir información adicional al resultado
        resultados.push({
          ...articulo,
          ...resultado,
          docId,
          nombreLey: abreviaturas[articulo.abreviatura].nombre
        });
        
        // Mostrar resultado en consola
        if (resultado.encontrado) {
          if (resultado.modificado) {
            console.log(`  ✅ Modificado: última modificación el ${resultado.fechaUltimaModificacion || 'fecha no disponible'}`);
          } else {
            console.log(`  ℹ️ No modificado desde la fecha de referencia`);
          }
        } else {
          console.log(`  ❌ ${resultado.mensaje}`);
        }
      } catch (error) {
        console.error(`  ❌ Error: ${error.message}`);
        resultados.push({
          ...articulo,
          encontrado: false,
          error: error.message,
          docId
        });
      }
    }
    
    // Crear directorio de informes si no existe
    const fs = require('fs');
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    // Generar informe
    console.log('\nGenerando informe...');
    const rutaInforme = await generarInforme(resultados, fechaReferencia, OUTPUT_DIR);
    
    console.log('\n¡Proceso completado!');
    console.log(`El informe se ha guardado en: ${rutaInforme}`);
    
  } catch (error) {
    console.error('Error en la ejecución del programa:');
    console.error(error);
  }
}

// Ejecutar función principal
main().catch(console.error);
