import Link from "next/link";
import { exitDemo } from "@/app/demo/actions";

export function DemoBanner({ name, role }: { name: string; role: string }) {
  return (
    <div
      className="text-white text-[12px]"
      style={{ background: "var(--color-accent)" }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-1.5 flex items-center justify-between gap-4 flex-wrap">
        <p>
          <span className="font-semibold mr-2">DEMO</span>
          You are{" "}
          <span className="font-medium">{name}</span> ·{" "}
          <span className="opacity-80">
            {role.replaceAll("_", " ").toLowerCase()}
          </span>
        </p>
        <div className="flex items-center gap-3">
          <Link href="/demo" className="underline opacity-90 hover:opacity-100">
            Switch persona
          </Link>
          <form action={exitDemo}>
            <button
              type="submit"
              className="underline opacity-90 hover:opacity-100"
            >
              Exit demo
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
