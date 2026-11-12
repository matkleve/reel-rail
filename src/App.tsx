import { useLayoutEffect } from "react";

import { Carousel } from "@/carousel/Carousel";
import { CleanupDialog } from "@/cleanup/CleanupDialog";
import { CreateSeriesDialog } from "@/series/CreateSeriesDialog";
import { SeriesListDialog } from "@/series/SeriesListDialog";
import { useUi } from "@/store/useUi";
import { GroupPiles } from "@/timeline/GroupPiles";
import { Timeline } from "@/timeline/Timeline";
import { TrimDialog } from "@/trim/TrimDialog";
import { Dock } from "@/ui/Dock";
import { Handover } from "@/ui/Handover";
import { Header } from "@/ui/Header";
import { HelpDialog } from "@/ui/HelpDialog";
import { SettingsDialog } from "@/ui/SettingsDialog";
import { StageOverlay } from "@/ui/StageOverlay";
import { StartScreen } from "@/ui/StartScreen";
import { PhoneTabs } from "@/ui/ViewTabs";
import { PHONE, useMedia } from "@/ui/useMedia";
import { SwipeDeck } from "@/swipe/SwipeDeck";
import { Toast } from "@/ui/Toast";
import { useKeyboard } from "@/ui/useKeyboard";
import { WorkflowDialog } from "@/ui/WorkflowDialog";

export function App() {
  const phase = useUi((s) => s.phase);
  const theme = useUi((s) => s.theme);
  // Two screens on every size: the swipe deck (one card, thrown to decide)
  // and the photo strip over the timeline. A phone switches with tabs at the
  // thumb, a bigger screen in the header.
  const phone = useMedia(PHONE);
  const sorting = useUi((s) => s.view === "sort");
  // Phone timeline: stacks (per day, time or place) until one is fanned out (D-031).
  const piles = useUi((s) => phone && s.groupBy !== "single" && !s.openGroup);
  useKeyboard();

  // Layout effect: it must land before children's effects run — the timeline
  // canvas reads the theme's colour tokens in its own effect.
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  if (phase !== "ready")
    return (
      <>
        <StartScreen />
        <Handover />
      </>
    );

  return (
    <div className={["app", phone && "is-phone", sorting && "is-sorting"].filter(Boolean).join(" ")}>
      <Header />
      <main className="stage-wrap">
        {sorting ? (
          <SwipeDeck />
        ) : piles ? (
          <GroupPiles />
        ) : (
          <>
            <Carousel />
            <StageOverlay />
            <Dock />
          </>
        )}
      </main>
      {!sorting && <Timeline />}
      {phone && <PhoneTabs />}
      <Toast />
      <Handover />
      <CreateSeriesDialog />
      <SeriesListDialog />
      <SettingsDialog />
      <CleanupDialog />
      <HelpDialog />
      <TrimDialog />
      <WorkflowDialog />
    </div>
  );
}
