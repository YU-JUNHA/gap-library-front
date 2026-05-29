import type React from "react";
import { cn } from "@/lib/utils";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input className={cn("w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring", className)} {...rest} />;
}
