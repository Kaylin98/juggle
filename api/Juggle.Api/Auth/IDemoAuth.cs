using Juggle.Api.Data.Entities;

namespace Juggle.Api.Auth;

/// <summary>Signs a user in without credentials. Replaced by Entra ID / Google sign-in after the demo.</summary>
public interface IDemoAuth
{
    Task SignInAsync(User user);
    Task SignOutAsync();
}
