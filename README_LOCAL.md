# README_LOCAL.md — локальная сборка Orca (форк)

Документ — единая точка правды про **эту локальную сборку** Orca: как собрать,
запустить, обновить, какие грабли были и как их обойти. Все факты проверены на
этой машине.

Проект чужой (MIT, оригинал stablyai/orca), у нас **свой форк**:
`origin` → https://github.com/ASXRND/orca

| Параметр         | Значение                                                                |
| ---------------- | ----------------------------------------------------------------------- |
| Upstream         | https://github.com/stablyai/orca (`main`)                               |
| Форк (`origin`)  | https://github.com/ASXRND/orca                                          |
| Версия проекта   | 1.4.209                                                                 |
| Стек             | Electron 43.7.0, electron-vite (rolldown-vite), React 19, TypeScript ~7 |
| Менеджер пакетов | pnpm 12.0.0 (через corepack; глобальный pnpm 11.24.0 игнорируется)      |
| Node             | v24.16.0 (nvm) — требование `engines: node 24`                          |
| Клон             | `/Users/aleksandrhohon/Desktop/development_locall/orca`                 |
| Приложение       | `/Applications/Orca.app` (см. раздел «Статус»)                          |
| Сборка на        | macOS 27.0, arm64, Xcode 26.6 toolchain                                 |

---

## 0. Статус на 03.10.2026

| Что                                        | Состояние                                                                                                                                           |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/Applications/Orca.app`                   | собрано из этого клона (`dist/mac-arm64/Orca.app`), подпись `Orca Local Signing`, **запускается и работает**                                        |
| Артефакты сборки                           | `dist/orca-macos-arm64.dmg` (211 МБ), `dist/Orca-…-arm64-mac.zip`, исходник `dist/mac-arm64/Orca.app`                                               |
| Версия сборки                              | `1.4.219-local` (asar-манифест + About; данные: `~/Library/Application Support/orca`)                                                                         |
| Данные приложения                          | `~/Library/Application Support/orca` (создаются автоматически)                                                                                      |
| dev-режим (`pnpm dev`)                     | работает (проверено 19.09)                                                                                                                          |
| `codesign --verify /Applications/Orca.app` | выдаёт `code has no resources but signature indicates they must be present` — НЕ мешает запуску, особенность ad-hoc; проверять через `codesign -dv` |
| Форк                                       | https://github.com/ASXRND/orca, правки в `main` + этот файл                                                                                         |
| Наши коммиты                               | `70822b7c` (MaxListeners-хаб, 6.1), `12b2e5f7` (EACCES CLI, 6.2), merge апстримов: `895b0564` (v1.4.206), `f1e43ec7` (v1.4.209), `be0b343c1` (v1.4.219); дальше: `525b8ada1`/`8b0e7622e`/`89623b51c` (browse-вкладки), `bfdc259e8` (Cmd+C в редакторе), `9e88f88a9` (browse на SSH-хосте), `d380e0954` (правило пересборки), русская локализация (раздел 8)             |
| **Процедура обновления** (шаг за шагом)          | раздел 5.1 — fetch тега → merge → build → проверить asar → установить с бэкапом           |
| **Механизм апдейтера / почему НЕ ставить офиц. релиз** | раздел 6.3                                                                          |
| **Бэкапы для отката**                            | `~/Desktop/Orca-1.4.197-local-backup.app`, `~/Desktop/Orca-1.4.206-local-backup.app`, `~/Desktop/Orca-1.4.219-local-pre-ru-backup.app` (до русской локализации)     |

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
# бэкап текущей версии (для отката):
cp -Rp /Applications/Orca.app ~/Desktop/Orca-<версия>-local-backup.app
rm -rf /Applications/Orca.app
cp -R dist/mac-arm64/Orca.app /Applications/
xattr -dr com.apple.quarantine /Applications/Orca.app   # снять карантин, если появлялся
open -a Orca
```

Если `cp` прервать (Ctrl-C / обрыв сессии) — в `/Applications` остаётся битая
полукопия с правами `Operation not permitted` даже у владельца. Лечение:

```bash
chflags -R nouchg /Applications/Orca.app   # снять immutable-флаги, если стоят
rm -rf /Applications/Orca.app              # затем чистый cp заново
```

**ВАЖНО про `pnpm build:mac`:** он собирает universal (arm64+x64) и падает с
`Packaging darwin/x64 requires native variants… Run pnpm install:release`.
Обход — ставить `pnpm install:release` (докачает x64-варианты нативных модулей)
ЛЮБО собирать только arm64 напрямую (быстрее, весь `out/` уже собран шагами
build:desktop и др.):

