import { AUTH_STEPS } from "../../constants/auth.constant";
import { IAuthFlowProps } from "../../interfaces/auth.interface";
import { EmailStep } from "./Email/EmailStep";
import { OTPStep } from "./OTP/OTPStep";

interface IAuthFlowComponentProps extends IAuthFlowProps {
  onEmailSubmit: (email: string) => void;
  onOTPSubmit: (code: string) => void;
  onResend: () => void;
  onBack: () => void;
  isLoading: boolean;
  error: string | null;
}

// Рендерит шаг auth-flow по activeStep: ввод email или ввод OTP-кода.
export function AuthFlow({
  activeStep,
  email,
  onEmailSubmit,
  onOTPSubmit,
  onResend,
  onBack,
  isLoading,
  error,
}: IAuthFlowComponentProps) {
  switch (activeStep) {
    case AUTH_STEPS.EMAIL:
      return (
        <EmailStep
          onSubmit={onEmailSubmit}
          isLoading={isLoading}
          error={error}
        />
      );

    case AUTH_STEPS.OTP:
      return (
        <OTPStep
          email={email}
          onSubmit={onOTPSubmit}
          onResend={onResend}
          onBack={onBack}
          isLoading={isLoading}
          error={error}
        />
      );

    default:
      return null;
  }
}
