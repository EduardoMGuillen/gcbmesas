import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Datos extraídos del PDF
const productos = [
  // SHOTS
  { name: 'DERRAME CEREBRAL', price: 120.00, category: 'SHOTS' },
  { name: 'TUCANAZO', price: 120.00, category: 'SHOTS' },
  { name: 'AGUA DEL ULUA', price: 120.00, category: 'SHOTS' },
  { name: 'MADRAZO', price: 120.00, category: 'SHOTS' },
  { name: 'TURBO', price: 120.00, category: 'SHOTS' },
  { name: 'SUBMARINO', price: 120.00, category: 'SHOTS' },
  { name: 'BIN LADEN', price: 120.00, category: 'SHOTS' },
  { name: 'STOP LIGHT', price: 120.00, category: 'SHOTS' },
  { name: 'MOTHERFUCKER', price: 120.00, category: 'SHOTS' },
  { name: 'LA BARBIE', price: 120.00, category: 'SHOTS' },
  { name: 'VAMPIRO', price: 120.00, category: 'SHOTS' },
  { name: 'SEMEN DE PITUFO', price: 120.00, category: 'SHOTS' },
  { name: 'SEMEN DE MONO', price: 120.00, category: 'SHOTS' },
  { name: 'SEMEN DEL DIABLO', price: 120.00, category: 'SHOTS' },
  { name: 'ORGASMO', price: 120.00, category: 'SHOTS' },
  { name: 'JAGER', price: 100.00, category: 'SHOTS' },
  { name: '1800 CRISTALINO', price: 180.00, category: 'SHOTS' },
  { name: 'JOSE CUERVO', price: 100.00, category: 'SHOTS' },
  { name: 'GRAN MALO', price: 150.00, category: 'SHOTS' },
  { name: 'BLACK LABEL', price: 150.00, category: 'SHOTS' },
  { name: 'TABLA DE SHOTS 8', price: 800.00, category: 'SHOTS' },
  { name: 'TABLA DE SHOTS 12', price: 1100.00, category: 'SHOTS' },
  { name: 'TABLA DE SHOTS 18', price: 1600.00, category: 'SHOTS' },
  { name: 'TABLA DE SHOTS 24', price: 2100.00, category: 'SHOTS' },

  // COCTELES
  { name: 'PIÑA COLADA', price: 150.00, category: 'COCTELES' },
  { name: 'MARGARITA', price: 150.00, category: 'COCTELES' },
  { name: 'BAHAMA MAMA', price: 150.00, category: 'COCTELES' },
  { name: 'SEX ON THE BEACH', price: 150.00, category: 'COCTELES' },
  { name: 'MOJITO CLASICO', price: 150.00, category: 'COCTELES' },
  { name: 'TOM COLLINS', price: 150.00, category: 'COCTELES' },
  { name: 'MICHELADA', price: 150.00, category: 'COCTELES' },
  { name: 'GIN TONIC', price: 150.00, category: 'COCTELES' },
  { name: 'GIN TONIC DE FRESA', price: 150.00, category: 'COCTELES' },
  { name: 'BLUE HAWAI', price: 150.00, category: 'COCTELES' },
  { name: 'APEROL SPRITZ', price: 150.00, category: 'COCTELES' },
  { name: 'VODKA COLLINS', price: 150.00, category: 'COCTELES' },
  { name: 'MOSCOW MULE', price: 150.00, category: 'COCTELES' },
  { name: 'LONG ISLAND TEA', price: 180.00, category: 'COCTELES' },
  { name: 'GIN FRUTOS ROJOS', price: 180.00, category: 'COCTELES' },
  { name: 'STRAWBERRY COLADA', price: 180.00, category: 'COCTELES' },

  // BOTELLAS - VODKA
  { name: 'GREY GOSSE', price: 1900.00, category: 'BOTELLAS' },
  { name: 'ABSOLUT', price: 1500.00, category: 'BOTELLAS' },
  { name: 'SMIRNOFF', price: 1350.00, category: 'BOTELLAS' },

  // BOTELLAS - WHISKY
  { name: 'BLACK LABEL', price: 2100.00, category: 'BOTELLAS' },
  { name: 'BLUE LABEL', price: 15800.00, category: 'BOTELLAS' },
  { name: 'OLD PAR', price: 2600.00, category: 'BOTELLAS' },
  { name: 'BUCHANANS 12 AÑOS', price: 2500.00, category: 'BOTELLAS' },
  { name: 'BUCHANANS 18 AÑOS', price: 4500.00, category: 'BOTELLAS' },

  // BOTELLAS - RON
  { name: 'FLOR DE CAÑA 4 AÑOS', price: 980.00, category: 'BOTELLAS' },
  { name: 'FLOR DE CAÑA 7 AÑOS', price: 1200.00, category: 'BOTELLAS' },
  { name: 'FLOR DE CAÑA 12 AÑOS', price: 2000.00, category: 'BOTELLAS' },
  { name: 'FLOR DE CAÑA 18 AÑOS', price: 2800.00, category: 'BOTELLAS' },

  // BOTELLAS - TEQUILA
  { name: '1800 CRISTALINO', price: 2600.00, category: 'BOTELLAS' },
  { name: 'JOSE CUERVO', price: 1200.00, category: 'BOTELLAS' },

  // BOTELLAS - ESPECIALES
  { name: 'BOTELLA KAMIKAZE', price: 600.00, category: 'BOTELLAS' },
  { name: 'BOTELLA KAMIKUYAZO', price: 600.00, category: 'BOTELLAS' },

  // BOTELLAS - GINEBRAS
  { name: 'BOMBAY', price: 2000.00, category: 'BOTELLAS' },
  { name: 'GIN HENDRICKS', price: 3200.00, category: 'BOTELLAS' },
  { name: 'JAGER', price: 1500.00, category: 'BOTELLAS' },

  // REFRESCOS
  { name: 'GASEOSAS', price: 50.00, category: 'REFRESCOS' },
  { name: 'AGUA', price: 50.00, category: 'REFRESCOS' },
  { name: 'AGUA TONICA', price: 50.00, category: 'REFRESCOS' },
  { name: 'SODA LATA', price: 50.00, category: 'REFRESCOS' },
  { name: 'ADRENALINA', price: 100.00, category: 'REFRESCOS' },
  { name: 'NATURALES', price: 100.00, category: 'REFRESCOS' },
  { name: 'JUGO DE PIÑA', price: 100.00, category: 'REFRESCOS' },
  { name: 'JUGO DE NARANJA', price: 100.00, category: 'REFRESCOS' },
  { name: 'CRAMBERRY', price: 150.00, category: 'REFRESCOS' },
]

async function main() {
  console.log('🍺 Iniciando importación de bebidas...\n')

  let created = 0
  let skipped = 0
  let errors = 0

  for (const producto of productos) {
    try {
      // Verificar si el producto ya existe
      const existing = await prisma.product.findFirst({
        where: {
          name: producto.name,
          category: producto.category,
        },
      })

      if (existing) {
        console.log(`⏭️  Ya existe: ${producto.name} (${producto.category})`)
        skipped++
        continue
      }

      // Crear el producto
      await prisma.product.create({
        data: {
          name: producto.name,
          price: producto.price,
          category: producto.category,
          isActive: true,
        },
      })

      console.log(`✅ Creado: ${producto.name} - L.${producto.price.toFixed(2)} (${producto.category})`)
      created++
    } catch (error: any) {
      console.error(`❌ Error al crear ${producto.name}:`, error.message)
      errors++
    }
  }

  console.log('\n📊 Resumen:')
  console.log(`   ✅ Creados: ${created}`)
  console.log(`   ⏭️  Omitidos (ya existían): ${skipped}`)
  console.log(`   ❌ Errores: ${errors}`)
  console.log(`   📦 Total procesados: ${productos.length}`)
}

main()
  .catch((e) => {
    console.error('Error fatal:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