```bash
ORCA_BUILD_COMMIT=$(git rev-parse --short=12 HEAD) \
ORCA_LOCAL_BUILD_VERSION=1.4.209-local \
SDKROOT=/Library/Developer/CommandLineTools/SDKs/MacOSX26.5.sdk \
pnpm exec electron-builder --config config/electron-builder.config.cjs --mac --arm64
```

**Подпись локальных сборок (обязательно):** при ad-hoc подписи cdhash меняется на
каждой сборке, поэтому macOS не может привязать к приложению выданные разрешения
(Local Network и др.): тумблеры в настройках остаются, но перестают совпадать с
приложением, и локальная сеть из терминалов Орки падает с `No route to host`
(в панели хостов — `connect EHOSTUNREACH …`). Лечится один раз — постоянным
self-signed сертификатом (уже сделано на этой машине):

```bash
# ~/.orca-local-signing: key.pem / cert.pem / orca-local.p12 (пароль p12: orca-local)
# identity "Orca Local Signing" импортирована в login keychain и доверена для codeSign
# (~/.orca-local-signing/codesign-shim — обёртка, снимающая --timestamp)

PATH=~/.orca-local-signing/codesign-shim:$PATH \
CSC_NAME="Orca Local Signing" \
ORCA_BUILD_COMMIT=$(git rev-parse --short=12 HEAD) \
ORCA_LOCAL_BUILD_VERSION=1.4.209-local \
DEVELOPER_DIR=/Library/Developer/CommandLineTools \
SDKROOT=/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk \
pnpm exec electron-builder --config config/electron-builder.config.cjs --mac --arm64
```

- `codesign-shim` нужен потому, что electron-builder добавляет `--timestamp`, а
  Apple timestamp-сервер не выдаёт токен самоподписанному сертификату — сборка
  падает на первом же `locale.pak` с `A timestamp was expected but was not found`.
- Проверка: `codesign -dvv /Applications/Orca.app | grep Authority` →
  `Authority=Orca Local Signing`; `codesign --verify --deep --strict` → OK.
  Важно: `codesign -dv` (одна `v`) строку `Authority` НЕ печатает вовсе — нужен
  `-dvv` или выше (проверено 03.10.2026, легко принять за «подписи нет»).
- Разрешение «Локальная сеть» (System Settings → Privacy & Security → Local
  Network) выдаётся приложению один раз и с постоянной подписью переживает
  последующие пересборки. После смены сертификата — подтвердить заново.

Полный цикл typecheck→bundles до `out/` — это `pnpm build:desktop`
(запускается и как часть build:mac до момента падения packaging; результат
сохраняется, повторно пересобирать не нужно).

### 3.1. Две грабли сборки на этой машине (03.10.2026)

**1. `pnpm build:desktop` падает последним шагом — `build:mobile-web`.**
Ему нужны `mobile/node_modules` (Expo / `react-native-web`), а в клоне их нет:

```
app/_layout.web.tsx:2:54: ERROR: Could not resolve "react-native-web"
[ELIFECYCLE] Command failed with exit code 1.
```

Это **не** повод для повторной сборки: typecheck → relay → cli → electron-vite →
verify:built-skills-cli → build:web-from-renderer к этому моменту уже прошли, `out/`
собран целиком (в `out/` есть и `mobile-web` от прошлых сборок). Дальше — нативные
хелперы и упаковка, `out/` пересобирать не нужно.

**2. `pnpm run build:computer-macos` падает на `lipo`.**
Скрипт собирает universal (arm64 + x86_64) и склеивает через `lipo -create`, но на
этой машине x86_64-срез компилируется fat-бинарём (в нём уже есть arm64):

```
lipo: same architectures (arm64) found in '…/arm64-apple-macosx/release/orca-computer-use-macos'
  and '…/x86_64-apple-macosx/release/orca-computer-use-macos'
```

Последствие: `.build/release` — это symlink на `.build/out/Products/Release`, там
остаётся частично записанный x86_64-бинарь, а `Orca Computer Use.app` не собирается.
electron-builder берёт его из `native/computer-use-macos/.build/release/Orca Computer Use.app`,
поэтому без ручной сборки хелпер просто не попадёт в пакет (упаковка при этом пройдёт).

Обход — arm64-only, вручную:

```bash
pkg=native/computer-use-macos
rm -f "$pkg/.build/release/orca-computer-use-macos"
cp "$pkg/.build/arm64-apple-macosx/release/orca-computer-use-macos" "$pkg/.build/release/orca-computer-use-macos"
chmod 755 "$pkg/.build/release/orca-computer-use-macos"      # lipo -archs → arm64
# собрать .app (шаблон Info.plist — из config/scripts/build-computer-macos.mjs):
app="$pkg/.build/release/Orca Computer Use.app"
mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources"
cp "$pkg/.build/release/orca-computer-use-macos" "$app/Contents/MacOS/"
cp resources/build/icon.icns "$app/Contents/Resources/AppIcon.icns"
codesign --force --deep --sign "Orca Local Signing" "$app"   # без --timestamp (см. раздел 3)
```

