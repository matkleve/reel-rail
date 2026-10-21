import { useEffect } from "react";

import { CreateSeriesDialog } from "@/series/CreateSeriesDialog";
import { SeriesListDialog } from "@/series/SeriesListDialog";
import { useUi } from "@/store/useUi";
import { Timeline } from "@/timeline/Timeline";
import { HelpDialog } from "@/ui/HelpDialog";
import { InfoBar } from "@/ui/InfoBar";
import { Preview } from "@/ui/Preview";
import { StartScreen } from "@/ui/StartScreen";
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
      <Preview />
      <InfoBar />
      <Timeline />
      <CreateSeriesDialog />
      <SeriesListDialog />
      <HelpDialog />
    </div>
  );
}
