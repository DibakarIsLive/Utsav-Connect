import { redirect } from "next/navigation";

/**
 * Sign-in lives inside the single account entry at /apply. The old /login
 * route stays as a permanent server-side redirect so existing links keep
 * working without showing a second, duplicated sign-in screen.
 */
export default function LoginPage() {
  redirect("/apply?mode=login");
}
