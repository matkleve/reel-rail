import { useLayoutEffect } from "react";

import { Carousel } from "@/carousel/Carousel";
import { CleanupDialog } from "@/cleanup/CleanupDialog";
import { CreateSeriesDialog } from "@/series/CreateSeriesDialog";
import { SeriesListDialog } from "@/series/SeriesListDialog";
import { useUi } from "@/store/useUi";
import { Waveform } from "@/timeline/Waveform";
import { TrimDialog } from "@/trim/TrimDialog";
import { Dock } from "@/ui/Dock";
import { Handover } from "@/ui/Handover";
import { Header } from "@/ui/Header";
import { HelpDialog } from "@/ui/HelpDialog";
import { SettingsDialog } from "@/ui/SettingsDialog";
import { StageOverlay } from "@/ui/StageOverlay";
import { StartScreen } from "@/ui/StartScreen";
import { Toast } from "@/ui/Toast";
import { useKeyboard } from "@/ui/useKeyboard";
import { WorkflowDialog } from "@/ui/WorkflowDialog";

export function App() {
  const phase = useUi((s) => s.phase);
  const theme = useUi((s) => s.theme);
  useKeyboard();

  // Layout effect: it must land before children's effects run — the waveform
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
    <div className="app">
      <Header />
      <main className="stage-wrap">
        <Carousel />
        <StageOverlay />
        <Dock />
      </main>
      <Waveform />
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
