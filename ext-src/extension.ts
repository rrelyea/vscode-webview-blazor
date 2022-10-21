import * as path from 'path';
import * as vscode from 'vscode';
import * as child from 'child_process';

export function activate(context: vscode.ExtensionContext) {
	let disposableWasm = vscode.commands.registerCommand('blazor-webview.startWasm', () => {
		BlazorPanel.createOrShow(context.extensionPath, "wasm");
	});

	let disposableServer = vscode.commands.registerCommand('blazor-webview.startServer', () => {
		BlazorPanel.createOrShow(context.extensionPath, "server");
	});

	context.subscriptions.push(disposableWasm);
	context.subscriptions.push(disposableServer);
}

export function deactivate() {}


/**
 * Manages blazor webview panels
 */
 class BlazorPanel {
	/**
	 * Track the currently panel. Only allow a single panel to exist at a time.
	 */
	public static wasmPanel: BlazorPanel | undefined;
	public static serverPanel: BlazorPanel | undefined;

	private static readonly viewType = 'blazor';
	private static readonly wasmAppName = 'blazorApp';
	private static readonly serverAppName = 'blazorServerApp';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionPath: string;
	private readonly _blazorType: string;
	private _disposables: vscode.Disposable[] = [];
    private _res: child.ChildProcess | undefined;

	public static createOrShow(extensionPath: string, blazorType: string) {
		const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

		switch (blazorType) {
			case "wasm":
				// If we already have a panel, show it.
				// Otherwise, create a new panel.
				if (BlazorPanel.wasmPanel) {
					BlazorPanel.wasmPanel._panel.reveal(column);
				} else {
					BlazorPanel.wasmPanel = new BlazorPanel(extensionPath, column || vscode.ViewColumn.One, blazorType);
				}
				break;
			case "server":
				// If we already have a panel, show it.
				// Otherwise, create a new panel.
				if (BlazorPanel.serverPanel) {
					BlazorPanel.serverPanel._panel.reveal(column);
				} else {
					BlazorPanel.serverPanel = new BlazorPanel(extensionPath, column || vscode.ViewColumn.One, blazorType);
				}		
				break;
		}
	}

	private constructor(extensionPath: string, column: vscode.ViewColumn, blazorType: string) {
		this._extensionPath = extensionPath;
		this._blazorType = blazorType;

		// Create and show a new webview panel
		this._panel = vscode.window.createWebviewPanel(BlazorPanel.viewType, "Blazor (" + this._blazorType + ")", column, {
			// Enable javascript in the webview
			enableScripts: true,

			// And restric the webview to only loading content from our extension's `media` directory.
			localResourceRoots: [
				vscode.Uri.file(path.join(this._extensionPath, BlazorPanel.wasmAppName))
			]
		});
		
		switch (this._blazorType) {
			case "wasm":
				this._panel.webview.html = this._getHtmlForBlazorWasmWebview();
				break;
			case "server":
				const projectBasePath = path.join(this._extensionPath, BlazorPanel.serverAppName) ;
				const exeBasePath = path.join(this._extensionPath, BlazorPanel.serverAppName, 'bin', 'debug', 'net7.0', 'publish') ;
				const exePath = path.join(exeBasePath, BlazorPanel.serverAppName + '.exe');

				this._res = child.execFile(exePath , 
					{
						cwd: exeBasePath
				  	});

				console.log(this._res);

				this._panel.webview.html = this._getHtmlForBlazorServerWebview();
				break;
		}

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(message => {
			switch (message.command) {
				case 'alert':
					vscode.window.showErrorMessage(message.text);
					return;
			}
		}, null, this._disposables);
	}

	public doRefactor() {
		// Send a message to the webview webview.
		// You can send any JSON serializable data.
		this._panel.webview.postMessage({ command: 'refactor' });
	}

	public dispose() {
		switch (this._blazorType) {
			case "wasm":
				BlazorPanel.wasmPanel = undefined;
				break;
			case "server":
				BlazorPanel.serverPanel = undefined;
				break;
		}

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private buildWebViewUrl(path: string) {
		return 'https://file.no-authority.vscode-resource.vscode-cdn.net' + vscode.Uri.file(path).toString().substring(7);
	}

	private _getHtmlForBlazorWasmWebview() {
		const basePath = path.join(this._extensionPath, BlazorPanel.wasmAppName, 'bin', 'debug', 'net7.0', 'publish', 'wwwroot') + "\\";
		const baseUrl = this.buildWebViewUrl(basePath);

		// Use a nonce to whitelist which scripts can be run
		const nonce = getNonce();
		
		return `<!DOCTYPE html>
			<html lang="en">
			
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
				<title>blazorApp</title>
				<base href="/">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; connect-src https:; img-src vscode-resource: https: data:; script-src 'unsafe-inline' 'unsafe-eval' https:; style-src vscode-resource: 'unsafe-inline' http: https: data:; font-src https:">
				<link href="${baseUrl + 'css/bootstrap/bootstrap.min.css'}" rel="stylesheet" />
				<link href="${baseUrl + 'css/app.css" rel="stylesheet'}" />
				<link href="${baseUrl + BlazorPanel.wasmAppName + '.styles.css'}" rel="stylesheet" />
			</head>
			
			<body>
			<div id="app">Loading...</div>
				<div id="blazor-error-ui">
					An unhandled error has occurred.
					<a href="" class="reload">Reload</a>
					<a class="dismiss">🗙</a>
				</div>
				<script nonce="${nonce}" src="${baseUrl}_framework/blazor.webassembly.js" autostart="false"></script>
				<script>
					window.getLocalResourceRoot = () => '${baseUrl}';
					Blazor.start({
						loadBootResource: (type, name, defaultUri, integrity) => \`${baseUrl}_framework/\${name}\`,
					});
				</script>
			</body>
			
			</html>`;
	}

	private _getHtmlForBlazorServerWebview() {
		const basePath = path.join(this._extensionPath, BlazorPanel.wasmAppName, 'bin', 'debug', 'net6.0', 'publish', 'wwwroot') + "\\";
		const baseUrl = this.buildWebViewUrl(basePath);

		// Use a nonce to whitelist which scripts can be run
		const nonce = getNonce();
		
		return `<!DOCTYPE html>
			<html lang="en">
			
			<head>
				<base href="${baseUrl}">
			</head>
			
			<body>
				<iframe src='http://localhost:5000/' width="100%" height="800px"/>
			</body>
			
			</html>`;
	}
}

function getNonce() {
	let text = "";
	const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}