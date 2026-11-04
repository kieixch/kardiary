"use client";

import { useSearchParams } from "next/navigation";
import { LoginForm } from "./login-form";

export function LoginWithNext() {
  const searchParams = useSearchParams();
  const requested = searchParams.get("next") ?? "/";
  const nextPath =
    requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";
  return <LoginForm nextPath={nextPath} />;
}
