# blazor-webview README

This is the README for a sample "blazor-webview" extension. It demonstrates a working VSCode
extension that hosts a Blazor app in a webview.

## Build custom VSCode to work around URL problem

- clone https://github.com/rrelyea/vscode
- install prereqs to dev vscode (see https://github.com/microsoft/vscode/wiki/How-to-Contribute)
- build VSCode (yarn. yarn watch.)

## Clone and build VSCode Extension to host blazorApp
- clone http://github.com/rrelyea/vscode-webview-blazor
- vscode-webview-blazor> npm install
- vscode-webview-blazor> dotnet publish blazorApp

# Launch custom VSCode
- open vscode repo in vscode.
- press F5 to launch a new instance of vscode (with my changes).

# Launch Extension Dev Host
- with custom vscode, open the vscode-webview-blazor repo folder.
- press F5 to launch an "[Extension Development Host]" vscode.
- press ctrl-shift-p and launch "Start Blazor Webview" command
