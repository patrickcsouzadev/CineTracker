#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ICON_CONFIG = {
    sourceImage: 'assets/source-icon.png',
    outputDir: 'assets',
    formats: {
        ico: {
            name: 'icon.ico',
            sizes: [16, 24, 32, 48, 64, 128, 256],
            description: 'Ícone para Windows (.ico)'
        },
        icns: {
            name: 'icon.icns',
            sizes: [16, 32, 128, 256, 512, 1024],
            description: 'Ícone para macOS (.icns)'
        },
        png: {
            name: 'icon.png',
            sizes: [512],
            description: 'Ícone PNG para Linux'
        }
    }
};

function log(message, color = '') {
    const colors = {
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        reset: '\x1b[0m'
    };
    console.log(`${colors[color] || ''}${message}${colors.reset}`);
}

function createDefaultIcon() {
    log('🎨 Criando ícone padrão...', 'blue');
    
    const svgIcon = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Background gradient -->
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2563eb;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="film" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#fbbf24;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f59e0b;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background circle -->
  <circle cx="256" cy="256" r="240" fill="url(#bg)" stroke="#1e40af" stroke-width="8"/>
  
  <!-- Film reel -->
  <circle cx="200" cy="180" r="80" fill="url(#film)" stroke="#d97706" stroke-width="4"/>
  <circle cx="200" cy="180" r="25" fill="none" stroke="#92400e" stroke-width="6"/>
  <circle cx="170" cy="150" r="8" fill="#92400e"/>
  <circle cx="230" cy="150" r="8" fill="#92400e"/>
  <circle cx="230" cy="210" r="8" fill="#92400e"/>
  <circle cx="170" cy="210" r="8" fill="#92400e"/>
  
  <!-- TV/Monitor -->
  <rect x="250" y="280" width="180" height="120" rx="15" fill="#374151" stroke="#1f2937" stroke-width="4"/>
  <rect x="270" y="300" width="140" height="80" fill="#111827"/>
  
  <!-- Screen content (series bars) -->
  <rect x="280" y="315" width="120" height="8" fill="#10b981"/>
  <rect x="280" y="330" width="90" height="8" fill="#6b7280"/>
  <rect x="280" y="345" width="110" height="8" fill="#10b981"/>
  <rect x="280" y="360" width="75" height="8" fill="#6b7280"/>
  
  <!-- Play button -->
  <polygon points="320,340 360,320 360,360" fill="#ef4444"/>
  
  <!-- Stand -->
  <rect x="320" y="400" width="40" height="30" fill="#6b7280"/>
  <rect x="300" y="430" width="80" height="15" rx="7" fill="#4b5563"/>
  
  <!-- Decorative stars -->
  <text x="100" y="120" font-family="Arial" font-size="40" fill="#fbbf24">⭐</text>
  <text x="400" y="140" font-family="Arial" font-size="30" fill="#fbbf24">⭐</text>
  <text x="80" y="380" font-family="Arial" font-size="25" fill="#fbbf24">⭐</text>
</svg>`;

    const svgPath = path.join(ICON_CONFIG.outputDir, 'icon.svg');
    fs.writeFileSync(svgPath, svgIcon);
    
    log('\n📝 Ícone SVG criado em: ' + svgPath, 'green');
    log('\n🔧 Para gerar ícones em outros formatos, use:');
    log('   • Inkscape: File → Export → selecione tamanho e formato');
    log('   • GIMP: Abra SVG → Export As → escolha formato');
    log('   • Online: convertio.co, cloudconvert.com');
    log('   • ImageMagick: convert icon.svg -resize 512x512 icon.png');
    
    return svgPath;
}

function checkRequirements() {
    log('🔍 Verificando requisitos...', 'blue');
    
    if (!fs.existsSync(ICON_CONFIG.outputDir)) {
        fs.mkdirSync(ICON_CONFIG.outputDir, { recursive: true });
        log('📁 Pasta assets criada', 'green');
    }
    
    if (!fs.existsSync(ICON_CONFIG.sourceImage)) {
        log('⚠️ Imagem fonte não encontrada: ' + ICON_CONFIG.sourceImage, 'yellow');
        log('🎨 Criando ícone padrão...', 'blue');
        return createDefaultIcon();
    }
    
    log('✅ Imagem fonte encontrada: ' + ICON_CONFIG.sourceImage, 'green');
    return ICON_CONFIG.sourceImage;
}

function generateInstructions() {
    log('\n' + '='.repeat(60), 'blue');
    log('📖 INSTRUÇÕES PARA CUSTOMIZAR ÍCONES', 'blue');
    log('='.repeat(60), 'blue');
    
    log('\n🎯 1. PREPARAR IMAGEM FONTE:');
    log('   • Tamanho: 512x512 pixels ou maior');
    log('   • Formato: PNG com fundo transparente');
    log('   • Qualidade: Alta resolução, bordas nítidas');
    log('   • Nome: assets/source-icon.png');
    
    log('\n🛠️ 2. FERRAMENTAS RECOMENDADAS:');
    log('   • Online: favicon.io, realfavicongenerator.net');
    log('   • Desktop: GIMP, Photoshop, Inkscape');
    log('   • CLI: ImageMagick, icon-gen (npm)');
    
    log('\n📁 3. ÍCONES NECESSÁRIOS:');
    Object.entries(ICON_CONFIG.formats).forEach(([format, config]) => {
        log(`   • ${config.name.padEnd(12)} - ${config.description}`);
        log(`     Tamanhos: ${config.sizes.join(', ')}px`);
    });
    
    log('\n🔄 4. CONVERSÃO AUTOMÁTICA (ImageMagick):');
    log('   # Instalar ImageMagick primeiro');
    log('   convert source-icon.png -resize 16x16 icon-16.png');
    log('   convert source-icon.png -resize 32x32 icon-32.png');
    log('   # ... repetir para todos os tamanhos');
    
    log('\n🌐 5. CONVERSÃO ONLINE:');
    log('   • favicon.io - Gera todos os formatos automaticamente');
    log('   • convertio.co - Conversões individuais');
    log('   • cloudconvert.com - Batch conversion');
    
    log('\n📦 6. VALIDAÇÃO:');
    log('   • Windows: Verificar icon.ico no Explorer');
    log('   • macOS: Verificar icon.icns no Finder');
    log('   • Linux: Verificar icon.png (512x512)');
}

function generateBuildConfig() {
    log('\n🔧 Gerando configuração avançada de build...', 'blue');
    
    const advancedConfig = {
        productName: "Movie & Series Tracker",
        appId: "com.movietracker.app",
        directories: {
            output: "dist",
            buildResources: "assets"
        },
        files: [
            "**/*",
            "!dist/**/*",
            "!node_modules/**/*",
            "node_modules/sqlite3/**/*",
            "node_modules/axios/**/*"
        ],
        win: {
            target: "nsis",
            icon: "assets/icon.ico",
            publisherName: "Movie Tracker Team",
            requestedExecutionLevel: "asInvoker"
        },
        nsis: {
            oneClick: false,
            perMachine: false,
            allowToChangeInstallationDirectory: true,
            createDesktopShortcut: true,
            createStartMenuShortcut: true,
            shortcutName: "Movie & Series Tracker",
            uninstallDisplayName: "Movie & Series Tracker",
            license: "LICENSE.txt",
            installerIcon: "assets/icon.ico",
            uninstallerIcon: "assets/icon.ico",
            installerHeaderIcon: "assets/icon.ico"
        },
        mac: {
            target: "dmg",
            icon: "assets/icon.icns",
            category: "public.app-category.entertainment",
            bundleVersion: "1.0.0"
        },
        dmg: {
            title: "Movie & Series Tracker",
            icon: "assets/icon.icns",
            background: "assets/dmg-background.png",
            contents: [
                { x: 130, y: 220, type: "file" },
                { x: 410, y: 220, type: "link", path: "/Applications" }
            ]
        },
        linux: {
            target: "AppImage",
            icon: "assets/icon.png",
            category: "AudioVideo;Video;Entertainment",
            synopsis: "Track your watched movies and TV series",
            maintainer: "movietracker@example.com"
        }
    };
        const configPath = path.join('build-config.json');
    fs.writeFileSync(configPath, JSON.stringify(advancedConfig, null, 2));
    
    log('✅ Configuração salva em: build-config.json', 'green');
    log('💡 Adicione ao package.json em "build": { ...config... }', 'yellow');
    
    return configPath;
}

function main() {
    log('🎨 GERADOR DE ÍCONES PARA ELECTRON', 'blue');
    log('================================', 'blue');
    
    try {
        const sourcePath = checkRequirements();
        generateInstructions();
        generateBuildConfig();
        
        log('\n🎉 Processo concluído!', 'green');
        log('\n📋 Próximos passos:');
        log('   1. Customize os ícones conforme as instruções');
        log('   2. Execute: node build.js');
        log('   3. Teste os executáveis gerados');
        
        log('\n📁 Status atual dos ícones:');
        Object.entries(ICON_CONFIG.formats).forEach(([format, config]) => {
            const iconPath = path.join(ICON_CONFIG.outputDir, config.name);
            const exists = fs.existsSync(iconPath);
            const status = exists ? '✅ Existe' : '❌ Faltando';
            log(`   ${config.name.padEnd(12)} ${status}`);
        });
        
    } catch (error) {
        log('❌ Erro: ' + error.message, 'red');
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    ICON_CONFIG,
    createDefaultIcon,
    generateInstructions,
    main
};