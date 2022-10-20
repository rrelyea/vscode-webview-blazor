using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Routing;
using Microsoft.JSInterop;
using System.Collections.Specialized;
using System.Web;

namespace blazorApp.Services;

internal sealed class VsCodeHelper : IDisposable
{
    private const string GetLocalResourceRootJsMethod = "getLocalResourceRoot";

    private readonly IJSInProcessRuntime _jsInProcessRuntime;
    private readonly NavigationManager _navigationManager;

    private NameValueCollection _requiredQueryParameters = default!;
    private IDisposable _locationChangingRegistration = default!;
    private string _localResourceRoot = default!;

    private bool _isInitialized;

    public VsCodeHelper(IJSRuntime jsRuntime, NavigationManager navigationManager)
    {
        if (jsRuntime is not IJSInProcessRuntime jsInProcessRuntime)
        {
            throw new InvalidOperationException(
                $"The {nameof(VsCodeHelper)} service requires a '{nameof(IJSInProcessRuntime)}' " +
                $"but got a '{jsRuntime.GetType().Name}' instead.");
        }

        _jsInProcessRuntime = jsInProcessRuntime;
        _navigationManager = navigationManager;
    }

    public void Initialize()
    {
        if (_isInitialized)
        {
            return;
        }

        var uriString = _navigationManager.Uri;
        if (!Uri.TryCreate(uriString, UriKind.RelativeOrAbsolute, out var uri))
        {
            throw new InvalidOperationException($"Could not parse the URI '{uriString}'.");
        }

        if (uri.Query is not { Length: > 0 } queryString)
        {
            throw new InvalidOperationException($"The required query string was empty.");
        }

        _requiredQueryParameters = HttpUtility.ParseQueryString(queryString);

        // VSCode navigates to /index.html by default, which will match the "not found" route
        // after Blazor starts up. So, we navigate to the home page immediately.
        _navigationManager.NavigateTo($"/?{_requiredQueryParameters}");

        // VSCode reads query parameters from the URI to determine how to load resources. Since
        // navigations would remove that query string, we intercept all navigation attempts,
        // cancelling them if they don't have the required query parameters. We then re-initiate the navigation
        // with the required query parameters.
        _locationChangingRegistration = _navigationManager.RegisterLocationChangingHandler(HandleLocationChangingAsync);

        // Local resources have URIs with an external origin, so relative paths must be converted to have that origin.
        // We use JS interop to invoke a method that returns the local resource root to help perform this conversion.
        _localResourceRoot = _jsInProcessRuntime.Invoke<string>(GetLocalResourceRootJsMethod);

        _isInitialized = true;
    }

    public string AsWebViewUri(string relativeUri)
    {
        AssertInitialized();
        return Path.Combine(_localResourceRoot, relativeUri);
    }

    private ValueTask HandleLocationChangingAsync(LocationChangingContext context)
    {
        if (!Uri.TryCreate(context.TargetLocation, UriKind.RelativeOrAbsolute, out var uri))
        {
            // Don't attempt to manipulate malformed URIs.
            return ValueTask.CompletedTask;
        }

        var queryParameters = HttpUtility.ParseQueryString(uri.Query);

        // "id" is just one of the required query parameters. For simplicity,
        // we're assuming that URIs either have all or none of the required parameters.
        if (queryParameters["id"] is null)
        {
            context.PreventNavigation();
            queryParameters.Add(_requiredQueryParameters);

            var uriBuilder = new UriBuilder(uri)
            {
                Query = queryParameters.ToString()
            };

            _navigationManager.NavigateTo(uriBuilder.Uri.ToString(), new NavigationOptions()
            {
                HistoryEntryState = context.HistoryEntryState,
                ReplaceHistoryEntry = true,
            });
        }

        return ValueTask.CompletedTask;
    }

    private void AssertInitialized()
    {
        if (!_isInitialized)
        {
            throw new InvalidOperationException($"The {nameof(VsCodeHelper)} has not been initialized.");
        }
    }

    public void Dispose()
    {
        if (!_isInitialized)
        {
            return;
        }

        _locationChangingRegistration.Dispose();
    }
}
