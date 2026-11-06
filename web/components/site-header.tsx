"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/shop/new", label: "New in" },
  { href: "/shop/tops", label: "Tops" },
  { href: "/shop/knitwear", label: "Knitwear" },
  { href: "/journal", label: "Journal" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const links = NAV.map((item) => {
    const current = pathname === item.href || pathname.startsWith(`${item.href}/`);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={current ? "page" : undefined}
        className={cn("whitespace-nowrap transition-colors hover:text-foreground", current && "text-foreground")}
      >
        {item.label}
      </Link>
    );
  });

  return (
    <header className="relative z-20 bg-background">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="text-sm font-semibold tracking-[0.32em]">
          ELWENSH
        </Link>
        <nav aria-label="Main" className="hidden gap-8 text-sm text-muted-foreground sm:flex">
          {links}
        </nav>
        <div className="flex items-center gap-1">
          <Link href="/shop" aria-label="Search the shop" className="rounded-full p-2 text-muted-foreground hover:text-foreground">
            <Search className="size-4" />
          </Link>
          <Link href="/shop" aria-label="Shop all" className="rounded-full p-2 text-muted-foreground hover:text-foreground">
            <ShoppingBag className="size-4" />
          </Link>
        </div>
      </div>
      <nav aria-label="Main" className="flex gap-6 overflow-x-auto px-4 pb-3 text-sm text-muted-foreground sm:hidden">
        {links}
      </nav>
    </header>
  );
}
