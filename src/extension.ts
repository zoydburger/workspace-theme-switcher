import * as vscode from 'vscode';
import path from 'path';
import fs from 'fs';
import { error } from 'console';

const LOGGING_PREFIX = '[workspace-theme-switcher]';
const CONFIG_PREFIX = 'workspace-theme-switcher';
const THEME_CONFIG_KEY = 'workbench.colorTheme';

enum Settings {
  WORKSPACES = `${CONFIG_PREFIX}.workspaces`,
  THEME_DEFAULT = `${CONFIG_PREFIX}.defaultTheme`,
  THEME_WORKBENCH = 'workbench.colorTheme',
  SCHEMA = '$schema',
}

enum Themes {
  ABYSS = 'Abyss',
  MONOKAI_DIMMED = 'Monokai Dimmed',
}

type Config = {
  defaultTheme: string;
  workspaces: Array<{ path: string; theme: string }>;
  disabled: boolean;
};

const DEFAULT_SETTINGS = {
  [Settings.THEME_DEFAULT]: Themes.ABYSS,
  [Settings.WORKSPACES]: [
    {
      path: '',
      theme: Themes.ABYSS,
    },
    {
      path: '.vscode',
      theme: Themes.MONOKAI_DIMMED,
    },
  ],
};

const DEFAULT_BASE_SETTINGS = {
  [Settings.SCHEMA]: 'vscode://schemas/settings/workspace',
  ...DEFAULT_SETTINGS,
};

function getRootPath() {
  const { workspaceFolders } = vscode.workspace;
  const rootPath = workspaceFolders
    ? workspaceFolders[0].uri.fsPath
    : undefined;

  if (rootPath === undefined) {
    throw new Error('Could not determine root path');
  }
  return rootPath;
}

async function init() {
  const rootPath = getRootPath();
  const settingsPath = path.join(rootPath, '.vscode', 'settings.json');
  const settingsBasePath = path.join(rootPath, '.vscode', 'settings.base.json');
  const hasSettings = fs.existsSync(settingsPath);
  const hasSettingsBase = fs.existsSync(settingsBasePath);

  if (!hasSettings && !hasSettingsBase) {
    const settings = JSON.stringify(DEFAULT_SETTINGS, null, 4);
    const baseSettings = JSON.stringify(DEFAULT_BASE_SETTINGS, null, 4);
    fs.writeFileSync(settingsPath, settings);
    fs.writeFileSync(settingsBasePath, baseSettings);
    vscode.window.showInformationMessage('succesfully nitialized with theme');
    return;
  }

  if (!hasSettingsBase) {
    const baseSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    if (baseSettings.hasOwnProperty(Settings.THEME_WORKBENCH)) {
      const defaultTheme = baseSettings[Settings.THEME_WORKBENCH];
      delete baseSettings[Settings.THEME_WORKBENCH];
      baseSettings[Settings.THEME_DEFAULT] = defaultTheme;
    }
    fs.writeFileSync(settingsBasePath, JSON.stringify(baseSettings, null, 4));
    return;
  }

  const settingsBase = JSON.parse(fs.readFileSync(settingsBasePath, 'utf8'));
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  fs.writeFileSync(
    settingsPath,
    JSON.stringify(
      {
        ...settingsBase,
        ...settings,
      },
      null,
      4
    )
  );
}

export async function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration();

  vscode.workspace.rootPath;

  console.log('dirname', __dirname);

  init();

  logger.info('Extension activated');

  const editor = vscode.window.activeTextEditor;
  if (editor !== undefined) {
    const filePath = editor.document.uri.fsPath;
    const newTheme = setThemeForFile(filePath, config);
    vscode.window.showInformationMessage(`Initialized theme '${newTheme}'`);
  }

  const onChangeEditor = vscode.window.onDidChangeActiveTextEditor((editor) => {
    const extensionConfig = config.get<Config>(CONFIG_PREFIX);
    if (editor) {
      const filePath = editor.document.uri.fsPath;
      const config = vscode.workspace.getConfiguration();
      setThemeForFile(filePath, config);
    }
  });

  context.subscriptions.push(onChangeEditor);

  // command to disable the extension
  const disableExtensionCommand = vscode.commands.registerCommand(
    'workspace-theme-switcher.disable',
    () =>
      context.workspaceState.update('isEnabled', false).then(() => {
        vscode.window.showInformationMessage('Extension disabled!');
      })
  );

  const enableExtensionCommand = vscode.commands.registerCommand(
    'workspace-theme-switcher.enable',
    () =>
      context.workspaceState.update('isEnabled', true).then(() => {
        vscode.window.showInformationMessage('Extension enabled!');
      })
  );

  context.subscriptions.push(disableExtensionCommand);
  context.subscriptions.push(enableExtensionCommand);
}

function setThemeForFile(
  filePath: string,
  config: vscode.WorkspaceConfiguration
): string | undefined {
  const rootPath = getRootPath();
  const workspaces = config.get<Config['workspaces']>(
    `${CONFIG_PREFIX}.workspaces`
  );
  if (workspaces === undefined || workspaces.length === 0) {
    logger.warn('No workspaces configured');
    return;
  }

  workspaces.sort((a, b) => b.path.length - a.path.length);
  const workspace = workspaces.find((workspace) =>
    filePath.startsWith(path.join(rootPath, workspace.path))
  );

  const theme =
    workspace?.theme ??
    config.get<Config['defaultTheme']>(`${CONFIG_PREFIX}.defaultTheme`);

  if (!theme) {
    logger.warn('No theme found for file');
    return;
  }

  if (theme !== config.get(THEME_CONFIG_KEY)) {
    config
      .update(THEME_CONFIG_KEY, theme, vscode.ConfigurationTarget.Workspace)
      .then(
        () => {
          logger.info(`Theme '${theme}' activated.`);
        },
        (error) => {
          logger.error('Error updating theme', error);
        }
      );
  }
  return theme;
}

const logger = {
  error: (...message: Array<string | Object>) =>
    console.error(`${LOGGING_PREFIX} ${message}`),
  warn: (...message: Array<string | Object>) =>
    console.warn(`${LOGGING_PREFIX} ${message}`),
  info: (...message: Array<string | Object>) =>
    console.log(`${LOGGING_PREFIX} ${message}`),
};

export function deactivate() {}
