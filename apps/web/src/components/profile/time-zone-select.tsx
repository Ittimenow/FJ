"use client";

import { useEffect, useState } from "react";
import { preferredTimeZones, timeZones } from "@/lib/time-zones";

export function TimeZoneSelect({
  id, value, onChange, required = false
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const [zones, setZones] = useState(() => [...new Set([...preferredTimeZones, ...(value ? [value] : [])])]);
  useEffect(() => setZones(timeZones(value)), [value]);
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-extrabold text-ink">Часовой пояс</label>
      <select
        id={id}
        name="timeZone"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="h-12 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-action focus:ring-4 focus:ring-action/20"
      >
        <option value="">Выберите часовой пояс</option>
        {zones.map((zone) => <option key={zone} value={zone}>{zone.replaceAll("_", " ")}</option>)}
      </select>
      <p className="text-xs leading-5 text-muted">Время открытых игр будет показано в выбранном поясе.</p>
    </div>
  );
}
