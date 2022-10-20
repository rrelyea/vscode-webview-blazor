import * as path from 'path';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('blazor-webview.start', () => {
		BlazorPanel.createOrShow(context.extensionPath);
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}


/**
 * Manages blazor webview panels
 */
 class BlazorPanel {
	/**
	 * Track the currently panel. Only allow a single panel to exist at a time.
	 */
	public static currentPanel: BlazorPanel | undefined;

	private static readonly viewType = 'blazor';
	private static readonly appName = 'blazorApp';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionPath: string;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionPath: string) {
		const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

		// If we already have a panel, show it.
		// Otherwise, create a new panel.
		if (BlazorPanel.currentPanel) {
			BlazorPanel.currentPanel._panel.reveal(column);
		} else {
			BlazorPanel.currentPanel = new BlazorPanel(extensionPath, column || vscode.ViewColumn.One);
		}
	}

	private constructor(extensionPath: string, column: vscode.ViewColumn) {
		this._extensionPath = extensionPath;

		// Create and show a new webview panel
		this._panel = vscode.window.createWebviewPanel(BlazorPanel.viewType, "Blazor", column, {
			// Enable javascript in the webview
			enableScripts: true,

			// And restric the webview to only loading content from our extension's `media` directory.
			localResourceRoots: [
				vscode.Uri.file(path.join(this._extensionPath, BlazorPanel.appName))
			]
		});
		
		// Set the webview's initial html content 
		this._panel.webview.html = this._getHtmlForBlazorWebview();

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
		BlazorPanel.currentPanel = undefined;

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

	private _getHtmlForBlazorWebview() {
		const basePath = path.join(this._extensionPath, BlazorPanel.appName, 'bin', 'debug', 'net7.0', 'publish', 'wwwroot') + "\\";
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
				<link href="${baseUrl}css/bootstrap/bootstrap.min.css" rel="stylesheet" />
				<link href="${baseUrl}css/app.css" rel="stylesheet" />
				<link href="${baseUrl}${BlazorPanel.appName}.styles.css" rel="stylesheet" />
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
}

function getNonce() {
	let text = "";
	const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}