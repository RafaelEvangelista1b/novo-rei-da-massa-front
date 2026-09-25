# Rei da Massa — Android com Capacitor

O projeto continua sendo um site estático em HTML5, Tailwind CSS e JavaScript. `index.html` é a página inicial; `cozinha.html` e `assets/` também são empacotados no aplicativo.

## Requisitos

- Node.js e npm
- Android Studio com Android SDK instalado
- JDK 17

## Preparar e sincronizar

Na primeira vez, instale as dependências e gere os arquivos web:

```bash
npm install
npm run build
npx cap sync android
```

`npm run build` copia as páginas, manifesto, service worker e imagens do projeto para `www/`. Repita `npm run build` e `npx cap sync android` sempre que alterar os arquivos web, antes de abrir/compilar o Android.

## Abrir no Android Studio

```bash
npx cap open android
```

No Android Studio, aguarde a sincronização do Gradle e execute em um emulador ou dispositivo conectado.

## Gerar APK de debug

No Windows:

```bash
cd android
.\gradlew.bat assembleDebug
```

Ou, a partir da raiz do projeto:

```bash
npm run android:debug
```

O APK ficará em `android/app/build/outputs/apk/debug/app-debug.apk`.

O identificador Android é `com.pastel.reimassa` e o nome exibido é `Rei da Massa`. O Capacitor usa `www/` como diretório web e `index.html` como entrada.


