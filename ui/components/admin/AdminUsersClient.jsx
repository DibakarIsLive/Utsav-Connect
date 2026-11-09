"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminPageHeader from "@/ui/components/admin/AdminPageHeader";
import Badge from "@/ui/components/ui/Badge";
import Notice from "@/ui/components/ui/Notice";
import EmptyState from "@/ui/components/ui/EmptyState";
import Skeleton from "@/ui/components/ui/Skeleton";
import Modal from "@/ui/components/ui/Modal";
import Field, { SelectInput, TextInput } from "@/ui/components/ui/Field";
import { Button, ArrowRight } from "@/ui/components/ui/Button";
import { apiFetch, fieldErrors } from "@/ui/lib/api-client";
import { ADMIN_PERMISSION_LABELS } from "@/ui/lib/navigation";
import { formatDate, formatDateTime, initials } from "@/ui/lib/format";
import { cn } from "@/ui/lib/cn";

const ROLE_OPTIONS = [
  {
    value: "admin",
    label: "Administrator",
    body: "Granular review and geography permissions chosen below.",
  },
  {
    value: "devotee",
    label: "Devotee",
    body: "An active reporting account created directly, without an application.",
  },
  {
    value: "super_admin",
    label: "Super Admin",
    body: "Full capability, including account creation and the audit log.",
  },
];

const EMPTY_FORM = {
  fullName: "",
  email: "",
  password: "",
  phone: "",
  gender: "male",
  role: "admin",
  adminPermissions: [
    "application:read:all",
    "application:review:all",
    "application:note:write",
    "devotee:read:all",
    "invitation-report:read:all",
    "area:manage",
    "proposal:review",
  ],
};

const ROLE_LABEL = {
  devotee: "Devotee",
  admin: "Administrator",
  super_admin: "Super Admin",
};

function generatePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
  const values = new Uint32Array(18);
  window.crypto.getRandomValues(values);
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

