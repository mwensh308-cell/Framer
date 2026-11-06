import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopView } from "@/components/shop-view";
import { SECTIONS, productsFor } from "@/lib/products";

type Params = Promise<{ category: string }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return SECTIONS.map((section) => ({ category: section.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { category } = await params;
  const section = SECTIONS.find((s) => s.slug === category);
  return { title: section ? `${section.title} · ELWENSH` : "ELWENSH" };
}

export default async function CategoryPage({ params }: { params: Params }) {
  const { category } = await params;
  const section = SECTIONS.find((s) => s.slug === category);
  if (!section) notFound();
  return <ShopView title={section.title} intro={section.intro} items={productsFor(section.slug)} active={section.slug} />;
}
