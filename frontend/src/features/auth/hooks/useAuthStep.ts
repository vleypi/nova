"use client";
import { useState, useCallback } from "react";

import { AUTH_STEPS } from "../constants/auth.constant";
import {
  TAuthStep,
  IUseAuthStepReturn,
} from "../interfaces/auth.interface";

// State-management шага auth-flow. Хранит текущий шаг и email между шагами.
export function useAuthStep(): IUseAuthStepReturn {
  const [activeStep, setActiveStep] = useState<TAuthStep>(AUTH_STEPS.EMAIL);
  const [email, setEmail] = useState("");

  const goToOTP = useCallback((submittedEmail: string) => {
    setEmail(submittedEmail);
    setActiveStep(AUTH_STEPS.OTP);
  }, []);

  const goToEmail = useCallback(() => {
    setActiveStep(AUTH_STEPS.EMAIL);
  }, []);

  return { activeStep, email, goToOTP, goToEmail };
}
