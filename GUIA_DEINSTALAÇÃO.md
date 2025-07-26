# 🎬 GUIA COMPLETO: Movie & Series Tracker

## 🚀 INSTALAÇÃO E BUILD AUTOMATIZADO

### ⚡ MÉTODO RÁPIDO (Recomendado)

```bash
# 1. Clone/baixe o projeto
git clone [URL_DO_PROJETO]
cd movie-series-tracker

# 2. Build automatizado completo
npm install
npm run build

# 3. Executáveis prontos na pasta dist/
```

### 🛠️ MÉTODO DETALHADO

#### 1️⃣ **Preparação do Ambiente**

```bash
# Verificar Node.js (versão 16+)
node --version
npm --version

# Se não tiver, instale em: https://nodejs.org
```

#### 2️⃣ **Instalação das Dependências**

```bash
# Instalar todas as dependências
npm install

# Ou usando yarn
yarn install
```

#### 3️⃣ **Configuração dos Ícones**

```bash
# Gerar ícones padrão
npm run setup-icons

# OU customize manualmente:
# - Coloque sua imagem em: assets/source-icon.png (512x512px)
# - Execute: npm run setup-icons
# - Converta para: icon.ico, icon.icns, icon.png
```

#### 4️⃣ **Build Automatizado**

```bash
# Build completo para todas as plataformas
npm run build

# Ou builds específicos:
npm run build-win    # Windows (.exe)
npm run build-mac    # macOS (.dmg)
npm run build-linux  # Linux (.AppImage + .deb)
```

---

## 📦 CUSTOMIZAÇÃO COMPLETA

### 🎨 **Personalizar Ícones**

#### **Método Automático:**
1. Coloque sua imagem em `assets/source-icon.png` (512x512px)
2. Execute: `npm run setup-icons`
3. Ícones gerados automaticamente

#### **Método Manual:**
```
assets/
├── icon.ico     (Windows - multi-tamanho)
├── icon.icns    (macOS - multi-resolução)
├── icon.png     (Linux - 512x512px)
└── icon.svg     (Fonte vetorial)
```

