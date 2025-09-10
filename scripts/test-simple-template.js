const DocxTemplater = require('docxtemplater');
const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');

async function testSimpleTemplate() {
  try {
    console.log('🧪 Testando template ETP.docx com dados simples...');
    
    const templatePath = path.join(process.cwd(), 'documentos', 'ETP.docx');
    const content = fs.readFileSync(templatePath);
    const zip = new PizZip(content);
    
    // Dados mínimos para teste
    const testData = {
      numero_etp: 'TESTE-001/2025',
      numero_sgd: '2025/09099/017491'
    };
    
    console.log('📋 Dados de teste:', JSON.stringify(testData, null, 2));
    
    const doc = new DocxTemplater(zip, { 
      paragraphLoop: true, 
      linebreaks: true, 
      nullGetter: () => "",
      delimiters: {
        start: '{',
        end: '}'
      }
    });
    
    console.log('🔧 Renderizando template...');
    doc.render(testData);
    console.log('✅ Template renderizado com sucesso');
    
    const buf = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
    
    const outputPath = path.join(process.cwd(), 'documentos', 'gerados', 'teste-simples.docx');
    fs.writeFileSync(outputPath, buf);
    
    console.log('✅ Arquivo de teste gerado:', outputPath);
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    if (error.properties && error.properties.errors) {
      console.error('📋 Erros detalhados:');
      error.properties.errors.forEach((err, index) => {
        console.error(`  ${index + 1}. ${err.name}: ${err.message}`);
      });
    }
  }
}

testSimpleTemplate();
