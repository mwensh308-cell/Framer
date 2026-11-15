/** Site mark: a pyramid built from two planes, drawn as one white path. */
export default function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 256 256" fill="none" className="sm:w-[32px] sm:h-[32px]" aria-hidden="true">
      <path d="M128 12 L248 236 L128 236 Z" fill="white" />
      <path d="M128 12 L128 236 L8 236 Z" fill="white" fillOpacity="0.55" />
    </svg>
  );
}