**Ferramentas Recomendadas:**
- **Online**: [favicon.io](https://favicon.io), [realfavicongenerator.net](https://realfavicongenerator.net)
- **Desktop**: GIMP, Photoshop, Inkscape
- **CLI**: ImageMagick, icon-gen

### 🏷️ **Personalizar Informações do App**

Edite `package.json`:

```json
{
  "name": "seu-app-name",
  "productName": "Seu App Nome",
  "description": "Sua descrição",
  "author": "Seu Nome",
  "version": "1.0.0",
  "build": {
    "appId": "com.seudominio.seuapp",
    "productName": "Seu App Nome",
    "win": {
      "publisherName": "Sua Empresa"
    }
  }
}
```

### 🪟 **Customizar Instalador Windows**

Edite `assets/installer.nsh`:
- Textos personalizados
- Páginas do instalador
- Associações de arquivo
- Atalhos personalizados

### 🍎 **Customizar Instalador macOS**

Configure no `package.json`:
```json
"dmg": {
  "title": "Seu App 1.0",
  "background": "assets/dmg-background.png",
  "icon": "assets/icon.icns"
}
```

### 🐧 **Customizar Pacote Linux**

```json
"linux": {
  "category": "AudioVideo;Entertainment",
  "synopsis": "Sua descrição curta",
  "description": "Descrição completa do app",
  "maintainer": "seu-email@exemplo.com"
}
```

---

## 🎯 COMANDOS DISPONÍVEIS

### **Desenvolvimento:**
```bash
npm run dev          # Executar em modo desenvolvimento
npm start            # Executar versão de produção
```

### **Build:**
```bash
npm run build        # Build automatizado completo
npm run build-win    # Apenas Windows
npm run build-mac    # Apenas macOS
npm run build-linux  # Apenas Linux
npm run build-manual # Build manual (electron-builder)
```

### **Utilitários:**
```bash
npm run setup-icons  # Configurar ícones
npm run clean        # Limpar pasta dist
```

### **Scripts Auxiliares:**
```bash
# Linux/macOS
chmod +x build-scripts/build-all.sh
./build-scripts/build-all.sh

# Windows PowerShell
.\build-scripts\build-all.ps1

# Make (se disponível)
make setup    # Configuração inicial
make build    # Build completo
make dev      # Desenvolvimento
make clean    # Limpeza
```

---

## 📁 ESTRUTURA DE ARQUIVOS FINAL

```
movie-series-tracker/
├── 📄 main.js                 # Processo principal Electron
├── 📄 database.js             # Gerenciamento SQLite
├── 📄 renderer.js             # Interface + IMDb API
├── 📄 index.html              # Interface principal
├── 📄 styles.css              # Estilos modernos
├── 📄 package.json            # Configurações + build
├── 📄 build.js                # Script de build automatizado
├── 📄 generate-icons.js        # Gerador de ícones
├── 📄 README.md               # Documentação
├── 📄 GUIA-INSTALACAO-COMPLETO.md # Este guia
├── 📁 assets/                 # Recursos do build
│   ├── 🖼️ icon.ico            # Ícone Windows
│   ├── 🖼️ icon.icns           # Ícone macOS
│   ├── 🖼️ icon.png            # Ícone Linux
│   ├── 🖼️ icon.svg            # Ícone vetorial
│   └── 📄 installer.nsh       # Script instalador Windows
├── 📁 build-scripts/          # Scripts auxiliares
│   ├── 📄 build-all.sh        # Build completo (Linux/Mac)
│   ├── 📄 build-all.ps1       # Build completo (Windows)
│   ├── 📄 dev-setup.sh        # Setup desenvolvimento
│   ├── 📄 test-build.sh       # Teste builds
│   └── 📄 Makefile            # Automação Make
├── 📁 data/                   # Banco de dados SQLite
│   └── 📄 movies_series.db    # Banco principal
├── 📁 posters/                # Imagens de pôsteres
│   └── 🖼️ *.jpg, *.png        # Pôsteres dos filmes/séries
├── 📁 dist/                   # Executáveis gerados
│   ├── 📦 Movie-&-Series-Tracker-1.0.0-x64-setup.exe  # Windows
│   ├── 📦 Movie-&-Series-Tracker-1.0.0-x64.dmg        # macOS
│   ├── 📦 Movie-&-Series-Tracker-1.0.0-x64.AppImage   # Linux
│   └── 📦 Movie-&-Series-Tracker-1.0.0-x64.deb        # Debian
└── 📁 node_modules/           # Dependências (auto-gerado)
```

---

## 🎉 DISTRIBUIÇÃO FINAL

### **Para Usuários Finais:**

#### **Windows:**
1. Arquivo: `Movie-&-Series-Tracker-1.0.0-x64-setup.exe`
2. Usuário clica duas vezes
3. Instalador guiado em português
4. Ícone criado na área de trabalho
5. Menu Iniciar populado

#### **macOS:**
1. Arquivo: `Movie-&-Series-Tracker-1.0.0-x64.dmg`
2. Usuário clica duas vezes
3. Arrasta app para pasta Applications
4. Abre pelo Launchpad

#### **Linux:**
1. **AppImage**: `Movie-&-Series-Tracker-1.0.0-x64.AppImage`
   - Torna executável: `chmod +x *.AppImage`
   - Executa diretamente: `./Movie-&-Series-Tracker-1.0.0-x64.AppImage`

2. **Debian/Ubuntu**: `Movie-&-Series-Tracker-1.0.0-x64.deb`
   - Instala: `sudo dpkg -i *.deb`
   - Ou clica duas vezes no gerenciador de pacotes

---

## 🔧 SOLUÇÃO DE PROBLEMAS

### **Build Falha:**
```bash
# Limpar e reinstalar
npm run clean
rm -rf node_modules
npm install
npm run build
```

### **Ícones Não Aparecem:**
```bash
# Verificar se ícones existem
ls -la assets/
# Se não, gerar novamente
npm run setup-icons
```

### **Erro de Permissão (Linux/macOS):**
```bash
# Dar permissão aos scripts
chmod +x build-scripts/*.sh
chmod +x generate-icons.js
chmod +x build.js
```

### **Erro SQLite:**
```bash
# Recompilar SQLite
npm rebuild sqlite3
# Ou reinstalar
npm uninstall sqlite3
npm install sqlite3
```

### **API IMDb Não Funciona:**
1. Obtenha chave gratuita em: [omdbapi.com](http://www.omdbapi.com/apikey.aspx)
2. Edite `renderer.js` linha 12:
```javascript
const OMDB_API_KEY = 'sua_chave_aqui';
```

---

## 🎯 CHECKLIST FINAL

### **Antes do Build:**
- [ ] Node.js 16+ instalado
- [ ] Dependências instaladas (`npm install`)
- [ ] Ícones configurados (pasta `assets/`)
- [ ] Informações do app personalizadas (`package.json`)
- [ ] API IMDb configurada (opcional)

### **Build Completo:**
- [ ] `npm run build` executado com sucesso
- [ ] Pasta `dist/` criada
- [ ] Executáveis gerados para plataformas desejadas
- [ ] Tamanhos dos arquivos razoáveis (< 200MB)

### **Teste dos Executáveis:**
- [ ] Windows: `.exe` instala e executa corretamente
- [ ] macOS: `.dmg` monta e app funciona
- [ ] Linux: `.AppImage` executa, `.deb` instala

### **Distribuição:**
- [ ] Arquivos copiados para local de distribuição
- [ ] Documentação incluída
- [ ] Versões testadas em máquinas limpas

---

## 🌟 RECURSOS AVANÇADOS

### **🔄 Atualização Automática**

Para adicionar atualizações automáticas, configure:

```json
// package.json
"build": {
  "publish": {
    "provider": "github",
    "owner": "seu-usuario",
    "repo": "movie-tracker"
  }
}
```

### **📊 Analytics (Opcional)**

Para rastrear uso (respeitando privacidade):

```javascript
// renderer.js - adicionar no final
const analytics = {
  trackEvent: (event, data) => {
    // Implementar apenas métricas anônimas
    console.log('Event:', event, data);
  }
};
```

### **🌐 Múltiplos Idiomas**

Estrutura para i18n:

```
locales/
├── pt-BR.json
├── en-US.json
└── es-ES.json
```

### **🎨 Temas Personalizados**

Configure em `styles.css`:

```css
/* Tema escuro */
[data-theme="dark"] {
  --background: #1a1a1a;
  --surface: #2d2d2d;
  --text-primary: #ffffff;
}

/* Tema claro */
[data-theme="light"] {
  --background: #f8fafc;
  --surface: #ffffff;
  --text-primary: #1e293b;
}
```

---

## 📈 PRÓXIMOS PASSOS

### **Desenvolvimento Contínuo:**
1. **Feedback dos Usuários**: Colete sugestões e bugs
2. **Novas Funcionalidades**: Implemente baseado no uso
3. **Performance**: Otimize consultas e interface
4. **Segurança**: Mantenha dependências atualizadas

### **Distribuição Profissional:**
1. **Website**: Crie landing page para downloads
2. **Documentação**: Wiki com tutoriais detalhados
3. **Suporte**: Canal para dúvidas e problemas
4. **Versionamento**: Releases organizados no GitHub

### **Monetização (Se Aplicável):**
1. **Versão Pro**: Recursos avançados pagos
2. **API Premium**: Integrações extras
3. **Suporte Premium**: Atendimento prioritário
4. **Customização**: Versões corporativas

---

## 🤝 CONTRIBUIÇÃO

### **Como Contribuir:**
1. Fork do repositório
2. Crie branch para feature: `git checkout -b nova-feature`
3. Commit mudanças: `git commit -m 'Adiciona nova feature'`
4. Push para branch: `git push origin nova-feature`
5. Abra Pull Request

### **Padrões de Código:**
- JavaScript ES6+
- Comentários em português/inglês
- Testes para novas funcionalidades
- Documentação atualizada

---

## 📞 SUPORTE

### **Canais de Suporte:**
- 🐛 **Bugs**: Abra issue no GitHub
- 💡 **Sugestões**: Discussions no repositório  
- 📧 **Contato**: movietracker@exemplo.com
- 💬 **Chat**: Discord/Telegram (se disponível)

### **FAQ Rápido:**

**P: O app funciona offline?**  
R: Sim, apenas a busca IMDb precisa de internet.

**P: Posso importar dados de outros apps?**  
R: Planejado para próximas versões.

**P: Há limite de filmes/séries?**  
R: Não, limitado apenas pelo espaço em disco.

**P: Funciona em tablets/celulares?**  
R: Apenas desktop por enquanto.

---

## 🎬 CONCLUSÃO

Você agora tem um **software desktop completo e profissional** para registrar filmes e séries! 

### **O que você conseguiu:**
✅ **App multiplataforma** (Windows, macOS, Linux)  
✅ **Interface moderna** e responsiva  
✅ **Integração IMDb** real  
✅ **Sistema de instaladores** customizados  
✅ **Build automatizado** completo  
✅ **Documentação profissional**

### **Comandos para começar AGORA:**
```bash
git clone [seu-repositorio]
cd movie-series-tracker
npm install
npm run build
```

**🚀 Seus executáveis estarão prontos na pasta `dist/`!**

---

*Desenvolvido com ❤️ para cinéfilos e seriados!* 🎬🍿

**#MovieTracker #Desktop #Electron #Multiplataforma #Cinema #Series**