Проверка: `codesign -dvv "$app"` → `Authority=Orca Local Signing`,
`codesign --verify --deep --strict "$app"` → OK.

---

## 4. Проверки после правок кода

> **⚠️ ГЛАВНОЕ ПРАВИЛО — не возвращаться к нему больше ни разу**
>
> После **любой** правки кода: проверки (блок ниже) → **сразу пересобрать
> приложение → проверить фикс внутри asar → установить в `/Applications` →
> перезапустить**. Только после этого любой результат теста считается реальным.
>
> Почему: `electron-builder` **только упаковывает готовый `out/`**, исходники
> он не компилирует. Правка в `src/` без пересборки = в установленной Orca
> старый код, и фикс «не работает» — а мы вместо этого ищем сломавшийся код
> в манифесте. Это уже стоило нескольких циклов ложных диагнозов (03.10.2026).
>
> Собирать **только полным циклом**, частичная пересборка ломает `out/`:
>
> ```bash
> # 1. полные бандлы (typecheck → relay → cli → electron-vite → verify)
> pnpm run build:desktop
> # 2. упаковка arm64 — env из раздела 3 (codesign-shim, CSC_NAME, SDKROOT…)
> pnpm exec electron-builder --config config/electron-builder.config.cjs --mac --arm64
> # 3. фикс внутри asar ДО установки (раздел 5.1, шаг 8), установка и перезапуск (раздел 3)
> ```
>
> Одного `build:electron-vite` **недостаточно**: `out/cli` останется от старой
> версии и упаковка упадёт на `[verify-skills-cli-runtime] missing runtime import`
> — это значит рассинхрон `out/cli` и `out/main`, а не битый код.

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
git remote -v      # origin = ASXRND/orca (форк); upstream = stablyai/orca
git branch         # работаем в main
git add -A && git commit -m "..." && git push    # в свой форк
```

**ВАЖНО:** husky pre-commit гоняет `pnpm install` (rebuild-native-deps) — коммитить
с `SDKROOT` (раздел 1), иначе commit «падает» на пересборке node-pty:

```bash
SDKROOT=/Library/Developer/CommandLineTools/SDKs/MacOSX26.5.sdk git commit -m "..."
```

### 5.1. Обновление до новой версии upstream (проверенная процедура, 21–23.09.2026)

**Ключевой принцип: официальные апдейтеры НЕ ставить** (см. раздел 6.3) — они
затирают /Applications и лишают нас фиксов. Любой новый релиз вмержить и
пересобрать самим.

```bash
cd /Users/aleksandrhohon/Desktop/development_locall/orca
export SDKROOT=/Library/Developer/CommandLineTools/SDKs/MacOSX26.5.sdk

# 1. Посмотреть, что нового
git ls-remote --tags https://github.com/stablyai/orca.git | grep 'refs/tags/v1.4'

# 2. Забрать нужный тег (без меток-мусора)
git fetch upstream tag v1.4.2XX --no-tags

# 3. Оценить масштаб: коммиты апстрима и задевание наших файлов фиксов
git log --oneline v1.4.старый..v1.4.2XX | wc -l
git diff --stat v1.4.старый v1.4.2XX -- \
  src/main/window/window-closed-hub.ts \
  src/main/cli/cli-command-filesystem-transaction.ts \
  src/main/cli/cli-command-inspection.ts

# 4. Merge (НЕ rebase/cherry-pick — наши коммиты остаются, история честная)
git merge v1.4.2XX --no-edit
# Типовой конфликт: package.json, resources/skills/release-mapping.json —
# наших правок там НЕТ (их меняет только release-коммит апстрима) → брать их версию:
git checkout --theirs package.json resources/skills/release-mapping.json
git add <конфликтные файлы> && SDKROOT=$SDKROOT git commit --no-edit

# 5. Зависимости
pnpm install --frozen-lockfile     # если lockfile не менялся — 100 мс

# 6. Полный цикл сборки бандлов (typecheck → out/)
pnpm build:desktop

# 7. Упаковка arm64 (свой коммит-хэш и версия!)
ORCA_BUILD_COMMIT=$(git rev-parse --short=12 HEAD) \
ORCA_LOCAL_BUILD_VERSION=1.4.2XX-local \
SDKROOT=$SDKROOT \
pnpm exec electron-builder --config config/electron-builder.config.cjs --mac --arm64
# Ошибка «darwin/x64 requires native variants» В КОНЦЕ — известная и игнорируемая:
# arm64-зип/dmg и dist/mac-arm64/Orca.app уже собраны (см. грабли).

