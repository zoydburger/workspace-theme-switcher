// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import path from 'path';

const LOGGING_PREFIX = '[workspace-theme-switcher]';
const CONFIG_PREFIX = 'workspace-theme-switcher';
const THEME_CONFIG_KEY = 'workbench.colorTheme';

type Config = {
  defaultTheme: string;
  workspaces: Array<{ path: string; theme: string }>;
};

export function activate(context: vscode.ExtensionContext) {
  log('info', 'Extension activated');

  const rootPath = vscode.workspace.workspaceFolders
    ? vscode.workspace.workspaceFolders[0].uri.fsPath
    : undefined;

  if (rootPath === undefined) {
    log('error', 'Error initializing extension: Could not determine root path');
    return;
  }

  const editor = vscode.window.activeTextEditor;
  if (editor !== undefined) {
    const filePath = editor.document.uri.fsPath;
    const config = vscode.workspace.getConfiguration();
    void setThemeForFile(rootPath, filePath, config);
    vscode.window.showInformationMessage(
      `${LOGGING_PREFIX} initialized with theme '${config.get(
        THEME_CONFIG_KEY
      )}'`
    );
  }

  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) {
      const filePath = editor.document.uri.fsPath;
      const config = vscode.workspace.getConfiguration();
      void setThemeForFile(rootPath, filePath, config);
    }
  });
}

function setThemeForFile(
  rootPath: string,
  filePath: string,
  config: vscode.WorkspaceConfiguration
): string | undefined {
  const workspaces = config.get<Config['workspaces']>(
    `${CONFIG_PREFIX}.workspaces`
  );
  if (workspaces === undefined || workspaces.length === 0) {
    log('warn', 'No workspaces configured');
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
    log('warn', 'No theme found for file');
    return;
  }

  if (theme !== config.get(THEME_CONFIG_KEY)) {
    config
      .update(THEME_CONFIG_KEY, theme, vscode.ConfigurationTarget.Workspace)
      .then(
        () => {
          log('info', `Updated theme to ${theme}`);
        },
        (error) => {
          log('error', `Error updating theme: ${error}`);
        }
      );
  }
}

function log(severity: 'error' | 'warn' | 'info', ...message: Array<any>) {
  const output = `${LOGGING_PREFIX} ${message}`;
  switch (severity) {
    case 'error':
      console.error(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    default:
      console.log(output);
  }
}

// This method is called when your extension is deactivated
export function deactivate() {}
