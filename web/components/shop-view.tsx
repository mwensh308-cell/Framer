import Link from "next/link";
import ClothingRailHero from "@/components/ui/product-rail-gallery";
import { SECTIONS, type Product, type SectionSlug } from "@/lib/products";
import { cn } from "@/lib/utils";

const LABELS: Record<Product["category"], string> = { tops: "Tops", knitwear: "Knitwear", outerwear: "Outerwear" };

export function ShopView({ title, intro, items, active }: { title: string; intro: string; items: Product[]; active: SectionSlug | "all" }) {
  const tabs = [{ slug: "all", label: "All", href: "/shop" }, ...SECTIONS.map((s) => ({ slug: s.slug, label: s.label, href: `/shop/${s.slug}` }))];
  return (
    <main className="flex-1">
      <ClothingRailHero
        items={items}
        hanger="wood"
        eyebrow={`ELWENSH · ${items.length} ${items.length === 1 ? "piece" : "pieces"}`}
        heading={title}
        caption={intro}
      />

      <section className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6">
        <nav aria-label="Shop sections" className="mb-8 flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <Link
              key={tab.slug}
              href={tab.href}
              aria-current={tab.slug === active ? "page" : undefined}
              className={cn(
                "whitespace-nowrap rounded-full border px-4 py-1.5 text-sm transition-colors",
                tab.slug === active ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.id} className="flex gap-4 rounded-xl border border-border p-4">
              <span aria-hidden="true" className="size-12 shrink-0 rounded-lg border border-foreground/10" style={{ background: item.color }} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-sm font-medium">{item.name}</h3>
                  <span className="text-sm tabular-nums">{item.tag}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {LABELS[item.category]}
                  {item.isNew && " · New"}
                </p>
                {item.description && <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{item.description}</p>}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
