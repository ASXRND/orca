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

## 0. Статус на 23.09.2026

| Что                                        | Состояние                                                                                                                                           |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/Applications/Orca.app`                   | собрано из этого клона (`dist/mac-arm64/Orca.app`), ad-hoc подпись, **запускается и работает**                                                      |
| Артефакты сборки                           | `dist/orca-macos-arm64.dmg` (211 МБ), `dist/Orca-…-arm64-mac.zip`, исходник `dist/mac-arm64/Orca.app`                                               |
| Версия сборки                              | `1.4.209-local` (asar-манифест + About; данные: `~/Library/Application Support/orca`)                                                                         |
| Данные приложения                          | `~/Library/Application Support/orca` (создаются автоматически)                                                                                      |
| dev-режим (`pnpm dev`)                     | работает (проверено 19.09)                                                                                                                          |
| `codesign --verify /Applications/Orca.app` | выдаёт `code has no resources but signature indicates they must be present` — НЕ мешает запуску, особенность ad-hoc; проверять через `codesign -dv` |
| Форк                                       | https://github.com/ASXRND/orca, правки в `main` + этот файл                                                                                         |
| Наши коммиты                               | `70822b7c` (MaxListeners-хаб, 6.1), `12b2e5f7` (EACCES CLI, 6.2), merge-коммиты апстримов: `895b0564` (v1.4.206), `f1e43ec7` (v1.4.209)             |

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
| Глобальный pnpm 11.24.0 ≠ требуемому 12.0.0                             | corepack сам качает 12.0.0 по `packageManager` — не трогать          |
| `MaxListenersExceededWarning` на BrowserWindow (11 closed listeners)    | **исправлено 20.09** — хаб `window-closed-hub` (см. раздел 6.1)      |
| Первая `pnpm install` падает на postinstall (rebuild-native-deps)       | повторить с SDKROOT — зависимость уже скачана, проходит              |
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
| 23.09.2026 | Merge upstream v1.4.209 (merge `f1e43ec7`), сборка 1.4.209-local установлена. Конфликты только в `package.json`/`release-mapping.json` (наших правок там нет, взята версия upstream). Все фиксы 6.1/6.2 проверены в asar, симлинк жив (0755), EACCES 0. Бэкапы: `~/Desktop/Orca-1.4.197-local-backup.app`, `~/Desktop/Orca-1.4.206-local-backup.app`. Процедура обновления описана в разделе 5.1, механизм апдейтера — 6.3 |
