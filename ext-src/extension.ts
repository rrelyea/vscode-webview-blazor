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
				vscode.Uri.file(path.join(this._extensionPath, 'blazorApp'))
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

	private _getHtmlForBlazorWebview() {
		const basePath = path.join(this._extensionPath, 'blazorApp', 'bin', 'debug', 'net6.0', 'publish', 'wwwroot') + "\\";
		const baseUrl = 'https://file.no-authority.vscode-resource.vscode-cdn.net' + vscode.Uri.file(basePath).toString().substring(7);
		
		// Use a nonce to whitelist which scripts can be run
		const nonce = getNonce();
		
		return `<!DOCTYPE html>
			<html lang="en">
			
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
				<title>blazorApp</title>
				<base href="${baseUrl}">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; connect-src https:; img-src vscode-resource: https: data:; script-src 'unsafe-inline' 'unsafe-eval' https:; style-src vscode-resource: 'unsafe-inline' http: https: data:; font-src https:">
				<link href="css/bootstrap/bootstrap.min.css" rel="stylesheet" />
				<link href="css/app.css" rel="stylesheet" />
				<link href="blazorApp.styles.css" rel="stylesheet" />
			</head>
			
			<body>
			<div id="app">Loading...</div>
				<div id="blazor-error-ui">
					An unhandled error has occurred.
					<a href="" class="reload">Reload</a>
					<a class="dismiss">🗙</a>
				</div>
				<script nonce="${nonce}" src="_framework/blazor.webassembly.js" autostart="false"></script>
				<script nonce="${nonce}">

					// WARNING - WORKAROUND NOT GUARANTEED TO WORK IN FUTURE
					// Without this line of script, Blazor 6.0 (and likely 7.0) will through an exception on launch of the blazorApp, and fail to load properly.
					// The Blazor team is looking at this problem, and will likely address in a future version of Blazor.
					// Issue tracking this problem: https://github.com/dotnet/aspnetcore/issues/26790
					Blazor._internal.navigationManager.getLocationHref = () => document.baseURI;
					
					Blazor.start();
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