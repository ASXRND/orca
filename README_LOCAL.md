# README_LOCAL.md — локальная сборка Orca (форк)

Документ — единая точка правды про **эту локальную сборку** Orca: как собрать,
запустить, обновить, какие грабли были и как их обойти. Все факты проверены на
этой машине.

Проект чужой (MIT, оригинал stablyai/orca), у нас **свой форк**:
`origin` → https://github.com/ASXRND/orca

| Параметр         | Значение                                                                 |
| ---------------- | ------------------------------------------------------------------------ |
| Upstream         | https://github.com/stablyai/orca (`main`)                                |
| Форк (`origin`)  | https://github.com/ASXRND/orca                                           |
| Версия проекта   | 1.4.197                                                                  |
| Стек             | Electron 43.7.0, electron-vite (rolldown-vite), React 19, TypeScript ~7  |
| Менеджер пакетов | pnpm 12.0.0 (через corepack; глобальный pnpm 11.24.0 игнорируется)        |
| Node             | v24.16.0 (nvm) — требование `engines: node 24`                           |
| Клон             | `/Users/aleksandrhohon/Desktop/development_locall/orca`                   |
| Приложение       | `/Applications/Orca.app` (см. раздел «Статус»)                           |
| Сборка на        | macOS 27.0, arm64, Xcode 26.6 toolchain                                  |

---

## 0. Статус на 20.09.2026

| Что                                   | Состояние                                                                                          |
| ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `/Applications/Orca.app`              | собрано из этого клона (`dist/mac-arm64/Orca.app`), ad-hoc подпись, **запускается и работает**      |
| Артефакты сборки                      | `dist/orca-macos-arm64.dmg` (211 МБ), `dist/Orca-…-arm64-mac.zip`, исходник `dist/mac-arm64/Orca.app` |
| Версия сборки                         | `1.4.197-local.test` (видна в данных: `~/Library/Application Support/orca`)                        |
| Данные приложения                     | `~/Library/Application Support/orca` (создаются автоматически)                                      |
| dev-режим (`pnpm dev`)                | работает (проверено 19.09)                                                                         |
| `codesign --verify /Applications/Orca.app` | выдаёт `code has no resources but signature indicates they must be present` — НЕ мешает запуску, особенность ad-hoc; проверять через `codesign -dv` |
| Форк                                  | https://github.com/ASXRND/orca, правки в `main` + этот файл                                         |

---

## 1. Главное знание: SDKROOT-обход

**Проблема:** на этой машине macOS 27.0 + линкер (tapi) от Xcode 26.6 не умеет
читать tbd-файлы SDK 27.0 (`unknown architecture arm64e.x1-macos`). Любая
нативная сборка (node-pty, cpu-features и т.п.) падает.

**Обход:** перед ЛЮБОЙ командой, которая может пересобирать нативные модули
(`pnpm install`, `pnpm dev` при первом запуске, `pnpm build:mac`), ставить:

```bash
export SDKROOT=/Library/Developer/CommandLineTools/SDKs/MacOSX26.5.sdk
```

SDK 26.5 лежит в `/Library/Developer/CommandLineTools/SDKs/MacOSX26.5.sdk` и целый.
(По умолчанию `MacOSX.sdk` → symlink на `MacOSX27.0.sdk` — сломанный для tapi 26.6.)

---

## 2. Запуск / перезапуск (dev-режим)

```bash
cd /Users/aleksandrhohon/Desktop/development_locall/orca

# запустить (SDKROOT нужен только если что-то пересобирается; безвреден всегда)
SDKROOT=/Library/Developer/CommandLineTools/SDKs/MacOSX26.5.sdk pnpm dev
```

- dev-сервер renderer: http://localhost:5173
- DevTools (CDP): ws://127.0.0.1:9402
- Лог: запускается в терминале; в фоне — `nohup ... > /tmp/orca_dev.log 2>&1 &`

**Останов dev:**

```bash
pkill -f 'orca/out/electron-dev'
```

Приложение в dev-режиме — НЕ полноценное приложение (запускается из
`out/electron-dev/...`, без нормальной иконки/прав). Для «настоящего»
приложения с правами — сборка в `/Applications` (раздел 3).

---

## 3. Сборка приложения (`pnpm build:mac`) и установка

