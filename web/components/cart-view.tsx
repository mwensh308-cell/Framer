"use client";

import Link from "next/link";
import { ArrowRight, Minus, Plus, X } from "lucide-react";
import { useCart } from "@/lib/cart";
import { findProduct, formatPrice } from "@/lib/products";

const FREE_SHIPPING_FROM = 100;
const SHIPPING = 8;

export function CartView() {
  const { lines, subtotal, count, ready, setQuantity, remove } = useCart();
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-20 pt-10 sm:px-6">
      <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">ELWENSH · Bag</p>
      <h1 className="mt-2 text-3xl font-medium tracking-tight">Your bag</h1>

      {!ready ? null : lines.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <p className="text-sm font-medium">Your bag is empty.</p>
          <p className="mt-1 text-sm text-muted-foreground">Pick a size on any piece and add it here.</p>
          <Link href="/shop" className="mt-6 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90">
            Shop the edit <ArrowRight className="size-4" />
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-10 md:grid-cols-[minmax(0,1fr)_18rem]">
          <ul className="divide-y divide-border border-y border-border">
            {lines.map((line) => {
              const product = findProduct(line.id);
              if (!product) return null;
              return (
                <li key={`${line.id}-${line.size}`} className="flex gap-4 py-5">
                  <span aria-hidden="true" className="size-16 shrink-0 rounded-lg border border-foreground/10" style={{ background: product.color }} />
                  <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">Size {line.size} · {formatPrice(product.price)} each</p>
                      </div>
                      <p className="text-sm tabular-nums">{formatPrice(product.price * line.quantity)}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center rounded-full border border-border">
                        <button type="button" aria-label={`Remove one ${product.name}`} onClick={() => setQuantity(line.id, line.size, line.quantity - 1)} className="grid size-8 place-items-center rounded-full text-muted-foreground hover:text-foreground">
                          <Minus className="size-3.5" />
                        </button>
                        <span aria-label="Quantity" className="w-6 text-center text-sm tabular-nums">{line.quantity}</span>
                        <button type="button" aria-label={`Add one more ${product.name}`} disabled={line.quantity >= 10} onClick={() => setQuantity(line.id, line.size, line.quantity + 1)} className="grid size-8 place-items-center rounded-full text-muted-foreground hover:text-foreground disabled:opacity-40">
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <button type="button" onClick={() => remove(line.id, line.size)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                        <X className="size-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <aside className="h-fit rounded-xl border border-border p-5">
            <h2 className="text-sm font-medium">Order summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Items ({count})</dt><dd className="tabular-nums">{formatPrice(subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Shipping</dt><dd className="tabular-nums">{shipping === 0 ? "Free" : formatPrice(shipping)}</dd></div>
              <div className="flex justify-between border-t border-border pt-3 font-medium"><dt>Total</dt><dd className="tabular-nums">{formatPrice(subtotal + shipping)}</dd></div>
            </dl>
            {shipping > 0 && <p className="mt-3 text-xs text-muted-foreground">Add {formatPrice(FREE_SHIPPING_FROM - subtotal)} more for free shipping.</p>}
            <button type="button" disabled className="mt-5 w-full rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50">
              Checkout
            </button>
            <p className="mt-2 text-center text-xs text-muted-foreground">Online checkout opens soon.</p>
            <Link href="/shop" className="mt-4 block text-center text-xs text-muted-foreground hover:text-foreground">Continue shopping</Link>
          </aside>
        </div>
      )}
    </main>
  );
}
