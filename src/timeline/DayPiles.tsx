import { Heart, Star } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useShallow } from "zustand/react/shallow";

import { locale, t, tn } from "@/i18n";
import { passes } from "@/store/filters";
import { useReel } from "@/store/useReel";
import type { Media } from "@/types";
import { useThumb } from "@/ui/useThumb";

import { dayDate, dayKey, groupDays, type Day } from "./days";
import { openDay } from "./dayMode";

const WEEKDAY = new Intl.DateTimeFormat(locale, { weekday: "long" });
const DATE = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" });

/**
 * The phone's Timeline tab, closed: every day one stack of prints, its best
 * photo on top (D-031). Tap a stack and it fans out into the day's photos,
 * one by one. The bars below still show the whole trip.
 */
export function DayPiles() {
  const s = useReel(useShallow((x) => ({ order: x.order, media: x.reel.media, filters: x.filters, currentId: x.currentId })));
  const ids = useMemo(() => s.order.filter((id) => passes(s.media[id]!, s.filters)), [s.order, s.media, s.filters]);
  const days = useMemo(() => groupDays(ids, s.media), [ids, s.media]);
  const here = s.currentId ? dayKey(s.media[s.currentId]!.takenAt) : undefined;
  const list = useRef<HTMLDivElement>(null);

  // The day you were in (or tapped on the bars) comes into view.
  useEffect(() => {
    list.current?.querySelector(".day-pile.is-here")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [here]);

  if (!days.length) return <p className="day-empty">{t("Nothing passes the filters.")}</p>;
  return (
    <div className="day-piles" ref={list}>
      {days.map((d) => (
        <Pile key={d.key} day={d} media={s.media} here={d.key === here} />
      ))}
    </div>
  );
}

function Pile({ day, media, here }: { day: Day; media: Record<string, Media>; here: boolean }) {
  const date = dayDate(day.key);
  const [cover, ...behind] = day.top3;
  return (
    <button
      type="button"
      className={here ? "day-pile is-here" : "day-pile"}
      onClick={() => openDay(day.key)}
      aria-label={t("{day}, {n} photos — open", { day: `${WEEKDAY.format(date)} ${DATE.format(date)}`, n: day.ids.length })}
    >
      <span className="day-stack" aria-hidden="true">
        {behind
          .slice()
          .reverse()
          .map((id, i) => (
            <Print key={id} media={media[id]!} className={`day-print is-behind-${behind.length - i}`} />
          ))}
        {cover && <Print media={media[cover]!} className="day-print is-cover" />}
      </span>
      <span className="day-label">
        <span className="day-weekday">{WEEKDAY.format(date)}</span>
        <span className="day-date">{DATE.format(date)}</span>
        <span className="day-count tabular">{tn("1 photo", "{n} photos", day.ids.length)}</span>
        <span className="day-ratings">
          {day.counts.top > 0 && (
            <span className="day-rating r2">
              <Star size={12} fill="currentColor" strokeWidth={0} /> {day.counts.top}
            </span>
          )}
          {day.counts.good > 0 && (
            <span className="day-rating r1">
              <Heart size={12} fill="currentColor" strokeWidth={0} /> {day.counts.good}
            </span>
          )}
          {day.counts.unrated > 0 && <span className="day-rating r0">{t("{n} open", { n: day.counts.unrated })}</span>}
        </span>
      </span>
    </button>
  );
}

function Print({ media, className }: { media: Media; className: string }) {
  const thumb = useThumb(media);
  return (
    <span className={className}>
      {thumb.url ? <img src={thumb.url} alt="" draggable={false} /> : <span className="card-ph" />}
    </span>
  );
}
