"use client";

import { cn } from "@/lib/utils";

export function DotPattern({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "absolute inset-0 -z-10 h-full w-full bg-[#343541]",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 h-full w-full bg-[#343541] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]">
        <div className="absolute inset-0 h-full w-full bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]" />
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-[#19C37D] opacity-20 blur-[100px]" />
      </div>
    </div>
  );
} 