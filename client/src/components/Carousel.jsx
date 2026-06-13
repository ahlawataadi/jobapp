import { useRef } from "react";

export default function Carousel({ children, itemWidth = 240 }) {
  const trackRef = useRef(null);

  const scrollBy = (dir) => {
    trackRef.current?.scrollBy({ left: dir * (itemWidth + 16) * 2, behavior: "smooth" });
  };

  return (
    <div className="relative group">
      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-2 -mx-1 px-1 snap-x snap-mandatory [&>*]:snap-start [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      <button
        type="button"
        onClick={() => scrollBy(-1)}
        aria-label="Previous"
        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-9 h-9 rounded-full bg-white border border-gray-200 shadow-card items-center justify-center text-gray-600 hover:text-primary-700 hover:border-primary-300 opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={() => scrollBy(1)}
        aria-label="Next"
        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 w-9 h-9 rounded-full bg-white border border-gray-200 shadow-card items-center justify-center text-gray-600 hover:text-primary-700 hover:border-primary-300 opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        ›
      </button>
    </div>
  );
}
