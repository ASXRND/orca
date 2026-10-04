# Статус русской локализации

Сгенерировано автоматически из `src/renderer/src/i18n/locales/{en,ru}.json`.
Непереведённые ключи откатываются на английский — интерфейс работает, но частично остаётся на английском.

## Общий прогресс

| Показатель | Значение |
|---|---|
| Всего ключей в en.json | 15030 |
| Переведено в ru.json | 3532 |
| **Покрытие** | **23%** |
| Осталось перевести | 11498 |
| Осиротевших ключей (нет в en.json) | 0 |

## Что уже переведено полностью

- `settings.appearance.statusBar` — 13/13
- `settings.browser.sshWorkspaceRouting` — 13/13
- `settings.browser.userAgent` — 12/12
- `settings.browser.clientHostedRemote` — 8/8
- `settings.appearance.menuBarIcon` — 5/5

## Основные непереведённые пространства имён

| Пространство | Не переведено |
|---|---|
| `auto.components` | 9780 |
| `components.native-chat` | 429 |
| `auto.lib` | 215 |
| `components.workspace` | 201 |
| `auto.hooks` | 148 |
| `auto.store` | 109 |
| `auto.App` | 48 |
| `featureTips.sessionSearch` | 44 |
| `terminal.codexSharedServerBanner` | 33 |
| `auto.web` | 32 |
| `sessionHistory.settings` | 30 |
| `components.agentSessionContinuation` | 26 |
| `sessionSearch.panel` | 26 |
| `worktreeJumpPalette.filter` | 25 |
| `browser.loadFailure` | 21 |
| `browser.clientHosted` | 19 |
| `components.onboarding` | 17 |
| `auto.runtime` | 15 |
| `dashboardPopout.filters` | 14 |
| `browser.sshRoute` | 11 |

## Непереведённые блоки настроек (по панелям)

Блоки `*.search.*` — это видимые поисковые термины в строке поиска настроек, а не служебные строки.

| Блок | Переведено/всего |
|---|---|
| `experimental.search` | 0/77 |
| `agents.search` | 0/71 |
| `accounts.search` | 0/66 |
| `notifications.search` | 0/41 |
| `integrations.search` | 0/38 |
| `mobile.pane` | 0/38 |
| `mobile.emulator` | 0/36 |
| `voice.pane` | 0/29 |
| `privacy.search` | 0/28 |
| `browser.use` | 0/27 |
| `jira.integration` | 0/27 |
| `task.tracker` | 0/26 |
| `repository.search` | 116/141 |
| `mobile.settings` | 0/23 |
| `bitbucket.credentials` | 0/23 |
| `cli.source` | 0/22 |
| `ssh.search` | 0/21 |
| `auto.rename` | 0/18 |

## Намеренно оставленные на английском

Технические литералы, которые нельзя переводить — по ним ищут в терминале и они используются как есть:

- Имена файлов и пути: `orca.yaml`, `.mcp.json`, `node_modules`, `../worktrees`, `.DS_Store`
- Имена переменных окружения: `ORCA_GITEA_TOKEN`, `ORCA_AZURE_DEVOPS_ACCESS_TOKEN`, `ORCA_BITBUCKET_API_TOKEN`
- Термины Git и GitHub: `main`, `master`, `origin/main`, `fast-forward`, `upstream`, `ref`, `stash`, `rebase`
- Протоколы, форматы, инструменты: `mdns`, `bonjour`, `bluetooth`, `usb`, `apfs`, `wsl`, `ffmpeg`, `sox`, `whisper`, `tcc`, `graphql`, `omnibox`, `webview`
- Имена провайдеров и CLI: `gh`, `glab`, `codex`, `claude`, `kimi`, `gemini`, `opencode-go`
- Единицы и разделители: `px`, `5h`, `·`, `···`

## Как продолжить

Карты переводов лежат в `/tmp/ru-map-*.json` (рабочий, не в репозитории). Сборка каталога:

```bash
node /tmp/build-ru.js
```


Скрипт объединяет карты, проверяет каждый ключ по `en.json` (неизвестные ключи — ошибка) и пересобирает отсортированный `ru.json`.

Проверка после перевода:

```bash
pnpm test src/renderer/src/i18n
```


