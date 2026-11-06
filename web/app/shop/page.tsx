import type { Metadata } from "next";
import { ShopView } from "@/components/shop-view";
import { ELWENSH_ITEMS } from "@/lib/products";

export const metadata: Metadata = { title: "Shop · ELWENSH" };

export default function ShopPage() {
  return <ShopView title="Shop the edit" intro="Every piece on the rail. Lift one to see the back." items={ELWENSH_ITEMS} active="all" />;
}
