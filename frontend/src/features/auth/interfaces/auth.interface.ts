import type { IUser } from "@/shared/identity";

export interface IAuthResponse {
  message: string;
  success: boolean;
}

export interface ILoginResponse {
  accessToken: string;
  refreshToken: string;
  user: IUser;
}

export type TAuthStep = "email" | "otp";

export interface IAuthFlowProps {
  activeStep: TAuthStep;
  email: string;
}

export interface IAuthProvider {
  id: string;
  name: string;
  icon: string;
  className: string;
  href: string;
}

export interface IEmailStepProps {
  onSubmit: (email: string) => void;
  isLoading: boolean;
  error: string | null;
}

export interface IOTPStepProps {
  email: string;
  onSubmit: (code: string) => void;
  onResend: () => void;
  onBack: () => void;
  isLoading: boolean;
  error: string | null;
}

export interface IUseAuthStepReturn {
  activeStep: TAuthStep;
  email: string;
  goToOTP: (email: string) => void;
  goToEmail: () => void;
}

export interface IUseAuthHandlersReturn {
  handleSendCode: (email: string) => void;
  handleVerifyCode: (code: string) => void;
  handleResendCode: () => void;
  isLoading: boolean;
  error: string | null;
}

export interface IUseOTPTimerReturn {
  timeLeft: number;
  formatted: string;
  isExpired: boolean;
  restart: () => void;
}

export interface IUseResendCooldownReturn {
  cooldown: number;
  canResend: boolean;
  startCooldown: () => void;
}
