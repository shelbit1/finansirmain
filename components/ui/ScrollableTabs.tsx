import { cn } from "@/lib/utils";

export function ScrollableTabs({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto no-scrollbar",
        className,
      )}
    >
      <div className="inline-flex gap-1 p-1 bg-bg border border-border rounded-xl min-w-full sm:min-w-0">
        {children}
      </div>
    </div>
  );
}
