import Link from "next/link";
import { ArrowRight, Search, ShoppingBag } from "lucide-react";
import ClothingRailHero from "@/components/ui/product-rail-gallery";
import { RAIL_DEMO_ITEMS } from "@/components/ui/product-rail-gallery-demo";

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="text-sm font-semibold tracking-[0.32em]">
          ELWENSH
        </Link>
        <nav aria-label="Main" className="hidden gap-8 text-sm text-muted-foreground sm:flex">
          <Link href="#" className="hover:text-foreground">New in</Link>
          <Link href="#" className="hover:text-foreground">Tops</Link>
          <Link href="#" className="hover:text-foreground">Knitwear</Link>
          <Link href="#" className="hover:text-foreground">Journal</Link>
        </nav>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Search" className="rounded-full p-2 text-muted-foreground hover:text-foreground">
            <Search className="size-4" />
          </button>
          <button type="button" aria-label="Bag" className="rounded-full p-2 text-muted-foreground hover:text-foreground">
            <ShoppingBag className="size-4" />
          </button>
        </div>
      </header>

      <main className="flex flex-1 items-center">
        <ClothingRailHero
          items={RAIL_DEMO_ITEMS}
          hanger="none"
          eyebrow="ELWENSH · New season"
          heading="Ten pieces on the rail. Pick one up."
          caption="Brush along the rail, slide a hanger, lift a piece to see the back."
          autoplay
          action={
            <Link
              href="#"
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background shadow-sm outline-none transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
            >
              Shop the edit
              <ArrowRight className="size-4" />
            </Link>
          }
        />
      </main>
    </div>
  );
}