export default function AdminUsersClient({ currentUserId }) {
  const [users, setUsers] = useState([]);
  const [state, setState] = useState({ status: "loading", error: null });
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [createdUser, setCreatedUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [superAdminConfirmed, setSuperAdminConfirmed] = useState(false);

  const load = useCallback(async () => {
    setState({ status: "loading", error: null });
    try {
      const data = await apiFetch("/api/admin/users");
      setUsers(data?.users ?? []);
      setState({ status: "ready", error: null });
    } catch (error) {
      setState({ status: "error", error: error.message });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter && user.role !== roleFilter) return false;
      if (statusFilter && user.status !== statusFilter) return false;
      if (!term) return true;
      return (
        user.fullName?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term)
      );
    });
  }, [users, search, roleFilter, statusFilter]);

  const counts = useMemo(
    () => ({
      total: users.length,
      admins: users.filter((user) => user.role === "admin" || user.role === "super_admin").length,
      devotees: users.filter((user) => user.role === "devotee").length,
      suspended: users.filter((user) => user.status === "suspended").length,
    }),
    [users],
  );

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setCreatedUser(null);
    setShowPassword(false);
    setSuperAdminConfirmed(false);
    setCreateOpen(true);
  }

  function closeCreate() {
    if (busy) return;
    setCreateOpen(false);
  }

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    if (formErrors[name] || formErrors.submit) {
      setFormErrors((current) => ({ ...current, [name]: undefined, submit: undefined }));
    }
  }

  function togglePermission(permission) {
    setForm((current) => {
      const has = current.adminPermissions.includes(permission);
      return {
        ...current,
        adminPermissions: has
          ? current.adminPermissions.filter((value) => value !== permission)
          : [...current.adminPermissions, permission],
      };
    });
    if (formErrors.adminPermissions) {
      setFormErrors((current) => ({ ...current, adminPermissions: undefined }));
    }
  }

  function validate() {
    const next = {};
    if (form.fullName.trim().length < 2) next.fullName = "Enter the person's full name.";
    if (form.fullName.trim().length > 120) next.fullName = "Keep the name under 120 characters.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = "Enter a valid email address.";
    }
    if (form.password.length < 12) next.password = "Use at least 12 characters.";
    if (form.password.length > 128) next.password = "Keep the password under 128 characters.";
    const digits = form.phone.replace(/[^\d]/g, "");
    if (digits.length < 10 || digits.length > 15) {
      next.phone = "Enter a phone number with 10–15 digits.";
    }
    if (!["male", "female"].includes(form.gender)) next.gender = "Choose a gender option.";
    if (!["devotee", "admin", "super_admin"].includes(form.role)) {
      next.role = "Choose a role.";
    }
    if (form.role === "super_admin" && !superAdminConfirmed) {
      next.confirmed = "Confirm that you intend to create a Super Admin account.";
    }
    return next;
  }

  async function handleCreate(event) {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      const first = Object.keys(nextErrors)[0];
      document.getElementById(first === "confirmed" ? "userRole" : first)?.focus();
      return;
    }

    setBusy(true);
    setFormErrors({});
    try {
      const data = await apiFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          phone: form.phone.trim(),
          gender: form.gender,
          role: form.role,
          adminPermissions: form.role === "admin" ? form.adminPermissions : [],
        }),
      });
      setCreatedUser(data?.user ?? null);
      await load();
    } catch (error) {
      const mapped = fieldErrors(error.details);
      if (Object.keys(mapped).length > 0) {
        setFormErrors(mapped);
        document.getElementById(Object.keys(mapped)[0])?.focus();
      } else {
        setFormErrors({ submit: error.message });
      }
    } finally {
      setBusy(false);
    }
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(form.password);
    } catch {
      // Clipboard access may be denied; the field remains visible for manual copy.
    }
  }

  return (
    <div>
      <AdminPageHeader
        eyebrow="Super Admin · Accounts & roles"
        title="Access is a responsibility, not a badge."
        description="Create reviewer and reporting accounts, assign only the permissions each person needs, and keep privileged access visible. Every creation is written to the audit log."
        actions={<Button onClick={openCreate}>Create account</Button>}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total accounts", value: counts.total, tone: "neutral" },
          { label: "Administrators", value: counts.admins, tone: "gold" },
          { label: "Devotees", value: counts.devotees, tone: "saffron" },
          { label: "Suspended", value: counts.suspended, tone: "red" },
        ].map((item) => (
          <div key={item.label} className="admin-card px-5 py-4">
            <Badge tone={item.tone}>{item.label}</Badge>
            <p className="font-display text-bark-900 mt-2.5 text-2xl font-semibold tabular-nums">
              {state.status === "error" ? "—" : item.value}
            </p>
          </div>
        ))}
      </div>

      <Notice tone="warning" className="mb-5" title="This section is restricted to Super Admins">
        Roles are enforced by the server. Creating a Super Admin grants every capability, including
        account creation and the audit log. Accounts created here are active immediately and verified,
        so only create accounts you have personally confirmed with the campaign team.
      </Notice>

      <div className="border-line shadow-soft rounded-2xl border bg-white">
        <div className="border-line flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-2.5 sm:flex-row">
            <div className="relative flex-1 sm:max-w-xs">
              <label htmlFor="userSearch" className="sr-only">
                Search accounts by name or email
              </label>
              <input
                id="userSearch"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or email…"
                className="input-base !py-2.5 text-[0.82rem]"
              />
            </div>
            <div>
              <label htmlFor="userRoleFilter" className="sr-only">
                Filter by role
              </label>
              <select
                id="userRoleFilter"
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="input-base !w-auto !py-2.5 text-[0.82rem]"
              >
                <option value="">All roles</option>
                <option value="devotee">Devotee</option>
                <option value="admin">Administrator</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div>
              <label htmlFor="userStatusFilter" className="sr-only">
                Filter by account status
              </label>
              <select
                id="userStatusFilter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="input-base !w-auto !py-2.5 text-[0.82rem]"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="pending_verification">Pending verification</option>
                <option value="pending_approval">Pending approval</option>
                <option value="rejected">Rejected</option>
                <option value="suspended">Suspended</option>
                <option value="invited">Invited</option>
              </select>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={load} disabled={state.status === "loading"}>
            {state.status === "loading" ? "Refreshing…" : "Refresh"}
          </Button>
        </div>

        {state.status === "error" ? (
          <div className="p-4">
            <Notice tone="error" title="Accounts could not be loaded">
              {state.error}
              <button
                type="button"
                onClick={load}
                className="mt-2 block font-semibold underline underline-offset-2"
              >
                Try again
              </button>
            </Notice>
          </div>
        ) : null}

        {state.status === "loading" ? (
          <div className="space-y-3 p-4 sm:p-5" aria-busy="true">
            {[0, 1, 2, 3, 4].map((index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
            <span className="sr-only">Loading accounts…</span>
          </div>
        ) : null}

        {state.status === "ready" && filtered.length === 0 ? (
          <EmptyState
            icon="people"
            title={users.length === 0 ? "No accounts yet" : "No account matches these filters"}
            description={
              users.length === 0
                ? "Create the first reviewer or devotee account. Applications create devotee accounts automatically, so this is for directly coordinated access."
                : "Try a different name, email, role or status."
            }
            action={
              users.length === 0 ? (
                <Button onClick={openCreate}>Create the first account</Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch("");
                    setRoleFilter("");
                    setStatusFilter("");
                  }}
                >
                  Clear filters
                </Button>
              )
            }
          />
        ) : null}

        {state.status === "ready" && filtered.length > 0 ? (
          <ul className="divide-line divide-y">
            {filtered.map((user) => {
              const isSelf = String(user._id) === String(currentUserId);
              return (
                <li key={user._id} className="px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3.5">
                      <span
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[0.72rem] font-bold",
                          user.role === "super_admin"
                            ? "bg-gold-400 text-bark-950"
                            : user.role === "admin"
                              ? "bg-bark-900 text-ivory"
                              : "bg-saffron-50 text-saffron-800",
                        )}
                      >
                        {initials(user.fullName)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-bark-900 text-sm font-semibold">{user.fullName}</p>
                          {isSelf ? <Badge tone="blue">You</Badge> : null}
                          {user.emailVerified ? null : <Badge tone="amber">Email unverified</Badge>}
                        </div>
                        <p className="text-ink-400 mt-0.5 truncate text-[0.7rem]">{user.email}</p>
                        <p className="text-ink-400 mt-1 text-[0.66rem]">
                          {ROLE_LABEL[user.role] ?? user.role} · joined {formatDate(user.createdAt)}
                          {user.lastLoginAt
                            ? ` · last sign in ${formatDateTime(user.lastLoginAt)}`
                            : " · never signed in"}
                        </p>
                        {user.role === "admin" ? (
                          <p className="text-ink-500 mt-2 max-w-2xl text-[0.68rem] leading-relaxed">
                            {user.adminPermissions?.length
                              ? user.adminPermissions
                                  .map((permission) => ADMIN_PERMISSION_LABELS[permission] ?? permission)
                                  .join(" · ")
                              : "No granular permissions assigned."}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Badge
                        tone={
                          user.role === "super_admin"
                            ? "gold"
                            : user.role === "admin"
                              ? "neutral"
                              : "saffron"
                        }
                      >
                        {ROLE_LABEL[user.role] ?? user.role}
                      </Badge>
                      <Badge
                        tone={
                          user.status === "active"
                            ? "green"
                            : user.status === "suspended" || user.status === "rejected"
                              ? "red"
                              : "amber"
                        }
                        dot
                      >
                        {String(user.status).replaceAll("_", " ")}
                      </Badge>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <p className="text-ink-400 mt-4 text-[0.72rem] leading-relaxed">
        Password hashes are never sent to the browser. Account editing and suspension are not exposed
        in this workspace yet, so no button pretends otherwise. Use the audit log to review privileged
        activity.
      </p>

      <Modal
        open={createOpen}
        onClose={closeCreate}
        title={createdUser ? "Account created" : "Create an account"}
        description={
          createdUser
            ? undefined
            : "The account becomes active immediately. Share the password through a secure channel and ask the person to change it after signing in."
        }
        size="lg"
        footer={
          createdUser ? (
            <Button onClick={closeCreate}>Done</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={closeCreate} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={busy}>
                {busy ? "Creating account…" : "Create account"}
              </Button>
            </>
          )
        }
      >
        {createdUser ? (
          <div>
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
                  <path
                    d="m5 12.5 4.2 4.2L19 6.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div>
                <h3 className="text-bark-900 text-lg font-semibold">{createdUser.fullName}</h3>
                <p className="text-ink-500 mt-2 text-sm leading-[1.75]">
                  {ROLE_LABEL[createdUser.role] ?? createdUser.role} · {createdUser.email}. The account
                  is active and verified. The creation was written to the audit log.
                </p>
              </div>
            </div>

            {form.password ? (
              <div className="border-line mt-5 rounded-2xl border bg-cream/60 p-4">
                <p className="text-ink-400 text-[0.62rem] font-bold tracking-[0.12em] uppercase">
                  Password to share securely
                </p>
                <p className="text-bark-900 mt-2 font-mono text-sm break-all">{form.password}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={copyPassword}>
                    Copy password
                  </Button>
                  <span className="text-ink-400 self-center text-[0.68rem]">
                    It is not shown again after you close this window.
                  </span>
                </div>
              </div>
            ) : null}

            <Notice tone="warning" className="mt-5" title="Share it securely">
              Send the password through a channel appropriate for account credentials, never in a
              public group. Ask the person to change it after their first sign-in.
            </Notice>
          </div>
        ) : (
          <form onSubmit={handleCreate} noValidate className="space-y-4">
            {formErrors.submit ? (
              <Notice tone="error" title="Account not created">
                {formErrors.submit}
              </Notice>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="fullName" label="Full name" required error={formErrors.fullName}>
                <TextInput
                  id="fullName"
                  value={form.fullName}
                  onChange={(event) => update("fullName", event.target.value)}
                  invalid={Boolean(formErrors.fullName)}
                  autoComplete="off"
                  placeholder="e.g. Ananya Devi"
                />
              </Field>
              <Field id="email" label="Email address" required error={formErrors.email}>
                <TextInput
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) => update("email", event.target.value)}
                  invalid={Boolean(formErrors.email)}
                  autoComplete="off"
                  placeholder="name@example.com"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="password"
                label="Initial password"
                required
                hint="At least 12 characters"
                error={formErrors.password}
              >
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <TextInput
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(event) => update("password", event.target.value)}
                      invalid={Boolean(formErrors.password)}
                      autoComplete="new-password"
                      className="pr-16"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="text-ink-400 hover:text-bark-900 absolute top-1/2 right-2 -translate-y-1/2 rounded px-1.5 py-1 text-[0.64rem] font-semibold"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      update("password", generatePassword());
                      setShowPassword(true);
                    }}
                  >
                    Generate
                  </Button>
                </div>
              </Field>
              <Field id="phone" label="Phone number" required error={formErrors.phone}>
                <TextInput
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(event) => update("phone", event.target.value)}
                  invalid={Boolean(formErrors.phone)}
                  autoComplete="off"
                  placeholder="10-digit mobile number"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="gender" label="Gender" required error={formErrors.gender}>
                <SelectInput
                  id="gender"
                  value={form.gender}
                  onChange={(event) => update("gender", event.target.value)}
                  invalid={Boolean(formErrors.gender)}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </SelectInput>
              </Field>
              <Field id="role" label="Role" required error={formErrors.role}>
                <SelectInput
                  id="role"
                  value={form.role}
                  onChange={(event) => {
                    update("role", event.target.value);
                    setSuperAdminConfirmed(false);
                  }}
                  invalid={Boolean(formErrors.role)}
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </div>

            <div className="border-line rounded-2xl border bg-cream/50 p-4">
              <p className="text-bark-900 text-sm font-semibold">
                {ROLE_OPTIONS.find((option) => option.value === form.role)?.label}
              </p>
              <p className="text-ink-500 mt-1 text-[0.76rem] leading-relaxed">
                {ROLE_OPTIONS.find((option) => option.value === form.role)?.body}
              </p>
            </div>

            {form.role === "admin" ? (
              <fieldset>
                <legend className="label-base">Permissions</legend>
                <p className="text-ink-400 mb-2.5 text-[0.7rem] leading-relaxed">
                  Assign only what the person needs. The server checks each permission on every
                  request, so unselected capabilities are genuinely unavailable.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(ADMIN_PERMISSION_LABELS).map(([permission, label]) => (
                    <label
                      key={permission}
                      className={cn(
                        "flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-colors",
                        form.adminPermissions.includes(permission)
                          ? "border-saffron-200 bg-saffron-50/70"
                          : "border-line bg-white hover:bg-cream/60",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={form.adminPermissions.includes(permission)}
                        onChange={() => togglePermission(permission)}
                        className="accent-saffron-600 mt-0.5 h-4 w-4 shrink-0"
                      />
                      <span>
                        <span className="text-bark-900 block text-[0.78rem] font-semibold">
                          {label}
                        </span>
                        <span className="text-ink-400 mt-0.5 block font-mono text-[0.6rem]">
                          {permission}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                {form.adminPermissions.length === 0 ? (
                  <p className="text-ink-400 mt-2 text-[0.68rem]">
                    No permissions selected. The account will be able to open the admin workspace but
                    every privileged action will be refused.
                  </p>
                ) : null}
              </fieldset>
            ) : null}

            {form.role === "super_admin" ? (
              <div className="border-line rounded-2xl border bg-white p-4">
                <Notice tone="error" title="Full, irrevocable-until-changed access">
                  A Super Admin can create other accounts and read the entire audit log. Only continue
                  if this is a deliberate, confirmed decision.
                </Notice>
                <label className="mt-3 flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={superAdminConfirmed}
                    onChange={(event) => {
                      setSuperAdminConfirmed(event.target.checked);
                      if (formErrors.confirmed) {
                        setFormErrors((current) => ({ ...current, confirmed: undefined }));
                      }
                    }}
                    className="accent-saffron-600 mt-0.5 h-4 w-4 shrink-0"
                  />
                  <span className="text-ink-600 text-[0.76rem] leading-relaxed">
                    I confirm that this person should hold full Super Admin capability.
                  </span>
                </label>
                {formErrors.confirmed ? (
                  <p role="alert" className="mt-2 text-xs font-medium text-red-700">
                    {formErrors.confirmed}
                  </p>
                ) : null}
              </div>
            ) : null}

            {form.role === "devotee" ? (
              <Notice tone="info" title="Creating a devotee directly">
                This bypasses the public application and review process. Use it only when the campaign
                team has already verified the person through another channel.
              </Notice>
            ) : null}
          </form>
        )}
      </Modal>
    </div>
  );
}