```bash
cd /Users/aleksandrhohon/Desktop/development_locall/orca
export SDKROOT=/Library/Developer/CommandLineTools/SDKs/MacOSX26.5.sdk
pkill -f 'orca/out/electron-dev'   # погасить dev, если запущен
pnpm build:mac
```

Что делает: typecheck → build:relay → build:cli → build:electron-vite →
сборка нативных хелперов (computer-use, keyboard-layout, notification-status) →
`config/scripts/build-mac-local.mjs` → `electron-builder --mac`
(конфиг `config/electron-builder.config.cjs`).

**Подпись:** вне release-режима (`ORCA_MAC_RELEASE=1`) всё подписывается
ad-hoc (`-`), notarization выключен. Это позволяет запускать приложение
локально: первый запуск — правой кнопкой → «Открыть», дальше обычно.

**Установка в /Applications (проверенный путь):**

```bash
osascript -e 'quit app "Orca"' 2>/dev/null
rm -rf /Applications/Orca.app
cp -R dist/mac-arm64/Orca.app /Applications/
xattr -dr com.apple.quarantine /Applications/Orca.app   # снять карантин, если появлялся
open -a Orca
```

**ВАЖНО про `pnpm build:mac`:** он собирает universal (arm64+x64) и падает с
`Packaging darwin/x64 requires native variants… Run pnpm install:release`.
Обход — ставить `pnpm install:release` (докачает x64-варианты нативных модулей)
ЛЮБО собирать только arm64 напрямую (быстрее, весь `out/` уже собран шагами
build:desktop и др.):

```bash
ORCA_BUILD_COMMIT=$(git rev-parse --short=12 HEAD) \
ORCA_LOCAL_BUILD_VERSION=1.4.197-local \
SDKROOT=/Library/Developer/CommandLineTools/SDKs/MacOSX26.5.sdk \
pnpm exec electron-builder --config config/electron-builder.config.cjs --mac --arm64
```

Полный цикл typecheck→bundles до `out/` — это `pnpm build:desktop`
(запускается и как часть build:mac до момента падения packaging; результат
сохраняется, повторно пересобирать не нужно).

---

## 4. Проверки после правок кода

```bash
pnpm tc                      # typecheck
pnpm test [путь/к/файлу]     # тесты (vitest)
oxlint                       # линт (быстрый)
pnpm run check:code-quality:changed   # линт изменённых файлов (как в CI)
```

UI-тесты / запуск app из тестов — только с `ORCA_BACKGROUND_LAUNCH=1`
(не красть фокус; см. AGENTS.md).

---

## 5. Git

```bash
git remote -v      # origin = ASXRND/orca (форк); upstream не настроен
git branch         # работаем в main (пока без своей ветки — см. историю)
git add -A && git commit -m "..." && git push    # в свой форк
```

Подтянуть обновления upstream:

```bash
git remote add upstream https://github.com/stablyai/orca.git  # если ещё нет
git fetch upstream && git merge --ff-only upstream/main && git push
```

---

## 6. Известные грабли (проверено на этой машине)

| Грабля                                                              | Обход                                                       |
| ------------------------------------------------------------------- | ----------------------------------------------------------- |
| Линкер tapi 26.6 не читает tbd SDK 27.0 → падение node-gyp сборок   | `SDKROOT=.../MacOSX26.5.sdk` (раздел 1)                     |
| Глобальный pnpm 11.24.0 ≠ требуемому 12.0.0                          | corepack сам качает 12.0.0 по `packageManager` — не трогать |
| `MaxListenersExceededWarning` на BrowserWindow (11 closed listeners) | не критично; кандидат на фикс                               |
| Первая `pnpm install` падает на postinstall (rebuild-native-deps)    | повторить с SDKROOT — зависимость уже скачана, проходит     |
| `pnpm build:mac` падает: x64-вариантов нативных модулей нет (universal) | `pnpm exec electron-builder … --mac --arm64` напрямую (см. раздел 3) |
| `codesign --verify` ругается: `no resources but signature indicates…` | норма для ad-hoc; проверять `codesign -dv`, запуск работает |

---

## 7. Журнал изменений

| Дата       | Что сделали                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------- |
| 19.09.2026 | Склонировали форк, поставили зависимости (SDKROOT-обход), подняли dev — работает                 |
| 19.09.2026 | `pnpm build:mac` падает на universal (x64 native variants); перешли на `--mac --arm64` напрямую  |
| 20.09.2026 | Собран `Orca.app` (arm64, ad-hoc), установлен в /Applications, запускается и работает            |

