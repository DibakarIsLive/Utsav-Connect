import { cn } from "@/ui/lib/cn";

export default function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={cn("skeleton rounded-xl", className)} />;
}

export function SkeletonText({ lines = 3, className = "" }) {
  return (
    <div className={cn("space-y-2.5", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="skeleton h-3 rounded-full"
          style={{ width: `${Math.max(45, 100 - index * 13)}%` }}
        />
      ))}
    </div>
  );
}
