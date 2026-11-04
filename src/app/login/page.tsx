import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { LoginWithNext } from "./login-with-next";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginForm nextPath="/" />}>
      <LoginWithNext />
    </Suspense>
  );
}
