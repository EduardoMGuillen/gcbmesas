// Script para obtener la IP local en Windows
const { exec } = require('child_process');

exec('ipconfig', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }

  const lines = stdout.split('\n');
  let foundAdapter = false;
  let ipAddress = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Buscar adaptadores de red activos (Ethernet o Wi-Fi)
    if (line.includes('Adaptador de Ethernet') || 
        line.includes('Adaptador de LAN inalámbrica') ||
        line.includes('Wireless LAN adapter') ||
        line.includes('Ethernet adapter')) {
      foundAdapter = true;
      continue;
    }

    // Buscar la dirección IPv4
    if (foundAdapter && line.includes('Dirección IPv4') || line.includes('IPv4 Address')) {
      const match = line.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
      if (match && !match[1].startsWith('169.254')) { // Ignorar IPs de link-local
        ipAddress = match[1];
        break;
      }
    }

    // Si encontramos una línea vacía después de un adaptador, resetear
    if (foundAdapter && line === '') {
      foundAdapter = false;
    }
  }

  if (ipAddress) {
    console.log('\n✅ IP Local encontrada:');
    console.log(`   ${ipAddress}`);
    console.log('\n📱 Para acceder desde tu iPad, usa:');
    console.log(`   http://${ipAddress}:3000`);
    console.log('\n💡 Asegúrate de usar: npm run dev:network\n');
  } else {
    console.log('\n❌ No se pudo encontrar una IP local válida.');
    console.log('   Verifica que estés conectado a una red Wi-Fi o Ethernet.\n');
  }
});

