import Image from "next/image";
import { cn } from "@/lib/cn";
import { withBase } from "@/lib/config";

export function Logo({ size = 40, className, priority }: { size?: number; className?: string; priority?: boolean }) {
  return (
    <Image
      src={withBase("/images/logo-pusbekmatau.jpg")}
      alt="Lambang Pusbekmatau"
      width={size}
      height={size}
      priority={priority}
      className={cn("shrink-0 select-none drop-shadow-[0_6px_18px_rgba(212,175,55,0.18)]", className)}
    />
  );
}
