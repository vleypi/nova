"use client";
import {
  AuthFlow,
  useAuthStep,
  useAuthHandlers,
  useAuthRedirect,
} from "@/features/auth";

// Страница авторизации с email/OTP-flow
export default function AuthPage() {
  const { activeStep, email, goToOTP, goToEmail } = useAuthStep();
  const { handleVerified } = useAuthRedirect();
  const {
    handleSendCode,
    handleVerifyCode,
    handleResendCode,
    isLoading,
    error,
  } = useAuthHandlers(goToOTP, handleVerified);

  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-md">
          <AuthFlow
            activeStep={activeStep}
            email={email}
            onEmailSubmit={handleSendCode}
            onOTPSubmit={handleVerifyCode}
            onResend={handleResendCode}
            onBack={goToEmail}
            isLoading={isLoading}
            error={error}
          />
        </div>
      </div>
    </main>
  );
}
