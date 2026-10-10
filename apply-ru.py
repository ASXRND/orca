#!/usr/bin/env python3
"""Apply RU translations for small untranslated blocks in ru.json.

Usage:
  python3 apply-ru.py            # apply
  python3 apply-ru.py --dry-run  # show diff without writing

Convention (see prior i18n commits): values translated in place, keys stay in
en.json order (the tree is built sorted by key at insertion time), technical
literals (git/provider identifiers, paths, env var names, CLI tools) stay EN.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
RU = os.path.join(HERE, "src", "renderer", "src", "i18n", "locales", "ru.json")
EN = os.path.join(HERE, "src", "renderer", "src", "i18n", "locales", "en.json")

# Translations, keyed by dot-path into en.json. Only leaves not already present
# in ru.json are applied. Verify each translation by hand before adding here.
TRANSLATIONS = {
    "dashboardPopout.card.review.closed": "Закрытое ревью",
    "dashboardPopout.card.review.draft": "Черновик ревью",
    "dashboardPopout.card.review.merged": "Слияние завершено",
    "dashboardPopout.card.review.open": "Открыть ревью",
    "dashboardPopout.card.time.days": "{{count}}д",
    "dashboardPopout.card.time.hours": "{{count}}ч",
    "dashboardPopout.card.time.justNow": "только что",
    "dashboardPopout.card.time.minutes": "{{count}}м",
    # ── components.native-chat (blocks: toggle, copyMessage, drop, notices,
    #    fileLinks, contextUsage, turnDiff, ask, contextMenu, receipt) ──
    "components.native-chat.toggle.showTerminal": "Показать терминал",
    "components.native-chat.toggle.showChat": "Показать вид чата",
    "components.native-chat.copyMessage.copied": "Скопировано",
    "components.native-chat.copyMessage.copy": "Копировать сообщение",
    "components.native-chat.drop.title": "Отпустите, чтобы прикрепить к этому чату",
    "components.native-chat.drop.subtitle": "Файлы добавляются в сообщение как пути, которые агент может прочитать.",
    "components.native-chat.notices.compaction": "Контекст сжат",
    "components.native-chat.notices.details": "Подробности",
    "components.native-chat.notices.plan": "План",
    "components.native-chat.fileLinks.notFound": "Файл не найден: {{value0}}",
    "components.native-chat.fileLinks.unverifiable": "Не удалось проверить {{value0}}: {{value1}}",
    "components.native-chat.fileLinks.unresolved": "Не удалось найти {{value0}} в этой рабочей области",
    "components.native-chat.contextUsage.label": "Контекст {{used}} из {{window}} токенов, использовано {{percent}}%",
    "components.native-chat.contextUsage.title": "Контекст",
    "components.native-chat.contextUsage.estimated": "Оценка по последнему ответу.",
    "components.native-chat.turnDiff.one": "1 изменённый файл",
    "components.native-chat.turnDiff.many": "{{count}} изменённых файлов",
    "components.native-chat.turnDiff.partial": "Частичный diff",
    "components.native-chat.turnDiff.recorded": "Итоги по записанным правкам за этот ход.",
    "components.native-chat.ask.awaiting": "Ожидание ввода пользователя:",
    "components.native-chat.ask.awaitingUnnamed": "Ожидание ввода пользователя",
    "components.native-chat.ask.asked": "Спрошено:",
    "components.native-chat.ask.questionCount": "{{value0}} вопросов",
    "components.native-chat.contextMenu.copyOrcaSessionId": "Копировать Orca Session ID",
    "components.native-chat.contextMenu.orcaSessionIdCopied": "Orca session ID скопирован",
    "components.native-chat.contextMenu.orcaSessionIdCopyFailed": "Не удалось скопировать Orca session ID",
    "components.native-chat.contextMenu.orcaSessionIdTooltip": "ID Orca для этого чата, отдельный от собственного session ID CLI агента. Агенты используют его, чтобы ссылаться друг на друга через Orca.",
    "components.native-chat.receipt.unavailable": "Выбранный ответ недоступен",
    "components.native-chat.receipt.cancelled": "Отменено",
    "components.native-chat.receipt.resolved": "Разрешено",
    "components.native-chat.receipt.resolver": "Отвечено на {{device}}",
    "components.native-chat.receipt.cancelledBy": "Отменено на {{device}}",
    # ── components.onboarding (blocks: skipConfirmation, theme, integrations) ──
    "components.onboarding.skipConfirmation.skip": "Пропустить",
    "components.onboarding.skipConfirmation.keepGoing": "Нет, продолжить",
    "components.onboarding.theme.hints.system": "Как в ОС",
    "components.onboarding.theme.hints.dark": "Щадит глаза",
    "components.onboarding.theme.hints.light": "Яркая и чёткая",
    "components.onboarding.integrations.capabilities.startWorkspaceFromIssue": "Начинайте рабочую область из любого issue или pull request GitHub, с подставленными названием и контекстом",
    "components.onboarding.integrations.capabilities.browseIssues": "Просматривайте issue и pull requests GitHub в виде «Задачи», не выходя из Orca",
    "components.onboarding.integrations.capabilities.reviewStatus": "Смотрите состояние issue, статус ревью и проверки CI для каждого рабочего дерева",
    "components.onboarding.integrations.capabilities.managePullRequests": "Читайте, комментируйте и мержите pull requests, не выходя из Orca",
    # ── auto.components (blocks: pet, error, taskSourceContextSummary,
    #    WorktreeBaseFallbackDialog, browserPane, NewWorkspaceComposerModal) ──
    "auto.components.pet.pet.models.7433516faf": "Gremlin",
    "auto.components.pet.pet.models.a84d5677ff": "OpenCode",
    "auto.components.pet.pet.models.2528586aa7": "Claudino",
    "auto.components.error.boundaries.RecoverableRenderErrorBoundary.55001880db": "Повторить",
    "auto.components.error.boundaries.RecoverableRenderErrorBoundary.34a189ae0f": "Остальная часть приложения продолжает работать. Повторите отрисовку этого элемента или переключитесь и вернитесь.",
    "auto.components.error.boundaries.RecoverableRenderErrorBoundary.ab855c11f4": "В этой части Orca произошла ошибка.",
    "auto.components.taskSourceContextSummary.sourceUnavailable": "Источник {{value0}} недоступен: {{value1}}",
    "auto.components.taskSourceContextSummary.someSourceHostsUnavailable": "Некоторые хосты источника {{value0}} недоступны: {{value1}}",
    "auto.components.taskSourceContextSummary.reconnectOrUpdateTitle": "Переподключитесь или обновите {{value0}}, чтобы загрузить этот источник.",
    "auto.components.WorktreeBaseFallbackDialog.title": "Рабочая область создана из локальной базы",
    "auto.components.WorktreeBaseFallbackDialog.description": "Удалённая ссылка \"{{value0}}\" была недоступна, поэтому Orca использовала локальную \"{{value1}}\". Эта рабочая область может не содержать последних удалённых изменений.",
    "auto.components.WorktreeBaseFallbackDialog.dismiss": "Понятно",
    "auto.components.browserPane.workspaceDoc.externalLinkTitle": "Открыть ссылку на {{host}}?",
    "auto.components.browserPane.workspaceDoc.externalLinkConfirm": "Открыть ссылку",
    "auto.components.browserPane.workspaceDoc.externalLinkCancel": "Отмена",
    "auto.components.NewWorkspaceComposerModal.createWorktree": "Создать рабочее дерево",
    "auto.components.NewWorkspaceComposerModal.createWorkspace": "Создать рабочую область",
    "auto.components.NewWorkspaceComposerModal.fa90f739a5": "Выберите проект, название рабочей области и агента перед созданием.",
}


def leaves(d, prefix=""):
    out = {}
    for k, v in d.items():
        p = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            out.update(leaves(v, p))
        else:
            out[p] = v
    return out


def set_leaf(root, path, value):
    parts = path.split(".")
    node = root
    for p in parts[:-1]:
        node = node.setdefault(p, {})
    node[parts[-1]] = value


def sorted_tree(d):
    return {k: sorted_tree(v) if isinstance(v, dict) else v for k, v in sorted(d.items())}


def main():
    dry = "--dry-run" in sys.argv
    with open(EN, encoding="utf-8") as f:
        en = json.load(f)
    with open(RU, encoding="utf-8") as f:
        ru = json.load(f)

    en_leaves = leaves(en)
    ru_leaves = leaves(ru)

    applied = []
    skipped_existing = []
    skipped_missing = []
    for path, value in TRANSLATIONS.items():
        if path in ru_leaves:
            skipped_existing.append(path)
            continue
        if path not in en_leaves:
            skipped_missing.append(path)
            continue
        set_leaf(ru, path, value)
        applied.append(path)

    if dry:
        for p in applied:
            print(f"APPLY {p}: {TRANSLATIONS[p]}")
    else:
        with open(RU, "w", encoding="utf-8") as f:
            json.dump(sorted_tree(ru), f, ensure_ascii=False, indent=2)
            f.write("\n")

    print(f"applied={len(applied)} existing={len(skipped_existing)} missing={len(skipped_missing)}")
    if skipped_existing:
        print("  existing:", ", ".join(skipped_existing))
    if skipped_missing:
        print("  MISSING in en.json (bad key!):", ", ".join(skipped_missing))
        sys.exit(2)


if __name__ == "__main__":
    main()
