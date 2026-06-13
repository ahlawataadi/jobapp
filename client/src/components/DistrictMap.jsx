import { useNavigate } from "react-router-dom";
import { useDistrictStatsQuery } from "../store/jobsApi.js";

// Approximate bounding box for Haryana districts represented here.
const LNG_RANGE = [75.5, 77.6];
const LAT_RANGE = [28.2, 30.9];
const WIDTH = 400;
const HEIGHT = 300;
const PADDING = 30;

function project([lng, lat]) {
  const x =
    PADDING + ((lng - LNG_RANGE[0]) / (LNG_RANGE[1] - LNG_RANGE[0])) * (WIDTH - PADDING * 2);
  // Invert Y: higher latitude = further north = smaller y on screen
  const y =
    PADDING + (1 - (lat - LAT_RANGE[0]) / (LAT_RANGE[1] - LAT_RANGE[0])) * (HEIGHT - PADDING * 2);
  return [x, y];
}

export default function DistrictMap() {
  const { data, isLoading } = useDistrictStatsQuery();
  const navigate = useNavigate();
  const items = (data?.items || []).filter((i) => i.district && i.coordinates?.length === 2);

  if (isLoading || items.length === 0) return null;

  const maxCount = Math.max(...items.map((i) => i.count), 1);

  return (
    <section>
      <h2 className="text-xl font-semibold mb-3">Jobs by district</h2>
      <div className="bg-white border rounded-lg p-4">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto max-h-80">
          <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="#eff6ff" rx="12" />
          {items.map((item) => {
            const [x, y] = project(item.coordinates);
            const r = 8 + (item.count / maxCount) * 22;
            return (
              <g
                key={item.district}
                className="cursor-pointer"
                onClick={() => navigate(`/jobs?district=${encodeURIComponent(item.district)}`)}
              >
                <circle cx={x} cy={y} r={r} fill="#1d4ed8" opacity="0.35" />
                <circle cx={x} cy={y} r={Math.max(r * 0.45, 6)} fill="#1d4ed8" />
                <text x={x} y={y + 3} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                  {item.count}
                </text>
                <text x={x} y={y + r + 14} textAnchor="middle" fill="#1e3a8a" fontSize="11">
                  {item.district}
                </text>
              </g>
            );
          })}
        </svg>
        <p className="text-xs text-gray-500 mt-2">
          Pin size reflects open job count. Click a district to view its jobs.
        </p>
      </div>
    </section>
  );
}
