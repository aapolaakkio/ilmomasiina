"use server";

import { signIn } from "@/auth";

export async function signInAction() {
  await signIn("google", { redirectTo: "/admin" });
}

export async function signInWithCredentialsAction(formData: FormData) {
  const email = formData.get("email") as string;
  await signIn("credentials", { email, redirectTo: "/admin" });
}
