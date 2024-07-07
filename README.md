# Workspace Theme Switcher

<img src="https://github.com/zoydburger/workspace-theme-switcher/blob/440feb43fdb8ef416afba62e072571ba640334f0/img/banner.png" alt="banner">
<img src="https://github.com/zoydburger/workspace-theme-switcher/blob/440feb43fdb8ef416afba62e072571ba640334f0/img/banner.gif" alt="showcase" />

## Features

This extension allows you to configure themes for specific workspaces and/or paths within your project. When you open a file from a workspace, the theme is automatically switched to the configured theme.

## Extension Settings

This extension contributes the following settings:

- `workspace-theme-switcher.defaultTheme`: Set a default theme which is applied, when no workspace configuration is found.
- `workspace-theme-switcher.workspaces`: Theme configuration for specific paths

## Example Configuration

```json
{
  ...
  "workspace-theme-switcher.defaultTheme": "Abyss",
  "workspace-theme-switcher.workspaces": [
    {
      "path": ".vscode",
      "theme": "Monokai Dimmed"
    },
    {
      "path": "./workspaces/example-1",
      "theme": "Tomorrow Night Blue",
    },
    {
      "path": "./workspaces/example-2",
      "theme": "Solarized Dark",
    }
  ],
  ...
}
```

## Settings

## Workspace Path Matching

Configured workspaces are sorted ascending by path length. The first file path which begins with the workspace path is used. If no workspace path matches, the default theme is used.

## Known Issues

Coming soon.
