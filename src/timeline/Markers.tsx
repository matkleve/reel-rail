import { DAY_WIDTH, type DaySlot, type GapSlot } from "./layout";

const DAY_FMT = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });

export function DayMarker({ slot, left }: { slot: DaySlot; left: number }) {
  return (
    <div className="tl-day" style={{ transform: `translateX(${left}px)`, width: DAY_WIDTH }}>
      <span className="tl-day-tick" />
      <span className="tl-day-label">
        <strong>{DAY_FMT.format(slot.date)}</strong>
        {slot.place && <span>{slot.place}</span>}
      </span>
    </div>
  );
}

export function GapMarker({ slot, left }: { slot: GapSlot; left: number }) {
  const label = slot.hours >= 24 ? `${Math.round(slot.hours / 24)} d` : `${Math.round(slot.hours)} h`;
  return (
    <div className="tl-gap" style={{ transform: `translateX(${left}px)`, width: slot.w }}>
      <span>{label}</span>
    </div>
  );
}
