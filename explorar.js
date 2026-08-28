const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('=== AMBIENTE ===');
console.log('Node.js:', process.version);
console.log('Sistema:', os.platform());
console.log('Pasta atual:', __dirname);

console.log('');
console.log('=== ARQUIVOS NA PASTA ===');
const arquivos = fs.readdirSync('.');
arquivos.forEach(arquivo => {
    console.log(' -', arquivo);

});

console.log('');
console.log('=== CAMINHO DO FUTURO SERVIDOR');
const caminhoServidor = path.join(__dirname, 'servidor.js');
console.log('o servidor ficará em: ', caminhoServidor);

const arquivosJS = arquivos.filter(arquivo => arquivo.endsWith('.js'));
console.log('');
console.log(`Arquivos .js encontrados: ${arquivosJS.length}`);
