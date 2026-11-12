import { CalendarDays, Clock, Heart, MapPin, Rows3, Star } from "lucide-react";
import { useEffect, useRef } from "react";

import { locale, t, tn } from "@/i18n";
import { useReel } from "@/store/useReel";
import { useUi } from "@/store/useUi";
import type { Media } from "@/types";
import { Segmented } from "@/ui/kit/Segmented";
import { useThumb } from "@/ui/useThumb";

import { openGroup, setGroupBy, useGroups } from "./groupMode";
import type { Group, GroupBy } from "./groups";

const WEEKDAY = new Intl.DateTimeFormat(locale, { weekday: "long" });
const DATE = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" });
const SHORT = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" });
const TIME = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" });

/** How to stack: one by one, per day, per stretch of time, per place (user, 2026-11-12). */
export function GroupSwitch() {
  const by = useUi((x) => x.groupBy);
  return (
    <Segmented<GroupBy>
      label={t("Stack by")}
      value={by}
      onChange={setGroupBy}
      options={[
        { value: "single", label: t("Single"), icon: Rows3 },
        { value: "day", label: t("Day"), icon: CalendarDays },
        { value: "time", label: t("Time"), icon: Clock },
        { value: "place", label: t("Place"), icon: MapPin },
      ]}
    />
  );
}

/**
 * The phone's Timeline tab, closed: every group one stack of prints, its best
 * photo on top (D-031). Tap a stack and it fans out into its photos, one by
 * one. The bars below still show the whole trip.
 */
export function GroupPiles() {
  const { groups, groupOf } = useGroups();
  const media = useReel((x) => x.reel.media);
  const here = useReel((x) => (x.currentId ? groupOf.get(x.currentId) : undefined));
  const list = useRef<HTMLDivElement>(null);

  // The stack you were in (or tapped on the bars) comes into view.
  useEffect(() => {
    list.current?.querySelector(".day-pile.is-here")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [here]);

  return (
    <div className="day-piles" ref={list}>
      <div className="group-switch">
        <GroupSwitch />
      </div>
      {groups.length === 0 && <p className="day-empty">{t("Nothing passes the filters.")}</p>}
      {groups.map((g) => (
        <Pile key={g.key} group={g} media={media} here={g.key === here} onOpen={() => openGroup(groups, g.key)} />
      ))}
    </div>
  );
}

/** Title and line under it, per way of stacking. */
function labelOf(g: Group, media: Record<string, Media>): [string, string] {
  const first = new Date(media[g.ids[0]!]!.takenAt);
  const last = new Date(media[g.ids.at(-1)!]!.takenAt);
  const sameDay = first.toDateString() === last.toDateString();
  const span = sameDay ? SHORT.format(first) : `${SHORT.format(first)} – ${SHORT.format(last)}`;
  if (g.key.startsWith("d:")) return [WEEKDAY.format(first), DATE.format(first)];
  if (g.key.startsWith("t:")) return [sameDay ? `${TIME.format(first)} – ${TIME.format(last)}` : span, sameDay ? SHORT.format(first) : ""];
  if (g.place) return [g.place, span];
  if (g.spot) return [t("Place {n}", { n: g.spot }), span];
  return [t("No place"), span];
}

function Pile({ group, media, here, onOpen }: { group: Group; media: Record<string, Media>; here: boolean; onOpen(): void }) {
  const [title, sub] = labelOf(group, media);
  const [cover, ...behind] = group.top3;
  return (
    <button
      type="button"
      className={here ? "day-pile is-here" : "day-pile"}
      onClick={onOpen}
      aria-label={t("{day}, {n} photos — open", { day: `${title} ${sub}`.trim(), n: group.ids.length })}
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
        <span className="day-weekday">{title}</span>
        {sub && <span className="day-date">{sub}</span>}
        <span className="day-count tabular">{tn("1 photo", "{n} photos", group.ids.length)}</span>
        <Ratings counts={group.counts} />
      </span>
    </button>
  );
}

function Ratings({ counts }: { counts: Group["counts"] }) {
  return (
    <span className="day-ratings">
      {counts.top > 0 && (
        <span className="day-rating r2">
          <Star size={12} fill="currentColor" strokeWidth={0} /> {counts.top}
        </span>
      )}
      {counts.good > 0 && (
        <span className="day-rating r1">
          <Heart size={12} fill="currentColor" strokeWidth={0} /> {counts.good}
        </span>
      )}
      {counts.unrated > 0 && <span className="day-rating r0">{t("{n} open", { n: counts.unrated })}</span>}
    </span>
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
