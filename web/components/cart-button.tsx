"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart";

export function CartButton() {
  const { count, ready } = useCart();
  const label = ready && count > 0 ? `Bag, ${count} ${count === 1 ? "item" : "items"}` : "Bag";
  return (
    <Link href="/cart" aria-label={label} className="relative rounded-full p-2 text-muted-foreground hover:text-foreground">
      <ShoppingBag className="size-4" />
      {ready && count > 0 && (
        <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold leading-4 text-background tabular-nums">
          {count}
        </span>
      )}
    </Link>
  );
}
