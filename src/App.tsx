import { useEffect } from "react";

import { Carousel } from "@/carousel/Carousel";
import { CleanupDialog } from "@/cleanup/CleanupDialog";
import { CreateSeriesDialog } from "@/series/CreateSeriesDialog";
import { SeriesListDialog } from "@/series/SeriesListDialog";
import { useUi } from "@/store/useUi";
import { Waveform } from "@/timeline/Waveform";
import { HelpDialog } from "@/ui/HelpDialog";
import { InfoBar } from "@/ui/InfoBar";
import { SettingsDialog } from "@/ui/SettingsDialog";
import { StartScreen } from "@/ui/StartScreen";
import { Toast } from "@/ui/Toast";
import { TopBar } from "@/ui/TopBar";
import { useKeyboard } from "@/ui/useKeyboard";

export function App() {
  const phase = useUi((s) => s.phase);
  const theme = useUi((s) => s.theme);
  useKeyboard();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  if (phase !== "ready") return <StartScreen />;

  return (
    <div className="app">
      <TopBar />
      <Carousel />
      <InfoBar />
      <Waveform />
      <Toast />
      <CreateSeriesDialog />
      <SeriesListDialog />
      <SettingsDialog />
      <CleanupDialog />
      <HelpDialog />
    </div>
  );
}
