# blazor-webview README

This is the README for a sample "blazor-webview" extension. It demonstrates a working VSCode
extension that hosts a Blazor app in a webview. It shows two different styles of blazor apps working:
 - blazorApp (via WebAssembly execution of C# code)
 - blazorServerApp (via a http server running a blazor server app and interacting via http with the vscode webview)


Note: This sample started with a similar structure and approach as the blazor-webview-react sample by rebornix: https://github.com/rebornix/vscode-webview-react

## Build custom VSCode to work around URL problem in retail VSCode

- details on problem in retail VSCode: https://github.com/microsoft/vscode/issues/163225

- clone https://github.com/rrelyea/vscode
- git checkout dev-rrelyea-schemeAuthorityDelimiter
- install prereqs to dev vscode (see https://github.com/microsoft/vscode/wiki/How-to-Contribute)
- build VSCode (yarn. yarn watch.)

## Clone and build VSCode Extension to host blazorApp
- clone http://github.com/rrelyea/vscode-webview-blazor
- vscode-webview-blazor> npm install
- vscode-webview-blazor> dotnet publish blazorApp
- vscode-webview-blazor> dotnet publish blazorServerApp

# Launch custom VSCode
- open vscode repo in vscode then press F5 to launch a new instance of vscode (with my changes).
or 
- run vscode\scripts\code.bat

# Launch Extension Dev Host
- with custom vscode, open the vscode-webview-blazor repo folder.
- press F5 to launch an "[Extension Development Host]" vscode.
- press ctrl-shift-p and launch "Start Blazor Webview (server)" command
- press ctrl-shift-p and launch "Start Blazor Webview (wasm)" command
