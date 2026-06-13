import { useState } from "react";
import { useNavigate } from "react-router-dom";

const MAX_ITEMS = 4;

export default function CompareTray({ items, onAdd, onRemove, onClear }) {
  const [isOver, setIsOver] = useState(false);
  const navigate = useNavigate();

  const handleDrop = (e) => {
    e.preventDefault();
    setIsOver(false);
    try {
      const job = JSON.parse(e.dataTransfer.getData("application/json"));
      onAdd(job);
    } catch {}
  };

  const goCompare = () => {
    navigate(`/compare?ids=${items.map((j) => j._id).join(",")}`);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={handleDrop}
      className={`sticky bottom-0 mt-4 border-2 rounded-lg p-3 transition-colors ${
        isOver ? "border-green-500 bg-green-50" : "border-dashed border-gray-300 bg-white"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">
          Compare tray {items.length > 0 && `(${items.length}/${MAX_ITEMS})`}
        </h3>
        {items.length > 0 && (
          <button onClick={onClear} className="text-xs text-gray-500 hover:text-red-600">
            Clear all
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-gray-500">
          Drag job cards here (or check "Compare") to build a comparison — up to {MAX_ITEMS} jobs.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {items.map((job) => (
            <div
              key={job._id}
              className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-3 py-1 text-xs"
            >
              <span>{job.title}</span>
              <button onClick={() => onRemove(job._id)} className="text-blue-700 hover:text-red-600">
                ✕
              </button>
            </div>
          ))}
          {items.length > 1 && (
            <button onClick={goCompare} className="bg-green-600 text-white text-xs px-4 py-1.5 rounded-full">
              Compare ({items.length})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
