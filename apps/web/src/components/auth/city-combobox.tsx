"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, LoaderCircle, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { publicApiBaseUrl } from "@/lib/api";
import { FieldError, FieldHint } from "./auth-form-feedback";

export interface CityOption {
  id: string;
  name: string;
  region: string;
}

export function CityCombobox({
  error,
  initialValue = null,
  inputId = "register-city",
  onChange
}: {
  error?: string | undefined;
  initialValue?: CityOption | null;
  inputId?: string;
  onChange: (city: CityOption | null) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(initialValue?.name ?? "");
  const [selected, setSelected] = useState<CityOption | null>(initialValue);
  const [results, setResults] = useState<CityOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const resultsId = `${inputId}-results`;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (selected || !normalizedQuery) {
      setResults([]);
      setLoading(false);
      setLoadError(null);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setLoadError(null);
      setOpen(true);
      try {
        const response = await fetch(
          `${publicApiBaseUrl()}/api/cities?query=${encodeURIComponent(normalizedQuery)}`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error("city search failed");
        const cities = (await response.json()) as CityOption[];
        setResults(cities);
        setActiveIndex(cities.length > 0 ? 0 : -1);
      } catch (searchError) {
        if (searchError instanceof DOMException && searchError.name === "AbortError") return;
        setResults([]);
        setActiveIndex(-1);
        setLoadError("Не удалось загрузить города. Повторите ввод.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query, selected]);

  function chooseCity(city: CityOption) {
    setSelected(city);
    setQuery(city.name);
    setOpen(false);
    setActiveIndex(-1);
    onChange(city);
  }

  return (
    <div
      ref={rootRef}
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <label htmlFor={inputId} className="mb-2 block text-sm font-extrabold text-ink">
        Город
      </label>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted" size={18} aria-hidden="true" />
        <Input
          id={inputId}
          value={query}
          placeholder="Начните вводить название"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && !selected}
          aria-controls={resultsId}
          aria-activedescendant={activeIndex >= 0 ? `${inputId}-option-${activeIndex}` : undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={`${hintId}${error ? ` ${errorId}` : ""}`}
          onFocus={() => {
            if (query.trim() && !selected) setOpen(true);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(null);
            setOpen(Boolean(event.target.value.trim()));
            setLoading(Boolean(event.target.value.trim()));
            onChange(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              return;
            }
            if (event.key === "ArrowDown" && results.length > 0) {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((current) => (current + 1) % results.length);
              return;
            }
            if (event.key === "ArrowUp" && results.length > 0) {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((current) => current <= 0 ? results.length - 1 : current - 1);
              return;
            }
            if (event.key === "Enter" && open && activeIndex >= 0 && results[activeIndex]) {
              event.preventDefault();
              chooseCity(results[activeIndex]);
            }
          }}
          className="h-[50px] pl-10 pr-10"
        />
        {loading ? (
          <LoaderCircle className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-journey" size={18} aria-label="Загрузка городов" />
        ) : selected ? (
          <CheckCircle2 className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-success" size={18} aria-hidden="true" />
        ) : null}
        {open && !selected ? (
          <div
            id={resultsId}
            role="listbox"
            aria-label="Города России"
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-64 overflow-y-auto rounded-xl bg-white p-1.5 shadow-[0_20px_45px_rgba(27,57,118,.16),0_4px_10px_rgba(27,57,118,.08)]"
          >
            {loading ? <p className="px-3 py-3 text-sm text-muted">Ищем города…</p> : null}
            {!loading && loadError ? <p className="px-3 py-3 text-sm text-red-700">{loadError}</p> : null}
            {!loading && !loadError && results.length === 0 ? (
              <p className="px-3 py-3 text-sm text-muted">Город не найден. Проверьте название.</p>
            ) : null}
            {results.map((city, index) => (
              <button
                key={city.id}
                id={`${inputId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                tabIndex={-1}
                className="block w-full rounded-lg px-3 py-2.5 text-left transition hover:bg-card focus-visible:bg-card focus-visible:outline-none aria-selected:bg-[#e8effe]"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseCity(city)}
              >
                <span className="block text-sm font-bold text-ink">{city.name}</span>
                <span className="mt-0.5 block text-xs text-muted">{city.region}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <input type="hidden" name="cityId" value={selected?.id ?? ""} />
      <FieldHint id={hintId}>
        Выберите город из справочника — свободный текст не сохранится.
      </FieldHint>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}
