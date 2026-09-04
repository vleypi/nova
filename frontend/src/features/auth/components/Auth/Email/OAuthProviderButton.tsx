"use client";
import Image from "next/image";

import { IAuthProvider } from "../../../interfaces/auth.interface";

interface IOAuthProviderButtonProps {
  provider: IAuthProvider;
}

// Кнопка входа через OAuth-провайдера. Используем полный navigate на
// provider.href, потому что серверный OAuth-handshake требует full reload.
export function OAuthProviderButton({ provider }: IOAuthProviderButtonProps) {
  const handleClick = () => {
    window.location.href = provider.href;
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full font-medium py-5 rounded-2xl text-lg transition-colors active:scale-[0.98] flex items-center justify-center gap-3 ${provider.className}`}
    >
      <Image
        src={provider.icon}
        alt={provider.name}
        width={24}
        height={24}
        className="w-6 h-6"
      />
      {provider.name}
    </button>
  );
}
