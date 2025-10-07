"use client";

import React, { useMemo, useRef, useState } from "react";

type DateTimePickerProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string; // applied to the input button for sizing/spacing overrides
  containerClassName?: string; // optional wrapper styles
};

function startOfMonth(d: Date) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function toLocalInputString(date: Date, time: string) {
  // time expects HH:MM
  const [hh, mm] = time.split(":");
  const out = new Date(date);
  out.setHours(Number(hh || 0), Number(mm || 0), 0, 0);
  // return ISO-like string without timezone offset suitable for storage
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${out.getFullYear()}-${pad(out.getMonth() + 1)}-${pad(out.getDate())}T${pad(out.getHours())}:${pad(out.getMinutes())}`;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({ value, onChange, placeholder = "Select date & time", className = "", containerClassName = "" }) => {
  const parsed = useMemo(() => (value ? new Date(value) : new Date()), [value]);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(parsed));
  const [tmpTime, setTmpTime] = useState(() => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
  });

  const wrapperRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const days = useMemo(() => {
    const firstDay = new Date(visibleMonth);
    const offset = firstDay.getDay(); // 0-6
    const total = daysInMonth(visibleMonth);
    const arr: (Date | null)[] = [];
    for (let i = 0; i < offset; i++) arr.push(null);
    for (let d = 1; d <= total; d++) arr.push(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), d));
    return arr;
  }, [visibleMonth]);

  const display = useMemo(() => {
    if (!value) return "";
    try {
      const d = new Date(value);
      return d.toLocaleString();
    } catch {
      return value;
    }
  }, [value]);

  const setDate = (d: Date) => {
    const v = toLocalInputString(d, tmpTime);
    onChange?.(v);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className={`relative ${containerClassName}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between rounded-lg border border-primary/20 bg-night-800 px-5 py-3.5 text-left text-[16px] md:text-[17px] text-white placeholder:text-slate-500 shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/40 ${className}`}
      >
        <span className={`truncate whitespace-nowrap leading-tight ${display ? "" : "text-slate-500"}`}>{display || placeholder}</span>
        <span className="ml-3 inline-flex h-4 w-4 items-center justify-center rounded-md border border-primary/30 text-slate-200">📅</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-[420px] rounded-2xl border border-primary/25 bg-night-900/95 p-4 text-white shadow-xl backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}
              className="rounded-md border border-primary/20 px-3 py-1 text-primary hover:bg-primary/10"
            >
              ◀
            </button>
            <div className="text-lg font-semibold text-primary">
              {visibleMonth.toLocaleString(undefined, { month: "long", year: "numeric" })}
            </div>
            <button
              type="button"
              onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
              className="rounded-md border border-primary/20 px-3 py-1 text-primary hover:bg-primary/10"
            >
              ▶
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-sm text-slate-300">
            {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
              <div key={d} className="text-slate-400">{d}</div>
            ))}
            {days.map((d, i) => (
              <button
                key={i}
                disabled={!d}
                onClick={() => d && setDate(d)}
                className={`h-10 rounded-md border border-primary/20 ${d ? "hover:bg-primary/10" : "opacity-30"}`}
              >
                {d ? d.getDate() : ""}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <input
              type="time"
              value={tmpTime}
              onChange={(e) => setTmpTime(e.target.value)}
              className="rounded-md border border-primary/25 bg-night-800 px-3 py-2 text-white"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-primary/25 px-4 py-2 text-slate-200 hover:bg-night-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date(visibleMonth);
                  // If a value exists, keep selected day; else default to 1
                  const base = value ? new Date(value) : new Date();
                  d.setDate(base.getDate());
                  onChange?.(toLocalInputString(d, tmpTime));
                  setOpen(false);
                }}
                className="rounded-md bg-badge-gradient px-4 py-2 font-semibold text-white shadow-md"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateTimePicker;
