import { redirect } from "next/navigation";

// The proxy handles `/` first: signed out it goes to /sign-in, signed in to /dashboard (unit 1.2a).
// This is only a fallback, and the dashboard's own session check still applies.
export default function Home() {
  redirect("/dashboard");
}
