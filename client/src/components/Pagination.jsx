export default function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;

  const nums = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(pages, page + 2);
  for (let p = start; p <= end; p++) nums.push(p);

  const btnCls = (active) =>
    `w-9 h-9 rounded-lg text-sm font-medium border transition-colors ${
      active
        ? "bg-primary-600 text-white border-primary-600"
        : "bg-white text-gray-600 border-gray-300 hover:border-primary-300"
    }`;

  return (
    <nav aria-label="Pagination" className="flex justify-center items-center gap-2 pt-2 flex-wrap">
      <button
        className={btnCls(false)}
        disabled={page <= 1}
        aria-disabled={page <= 1}
        aria-label="Previous page"
        onClick={() => onChange(page - 1)}
      >
        ‹
      </button>
      {start > 1 && (
        <>
          <button className={btnCls(false)} aria-label="Page 1" onClick={() => onChange(1)}>1</button>
          {start > 2 && <span aria-hidden="true" className="text-gray-400 px-1">…</span>}
        </>
      )}
      {nums.map((p) => (
        <button
          key={p}
          className={btnCls(p === page)}
          onClick={() => onChange(p)}
          aria-label={`Page ${p}`}
          aria-current={p === page ? "page" : undefined}
        >
          {p}
        </button>
      ))}
      {end < pages && (
        <>
          {end < pages - 1 && <span aria-hidden="true" className="text-gray-400 px-1">…</span>}
          <button className={btnCls(false)} aria-label={`Page ${pages}`} onClick={() => onChange(pages)}>{pages}</button>
        </>
      )}
      <button
        className={btnCls(false)}
        disabled={page >= pages}
        aria-disabled={page >= pages}
        aria-label="Next page"
        onClick={() => onChange(page + 1)}
      >
        ›
      </button>
    </nav>
  );
}
