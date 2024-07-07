import * as vscode from 'vscode';
import z from 'zod';
import path from 'path';
import fs from 'fs';
import packageJSON from '~/package.json';

const CURRENT_THEME_KEY = 'currentTheme';

let activationTimeout: NodeJS.Timeout | undefined;

const { properties } =
  packageJSON.contributes.configuration.properties['workspace-theme-switcher'];

const settingsSchema = z.object({
  workspaces: z
    .array(
      z.object({
        path: z.string(),
        theme: z.string(),
      })
    )
    .optional()
    .default(properties.workspaces.default),
  defaultTheme: z.string().optional().default(properties.defaultTheme.default),
  activationDelay: z
    .number()
    .optional()
    .default(properties.activationDelay.default),
});

type Settings = z.infer<typeof settingsSchema>;

let themeNameToPath: Record<string, string> = {};
let statusBarItem: vscode.StatusBarItem;
const workspaces: Settings['workspaces'] = [];

function initStatusBarItem(context: vscode.ExtensionContext) {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    10
  );
  updateStatusBarItem(context);
  statusBarItem.show();
}

function updateStatusBarItem(context: vscode.ExtensionContext) {
  const theme = context.workspaceState.get(CURRENT_THEME_KEY);
  statusBarItem.text = `Dynamic Theme <${theme}>`;
}

function updateThemeNameToPath() {
  themeNameToPath = {};
  for (const extension of vscode.extensions.all) {
    const { contributes, name } = extension.packageJSON;
    if (name === packageJSON.name) continue;
    const extensionPath = extension.extensionUri.fsPath;
    for (const theme of contributes?.themes ?? []) {
      themeNameToPath[theme.label] = path.join(extensionPath, theme.path);
    }
  }
}

function updateWorkspaces() {
  const config = vscode.workspace.getConfiguration();
  const setttings = settingsSchema.parse(
    config.get<Settings>(packageJSON.name)
  );
  workspaces.splice(0, workspaces.length, ...setttings.workspaces);
  workspaces.sort((a, b) => b.path.length - a.path.length);
}

function updateTheme(context: vscode.ExtensionContext) {
  if (activationTimeout) {
    clearTimeout(activationTimeout);
    activationTimeout = undefined;
  }

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    logger.warn('No active text editor');
    return;
  }

  const rootPath = vscode.workspace.workspaceFolders
    ? vscode.workspace.workspaceFolders[0].uri.fsPath
    : undefined;

  if (!rootPath) {
    logger.error('Could not determine root path');
    return;
  }

  const filePath = path.resolve(editor.document.uri.fsPath);
  const workspace = workspaces.find((workspace) =>
    filePath.startsWith(path.join(rootPath, workspace.path))
  );
  const currentTheme = context.workspaceState.get(CURRENT_THEME_KEY);

  if (workspace && workspace.theme !== currentTheme) {
    const config = vscode.workspace.getConfiguration();
    const setttings = settingsSchema.parse(
      config.get<Settings>(packageJSON.name)
    );
    const dynamicThemePath = path.join(
      context.extensionPath,
      'themes/dynamic.json'
    );
    const themePath = themeNameToPath[workspace.theme];
    activationTimeout = setTimeout(() => {
      fs.copyFileSync(themePath, dynamicThemePath);
      context.workspaceState.update(CURRENT_THEME_KEY, workspace.theme);
      updateStatusBarItem(context);
    }, setttings.activationDelay);
  }
}

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration();
  const settings = settingsSchema.parse(config.get<Settings>(packageJSON.name));
  const workbenchTheme = config.get<string>('workbench.colorTheme');

  if (workbenchTheme !== packageJSON.contributes.themes[0].label) {
    config.update(packageJSON.name, {
      ...settings,
      defaultTheme: workbenchTheme,
    });
    config.update(
      'workbench.colorTheme',
      packageJSON.contributes.themes[0].label
    );
  }

  updateThemeNameToPath();
  updateWorkspaces();
  updateTheme(context);
  initStatusBarItem(context);

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => updateTheme(context))
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(packageJSON.name)) {
        updateWorkspaces();
        updateTheme(context);
      }
    })
  );

  vscode.extensions.onDidChange(() => {
    updateThemeNameToPath();
    updateTheme(context);
  });
}

export function deactivate() {
  logger.info('Deactivated');
}

const logger = {
  error: (...message: Array<string | Object>) =>
    console.error(`[${packageJSON.name}] ${message}`),
  warn: (...message: Array<string | Object>) =>
    console.warn(`[${packageJSON.name}] ${message}`),
  info: (...message: Array<string | Object>) =>
    console.log(`[${packageJSON.name}] ${message}`),
};
