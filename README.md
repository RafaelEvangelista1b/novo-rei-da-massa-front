# Rei da Massa — Capacitor + Supabase

O projeto usa páginas HTML, Tailwind CSS e JavaScript, com autenticação e painel de gerenciamento em React empacotados para web e Android via Capacitor. `index.html` é o cardápio, `cozinha.html` mostra pedidos e `admin.html` oferece login, cadastro e gerenciamento de produtos/categorias.

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

O cardápio lê as tabelas configuradas (por padrão, `produtos` e `categorias`). O painel React em `admin.html` permite login, cadastro de conta, acesso com Google, CRUD e atualização em tempo real. Os campos esperados para produtos são `id`, `nome`, `preco`, `descricao`, `imagem` e a coluna de categoria configurada; neste projeto ela é `categoria_id`. Se as credenciais estiverem vazias, o cardápio mantém a API como fallback e o painel não conecta.

O painel e a tela da cozinha exigem uma sessão cujo `app_metadata.role` seja `admin`. Contas cadastradas por e-mail ou Google não recebem esse privilégio automaticamente. A role deve ser atribuída por um administrador em um caminho seguro. Execute `supabase/rls.sql` no SQL Editor para permitir leitura pública do catálogo e restringir gravações a administradores. O script também inclui produtos e categorias na publicação Realtime. Revise os nomes das tabelas no SQL se forem diferentes. Não use a chave `service_role` no frontend.

`.env.local` é ignorado pelo Git. `.env.example` contém somente nomes de variáveis e pode ser versionado.

## Desenvolvimento e build web

```bash
npm run dev
```

Esse comando prepara `www/` e inicia um servidor local em `http://127.0.0.1:4173`. Para gerar/atualizar apenas os arquivos web:

```bash
npm run build
```

O build copia as páginas e imagens, empacota o SDK oficial do Supabase e o painel React, e gera `www/supabase-config.js` a partir de `.env.local`. Sem credenciais, esse arquivo não contém valores de conexão.

## Supabase Auth e Google OAuth

1. Em Supabase **Authentication → Sign In / Providers**, habilite Email. Configure confirmação de e-mail conforme a política do projeto.
2. Em **Authentication → URL Configuration**, defina a Site URL do site publicado e adicione aos Redirect URLs:
   - `http://127.0.0.1:4173/admin.html` para desenvolvimento;
   - `https://SEU-DOMINIO/admin.html` para produção;
   - `com.pastel.reimassa://auth/callback` para o retorno OAuth do aplicativo Android.
3. No Google Cloud Console, configure a tela de consentimento e crie um OAuth Client ID do tipo Web. Adicione a origem web local e a origem de produção em **Authorized JavaScript origins**.
4. Em **Authorized redirect URIs** do Google, adicione o callback exibido na configuração do provedor Google do Supabase, no formato `https://SEU_PROJECT_REF.supabase.co/auth/v1/callback`.
5. Em Supabase **Authentication → Sign In / Providers → Google**, habilite Google e informe Client ID e Client Secret. O Client Secret fica somente no Supabase; nunca no frontend.

O callback registrado no Google é o endpoint do Supabase que recebe a resposta do provedor. O Redirect URL do Supabase é o endereço para onde o usuário volta depois que o Supabase termina o fluxo. Para Android, o app abre o OAuth no navegador do sistema e recebe o retorno pelo deep link `com.pastel.reimassa://auth/callback`.

Depois de autorizar um administrador, abra `admin.html` para login/cadastro e gerenciamento. Se o retorno por e-mail ou Google for recusado, confira a Redirect URL allow-list. O login Google só fica ativo depois de configurar Client ID/Secret no Supabase e testar o fluxo real no navegador e no Android.

O painel da cozinha é protegido na interface, mas os pedidos ainda vêm de uma API externa. Essa API precisa validar autenticação/autorização no servidor para que a proteção também cubra chamadas diretas ao endpoint.

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

## Autenticação e Google OAuth

O painel `admin.html` oferece cadastro por e-mail/senha, login e Google OAuth. Apenas usuários cujo `app_metadata.role` seja `admin` acessam o painel e a tela `cozinha.html`. Novas contas não recebem privilégios administrativos automaticamente. A role deve ser atribuída por um administrador usando um backend/Admin API seguro.

No Supabase, habilite Email em **Authentication → Sign In / Providers** e configure **Authentication → URL Configuration**. Adicione aos Redirect URLs `http://127.0.0.1:4173/admin.html**`, `https://SEU-DOMINIO/admin.html**` e `com.pastel.reimassa://auth/callback`.

No Google Cloud Console, configure a tela de consentimento e crie um OAuth Client ID do tipo Web. Adicione `http://127.0.0.1:4173` e `https://SEU-DOMINIO` às origens JavaScript. Em Authorized redirect URIs, use o callback mostrado no provedor Google do Supabase, no formato `https://SEU_PROJECT_REF.supabase.co/auth/v1/callback`. Depois habilite Google em Supabase **Authentication → Sign In / Providers → Google** e coloque o Client ID e Client Secret lá. O Client Secret não deve estar no frontend.

O callback do Google aponta para o Supabase; o Redirect URL do Supabase leva o usuário de volta ao site/app. No Android, o OAuth abre no navegador do sistema e retorna pelo deep link configurado `com.pastel.reimassa://auth/callback`.

O login Google só pode ser validado depois de cadastrar credenciais reais nos dois painéis e permitir os Redirect URLs. Execute `npm run build` e `npx cap sync android` após alterações. A API externa usada para pedidos precisa validar autenticação no servidor; a proteção da página cozinha, sozinha, não protege chamadas diretas à API.
