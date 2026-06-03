import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, MapPinIcon, CheckIcon } from "lucide-react";

import { ADDIS_AREAS, getSavedArea, saveArea } from "../lib/areas";

interface Props {
  className?: string;
  onChange?: (area: string) => void;
}

// Lightweight "Delivering to …" selector. Visual + localStorage only for now;
// later this can drive store filtering by neighborhood.
const LocationSelector = ({ className = "", onChange }: Props) => {
  const [area, setArea] = useState("Addis Ababa");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setArea(getSavedArea());
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (next: string) => {
    setArea(next);
    saveArea(next);
    setOpen(false);
    onChange?.(next);
  };

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm text-app-green font-medium hover:text-app-green-light transition-colors"
      >
        <MapPinIcon className="size-4 text-app-orange shrink-0" />
        <span className="truncate max-w-[12rem]">Delivering to {area}</span>
        <ChevronDownIcon className="size-3.5 text-zinc-400" />
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-app-border py-1.5 z-50 animate-fade-in max-h-72 overflow-y-auto">
          {ADDIS_AREAS.map((a) => (
            <button
              key={a}
              onClick={() => select(a)}
              className="flex items-center justify-between gap-2 w-full px-4 py-2 text-sm text-left text-zinc-700 hover:bg-orange-50 transition-colors"
            >
              {a}
              {a === area && <CheckIcon className="size-4 text-app-green" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationSelector;
