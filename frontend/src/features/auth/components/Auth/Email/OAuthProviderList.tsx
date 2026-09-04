"use client";
import { AUTH_PROVIDERS_LIST } from "../../../constants/auth.constant";
import { OAuthProviderButton } from "./OAuthProviderButton";

// Список OAuth-провайдеров для входа. Расширяется через AUTH_PROVIDERS_LIST.
export function OAuthProviderList() {
  return (
    <div className="space-y-4 mt-4">
      {AUTH_PROVIDERS_LIST.map((provider) => (
        <OAuthProviderButton key={provider.id} provider={provider} />
      ))}
    </div>
  );
}
