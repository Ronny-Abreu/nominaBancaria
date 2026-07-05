"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { Button, type ButtonProps } from "@/components/ui/Button";

export function SignOutButton({ children, ...props }: Omit<ButtonProps, "onClick">) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/session", { method: "DELETE" });
    await signOut(auth);
    router.push("/login");
    router.refresh();
  }

  return (
    <Button variant="secondary" onClick={handleLogout} {...props}>
      {children ?? "Cerrar sesión"}
    </Button>
  );
}