# 8. Проверить фиксы ВНУТРИ нового asar ДО установки (все 3 должны дать 1):
npx --yes @electron/asar extract dist/mac-arm64/Orca.app/Contents/Resources/app.asar /tmp/asar_check
grep -c 'chmod -h 755'                      /tmp/asar_check/out/main/index.js   # фикс 6.2a
grep -c 'not readable by your user account' /tmp/asar_check/out/main/index.js   # фикс 6.2b
grep -c 'window-closed-hub'                 /tmp/asar_check/out/main/index.js   # фикс 6.1
cat dist/mac-arm64/Orca.app/Contents/Resources/orca-local-build.json              # версия+commit+arch
rm -rf /tmp/asar_check

# 9. Установка с бэкапом (раздел 3) и финальная проверка
open -a Orca   # Orca запущена, EACCES/MaxListeners в ~/Library/Application Support/orca/logs/main.trace.ndjson = 0
ls -la /usr/local/bin/orca && /usr/local/bin/orca --version   # симлинк 0755 жив, версия = x.y.z-local

# 10. Запушить merge + этот файл
git push origin main
```

Откат: `rm -rf /Applications/Orca.app && cp -R ~/Desktop/Orca-<версия>-local-backup.app /Applications/`.

---

## 6. Известные грабли (проверено на этой машине)

| Грабля                                                                  | Обход                                                                |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Линкер tapi 26.6 не читает tbd SDK 27.0 → падение node-gyp сборок       | `SDKROOT=.../MacOSX26.5.sdk` (раздел 1)                              |
| Xcode 27.0 обновлён, лицензия не принята → сборки node-gyp падают        | CLT-тулчейн: `DEVELOPER_DIR=/Library/Developer/CommandLineTools` + `SDKROOT=/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk` + `ORCA_REUSE_PREPARED_NATIVE_RUNTIME=1`; разово лечится `sudo xcodebuild -license accept` |
| `check:code-quality:changed` ругается на перестилизацию `<Input>`        | плотный ввод — нативный `<input>` в обёртке (как `FileExplorerNameFilter`); активная кнопка — `variant={active ? 'secondary' : 'ghost'}`, не `bg-accent` |
| SSH/локальная сеть из Орки: `No route to host` (EHOSTUNREACH), а из Terminal.app тот же `ssh` работает | **причина — ad-hoc подпись** (см. раздел 3): macOS не привязывает разрешение «Локальная сеть» к билду, чей cdhash меняется каждой сборкой. Лечится постоянным self-signed сертификатом + сборкой с `CSC_NAME`; тумблер Local Network выдаётся один раз и дальше переживает пересборки. Осиротевшее расширение Little Snitch (если его приложение удалено) — отдельная помеха, лечится только в System Settings → General → Login Items & Extensions → Network Extensions (CLI `systemextensionsctl uninstall` требует выключенного SIP, `gc` отдаёт Code=13) |
| `zsh: killed` при запуске `cline` (и других npm-нативных бинарей) после авто-обновления | обновление приносит бинарь с несовпадающей подписью → ядро убивает процесс (`CODE SIGNING: rejecting invalid page … SIGKILL`). Лечение: `codesign --force --sign - <путь к бинарю>` (например `~/.nvm/versions/node/*/lib/node_modules/cline/node_modules/@cline/cli-darwin-arm64/bin/cline`) либо `npm i -g cline --force` |
| Глобальный pnpm 11.24.0 ≠ требуемому 12.0.0                             | corepack сам качает 12.0.0 по `packageManager` — не трогать          |
| `MaxListenersExceededWarning` на BrowserWindow (11 closed listeners)    | **исправлено 20.09** — хаб `window-closed-hub` (см. раздел 6.1)      |
| Первая `pnpm install` падает на postinstall (rebuild-native-deps)       | повторить с SDKROOT — зависимость уже скачана, проходит              |
| Правка в `src/` сделана, а в приложении ничего не изменилось («фикс не работает») | `electron-builder` **не компилирует** исходники — только упаковывает `out/`. Обязателен полный `pnpm run build:desktop` + упаковка + установка (раздел 4) |
| Упаковка падает: `[verify-skills-cli-runtime] missing runtime import` | рассинхрон `out/cli` и `out/main` из-за частичной пересборки → `pnpm run build:desktop`, потом упаковка |
| `pnpm build:mac` падает: x64-вариантов нативных модулей нет (universal) | `pnpm exec electron-builder … --mac --arm64` напрямую (см. раздел 3) |
| `codesign --verify` ругается: `no resources but signature indicates…`   | норма для ad-hoc; проверять `codesign -dv`, запуск работает          |
| `EACCES: permission denied, readlink '/usr/local/bin/orca'` в UI         | **исправлено 21.09** — права CLI-симлинка, см. раздел 6.2            |
| `git commit` падает на husky pre-commit (rebuild node-pty)               | коммитить с `SDKROOT=…MacOSX26.5.sdk` (см. раздел 5)                 |
| Прерванный `cp -R Orca.app /Applications/` → битая полукопия «Operation not permitted» | `chflags -R nouchg` + `rm -rf`, затем чистый cp (см. раздел 3) |
| Официальный апдейтер качает релиз без наших фиксов                       | НЕ ставить; вмержить тег и пересобрать (см. разделы 5.1, 6.3)        |
| Предупреждения `RecoverableRenderErrorBoundary` / `client-creation-action-error` в бандл-логе | это имена чанков, не ошибки                     |

---

### 6.1. Фикс MaxListenersExceededWarning (20.09.2026)

**Симптом:** при старте `MaxListenersExceededWarning: Possible EventEmitter memory
leak detected. 11 closed listeners added to [BrowserWindow]` — 12 модулей
подписывались напрямую на `win.on('closed', ...)`, лимит Electron = 10.

**Решение:** единый хаб `src/main/window/window-closed-hub.ts`:
`subscribeWindowClosed(win, cb)` — на окно один `'closed'`-подписчик, события
fan-out'ятся подписчикам. Мигрированы 12 точек вызова: attach-main-window-services,
createMainWindow, main-window-controller, runtime-window-lifecycle,
main-window-visual-lifecycle, mobile-markdown/terminal-tab/session-tab relays,
speech IPC, worktree-base-directory-watcher, macos-tcc-prompt-notice,
service-configuration.

**Проверка:** 23 unit-теста зелёные (vitest, `config/vitest.config.ts`), `pnpm tc`
чисто, пересобрано electron-builder'ом (`--mac --arm64`), в логе прямого запуска
`/tmp/orca_run.log` — 0 вхождений `MaxListeners` (раньше warning был сразу после
`starting electron app...`). Коммит `70822b7c` запушен в форк (ASXRND/orca, main).

---

### 6.2. Фикс EACCES на `/usr/local/bin/orca` (21.09.2026)

**Симптом (в консоли рендерера):**

```
Error invoking remote method 'cli:getInstallStatus':
Error: EACCES: permission denied, readlink '/usr/local/bin/orca'
```

и в терминале `orca --version` → `Unable to determine Orca.app path from symlink: /usr/local/bin/orca`.

**Причина (цепочка целиком):**

1. Установщик CLI на macOS пишет симлинк привилегированно (`osascript … with administrator
   privileges`), а сгенерированный скрипт начинается с `umask 077;` (делает приватной
   транзакционную директорию) — `cli-command-filesystem-transaction.ts`.
2. `umask 077` наследуется и на `ln -s`, поэтому симлинк получается `lrwx------`
   (0700, root:wheel) вместо обычных `lrwxr-xr-x` (0755) — проверено `stat -f '%Sp'`:
   единственный такой файл в `/usr/local/bin`.
3. macOS проверяет права **самого симлинка**, поэтому у обычного пользователя
   `readlink` падает с EACCES (`lstat` при этом проходит — отсюда «файл есть, но не читается»).
4. `inspectSymlink` обрабатывал только ENOENT, а `inspectStableCommand` глотал EACCES в
   retry-цикле → исключение уходило в renderer как ошибка IPC.
5. Побочно: сам CLI не мог определить свой путь (`orca --version`), т.е. команда была нерабочей.

**Решение (в форке):**

- `cli-command-filesystem-transaction.ts`: перед публикацией симлинка
  `/bin/chmod -h 755 <publishPath>` (hard-link сохраняет inode, поэтому режим едет в
  `/usr/local/bin`); EACCES в retry-цикле больше не глотается — пробрасывается как причина.
- `cli-command-inspection.ts`: EACCES → статус `stale` с внятным `detail`
  («not readable by your user account…»), а не исключение IPC. Повторная установка CLI
  перезапишет симлинк с правильными правами (самовосстановление).

**Проверка:** `src/main/cli` — 30 файлов, 213 тестов зелёные; новый
`cli-command-inspection-permission.test.ts` (2) + тест прав в
`cli-command-privileged-transaction.test.ts` (падает без `chmod`-строки — проверено
откатом фикса). `pnpm tc` чисто, oxlint чисто.

**Лечение уже существующего симлинка** (одноразово, нужен пароль админа):

```bash
sudo chmod -h 755 /usr/local/bin/orca    # -h: менять сам симлинк, не цель
```

Либо в Orca: Settings → Command Line Tool → удалить и поставить заново (после
пересборки с этим фиксом права будут 0755 сразу).

---

### 6.3. Механизм апдейтера и правило обновления (23.09.2026)

**Как устроен апдейт в Orca:**

- Официальный апдейтер (electron-updater) качает релизы в
  `~/Library/Caches/orca-updater/pending/` (например `temp-Orca-1.4.206-arm64-mac.zip`)
  и предлагает установить — это **официальный билд без наших коммитов**.
  Ставить его нельзя: затрёт `/Applications/Orca.app`, потеряются
  `70822b7c` (6.1) и `12b2e5f7` (6.2). Если такой zip уже лежит — удалить.
- **Штатный обход:** у Orca есть механизм «local build» — приложение принимает
  собственный zip как апдейт, если в `Contents/Resources` лежит
  `orca-local-build.json` (версия, 12-символьный коммит, архитектура,
  sha512+подпись). Проверяется через меню «Check for Local Build».
  Код: `local-build-candidate.ts`, `local-build-switch.ts`,
  `local-build-compatibility.ts`, меню — `updater-menu-checks.ts`,
  `register-app-menu.ts`.
- **Наша процедура** — проще и надёжнее: вмержить тег upstream → пересобрать →
  поставить `cp -R` с бэкапом (раздел 5.1). In-app local-build-switch не нужен.

**История обновлений форка:**

| Дата       | Было          | Стало         | Как                                                                  |
| ---------- | ------------- | ------------- | -------------------------------------------------------------------- |
| 20.09.2026 | —             | 1.4.197-local | первая сборка из клона                                                |
| 21.09.2026 | 1.4.197-local | 1.4.206-local | merge v1.4.206 (28 коммитов, merge `895b0564`), конфликтов нет        |
| 23.09.2026 | 1.4.206-local | 1.4.209-local | merge v1.4.209 (111 коммитов, merge `f1e43ec7`); конфликт только в release-файлах |

Проверка после каждого обновления (все обязательны):

```bash
# 1. Фиксы в asar — 3 grep'а из раздела 5.1 шаг 8 (все = 1)
# 2. Приложение запускается и работает
# 3. CLI: ls -la /usr/local/bin/orca  → lrwxr-xr-x; orca --version → x.y.z-local
# 4. Логи: grep -c EACCES ~/Library/Application\ Support/orca/logs/main.trace.ndjson → 0
#    grep -c MaxListeners … → 0
```

---

## 7. Журнал изменений

| Дата       | Что сделали                                                                                                           |
| ---------- | --------------------------------------------------------------------------------------------------------------------- |
| 19.09.2026 | Склонировали форк, поставили зависимости (SDKROOT-обход), подняли dev — работает                                      |
| 19.09.2026 | `pnpm build:mac` падает на universal (x64 native variants); перешли на `--mac --arm64` напрямую                       |
| 20.09.2026 | Собран `Orca.app` (arm64, ad-hoc), установлен в /Applications, запускается и работает                                 |
| 20.09.2026 | Фикс MaxListenersExceededWarning: хаб `window-closed-hub.ts`, 12 точек подписки мигрированы, коммит `70822b7c` в форк |
| 21.09.2026 | Фикс EACCES на readlink `/usr/local/bin/orca`: `chmod -h 755` при публикации симлинка + EACCES → `stale` вместо падения IPC (раздел 6.2) |
| 21.09.2026 | Merge upstream v1.4.206 (merge `895b0564`), сборка 1.4.206-local установлена; pending-зип официального апдейтера удалён, бэкап 1.4.197 на Desktop |
| 23.09.2026 | Browse-режим в правом файловом дереве: путь-бар с Tab-автодополнением (общий префикс + список кандидатов, ↑/↓/Enter/Esc) и раскрытие папок стрелками инлайн (ленивая загрузка детей; refresh перечитывает раскрытые поддеревья), контекстное меню, inline rename/create, paste/duplicate/delete в Trash. Чтения и мутации — только через существующий `fs:authorizeExternalPath` (LRU-поддеревья). Новые файлы: `FileExplorerBrowseMode.tsx`, `FileExplorerBrowsePathSuggestions.tsx`, `use-file-explorer-browse{,-navigation,-mutations,-path-complete}.ts`, `file-explorer-browse-{mode,fs,operations,keyboard,clipboard,path-complete}.ts`. Сборка 1.4.209-local пересобрана и переустановлена; бэкап `~/Desktop/Orca-1.4.209-local-backup.app` |
| 23.09.2026 | Локальные сборки переведены на постоянную подпись: self-signed сертификат `Orca Local Signing` (`~/.orca-local-signing`, identity в login keychain, trust для codeSign) + сборка с `CSC_NAME` и shim без `--timestamp`. Причина: при ad-hoc подписи cdhash меняется каждой сборкой, и macOS не привязывает к приложению разрешение «Локальная сеть» — ssh из терминалов Орки падал с `No route to host`, панель Remote Hosts показывала `connect EHOSTUNREACH`. После подписанной сборки и перезапуска Орки ssh к `srv-220` работает; разрешение Local Network выдаётся один раз и переживает пересборки. Попутно вычищен удалённый Little Snitch (launchd-плисты, `/Library/Application Support/Objective Development`, prefs; само расширение под SIP — снимать в System Settings → General → Login Items & Extensions → Network Extensions), и починен `cline` после авто-обновления (`codesign --force --sign -`, см. «грабли») |
| 03.10.2026 | Merge апстрима v1.4.219 (`be0b343c1`), конфликты разрешены; сборка `1.4.219-local` установлена |
| 03.10.2026 | Browse-режим: файлы открываются в редакторе (`525b8ada1`), одиночный клик как в дереве (`8b0e7622e`), каждая кликнутая вкладка постоянная вместо предпросмотра (`89623b51c`), работа на SSH-хосте рабочей области (`9e88f88a9` + `file-explorer-browse-target.ts`, 4 теста) |
| 03.10.2026 | Cmd+C в редакторе (`bfdc259e8`): копирование из файла не срабатывало, пока фокус был у меню приложения — `setup-editor-app-menu-clipboard.ts` |
| 03.10.2026 | Правило «правка кода → пересборка → установка» зафиксировано в разделе 4 (`d380e0954`); грабли сборки задокументированы в разделе 3.1 |
| 03.10.2026 | **Русский язык интерфейса** (раздел 8): `ru.json`, 6 точек регистрации, тесты чисто |
| 03.10.2026 | «Copy Path» в browse не копировал вообще: `navigator.clipboard.writeText` отклоняется политикой разрешений главного окна, а `void` глотал ошибку → `window.api.ui.writeClipboardText`; та же поломка в `SkillFreshnessUpdateDialog`. Добавлен ratchet-тест `src/renderer/src/no-browser-clipboard-write.test.ts`. Отдельно починены два теста, не обновлённых коммитом `89623b51c` (`useFileExplorerHandlers.test.ts`) и упававших на машине с `LANG=ru_RU.UTF-8` (`source-control-branch-context-row.test.tsx`) |


---

## 8. Локализация интерфейса: русский язык (03.10.2026)

Русский добавлен как полноценная встроенная локаль рядом с `en/zh/ko/ja/es/fr`.
Переключение: **Settings → Appearance → Language → «Русский»**; при «System»
берётся системная локаль (то есть на русской macOS интерфейс станет русским сам).

**Шесть точек регистрации — добавление локали это не только файл перевода:**

| Файл | Что там |
| --- | --- |
| `src/shared/ui-language.ts` | `UI_LANGUAGE_RUSSIAN = 'ru'`, `BuiltInUiLanguage`, набор `UI_LANGUAGE_VALUES` |
| `src/shared/ui-locale.ts` | `'ru'` в `SUPPORTED_UI_LOCALES` и ветка в `resolveUiLocale` |
| `src/renderer/src/i18n/i18n.ts` | ленивый загрузчик `ru: () => import('./locales/ru.json')` |
| `src/main/i18n/main-i18n.ts` | тот же загрузчик для main-процесса |
| `src/renderer/src/i18n/supported-languages.ts` | пункт выпадающего списка + нативная метка «Русский» |
| `src/renderer/src/i18n/locales/en.json` | ключ `settings.appearance.language.russian` |

Оба загрузчика типизированы как `Record<Exclude<SupportedUiLocale, 'en'>, …>`,
поэтому пропущенный код не пройдёт: `pnpm tc` падает.

**Частичный каталог — это норма.** `ru.json` сейчас 159 строк (настройки, меню,
проводник, tray, уведомления, меню browse). Остальное падает на английский через
`fallbackLng: 'en'`, а строки вида `translate(key, 'English default')` — на
английский дефолт из вызова. Сплошного теста на полноту локалей намеренно нет
(`locale-english-regression.test.ts` покрывает es/ja/ko/zh и прямо пишет, что
blanket-gate не вводится). **`en.json` не трогать**, кроме метки самого языка.

**Дописать перевод** — правкой `ru.json` (2 пробела, ключи сортируются как в
`en.json`). Проверка, что все ключи реально существуют в английском:

```bash
node -e "const en=require('./src/renderer/src/i18n/locales/en.json');const ru=require('./src/renderer/src/i18n/locales/ru.json');
const flat=(o,p='')=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'?flat(v,p+k+'.'):[[p+k,v]]);
const keys=new Set(flat(en).map(([k])=>k));const bad=flat(ru).map(([k])=>k).filter(k=>!keys.has(k));
console.log('ключей:',flat(ru).length,'| лишних:',bad)"
```

**Проверка после сборки.** Русский попадает в пакет двумя ленивыми чанками
(main и renderer). Ищи их инструментом asar, а не грепом: `grep -a` по
117-МБ бинарнику находит ASCII, но молчит на кириллице (проверено 03.10.2026 —
текст лежит в файле, `grep` его не показывает), поэтому проверять через распаковку:

```bash
node -e "const a=require('@electron/asar');const f='dist/mac-arm64/Orca.app/Contents/Resources/app.asar';
console.log(a.listPackage(f).filter(x=>/\/ru-[A-Za-z0-9_-]+\.js$/.test(x)))"
```

Проверять нужно и установленную копию: `/Applications/Orca.app/Contents/Resources/app.asar`.

## 6. Грабли: состояние профиля и «невидимое» окно (проверено 04.10.2026)

### 6.1. Не править `profile-state.db` напрямую через `sqlite3`

Симптом, если уже сломано — приложение при старте отказывается открывать профиль:

```
Orca cannot safely open the active profile because its SQLite state is unreadable.
```

Причина: таблица `profile_state_documents` хранит для каждого домена не только
`payload`, но и `content_hash` (`sha256` от payload) и `revision`. Приложение проверяет
их при чтении, поэтому `UPDATE ... SET payload=...` без пересчёта хеша ломает состояние
целиком — профиль перестаёт открываться, а приложение завершиться штатно не даёт.

Хеш считается функцией `hashProfileStatePayload` —
`src/main/persistence/profile-state/profile-state-document-validation.ts:41`.

**Правильный путь — штатный откат Orca** (экспорты и бэкапы приложение делает само):

```bash
pkill -9 -f 'Orca.app'
orca profile state exports                     # посмотреть, что есть
orca profile state rollback --backup <id>      # откатить на SQLite-бэкап
# или откатить на JSON-экспорт:
orca profile state rollback --revision <revision>
sqlite3 "$HOME/Library/Application Support/Orca/profiles/local-default/profile-state.db" \
  "PRAGMA integrity_check;"                    # должно быть ok
```

Если откат недоступен и править руками — только payload, хеш, ревизия и время вместе:

```bash
node -e "
const {execFileSync}=require('child_process'), crypto=require('crypto');
const db=process.env.HOME+'/Library/Application Support/Orca/profiles/local-default/profile-state.db';
const q=(s)=>execFileSync('sqlite3',[db,s],{maxBuffer:1e8,encoding:'utf8'});
const [payload,rev]=q(\"SELECT payload||'|'||revision FROM profile_state_documents WHERE domain='ui';\").trim().split('|');
const obj=JSON.parse(payload); delete obj.windowBounds; delete obj.windowMaximized;
const next=JSON.stringify(obj);
const hash=crypto.createHash('sha256').update(next,'utf8').digest('hex');
q(\"UPDATE profile_state_documents SET payload='\"+next.replace(/'/g,\"''\")+\"', content_hash='\"+hash+\"', revision=\"+(Number(rev)+1)+\", updated_at=\"+Date.now()+\" WHERE domain='ui';\");
"
```

### 6.2. Окно уезжает за экран при нескольких мониторах

Симптом: Orca висит в доке, процессы и демон работают, рендерер шлёт события,
но окна на экране нет — кажется, что приложение «не запускается».

Причина — сохранённые bounds окна. Проверить:

```bash
python3 -c "
import Quartz
wl=Quartz.CGWindowListCopyWindowInfo(Quartz.kCGWindowListOptionAll, Quartz.kCGNullWindowID)
for w in wl:
    if 'rca' in str(w.get('kCGWindowOwnerName','')):
        b=w.get('kCGWindowBounds',{})
        if b.get('Width',0)>700: print(b)"
```

И лежит в сторе ровно то же (домен `ui`):

```bash
sqlite3 "$HOME/Library/Application Support/Orca/profiles/local-default/profile-state.db" \
  "SELECT payload FROM profile_state_documents WHERE domain='ui';" | grep -o '"windowBounds":{[^}]*}'
```

На этой машине три дисплея (встроенный 1512×982 + два 2048×1152), и сохранённые
`{"x":1574,"y":-124}` уводили окно на второй монитор выше его верхнего края.

**Лечение** — сбросить `windowBounds` (способ из 6.1), после чего приложение откроет
окно в позиции по умолчанию.

**Оговорка:** дефект позиционирования остаётся и после сброса — при старте приложение
само сохраняет `y` отрицательным (`y=-138`). То есть с несколькими мониторами окно
штатно открывается частично выше экрана. Если симптом повторится — снова сбрасывать
bounds. Про автоматическое заполнение экрана в апстриме не сообщалось.

