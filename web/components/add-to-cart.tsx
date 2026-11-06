"use client";

import * as React from "react";
import { Check, Plus } from "lucide-react";
import { useCart } from "@/lib/cart";
import { SIZES, type Size } from "@/lib/products";
import { cn } from "@/lib/utils";

export function AddToCart({ id, name }: { id: string; name: string }) {
  const { add } = useCart();
  const [size, setSize] = React.useState<Size>("M");
  const [added, setAdded] = React.useState(false);

  React.useEffect(() => {
    if (!added) return;
    const timer = window.setTimeout(() => setAdded(false), 1600);
    return () => window.clearTimeout(timer);
  }, [added]);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <div role="radiogroup" aria-label={`Size for ${name}`} className="flex gap-1">
        {SIZES.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={size === option}
            onClick={() => setSize(option)}
            className={cn(
              "h-8 min-w-8 rounded-md border px-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              size === option ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {option}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          add(id, size);
          setAdded(true);
        }}
        className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-xs font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {added ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
        {added ? "Added" : "Add to bag"}
      </button>
      <span className="sr-only" aria-live="polite">
        {added ? `${name}, size ${size}, added to bag` : ""}
      </span>
    </div>
  );
}
