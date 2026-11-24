"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";

import { setAccessToken } from "@/features/auth/auth-session";
import { login } from "@/features/auth/api/auth-api";
import styles from "@/features/auth/components/login-form.module.css";

type LoginField = "email" | "password";
type FieldErrors = Partial<Record<LoginField, string>>;

function characterCount(value: string): number {
  return Array.from(value).length;
}

export function LoginForm() {
  const router = useRouter();
  const emailInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validateField(
    field: LoginField,
    value = field === "email" ? email : password,
    emailTypeMismatch = emailInput.current?.validity.typeMismatch ?? false,
  ): string | undefined {
    if (field === "email") {
      if (!value.trim()) return "Enter your email address.";
      if (characterCount(value) > 255) {
        return "Email addresses must be 255 characters or fewer.";
      }
      if (emailTypeMismatch) {
        return "Enter an email address in the format you@example.com.";
      }
      return undefined;
    }

    if (value.length === 0) return "Enter your password.";
    if (characterCount(value) > 255) {
      return "Passwords must be 255 characters or fewer.";
    }
    return undefined;
  }

  function updateFieldError(
    field: LoginField,
    value?: string,
    emailTypeMismatch?: boolean,
  ) {
    const message = validateField(field, value, emailTypeMismatch);
    setFieldErrors((current) => {
      if (message) return { ...current, [field]: message };
      const remaining = { ...current };
      delete remaining[field];
      return remaining;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const nextFieldErrors: FieldErrors = {};
    for (const field of ["email", "password"] as const) {
      const message = validateField(field);
      if (message) nextFieldErrors[field] = message;
    }
    setFieldErrors(nextFieldErrors);
    setError(null);
    if (Object.keys(nextFieldErrors).length > 0) {
      if (nextFieldErrors.email) emailInput.current?.focus();
      else passwordInput.current?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login({
        email: email.trim(),
        password,
        trusted_device: rememberDevice,
      });
      setAccessToken(result.access_token);
      router.replace("/admin");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className={styles.form}
      method="post"
      noValidate
      onSubmit={handleSubmit}
    >
      <div className={styles.field}>
        <label htmlFor="login-email">Email address</label>
        <input
          id="login-email"
          ref={emailInput}
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          required
          autoCapitalize="none"
          spellCheck={false}
          disabled={isSubmitting}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
          onBlur={() => updateFieldError("email")}
          onChange={(event) => {
            const value = event.target.value;
            setEmail(value);
            if (fieldErrors.email) {
              updateFieldError("email", value, event.target.validity.typeMismatch);
            }
            setError(null);
          }}
        />
        {fieldErrors.email && (
          <p
            className={styles.fieldError}
            id="login-email-error"
            aria-live="polite"
          >
            {fieldErrors.email}
          </p>
        )}
      </div>

      <div className={styles.field}>
        <div className={styles.labelRow}>
          <label htmlFor="login-password">Password</label>
        </div>
        <div className={styles.passwordInput}>
          <input
            id="login-password"
            ref={passwordInput}
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            required
            disabled={isSubmitting}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={
              fieldErrors.password ? "login-password-error" : undefined
            }
            onBlur={() => updateFieldError("password")}
            onChange={(event) => {
              const value = event.target.value;
              setPassword(value);
              if (fieldErrors.password) updateFieldError("password", value);
              setError(null);
            }}
          />
          <button
            className={styles.passwordToggle}
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((visible) => !visible)}
            disabled={isSubmitting}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        {fieldErrors.password && (
          <p
            className={styles.fieldError}
            id="login-password-error"
            aria-live="polite"
          >
            {fieldErrors.password}
          </p>
        )}
      </div>

      <label className={styles.remember}>
        <input
          type="checkbox"
          checked={rememberDevice}
          onChange={(event) => setRememberDevice(event.target.checked)}
          disabled={isSubmitting}
        />
        <span className={styles.checkbox} aria-hidden="true" />
        <span>
          Remember this device <span className={styles.duration}>for 30 days</span>
        </span>
      </label>

      {error && (
        <p className={styles.error} role="alert">
          <span aria-hidden="true">!</span>
          {error}
        </p>
      )}

      <button className={styles.submit} type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <span className={styles.spinner} aria-hidden="true" />
            Signing in…
          </>
        ) : (
          <>
            Sign in <span aria-hidden="true">→</span>
          </>
        )}
      </button>
    </form>
  );
}
