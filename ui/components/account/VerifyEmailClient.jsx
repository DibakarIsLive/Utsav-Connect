"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Notice from "@/ui/components/ui/Notice";
import { Button, ButtonLink, ArrowRight } from "@/ui/components/ui/Button";
import { apiFetch } from "@/ui/lib/api-client";

/**
 * Consumes the one-time verification token from the URL. The request is issued
 * once, even under React Strict Mode, and the token is never echoed into the
 * page after the call.
 */
export default function VerifyEmailClient({ token }) {
  const [state, setState] = useState({ status: token ? "verifying" : "missing", message: null });
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    apiFetch("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then(() => setState({ status: "verified", message: null }))
      .catch((error) =>
        setState({
          status: "error",
          message:
            error.code === "TOKEN_INVALID"
              ? "This verification link is invalid, already used, or has expired. Sign in to see whether your email is already verified."
              : error.message,
        }),
      );
  }, [token]);

  if (state.status === "verifying") {
    return (
      <div className="card-paper mx-auto max-w-xl p-8 text-center">
        <span className="bg-saffron-50 text-saffron-700 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl">
          <svg viewBox="0 0 24 24" className="h-6 w-6 animate-spin" fill="none" aria-hidden="true">
            <path
              d="M12 3a9 9 0 1 1-6.4 2.6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <h2 className="text-bark-900 mt-5 text-2xl font-semibold tracking-[-0.03em]">
          Verifying your email
        </h2>
        <p className="text-ink-500 mt-2 text-sm">This usually takes a moment.</p>
      </div>
    );
  }

  if (state.status === "verified") {
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
        <h2 className="text-bark-900 mt-5 text-2xl font-semibold tracking-[-0.03em]">
          Email verified.
        </h2>
        <p className="text-ink-500 mx-auto mt-3 max-w-md text-sm leading-[1.75]">
          Thank you. Your application now moves to administrative review. You can still sign in to
          follow its status while you wait.
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
      <Notice
        tone="error"
        title={state.status === "missing" ? "No verification token found" : "Verification failed"}
      >
        {state.status === "missing"
          ? "Open the complete verification link from your application email, including the token."
          : state.message}
      </Notice>
      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink href="/apply?mode=login">Go to sign in <ArrowRight /></ButtonLink>
        <Link
          href="/about"
          className="text-ink-600 hover:text-bark-900 inline-flex min-h-11 items-center px-2 text-sm font-semibold"
        >
          Learn how applications work
        </Link>
      </div>
      <p className="text-ink-400 mt-5 text-[0.72rem] leading-relaxed">
        If you have already verified this address, simply sign in. Verification links can only be
        used once.
      </p>
    </div>
  );
}
