# Rei da Massa — Capacitor + Supabase

O projeto é um site estático em HTML5, Tailwind CSS e JavaScript, empacotado para Android com Capacitor. Ele não usa React nem Vite. `index.html` é a página inicial e `cozinha.html` é o painel da cozinha.

## Requisitos

- Node.js e npm
- Android Studio com Android SDK instalado
- JDK 17

## Instalar dependências

```bash
npm install
```

## Configurar o Supabase

Copie `.env.example` para `.env.local` e preencha:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
SUPABASE_PRODUCTS_TABLE=produtos
SUPABASE_CATEGORIES_TABLE=categorias
SUPABASE_PRODUCT_CATEGORY_COLUMN=categoriaId
```

Use somente a chave pública/anon apropriada para clientes. Nunca use `service_role`: o build bloqueia uma chave JWT com essa role. A URL e a chave pública serão incluídas nos arquivos web e no APK; proteja os dados com RLS no Supabase.

O cardápio lê os produtos da tabela configurada (por padrão, `produtos`) e as categorias (por padrão, `categorias`). O painel `cozinha.html` permite cadastrar, editar e excluir produtos e categorias diretamente no Supabase. Os campos esperados para produtos são `id`, `nome`, `preco`, `descricao`, `imagem` e `categoriaId` ou `categoria_id`; configure `SUPABASE_PRODUCT_CATEGORY_COLUMN` se sua tabela estiver vazia e usar `categoria_id`. Configure políticas RLS de leitura para o cardápio e políticas adequadas de escrita para o painel. Se as credenciais estiverem vazias, o cardápio público mantém a API atual como fallback; o CRUD do painel requer Supabase configurado.

`.env.local` é ignorado pelo Git. `.env.example` contém somente nomes de variáveis e pode ser versionado.

## Desenvolvimento e build web

```bash
npm run dev
```

Esse comando prepara `www/` e inicia um servidor local em `http://127.0.0.1:4173`. Para gerar/atualizar apenas os arquivos web:

```bash
npm run build
```

O build copia as páginas e imagens, empacota o SDK oficial do Supabase e gera `www/supabase-config.js` a partir de `.env.local`. Sem credenciais, esse arquivo não contém valores de conexão.

## Sincronizar e abrir Android

Após alterar arquivos web ou `.env.local`, execute:

```bash
npm run build
npx cap sync android
```

Para abrir no Android Studio:

```bash
npx cap open android
```

## Gerar APK de debug

```bash
npm run android:debug
```

O APK será criado em `android/app/build/outputs/apk/debug/app-debug.apk`.
