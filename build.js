#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const BUILD_CONFIG = {
    appName: 'CineTracker',
    version: '1.0.0',
    author: 'PTK',
    description: 'Software para gerenciar filmes e séries assistidos',
    platforms: {
        windows: true,
        mac: true,
        linux: true
    },
    createInstallers: true,
    cleanDist: true
};

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
    log(`\n🔨 [${step}] ${message}`, 'cyan');
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logWarning(message) {
    log(`⚠️ ${message}`, 'yellow');
}

function checkDependencies() {
    logStep('1/6', 'Verificando dependências...');
    
    try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const requiredDeps = ['electron', 'electron-builder'];
        
        for (const dep of requiredDeps) {
            if (!packageJson.devDependencies[dep] && !packageJson.dependencies[dep]) {
                throw new Error(`Dependência ${dep} não encontrada`);
            }
        }
        
        logSuccess('Todas as dependências estão instaladas');
    } catch (error) {
        logError(`Erro ao verificar dependências: ${error.message}`);
        process.exit(1);
    }
}

function cleanDist() {
    if (!BUILD_CONFIG.cleanDist) return;
    
    logStep('2/6', 'Limpando pasta dist...');
    
    try {
        if (fs.existsSync('dist')) {
            fs.rmSync('dist', { recursive: true, force: true });
            logSuccess('Pasta dist limpa');
        } else {
            log('Pasta dist não existe, continuando...');
        }
    } catch (error) {
        logWarning(`Não foi possível limpar pasta dist: ${error.message}`);
    }
}

function createDirectories() {
    logStep('3/6', 'Criando estrutura de pastas...');
    
    const dirs = ['assets', 'posters', 'data'];
    
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            logSuccess(`Pasta ${dir} criada`);
        }
    });
}

function checkIcons() {
    logStep('4/6', 'Verificando ícones...');
    
    const iconPaths = {
        ico: 'assets/icon.ico',
        icns: 'assets/icon.icns',
        png: 'assets/icon.png'
    };
    
    let iconsExist = true;
    
    Object.entries(iconPaths).forEach(([format, path]) => {
        if (!fs.existsSync(path)) {
            logWarning(`Ícone ${format.toUpperCase()} não encontrado: ${path}`);
            iconsExist = false;
        } else {
            logSuccess(`Ícone ${format.toUpperCase()} encontrado`);
        }
    });
    
    if (!iconsExist) {
        logWarning('Alguns ícones estão faltando. O build continuará com ícones padrão.');
        logWarning('Para customizar, adicione os ícones na pasta assets/');
    }
    
    return iconsExist;
}

function buildPlatform(platform) {
    log(`\n📦 Construindo para ${platform}...`, 'magenta');
    
    const commands = {
        windows: 'npm run build-win',
        mac: 'npm run build-mac',
        linux: 'npm run build-linux'
    };
    
    try {
        execSync(commands[platform], { stdio: 'inherit' });
        logSuccess(`Build para ${platform} concluído!`);
        return true;
    } catch (error) {
        logError(`Erro no build para ${platform}: ${error.message}`);
        return false;
    }
}

function buildAll() {
    logStep('5/6', 'Iniciando builds...');
    
    const results = {};
    const currentPlatform = os.platform();
    
    const platformMap = {
        win32: ['windows', 'linux'],
        darwin: ['mac', 'linux', 'windows'],
        linux: ['linux', 'windows']
    };
    
    const availablePlatforms = platformMap[currentPlatform] || ['linux'];
    
    Object.entries(BUILD_CONFIG.platforms).forEach(([platform, enabled]) => {
        if (!enabled) {
            log(`⏭️ Pulando ${platform} (desabilitado na configuração)`);
            return;
        }
        
        if (!availablePlatforms.includes(platform)) {
            logWarning(`Não é possível buildar ${platform} no sistema ${currentPlatform}`);
            results[platform] = false;
            return;
        }
        
        results[platform] = buildPlatform(platform);
    });
    
    return results;
}

function listGeneratedFiles() {
    logStep('6/6', 'Listando arquivos gerados...');
    
    if (!fs.existsSync('dist')) {
        logWarning('Pasta dist não encontrada');
        return;
    }
    
    try {
        const files = fs.readdirSync('dist');
        
        if (files.length === 0) {
            logWarning('Nenhum arquivo encontrado na pasta dist');
            return;
        }
        
        log('\n📁 Arquivos gerados:', 'bright');
        files.forEach(file => {
            const filePath = path.join('dist', file);
            const stats = fs.statSync(filePath);
            const size = (stats.size / 1024 / 1024).toFixed(2);
            
            let icon = '📄';
            if (file.endsWith('.exe')) icon = '🪟';
            else if (file.endsWith('.dmg')) icon = '🍎';
            else if (file.endsWith('.AppImage')) icon = '🐧';
            else if (file.endsWith('.deb')) icon = '📦';
            
            log(`  ${icon} ${file} (${size} MB)`);
        });
        
    } catch (error) {
        logError(`Erro ao listar arquivos: ${error.message}`);
    }
}

function generateReport(results) {
    log('\n' + '='.repeat(50), 'bright');
    log('📊 RELATÓRIO FINAL DO BUILD', 'bright');
    log('='.repeat(50), 'bright');
    
    log(`\n🎯 Aplicativo: ${BUILD_CONFIG.appName}`);
    log(`📋 Versão: ${BUILD_CONFIG.version}`);
    log(`👤 Autor: ${BUILD_CONFIG.author}`);
    
    log('\n🚀 Status por Plataforma:');
    Object.entries(results).forEach(([platform, success]) => {
        const status = success ? '✅ Sucesso' : '❌ Falhou';
        const icon = platform === 'windows' ? '🪟' : platform === 'mac' ? '🍎' : '🐧';
        log(`  ${icon} ${platform.padEnd(10)} ${status}`);
    });
    
    const successful = Object.values(results).filter(Boolean).length;
    const total = Object.keys(results).length;
    
    log(`\n📈 Resumo: ${successful}/${total} builds bem-sucedidos`);
    
    if (successful > 0) {
        log('\n🎉 Build concluído! Arquivos prontos para distribuição na pasta dist/', 'green');
        log('\n📝 Próximos passos:');
        log('  1. Teste os executáveis em máquinas limpas');
        log('  2. Crie releases no GitHub/GitLab');
        log('  3. Distribua para os usuários');
    } else {
        log('\n💥 Todos os builds falharam. Verifique os erros acima.', 'red');
    }
}

function main() {
    const startTime = Date.now();
    
    log('🚀 INICIANDO BUILD AUTOMATIZADO', 'bright');
    log(`📦 ${BUILD_CONFIG.appName} v${BUILD_CONFIG.version}`, 'cyan');
    log('='.repeat(50));
    
    try {
        checkDependencies();
        cleanDist();
        createDirectories();
        checkIcons();
        
        const results = buildAll();
        
        listGeneratedFiles();
        generateReport(results);
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        log(`\n⏱️ Tempo total: ${duration}s`, 'bright');
        
    } catch (error) {
        logError(`Erro crítico no build: ${error.message}`);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    main,
    BUILD_CONFIG,
    buildPlatform,
    checkDependencies,
    cleanDist
};