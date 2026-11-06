import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = { title: "Journal · ELWENSH" };

const POSTS = [
  {
    id: "care",
    date: "November 2026",
    title: "How to care for heavyweight cotton",
    body: "Wash cold, inside out, and dry flat. A thick cotton tee keeps its shape for years when it stays out of a hot dryer. Iron on medium heat from the inside if you want a crisp finish.",
  },
  {
    id: "layering",
    date: "October 2026",
    title: "Three ways to layer for cooler days",
    body: "Start with an essential tee, add an open overshirt, and finish with a knit or a work jacket. Keep one colour neutral so the other pieces can carry the outfit.",
  },
  {
    id: "season",
    date: "September 2026",
    title: "Behind the new season",
    body: "This season's rail is built around earthy colours: olive, brick, camel and forest green, balanced with bone and black basics that go with everything.",
  },
];

export default function JournalPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-20 pt-10 sm:px-6">
      <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">ELWENSH · Journal</p>
      <h1 className="mt-2 text-3xl font-medium tracking-tight">Notes from the studio</h1>
      <div className="mt-10 flex flex-col divide-y divide-border">
        {POSTS.map((post) => (
          <article key={post.id} id={post.id} className="py-8 first:pt-0">
            <p className="text-xs text-muted-foreground">{post.date}</p>
            <h2 className="mt-1 text-xl font-medium tracking-tight">{post.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{post.body}</p>
          </article>
        ))}
      </div>
      <Link href="/shop" className="mt-4 inline-flex items-center gap-2 text-sm font-medium hover:underline">
        Shop the edit <ArrowRight className="size-4" />
      </Link>
    </main>
  );
}
