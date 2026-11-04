import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Overlay } from "@/game/Overlay";
import { Scene } from "@/game/Scene";
import { bindInput } from "@/game/runtime";
import { useGame } from "@/game/store";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const hydrate = useGame((s) => s.hydrate);
  useEffect(() => {
    hydrate();
    bindInput();
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      document.documentElement.style.setProperty("--vh", `${h * 0.01}px`);
      if (w < 800 && useGame.getState().quality === "high") {
        useGame.getState().setQuality("low");
      }
    };
    onResize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [hydrate]);

  return (
    <div className="game-root relative h-dvh w-full overflow-hidden bg-ink" style={{ height: "100dvh" }}>
      <Scene />
      <Overlay />
    </div>
  );
}
