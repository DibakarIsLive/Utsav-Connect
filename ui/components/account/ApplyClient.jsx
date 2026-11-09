"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Tabs from "@/ui/components/ui/Tabs";
import Field, { SelectInput, TextArea, TextInput } from "@/ui/components/ui/Field";
import Notice from "@/ui/components/ui/Notice";
import { Button, ArrowRight } from "@/ui/components/ui/Button";
import { LotusDivider } from "@/ui/components/ui/Ornament";
import { useSession } from "@/ui/components/providers/SessionProvider";
import { apiFetch, fieldErrors } from "@/ui/lib/api-client";

const EMPTY_APPLICATION = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  phone: "",
  gender: "male",
  message: "",
};

const TRUST_POINTS = [
  "A real person reviews every application.",
  "Your invitation reports stay private to you and authorised reviewers.",
  "No invitee names or phone numbers are ever collected.",
];

function routeForUser(user) {
  if (!user) return "/apply";
  if (user.role === "admin" || user.role === "super_admin") return "/admin";
  if (user.scope === "full" || user.status === "active") return "/dashboard";
  return "/application-status";
}

export default function ApplyClient({ initialMode = "apply", registrationOpen = true }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { refresh } = useSession();
  const [mode, setMode] = useState(initialMode === "login" ? "login" : "apply");

  const [application, setApplication] = useState(EMPTY_APPLICATION);
  const [applicationErrors, setApplicationErrors] = useState({});
  const [applicationBusy, setApplicationBusy] = useState(false);
  const [applicationSuccess, setApplicationSuccess] = useState(null);

  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [loginErrors, setLoginErrors] = useState({});
  const [loginBusy, setLoginBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function changeMode(next) {
    setMode(next);
    setApplicationErrors({});
    setLoginErrors({});
    if (typeof window !== "undefined") {
      const url = next === "login" ? "/apply?mode=login" : "/apply";
      window.history.replaceState(null, "", url);
    }
  }

  function updateApplication(name, value) {
    setApplication((current) => ({ ...current, [name]: value }));
    if (applicationErrors[name]) {
      setApplicationErrors((current) => ({ ...current, [name]: undefined }));
    }
  }

  function updateCredentials(name, value) {
    setCredentials((current) => ({ ...current, [name]: value }));
    if (loginErrors[name] || loginErrors.submit) {
      setLoginErrors((current) => ({ ...current, [name]: undefined, submit: undefined }));
    }
  }

  function validateApplication() {
    const errors = {};
    if (application.fullName.trim().length < 2) {
      errors.fullName = "Please enter your full name.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(application.email.trim())) {
      errors.email = "Enter a valid email address.";
    }
    if (application.password.length < 12) {
      errors.password = "Use at least 12 characters.";
    }
    if (application.password !== application.confirmPassword) {
      errors.confirmPassword = "The two passwords do not match.";
    }
    const digits = application.phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15) {
      errors.phone = "Enter a phone number with 10 to 15 digits.";
    }
    if (!["male", "female"].includes(application.gender)) {
      errors.gender = "Select a gender option.";
    }
    if (application.message.length > 500) {
      errors.message = "Keep the message under 500 characters.";
    }
    return errors;
  }

  async function submitApplication(event) {
    event.preventDefault();
    const errors = validateApplication();
    if (Object.keys(errors).length > 0) {
      setApplicationErrors(errors);
      document.getElementById(Object.keys(errors)[0])?.focus();
      return;
    }

    setApplicationBusy(true);
    setApplicationErrors({});
    try {
      const data = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          fullName: application.fullName.trim(),
          email: application.email.trim().toLowerCase(),
          password: application.password,
          phone: application.phone.trim(),
          gender: application.gender,
          message: application.message.trim() || undefined,
        }),
      });
      setApplicationSuccess({
        email: application.email.trim().toLowerCase(),
        verificationToken: data?.verificationToken ?? null,
      });
      setApplication(EMPTY_APPLICATION);
    } catch (error) {
      const mapped = fieldErrors(error.details);
      if (Object.keys(mapped).length > 0) {
        setApplicationErrors(mapped);
        document.getElementById(Object.keys(mapped)[0])?.focus();
      } else {
        setApplicationErrors({ submit: error.message });
      }
    } finally {
      setApplicationBusy(false);
    }
  }

  async function submitLogin(event) {
    event.preventDefault();
    const errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email.trim())) {
      errors.email = "Enter a valid email address.";
    }
    if (!credentials.password) {
      errors.password = "Enter your password.";
    }
    if (Object.keys(errors).length > 0) {
      setLoginErrors(errors);
      document.getElementById(Object.keys(errors)[0])?.focus();
      return;
    }

    setLoginBusy(true);
    setLoginErrors({});
    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: credentials.email.trim().toLowerCase(),
          password: credentials.password,
        }),
      });
      const user = data?.user ?? null;
      await refresh();
      router.push(routeForUser(user));
      router.refresh();
    } catch (error) {
      setLoginErrors({
        submit:
          error.code === "EMAIL_NOT_VERIFIED"
            ? "Your email is not verified yet. Open the verification link from your application email."
            : error.message,
      });
    } finally {
      setLoginBusy(false);
    }
  }

  const tabItems = [
    { value: "apply", label: "Apply to join" },
    { value: "login", label: "Sign in" },
  ];

  return (
    <div className="bg-cream relative overflow-hidden">
      <div className="pattern-contour absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="shell relative py-12 sm:py-16 lg:py-20">
        <div className="grid items-start gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="lg:sticky lg:top-28"
          >
            <p className="eyebrow text-saffron-700 eyebrow-line">Join the Mahotsav outreach</p>
            <h1 className="text-bark-900 mt-5 max-w-xl text-[2.6rem] leading-[1.02] font-semibold tracking-[-0.045em] sm:text-[3.4rem]">
              Your place on the map begins with a{" "}
              <span className="text-saffron-700 italic">hello.</span>
            </h1>
            <p className="text-ink-600 mt-6 max-w-lg text-[1.02rem] leading-[1.8]">
              Apply for a devotee account to record invitations in approved localities, propose
              places you know, and help the whole outreach see itself clearly. Already part of the
              campaign? Sign in from the same page.
            </p>

            <ul className="mt-8 space-y-3.5">
              {TRUST_POINTS.map((point) => (
                <li key={point} className="text-ink-600 flex items-start gap-3 text-sm leading-relaxed">
                  <span className="bg-saffron-600 mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
                  {point}
                </li>
              ))}
            </ul>


          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="card-paper overflow-hidden">
              <div className="border-line border-b px-5 py-4 sm:px-8 sm:py-5">
                <Tabs
                  items={tabItems}
                  value={mode}
                  onChange={changeMode}
                  ariaLabel="Application or sign in"
                  grow
                />
                <p className="text-ink-400 mt-3 text-[0.72rem] leading-relaxed">
                  {mode === "apply"
                    ? "One application, reviewed by a real administrator. Verification and approval keep the map trustworthy."
                    : "Welcome back. Your account carries the same care and permissions as before."}
                </p>
              </div>

              <div className="p-5 sm:p-8">
                <AnimatePresence mode="wait" initial={false}>
                  {mode === "apply" ? (
                    <motion.div
                      key="apply"
                      initial={reduce ? false : { opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={reduce ? undefined : { opacity: 0, x: 8 }}
                      transition={{ duration: 0.22 }}
                    >
                      {applicationSuccess ? (
                        <div>
                          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
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
                          <h2 className="text-bark-900 mt-5 text-2xl font-semibold tracking-[-0.03em]">
                            Your application has been received.
                          </h2>
                          <p className="text-ink-500 mt-3 text-sm leading-[1.75]">
                            Thank you. A verification link has been prepared for{" "}
                            <strong className="text-bark-900">{applicationSuccess.email}</strong>.
                            After verification, an administrator will review your application.
                          </p>
                          <LotusDivider className="my-6" />
                          <ol className="space-y-3">
                            {[
                              ["Verify your email", "Open the verification link to confirm the address."],
                              ["Wait for review", "An administrator checks every application personally."],
                              ["Start reporting", "Once approved, record invitations and propose localities."],
                            ].map(([title, body], index) => (
                              <li key={title} className="flex items-start gap-3">
                                <span className="bg-bark-900 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.64rem] font-bold text-ivory">
                                  {index + 1}
                                </span>
                                <div>
                                  <p className="text-bark-900 text-sm font-semibold">{title}</p>
                                  <p className="text-ink-500 mt-0.5 text-[0.78rem] leading-relaxed">
                                    {body}
                                  </p>
                                </div>
                              </li>
                            ))}
                          </ol>

                          {applicationSuccess.verificationToken ? (
                            <Notice tone="warning" className="mt-6" title="Development environment">
                              Email delivery is not configured here, so the verification link is
                              shown directly. In production it is sent by email.
                              <Link
                                href={`/verify-email?token=${encodeURIComponent(
                                  applicationSuccess.verificationToken,
                                )}`}
                                className="text-saffron-800 mt-2 block font-semibold underline underline-offset-2"
                              >
                                Verify this email now
                              </Link>
                            </Notice>
                          ) : null}

                          <div className="mt-7 flex flex-wrap gap-3">
                            <Button onClick={() => changeMode("login")}>
                              Go to sign in <ArrowRight />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {!registrationOpen ? (
                            <Notice
                              tone="warning"
                              className="mb-5"
                              title="Applications are currently paused"
                            >
                              New applications are closed at the moment. If you already applied, sign
                              in to follow your application. Please check back, or refer to the
                              official Satsang website for campaign updates.
                            </Notice>
                          ) : null}

                          {applicationErrors.submit ? (
                            <Notice tone="error" className="mb-5" title="Application not submitted">
                              {applicationErrors.submit}
                            </Notice>
                          ) : null}

                          <form onSubmit={submitApplication} noValidate className="space-y-4">
                            <Field
                              id="fullName"
                              label="Full name"
                              required
                              error={applicationErrors.fullName}
                            >
                              <TextInput
                                id="fullName"
                                name="fullName"
                                autoComplete="name"
                                value={application.fullName}
                                onChange={(event) => updateApplication("fullName", event.target.value)}
                                invalid={Boolean(applicationErrors.fullName)}
                                placeholder="As it should appear on your account"
                                aria-describedby={
                                  applicationErrors.fullName ? "fullName-error" : undefined
                                }
                              />
                            </Field>

                            <Field
                              id="email"
                              label="Email address"
                              required
                              error={applicationErrors.email}
                            >
                              <TextInput
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                value={application.email}
                                onChange={(event) => updateApplication("email", event.target.value)}
                                invalid={Boolean(applicationErrors.email)}
                                placeholder="you@example.com"
                                aria-describedby={applicationErrors.email ? "email-error" : undefined}
                              />
                            </Field>

                            <div className="grid gap-4 sm:grid-cols-2">
                              <Field
                                id="password"
                                label="Password"
                                required
                                hint="12+ characters"
                                error={applicationErrors.password}
                              >
                                <TextInput
                                  id="password"
                                  name="password"
                                  type="password"
                                  autoComplete="new-password"
                                  value={application.password}
                                  onChange={(event) =>
                                    updateApplication("password", event.target.value)
                                  }
                                  invalid={Boolean(applicationErrors.password)}
                                  placeholder="Create a strong password"
                                  aria-describedby={
                                    applicationErrors.password ? "password-error" : undefined
                                  }
                                />
                              </Field>
                              <Field
                                id="confirmPassword"
                                label="Confirm password"
                                required
                                error={applicationErrors.confirmPassword}
                              >
                                <TextInput
                                  id="confirmPassword"
                                  name="confirmPassword"
                                  type="password"
                                  autoComplete="new-password"
                                  value={application.confirmPassword}
                                  onChange={(event) =>
                                    updateApplication("confirmPassword", event.target.value)
                                  }
                                  invalid={Boolean(applicationErrors.confirmPassword)}
                                  placeholder="Repeat the password"
                                  aria-describedby={
                                    applicationErrors.confirmPassword
                                      ? "confirmPassword-error"
                                      : undefined
                                  }
                                />
                              </Field>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                              <Field
                                id="phone"
                                label="Phone number"
                                required
                                error={applicationErrors.phone}
                              >
                                <TextInput
                                  id="phone"
                                  name="phone"
                                  type="tel"
                                  autoComplete="tel"
                                  value={application.phone}
                                  onChange={(event) => updateApplication("phone", event.target.value)}
                                  invalid={Boolean(applicationErrors.phone)}
                                  placeholder="+91 98765 43210"
                                  aria-describedby={
                                    applicationErrors.phone ? "phone-error" : undefined
                                  }
                                />
                              </Field>
                              <Field
                                id="gender"
                                label="Gender"
                                required
                                error={applicationErrors.gender}
                              >
                                <SelectInput
                                  id="gender"
                                  name="gender"
                                  value={application.gender}
                                  onChange={(event) =>
                                    updateApplication("gender", event.target.value)
                                  }
                                  invalid={Boolean(applicationErrors.gender)}
                                >
                                  <option value="male">Male</option>
                                  <option value="female">Female</option>
                                </SelectInput>
                              </Field>
                            </div>

                            <Field
                              id="message"
                              label="Message or background"
                              hint={`${application.message.length}/500`}
                              error={applicationErrors.message}
                            >
                              <TextArea
                                id="message"
                                name="message"
                                value={application.message}
                                onChange={(event) => updateApplication("message", event.target.value)}
                                maxLength={500}
                                rows={3}
                                invalid={Boolean(applicationErrors.message)}
                                placeholder="Share any seva experience, the localities you know, or how you would like to help."
                                aria-describedby={
                                  applicationErrors.message ? "message-error" : undefined
                                }
                              />
                            </Field>

                            <div className="pt-1">
                              <Button
                                type="submit"
                                size="lg"
                                className="w-full"
                                disabled={applicationBusy || !registrationOpen}
                              >
                                {applicationBusy
                                  ? "Submitting application…"
                                  : registrationOpen
                                    ? "Submit application"
                                    : "Applications are paused"}
                                {!applicationBusy && registrationOpen ? <ArrowRight /> : null}
                              </Button>
                              <p className="text-ink-400 mt-3 text-center text-[0.68rem] leading-relaxed">
                                By applying you agree to be contacted about your application. We
                                never publish applicant details.
                              </p>
                            </div>
                          </form>
                        </>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="login"
                      initial={reduce ? false : { opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={reduce ? undefined : { opacity: 0, x: -8 }}
                      transition={{ duration: 0.22 }}
                    >
                      <h2 className="text-bark-900 text-2xl font-semibold tracking-[-0.03em]">
                        Welcome back.
                      </h2>
                      <p className="text-ink-500 mt-2 text-sm leading-relaxed">
                        Sign in to follow your application, record invitations, or open the admin
                        workspace.
                      </p>

                      {loginErrors.submit ? (
                        <Notice tone="error" className="mt-5" title="Could not sign in">
                          {loginErrors.submit}
                        </Notice>
                      ) : null}

                      <form onSubmit={submitLogin} noValidate className="mt-6 space-y-4">
                        <Field id="loginEmail" label="Email address" required error={loginErrors.email}>
                          <TextInput
                            id="loginEmail"
                            name="email"
                            type="email"
                            autoComplete="email"
                            value={credentials.email}
                            onChange={(event) => updateCredentials("email", event.target.value)}
                            invalid={Boolean(loginErrors.email)}
                            placeholder="you@example.com"
                          />
                        </Field>

                        <Field id="loginPassword" label="Password" required error={loginErrors.password}>
                          <div className="relative">
                            <TextInput
                              id="loginPassword"
                              name="password"
                              type={showPassword ? "text" : "password"}
                              autoComplete="current-password"
                              value={credentials.password}
                              onChange={(event) => updateCredentials("password", event.target.value)}
                              invalid={Boolean(loginErrors.password)}
                              placeholder="Your password"
                              className="pr-14"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((value) => !value)}
                              aria-label={showPassword ? "Hide password" : "Show password"}
                              aria-pressed={showPassword}
                              className="text-ink-400 hover:text-bark-900 absolute top-1/2 right-3 min-h-8 -translate-y-1/2 rounded-lg px-2 text-[0.68rem] font-bold tracking-[0.08em] uppercase"
                            >
                              {showPassword ? "Hide" : "Show"}
                            </button>
                          </div>
                        </Field>

                        <Button type="submit" size="lg" className="mt-2 w-full" disabled={loginBusy}>
                          {loginBusy ? "Signing in…" : "Sign in"}
                          {!loginBusy ? <ArrowRight /> : null}
                        </Button>
                      </form>

                      <div className="border-line mt-7 border-t pt-5">
                        <p className="text-ink-500 text-sm">
                          New to the outreach?{" "}
                          <button
                            type="button"
                            onClick={() => changeMode("apply")}
                            className="text-saffron-700 hover:text-saffron-800 font-semibold underline underline-offset-2"
                          >
                            Apply to join
                          </button>
                        </p>
                        <p className="text-ink-400 mt-3 text-[0.7rem] leading-relaxed">
                          By signing in you agree to use the platform for genuine campaign
                          coordination. Accounts that misrepresent reporting may be suspended.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="border-line mt-6 flex flex-col items-start justify-between gap-3 rounded-2xl border bg-white/60 px-5 py-4 sm:flex-row sm:items-center">
              <p className="text-ink-500 text-[0.78rem] leading-relaxed">
                Just here to explore? The venue and About page are open to everyone.
              </p>
              <Link
                href="/about"
                className="text-saffron-700 hover:text-saffron-800 inline-flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap"
              >
                Learn more <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
