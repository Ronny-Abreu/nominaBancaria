import { SignOutButton } from "@/components/layout/SignOutButton";

interface NavbarProps {
  nombre: string;
  rol: string;
}

export function Navbar({ nombre, rol }: NavbarProps) {
  return (
    <header className="flex items-center justify-between border-b border-rule bg-paper px-6 py-4">
      <div>
        <p className="text-sm text-ink-muted">
          {nombre} · <span className="uppercase tracking-wide">{rol}</span>
        </p>
      </div>
      <SignOutButton />
    </header>
  );
}
