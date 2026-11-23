"use client";

import { useEffect, useRef, useState } from "react";
import Notice from "@/ui/components/ui/Notice";
import { Button, ButtonLink, ArrowRight } from "@/ui/components/ui/Button";
import Field from "@/ui/components/ui/Field";
import { SelectInput, TextInput } from "@/ui/components/ui/Field";
import { apiFetch } from "@/ui/lib/api-client";
import Link from "next/link";

/**
 * Accepts a one-time administrator invitation token, lets the invitee set up
 * their account, then invalidates the token. The token is never echoed into
 * the page after the call.
 */
export default function AcceptInvitationClient({ token }) {
  const [state, setState] = useState({
    status: token ? "ready" : "missing",
    message: null,
    busy: false,
  });
  const [form, setForm] = useState({
    fullName: "",
    password: "",
    phone: "",
    gender: "male",
  });
  const [formErrors, setFormErrors] = useState({});
  const started = useRef(false);
  const urlCleaned = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;

    // Remove the one-time invitation token from the visible browser URL after
    // capturing it in React state. This prevents the token from lingering in
    // browser history, bookmarks, or Referer headers. The token remains in
    // component state for form submission.
    if (typeof window !== "undefined" && !urlCleaned.current) {
      urlCleaned.current = true;
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [token]);

  function validateForm() {
    const errors = {};
    if (form.fullName.trim().length < 2) {
      errors.fullName = "Please enter your full name.";
    }
    if (form.password.length < 12) {
      errors.password = "Use at least 12 characters.";
    }
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15) {
      errors.phone = "Enter a phone number with 10 to 15 digits.";
    }
    if (!["male", "female"].includes(form.gender)) {
      errors.gender = "Select a gender option.";
    }
    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    if (!token) {
      setState({ status: "error", message: "No invitation token found.", busy: false });
      return;
    }

    setState((current) => ({ ...current, busy: true, message: null }));
    setFormErrors({});

    try {
      await apiFetch("/api/auth/admin-invitation/accept", {
        method: "POST",
        body: JSON.stringify({
          token,
          fullName: form.fullName.trim(),
          password: form.password,
          phone: form.phone.trim(),
          gender: form.gender,
        }),
      });
      setState({ status: "success", message: null, busy: false });
    } catch (error) {
      setState((current) => ({
        ...current,
        busy: false,
        message:
          error.code === "TOKEN_INVALID"
            ? "This invitation link is invalid, already used, or has expired. Contact the Super Admin."
            : error.message,
      }));
    }
  }

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((current) => ({ ...current, [name]: undefined }));
    }
  }

  if (state.status === "missing") {
    return (
      <div className="card-paper mx-auto max-w-xl p-8">
        <Notice tone="error" title="No invitation token found">
          Open the complete invitation link from your invitation email, including the token.
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
          Account created.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-[1.75] text-ink-500">
          Your administrator account is ready. You can now sign in and access the features permitted
          by your assigned permissions.
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
        {state.message ? (
          <Notice tone="error" title="Invitation could not be accepted">
            {state.message}
          </Notice>
        ) : null}
        <Field id="inviteFullName" label="Full name" required error={formErrors.fullName}>
          <TextInput
            id="inviteFullName"
            name="fullName"
            autoComplete="name"
            value={form.fullName}
            onChange={(event) => updateField("fullName", event.target.value)}
            invalid={Boolean(formErrors.fullName)}
            placeholder="As it should appear on your account"
          />
        </Field>
        <Notice tone="info" title="Your email is already set">
          The email address invited by the Super Admin is bound to this link and cannot be changed
          here.
        </Notice>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="invitePassword"
            label="Password"
            required
            hint="12+ characters"
            error={formErrors.password}
          >
            <TextInput
              id="invitePassword"
              name="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              invalid={Boolean(formErrors.password)}
              placeholder="Create a strong password"
            />
          </Field>
          <Field id="invitePhone" label="Phone number" required error={formErrors.phone}>
            <TextInput
              id="invitePhone"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              invalid={Boolean(formErrors.phone)}
              placeholder="+91 98765 43210"
            />
          </Field>
        </div>
        <Field id="inviteGender" label="Gender" required error={formErrors.gender}>
          <SelectInput
            id="inviteGender"
            name="gender"
            value={form.gender}
            onChange={(event) => updateField("gender", event.target.value)}
            invalid={Boolean(formErrors.gender)}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </SelectInput>
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={state.busy}>
          {state.busy ? "Creating account…" : "Accept invitation"}
        </Button>
      </form>
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
