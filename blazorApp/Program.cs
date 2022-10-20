using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using blazorApp;
using blazorApp.Services;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

builder.Services.AddScoped<HttpClient>();
builder.Services.AddSingleton<VsCodeHelper>();

var host = builder.Build();

// Perform VSCode-specific setup before running the host.
var vsCodeHelper = host.Services.GetRequiredService<VsCodeHelper>();
vsCodeHelper.Initialize();

await host.RunAsync();
