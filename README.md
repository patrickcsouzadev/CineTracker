# CineTracker

Um software desktop multiplataforma para registrar e organizar filmes e séries assistidos, com integração ao IMDb.

## 🚀 Funcionalidades

### ✅ Funcionalidades Implementadas
- **Cadastro de Filmes e Séries**
  - Upload de pôster personalizado
  - Campo para sinopse
  - Sistema de notas pessoais (0-10)
  - Integração com API do IMDb para busca automática
  - Exibição lado a lado da nota IMDb e nota pessoal

- **Gerenciamento de Séries**
  - Sistema de temporadas com controle individual
  - Checkbox para marcar temporadas como assistidas
  - Comentários específicos por temporada
  - Notas individuais por temporada
  - Botão "Nova Temporada" para expansão dinâmica

- **Interface Moderna**
  - Design limpo e intuitivo
  - Layout responsivo
  - Navegação fácil e fluida
  - Tela principal com grid de itens

- **Recursos Extras**
  - Campo de busca por título
  - Filtros por tipo (filme/série), nota e status
  - Ordenação por nome, nota ou data de adição
  - Sistema de notificações
  - Suporte completo a multiplataforma

## 🛠️ Tecnologias Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript
- **Backend**: Node.js com Electron
- **Banco de Dados**: SQLite (local)
- **APIs**: OMDb API (IMDb integration)
- **Build**: Electron Builder

## 📋 Pré-requisitos

- Node.js 16+ instalado
- npm ou yarn
- Chave da API OMDb (opcional, para integração IMDb)

## 🔧 Instalação e Configuração

### 1. Clone ou baixe o projeto
```bash
git clone [URL_DO_REPOSITORIO]
cd movie-series-tracker
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure a API do IMDb (Opcional)
1. Acesse [OMDb API](http://www.omdbapi.com/apikey.aspx)
2. Registre-se gratuitamente para obter uma chave
3. Edite o arquivo `renderer.js` na linha 12:
```javascript
const OMDB_API_KEY = 'SUA_CHAVE_AQUI';
```

### 4. Execute em modo desenvolvimento
```bash
npm run dev
```

## 📦 Gerando Executáveis

### Para todas as plataformas:
```bash
npm run build
```

### Para plataformas específicas:
```bash
# Windows
npm run build-win

# macOS
npm run build-mac

# Linux
npm run build-linux
```

Os executáveis serão gerados na pasta `dist/`.

## 🎯 Como Usar

### Adicionando um Filme
1. Clique em "+ Adicionar Filme"
2. Digite o título e clique "Buscar IMDb" (opcional)
3. Preencha sinopse e nota pessoal
4. Selecione um pôster personalizado
5. Clique "Salvar"

### Adicionando uma Série
1. Clique em "+ Adicionar Série"
2. Preencha os dados básicos como um filme
3. Use "+ Nova Temporada" para adicionar temporadas
4. Para cada temporada:
   - Marque como assistida se aplicável
   - Adicione comentários específicos
   - Atribua uma nota individual
5. Clique "Salvar"

### Organizando sua Coleção
- **Buscar**: Use o campo de busca para encontrar títulos específicos
- **Filtrar**: Selecione filtros por tipo, nota ou status
- **Ordenar**: Organize por nome, nota ou data de adição
- **Editar**: Clique em qualquer item para editar
- **Excluir**: Use o botão de lixeira para remover itens

## 📁 Estrutura do Projeto

```
cine-tracker/
├── main.js              # Processo principal do Electron
├── database.js          # Gerenciamento do banco SQLite
├── renderer.js          # Lógica da interface e IMDb
├── index.html           # Interface principal
├── styles.css           # Estilos modernos
├── package.json         # Configurações e dependências
├── data/               # Banco de dados SQLite
├── posters/            # Imagens de pôsteres
└── dist/               # Executáveis gerados
```

## 🔒 Privacidade e Dados

- Todos os dados são armazenados localmente no seu computador
- Nenhuma informação é enviada para servidores externos
- A única conexão externa é com a API do IMDb (opcional)
- Backup automático do banco de dados na pasta `data/`

## ⚡ Performance

- Banco SQLite otimizado para consultas rápidas
- Interface responsiva com carregamento assíncrono
- Imagens de pôster otimizadas automaticamente
- Cache local para melhor performance

## 🐛 Resolução de Problemas

### Erro "API Key não configurada"
- Configure sua chave da OMDb API no arquivo `renderer.js`
- A funcionalidade funciona sem a API, mas sem integração IMDb

### Erro ao salvar imagens
- Verifique se a pasta `posters/` tem permissões de escrita
- Formatos suportados: JPG, PNG, GIF, BMP

### Performance lenta
- Limite o número de pôsteres muito grandes
- Execute limpeza periódica da pasta `posters/`

## 🚀 Próximas Funcionalidades

- [ ] Backup automático na nuvem
- [ ] Sistema de tags personalizadas
- [ ] Gráficos e estatísticas
- [ ] Exportação de dados (CSV/JSON)
- [ ] Sistema de recomendações
- [ ] Integração com outras APIs (TMDb, Trakt)

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 🤝 Contribuições

Contribuições são bem-vindas! Sinta-se à vontade para:
- Reportar bugs
- Sugerir novas funcionalidades
- Enviar pull requests
- Melhorar a documentação

## 📞 Suporte

Para suporte técnico ou dúvidas:
- Abra uma issue no repositório
- Consulte a documentação
- Verifique os logs de erro no DevTools (Ctrl+Shift+I)

---

**Desenvolvido com ❤️ para cinéfilos e seriados!** 🎬🍿