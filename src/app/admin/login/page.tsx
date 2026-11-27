import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/admin/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function AdminLoginPage() {
  if (await currentStaff()) redirect("/");
  return <LoginForm />;
}
