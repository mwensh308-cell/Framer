import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ClothingRailHero from "@/components/ui/product-rail-gallery";
import { ELWENSH_ITEMS } from "@/lib/products";

export default function Home() {
  return (
    <main className="flex flex-1 items-center">
      <ClothingRailHero
        items={ELWENSH_ITEMS}
        hanger="wood"
        eyebrow="ELWENSH · New season"
        heading="Ten pieces on the rail. Pick one up."
        caption="Brush along the rail, slide a hanger, lift a piece to see the back."
        autoplay
        action={
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background shadow-sm outline-none transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
          >
            Shop the edit
            <ArrowRight className="size-4" />
          </Link>
        }
      />
    </main>
  );
}
