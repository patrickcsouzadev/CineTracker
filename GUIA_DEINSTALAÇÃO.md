# Guia de Instalação e Build - CineTracker

Este guia foi atualizado para o estado atual do projeto (Electron + SQLite + hardening de segurança).

## 1. Pré-requisitos

No Windows (recomendado):

- Windows 10/11
- Node.js LTS (recomendado: 20.x ou 22.x)
- npm (vem com Node.js)
- Git (opcional, se for clonar)

Verifique as versões:

```powershell
node -v
npm -v
```

## 2. Baixar o projeto

Se for via Git:

```powershell
git clone <URL_DO_REPOSITORIO>
cd CineTracker
```

Se você já tem a pasta local, apenas entre nela:

```powershell
cd C:\Users\PTK\Documents\PROJETOS\CineTracker
```

## 3. Instalar dependências

```powershell
npm install
npm run postinstall
```

Observação:
- `postinstall` recompila dependências nativas para o Electron atual (ex.: `better-sqlite3`).

## 4. Configurar chave da OMDb (opcional)

A busca automática no IMDb/OMDb só funciona com chave.

Você pode definir a variável de ambiente assim:

```powershell
setx OMDB_API_KEY "SUA_CHAVE_AQUI"
```

Feche e abra o terminal depois do `setx`.

Sem chave, o app funciona normalmente, apenas sem busca automática.

## 5. Executar em desenvolvimento

```powershell
npm run dev
```

## 6. Build para usar sem instalador (recomendado quando o setup falhar)

Gera a pasta `win-unpacked` com o app pronto para executar:

```powershell
npx electron-builder --win --dir
```

Executável gerado:

```text
dist\win-unpacked\CineTracker.exe
```

Para abrir:

```powershell
.\dist\win-unpacked\CineTracker.exe
```

## 7. Build com instalador (.exe setup)

Comando padrão:

```powershell
npm run build-win
```

Saída esperada:

```text
dist\CineTracker-<versao>-x64-setup.exe
```

## 8. Quando o setup falha com erro de symlink (winCodeSign)

Erro típico:

```text
Cannot create symbolic link ... winCodeSign ... O cliente não tem o privilégio necessário
```

Faça nesta ordem:

1. Ative **Modo Desenvolvedor** no Windows:
   - Configurações -> Privacidade e Segurança -> Para Desenvolvedores -> Modo Desenvolvedor
2. Abra o PowerShell como Administrador
3. Limpe cache do electron-builder:

```powershell
Remove-Item "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign" -Recurse -Force -ErrorAction SilentlyContinue
```

4. Rode novamente:

```powershell
npm run build-win
```

Se ainda falhar, use o build `win-unpacked` (seção 6), que já gera app executável.

## 9. Instalação da aplicação no PC

### Opção A (com setup)

1. Dê duplo clique em `dist\CineTracker-<versao>-x64-setup.exe`
2. Siga o assistente do instalador
3. Abra pelo atalho criado

### Opção B (sem setup)

1. Abra `dist\win-unpacked\CineTracker.exe`
2. (Opcional) Crie atalho manual para área de trabalho/menu iniciar

## 10. Onde ficam os dados do usuário

Após instalar/executar, os dados NÃO ficam dentro da pasta do projeto.

Pasta base:

```text
%APPDATA%\CineTracker
```

Arquivos usados pelo app:

- Banco SQLite: `%APPDATA%\CineTracker\data\movies_series.db`
- Posters: `%APPDATA%\CineTracker\posters\`

Isso permite atualizar/reinstalar sem perder dados (desde que essa pasta não seja apagada).

## 11. Atualizar o app

1. Atualize o código fonte
2. Rode:

```powershell
npm install
npm run postinstall
npm run build-win
```

3. Instale a nova versão (ou substitua o `win-unpacked`)

## 12. Troubleshooting rápido

### 12.1 "Electron failed to install correctly"

```powershell
Remove-Item node_modules -Recurse -Force
Remove-Item package-lock.json -Force
npm install
node node_modules/electron/install.js
npm run postinstall
```

### 12.2 Erro de rebuild do `better-sqlite3`

Se aparecer erro de compilação nativa, use Node LTS (20/22) e rode novamente:

```powershell
npm run postinstall
```

### 12.3 O executável abre e fecha

Teste com logs:

```powershell
.\dist\win-unpacked\CineTracker.exe --enable-logging --v=1
```

Se precisar, redirecione logs para arquivo e analise o erro principal.

## 13. Comandos mais usados

```powershell
npm run dev
npm run build-win
npx electron-builder --win --dir
npm run postinstall
npm audit
```

---

Se você quiser, eu também posso criar um guia separado de "Distribuição para usuários" (instalador, assinatura de código e checklist de release).
