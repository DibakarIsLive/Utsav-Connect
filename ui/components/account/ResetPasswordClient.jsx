"use client";

import { useEffect, useRef, useState } from "react";
import Notice from "@/ui/components/ui/Notice";
import { Button, ButtonLink, ArrowRight } from "@/ui/components/ui/Button";
import Field from "@/ui/components/ui/Field";
import { TextInput } from "@/ui/components/ui/Field";
import { apiFetch } from "@/ui/lib/api-client";
import Link from "next/link";

/**
 * Consumes the one-time password reset token from the URL, lets the user set a
 * new password, then invalidates the token and revokes all existing sessions.
 * The token is never echoed into the page after the call.
 */
export default function ResetPasswordClient({ token }) {
  const [state, setState] = useState({
    status: token ? "ready" : "missing",
    message: null,
    busy: false,
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState({});
  const started = useRef(false);
  const urlCleaned = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;

    // Remove the one-time token from the visible browser URL after capturing it
    // in React state. This prevents the token from lingering in browser history,
    // bookmarks, or Referer headers. The token remains in component state for
    // form submission.
    if (typeof window !== "undefined" && !urlCleaned.current) {
      urlCleaned.current = true;
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [token]);

  function validateForm() {
    const errors = {};
    if (password.length < 12) {
      errors.password = "Use at least 12 characters.";
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = "The two passwords do not match.";
    }
    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }
    if (!token) {
      setState({ status: "error", message: "No reset token found.", busy: false });
      return;
    }

    setState((current) => ({ ...current, busy: true, message: null }));
    setPasswordErrors({});

    try {
      await apiFetch("/api/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setState({ status: "success", message: null, busy: false });
    } catch (error) {
      setState((current) => ({
        ...current,
        busy: false,
        message:
          error.code === "TOKEN_INVALID"
            ? "This reset link is invalid, already used, or has expired. Request a new one."
            : error.message,
      }));
    }
  }

  if (state.status === "missing") {
    return (
      <div className="card-paper mx-auto max-w-xl p-8">
        <Notice tone="error" title="No reset token found">
          Open the complete reset link from your password reset email, including the token.
        </Notice>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/apply?mode=login">
            Go to sign in <ArrowRight />
          </ButtonLink>
          <Link
            href="/about"
            className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-ink-600 hover:text-bark-900"
          >
            Learn more
          </Link>
        </div>
      </div>
    );
  }

  if (state.status === "success") {
    return (
      <div className="card-paper mx-auto max-w-xl p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
            <path
              d="m5 12.5 4.2 4.2L19 6.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-bark-900">
          Password reset.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-[1.75] text-ink-500">
          Your password has been changed and all other active sessions were revoked. You can now
          sign in with your new password.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/apply?mode=login" size="lg">
            Sign in <ArrowRight />
          </ButtonLink>
          <ButtonLink href="/about" variant="secondary" size="lg">
            Learn more
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="card-paper mx-auto max-w-xl p-8">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field
          id="resetPassword"
          label="New password"
          required
          hint="12+ characters"
          error={passwordErrors.password}
        >
          <TextInput
            id="resetPassword"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            invalid={Boolean(passwordErrors.password)}
            placeholder="Create a strong password"
          />
        </Field>
        <Field
          id="resetConfirmPassword"
          label="Confirm new password"
          required
          error={passwordErrors.confirmPassword}
        >
          <TextInput
            id="resetConfirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            invalid={Boolean(passwordErrors.confirmPassword)}
            placeholder="Repeat the password"
          />
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={state.busy}>
          {state.busy ? "Resetting…" : "Reset password"}
        </Button>
      </form>
      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink href="/apply?mode=login">
          Back to sign in <ArrowRight />
        </ButtonLink>
        <Link
          href="/about"
          className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-ink-600 hover:text-bark-900"
        >
          Learn more
        </Link>
      </div>
    </div>
  );
}
