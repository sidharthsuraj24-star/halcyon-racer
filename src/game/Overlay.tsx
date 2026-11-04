import { useEffect, useMemo, useRef, useState } from "react";
import { CARS, carById, STAT_CAPS } from "@/game/cars";
import { runtime, poses } from "@/game/runtime";
import { audio } from "@/game/audio";
import { getTrack, trackList } from "@/game/tracks";
import { useGame, SHOP, BOOST_WINS, BOOST_COST } from "@/game/store";

function formatTime(t: number) {
  if (!t || !isFinite(t) || t > 9e3) return "—:—.—";
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, "0")}`;
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function StatBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-mute">
      <span className="w-14 shrink-0">{label}</span>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-line">
        <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Overlay() {
  const phase = useGame((s) => s.phase);
  const trackId = useGame((s) => s.trackId);
  const carId = useGame((s) => s.carId);
  const weather = useGame((s) => s.weather);
  const time = useGame((s) => s.time);
  const quality = useGame((s) => s.quality);
  const difficulty = useGame((s) => s.difficulty);
  const volume = useGame((s) => s.volume);
  const muted = useGame((s) => s.muted);
  const ghost = useGame((s) => s.ghost);
  const save = useGame((s) => s.save);
  const hud = useGame((s) => s.hud);
  const results = useGame((s) => s.results);
  const panel = useGame((s) => s.panel);

  const setTrack = useGame((s) => s.setTrack);
  const setCar = useGame((s) => s.setCar);
  const setWeather = useGame((s) => s.setWeather);
  const setTime = useGame((s) => s.setTime);
  const setQuality = useGame((s) => s.setQuality);
  const setDifficulty = useGame((s) => s.setDifficulty);
  const setVolume = useGame((s) => s.setVolume);
  const toggleMute = useGame((s) => s.toggleMute);
  const toggleGhost = useGame((s) => s.toggleGhost);
  const setPanel = useGame((s) => s.setPanel);
  const buyItem = useGame((s) => s.buyItem);
  const upgradeBoost = useGame((s) => s.upgradeBoost);
  const startRace = useGame((s) => s.startRace);
  const resume = useGame((s) => s.resume);
  const retire = useGame((s) => s.retire);
  const replay = useGame((s) => s.replay);
  const exitReplay = useGame((s) => s.exitReplay);
  const cycleCamera = useGame((s) => s.cycleCamera);
  const camera = useGame((s) => s.camera);

  const tracks = useMemo(() => trackList(), []);
  const car = carById(carId);
  const track = tracks.find((t) => t.id === trackId) ?? tracks[0];

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col text-ivory">
      {phase === "menu" && (
        <div className="animate-in fade-in duration-300">
          <Menu
          tracks={tracks}
          trackId={trackId}
          car={car}
          carId={carId}
          save={save}
          panel={panel}
          weather={weather}
          time={time}
          quality={quality}
          difficulty={difficulty}
          volume={volume}
          muted={muted}
          ghost={ghost}
          setTrack={setTrack}
          setCar={setCar}
          setWeather={setWeather}
          setTime={setTime}
          setQuality={setQuality}
          setDifficulty={setDifficulty}
          setVolume={setVolume}
          toggleMute={toggleMute}
          toggleGhost={toggleGhost}
          setPanel={setPanel}
          buyItem={buyItem}
          upgradeBoost={upgradeBoost}
          startRace={startRace}
        />
        </div>
      )}

      {(phase === "race" || phase === "paused") && (
        <Hud
          hud={hud}
          phase={phase}
          trackName={track.name}
          camera={camera}
          resume={resume}
          retire={retire}
          cycleCamera={cycleCamera}
        />
      )}

      {phase === "results" && results && (
        <Results
          results={results}
          trackName={track.name}
          startRace={startRace}
          retire={retire}
          replay={replay}
        />
      )}

      {phase === "replay" && (
        <div className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2">
          <button
            onClick={exitReplay}
            className="rounded-full border border-line bg-panel/90 px-6 py-2 text-sm uppercase tracking-widest text-ivory backdrop-blur"
          >
            Exit Replay
          </button>
        </div>
      )}

      {(phase === "race" || phase === "paused") && save.races < 2 && (
        <TutorialHint />
      )}
      {(phase === "race" || phase === "paused") && <TouchControls />}
    </div>
  );
}

function TutorialHint() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const check = () => setNarrow(window.innerWidth < 800);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return (
    <div className="pointer-events-none absolute bottom-28 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-line bg-panel/90 px-4 py-2 text-center text-xs text-mute backdrop-blur md:bottom-6">
      {narrow ? "Steer pad · Acc · Drift · Nitro" : "WASD drive · Space drift · N nitro · C camera"}
    </div>
  );
}

function Menu(props: {
  tracks: ReturnType<typeof trackList>;
  trackId: string;
  car: ReturnType<typeof carById>;
  carId: string;
  save: ReturnType<typeof useGame.getState>["save"];
  panel: "none" | "settings" | "board" | "shop";
  weather: "clear" | "rain";
  time: "day" | "dusk" | "night";
  quality: "high" | "medium" | "low";
  difficulty: "casual" | "sport" | "elite";
  volume: number;
  muted: boolean;
  ghost: boolean;
  setTrack: (id: string) => void;
  setCar: (id: string) => void;
  setWeather: (w: "clear" | "rain") => void;
  setTime: (t: "day" | "dusk" | "night") => void;
  setQuality: (q: "high" | "medium" | "low") => void;
  setDifficulty: (d: "casual" | "sport" | "elite") => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleGhost: () => void;
  setPanel: (p: "none" | "settings" | "board" | "shop") => void;
  buyItem: (id: string) => boolean;
  upgradeBoost: () => boolean;
  startRace: () => void;
}) {
  const {
    tracks, trackId, car, carId, save, panel, weather, time, quality, difficulty, volume, muted, ghost,
    setTrack, setCar, setWeather, setTime, setQuality, setDifficulty, setVolume, toggleMute, toggleGhost, setPanel, buyItem, upgradeBoost, startRace,
  } = props;

  return (
    <div className="pointer-events-auto flex h-full w-full flex-col overflow-auto bg-ink/70 backdrop-blur-sm md:flex-row">
      {/* Left: brand + tracks */}
      <div className="flex flex-1 flex-col justify-between p-6 md:p-10">
        <div>
          <div className="font-display text-5xl font-semibold tracking-tight text-gold md:text-7xl">HALCYON</div>
          <div className="mt-1 text-sm uppercase tracking-[0.35em] text-mute">Night Circuit</div>
        </div>

        <div className="mt-6 max-h-[40vh] space-y-2 overflow-auto md:max-h-none">
          <div className="mb-2 text-[11px] uppercase tracking-widest text-mute">Track</div>
          <div className="grid gap-2">
            {tracks.map((t) => (
              <button
                key={t.id}
                onClick={() => setTrack(t.id)}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                  t.id === trackId
                    ? "border-gold bg-panel-2 text-ivory"
                    : "border-line bg-panel/60 text-mute hover:border-gold/40"
                }`}
              >
                <div>
                  <div className="font-medium text-ivory">{t.name}</div>
                  <div className="text-xs text-mute">{t.subtitle}</div>
                </div>
                <div className="text-xs uppercase text-gold">{t.time}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4 text-sm">
          <span className="text-mute">Credits</span>
          <span className="font-display text-2xl text-gold">{save.credits.toLocaleString()}</span>
          <span className="text-mute">·</span>
          <span className="text-mute">{save.races} races · {save.wins} wins · Series {save.series ?? 1} ({save.seriesWins ?? 0}/6)</span>
        </div>
        <button
          onClick={() => { audio.unlock(); audio.click(); startRace(); }}
          className="mt-4 rounded-full bg-gold py-3 font-display text-lg uppercase tracking-widest text-ink transition hover:bg-gold-soft"
        >
          Start Race
        </button>
      </div>

      {/* Right: car + actions */}
      <div className="flex w-full flex-col border-t border-line bg-panel/80 p-4 md:w-[420px] md:border-l md:border-t-0 md:p-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-widest text-mute">Garage</div>
          <div className="flex gap-2">
            <button
              onClick={() => setPanel(panel === "shop" ? "none" : "shop")}
              className="rounded-full border border-line px-3 py-1 text-xs uppercase tracking-wider text-mute hover:text-ivory"
            >
              Shop
            </button>
            <button
              onClick={() => setPanel(panel === "board" ? "none" : "board")}
              className="rounded-full border border-line px-3 py-1 text-xs uppercase tracking-wider text-mute hover:text-ivory"
            >
              Board
            </button>
            <button
              onClick={() => setPanel(panel === "settings" ? "none" : "settings")}
              className="rounded-full border border-line px-3 py-1 text-xs uppercase tracking-wider text-mute hover:text-ivory"
            >
              Settings
            </button>
          </div>
        </div>

        {panel === "none" && (
          <>
            <div className="mb-4 flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-lg"
                style={{ background: car.paint, boxShadow: `inset 0 0 0 2px ${car.accent}` }}
              />
              <div>
                <div className="font-display text-2xl">{car.name}</div>
                <div className="text-xs uppercase tracking-wider text-mute">{car.cls}</div>
              </div>
            </div>
            <p className="mb-4 text-sm text-mute">{car.blurb}</p>
            <div className="mb-6 space-y-2">
              <StatBar label="Accel" value={car.accel} max={STAT_CAPS.accel} />
              <StatBar label="Speed" value={car.maxSpeed} max={STAT_CAPS.maxSpeed} />
              <StatBar label="Grip" value={car.grip} max={STAT_CAPS.grip} />
              <StatBar label="Turn" value={car.turn} max={STAT_CAPS.turn} />
            </div>
            <div className="mb-6 grid grid-cols-4 gap-2">
              {CARS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCar(c.id)}
                  title={c.name}
                  className={`h-10 rounded-lg border transition ${
                    c.id === carId ? "border-gold" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                  style={{ background: c.paint }}
                />
              ))}
            </div>
          </>
        )}

        {panel === "settings" && (
          <Settings
            weather={weather}
            time={time}
            quality={quality}
            difficulty={difficulty}
            volume={volume}
            muted={muted}
            ghost={ghost}
            setWeather={setWeather}
            setTime={setTime}
            setQuality={setQuality}
            setDifficulty={setDifficulty}
            setVolume={setVolume}
            toggleMute={toggleMute}
            toggleGhost={toggleGhost}
          />
        )}

        {panel === "shop" && <Shop save={save} buyItem={buyItem} upgradeBoost={upgradeBoost} />}

        {panel === "board" && <Board save={save} tracks={tracks} />}

        <button
          onClick={() => { audio.unlock(); audio.click(); startRace(); }}
          className="sticky bottom-2 mt-4 rounded-full bg-gold py-4 font-display text-lg uppercase tracking-widest text-ink transition hover:bg-gold-soft"
        >
          Start Race
        </button>
      </div>
    </div>
  );
}

function Settings(props: {
  weather: "clear" | "rain";
  time: "day" | "dusk" | "night";
  quality: "high" | "medium" | "low";
  difficulty: "casual" | "sport" | "elite";
  volume: number;
  muted: boolean;
  ghost: boolean;
  setWeather: (w: "clear" | "rain") => void;
  setTime: (t: "day" | "dusk" | "night") => void;
  setQuality: (q: "high" | "medium" | "low") => void;
  setDifficulty: (d: "casual" | "sport" | "elite") => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleGhost: () => void;
}) {
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="mb-4">
      <div className="mb-2 text-[11px] uppercase tracking-wider text-mute">{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
  const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-wider ${
        active ? "border-gold bg-gold/15 text-gold" : "border-line text-mute hover:text-ivory"
      }`}
    >
      {children}
    </button>
  );
  return (
    <div className="mb-6">
      <Row label="Weather">
        <Chip active={props.weather === "clear"} onClick={() => props.setWeather("clear")}>Clear</Chip>
        <Chip active={props.weather === "rain"} onClick={() => props.setWeather("rain")}>Rain</Chip>
      </Row>
      <Row label="Time">
        <Chip active={props.time === "day"} onClick={() => props.setTime("day")}>Day</Chip>
        <Chip active={props.time === "dusk"} onClick={() => props.setTime("dusk")}>Dusk</Chip>
        <Chip active={props.time === "night"} onClick={() => props.setTime("night")}>Night</Chip>
      </Row>
      <Row label="Quality">
        <Chip active={props.quality === "high"} onClick={() => props.setQuality("high")}>High</Chip>
        <Chip active={props.quality === "medium"} onClick={() => props.setQuality("medium")}>Med</Chip>
        <Chip active={props.quality === "low"} onClick={() => props.setQuality("low")}>Low</Chip>
      </Row>
      <Row label="Difficulty">
        <Chip active={props.difficulty === "casual"} onClick={() => props.setDifficulty("casual")}>Casual</Chip>
        <Chip active={props.difficulty === "sport"} onClick={() => props.setDifficulty("sport")}>Sport</Chip>
        <Chip active={props.difficulty === "elite"} onClick={() => props.setDifficulty("elite")}>Elite</Chip>
      </Row>
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-wider text-mute">
          <span>Volume</span>
          <button onClick={props.toggleMute} className="text-gold">{props.muted ? "Muted" : "On"}</button>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={props.volume}
          onChange={(e) => props.setVolume(Number(e.target.value))}
          className="w-full accent-gold"
        />
      </div>
      <button
        onClick={props.toggleGhost}
        className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-wider ${
          props.ghost ? "border-gold text-gold" : "border-line text-mute"
        }`}
      >
        Ghost {props.ghost ? "On" : "Off"}
      </button>
    </div>
  );
}

function Shop({ save, buyItem, upgradeBoost }: {
  save: ReturnType<typeof useGame.getState>["save"];
  buyItem: (id: string) => boolean;
  upgradeBoost: () => boolean;
}) {
  const next = save.boostLevel + 1;
  const needWins = BOOST_WINS[next];
  const cost = BOOST_COST[next];
  const canUp = needWins != null && save.wins >= needWins && save.credits >= (cost ?? 0);
  return (
    <div className="mb-6 space-y-3">
      <div className="text-[11px] uppercase tracking-wider text-mute">Nitro Level {save.boostLevel}</div>
      {needWins != null ? (
        <button
          disabled={!canUp}
          onClick={() => upgradeBoost()}
          className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${canUp ? "border-gold text-gold" : "border-line text-mute"}`}
        >
          Upgrade to Lv{next} · {cost} cr · need {needWins} wins
        </button>
      ) : (
        <div className="text-xs text-gold">Nitro maxed</div>
      )}
      <div className="mt-3 text-[11px] uppercase tracking-wider text-mute">Items</div>
      {SHOP.map((item) => {
        const owned = save.items[item.id] ?? 0;
        const can = owned < item.max && save.credits >= item.cost;
        return (
          <button
            key={item.id}
            disabled={!can}
            onClick={() => buyItem(item.id)}
            className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${can ? "border-line hover:border-gold" : "border-line/40 text-mute"}`}
          >
            <div>
              <div>{item.name} {owned}/{item.max}</div>
              <div className="text-xs text-mute">{item.blurb}</div>
            </div>
            <div className="text-gold">{item.cost}</div>
          </button>
        );
      })}
    </div>
  );
}

function Board({ save, tracks }: { save: ReturnType<typeof useGame.getState>["save"]; tracks: ReturnType<typeof trackList> }) {
  return (
    <div className="mb-6 space-y-3">
      <div className="text-[11px] uppercase tracking-wider text-mute">Best Laps</div>
      {tracks.map((t) => (
        <div key={t.id} className="flex items-center justify-between border-b border-line/60 py-2 text-sm">
          <span className="text-ivory">{t.name}</span>
          <span className="font-mono text-gold">{formatTime(save.bestLap[t.id] ?? 0)}</span>
        </div>
      ))}
    </div>
  );
}

function Hud(props: {
  hud: ReturnType<typeof useGame.getState>["hud"];
  phase: "race" | "paused";
  trackName: string;
  camera: "chase" | "fpp" | "hood" | "tower";
  resume: () => void;
  retire: () => void;
  cycleCamera: () => void;
}) {
  const { hud, phase, trackName, camera, resume, retire, cycleCamera } = props;
  const camLabel = camera === "chase" ? "TPP" : camera === "fpp" ? "FPP" : camera === "hood" ? "HOOD" : "TOWER";
  return (
    <>
      {/* Top bar */}
      <div className="pointer-events-none flex items-start justify-between p-4 md:p-6">
        <div>
          <div className="font-display text-3xl leading-none text-ivory md:text-5xl">
            {ordinal(hud.place)}
            <span className="ml-1 text-base text-mute">/ {hud.total}</span>
          </div>
          <div className="mt-1 text-xs uppercase tracking-widest text-mute">{trackName}</div>
        </div>
        <div className="text-right">
          <div className="font-display text-3xl leading-none md:text-5xl">{hud.speed}</div>
          <div className="text-xs uppercase tracking-widest text-mute">km/h · G{hud.gear}</div>
          <button
            onClick={cycleCamera}
            className="pointer-events-auto mt-2 rounded-full border border-line bg-panel/70 px-2.5 py-0.5 text-[10px] uppercase tracking-widest text-gold backdrop-blur"
          >
            {camLabel}
          </button>
        </div>
      </div>

      {/* Center banner */}
      {hud.banner && (
        <div className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 font-display text-6xl tracking-widest text-gold md:text-8xl">
          {hud.banner}
        </div>
      )}

      {/* Bottom left times */}
      <div className="pointer-events-none absolute bottom-6 left-4 space-y-1 text-sm md:left-6">
        <div className="flex gap-4">
          <span className="text-mute">LAP</span>
          <span>{hud.lap}/{hud.laps}</span>
        </div>
        <div className="flex gap-4">
          <span className="text-mute">TIME</span>
          <span className="font-mono">{formatTime(hud.lapTime)}</span>
        </div>
        <div className="flex gap-4">
          <span className="text-mute">BEST</span>
          <span className="font-mono text-gold">{formatTime(hud.bestLap)}</span>
        </div>
        {hud.ghostDelta !== undefined && Math.abs(hud.ghostDelta) > 0.05 && (
          <div className="flex gap-4">
            <span className="text-mute">DELTA</span>
            <span className={`font-mono ${hud.ghostDelta < 0 ? "text-gold" : "text-ember"}`}>
              {hud.ghostDelta < 0 ? "-" : "+"}{Math.abs(hud.ghostDelta).toFixed(2)}
            </span>
          </div>
        )}
        {hud.wrong && <div className="text-ember">WRONG WAY</div>}
      </div>

      {/* Minimap */}
      <div className="pointer-events-none absolute bottom-20 right-4 md:bottom-24 md:right-6">
        <Minimap />
      </div>
      <div className="pointer-events-none absolute bottom-6 right-4 w-40 md:right-6">
        <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider text-mute">
          <span>Nitro</span>
          <span>{hud.boost >= 0.99 && !runtime.sim.boostActive ? "READY" : Math.round(hud.boost * 100)}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
          <div className="h-full bg-ember" style={{ width: `${hud.boost * 100}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wider text-mute">
          <span>Grip</span>
          <span>{Math.round((runtime.sim.grip ?? 1) * 100)}</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-line">
          <div className="h-full transition-all" style={{ width: `${(runtime.sim.grip ?? 1) * 100}%`, background: (runtime.sim.grip ?? 1) > 0.7 ? '#d4a45a' : (runtime.sim.grip ?? 1) > 0.45 ? '#e07a3d' : '#c45c3a' }} />
        </div>
        <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wider text-mute">
          <span>Tires</span>
          <span>{Math.round((runtime.sim.tireTemp ?? 0.5) * 100)}</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-line">
          <div className="h-full" style={{ width: `${(runtime.sim.tireTemp ?? 0.5) * 100}%`, background: (runtime.sim.tireTemp ?? 0.5) > 0.75 ? '#c45c3a' : (runtime.sim.tireTemp ?? 0.5) > 0.4 ? '#d4a45a' : '#6a8a9a' }} />
        </div>
        {hud.drift > 0.2 && (
          <div className="mt-2 text-right text-xs uppercase tracking-widest text-gold">Drift</div>
        )}
      </div>

      {/* Pause overlay */}
      {phase === "paused" && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-ink/60 backdrop-blur-sm">
          <div className="rounded-2xl border border-line bg-panel p-8 text-center">
            <div className="font-display text-4xl text-gold">PAUSED</div>
            <div className="mt-6 flex flex-col gap-3">
              <button onClick={resume} className="rounded-full bg-gold px-8 py-3 font-display uppercase tracking-widest text-ink">
                Resume
              </button>
              <button onClick={cycleCamera} className="rounded-full border border-line px-8 py-3 text-sm uppercase tracking-widest text-mute">
                Camera · {camLabel}
              </button>
              <button onClick={retire} className="rounded-full border border-line px-8 py-3 text-sm uppercase tracking-widest text-mute">
                Retire
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Results(props: {
  results: NonNullable<ReturnType<typeof useGame.getState>["results"]>;
  trackName: string;
  startRace: () => void;
  retire: () => void;
  replay: () => void;
}) {
  const { results, trackName, startRace, retire, replay } = props;
  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-ink/75 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-8 text-center">
        <div className="text-[11px] uppercase tracking-[0.4em] text-mute">{trackName}</div>
        <div className="mt-2 font-display text-6xl text-gold">
          {results.busted ? "BUSTED" : ordinal(results.place)}
        </div>
        <div className="mt-1 text-sm text-mute">{results.busted ? "Police caught you" : `of ${results.total}`}</div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-mute">Race</div>
            <div className="font-mono text-lg">{formatTime(results.raceTime)}</div>
          </div>
          <div>
            <div className="text-mute">Best Lap</div>
            <div className="font-mono text-lg text-gold">{formatTime(results.bestLap)}</div>
          </div>
        </div>

        <div className="mt-4 text-sm">
          <span className="text-mute">Credits earned </span>
          <span className="font-display text-xl text-gold">+{results.credits}</span>
        </div>
        {results.newRecord && <div className="mt-3 font-display text-xl uppercase tracking-widest text-gold">New Record</div>}
        {results.seriesUp && <div className="mt-2 font-display text-lg uppercase tracking-widest text-gold">Series Complete +250</div>}

        <div className="mt-8 flex flex-col gap-3">
          <button onClick={startRace} className="rounded-full bg-gold py-3 font-display uppercase tracking-widest text-ink">
            Race Again
          </button>
          <button onClick={replay} className="rounded-full border border-line py-3 text-sm uppercase tracking-widest text-mute">
            Replay
          </button>
          <button onClick={retire} className="rounded-full border border-line py-3 text-sm uppercase tracking-widest text-mute">
            Menu
          </button>
        </div>
      </div>
    </div>
  );
}

function Minimap() {
  const ref = useRef<HTMLCanvasElement>(null);
  const trackId = useGame((s) => s.trackId);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const track = getTrack(trackId);
      const samples = track.samples;
      if (!samples.length) return;

      const w = canvas.width;
      const h = canvas.height;
      if (!samples.length) return;
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (const s of samples) {
        if (s.x < minX) minX = s.x;
        if (s.x > maxX) maxX = s.x;
        if (s.z < minZ) minZ = s.z;
        if (s.z > maxZ) maxZ = s.z;
      }
      const pad = 18;
      const scale = Math.min((w - pad * 2) / Math.max(1, maxX - minX), (h - pad * 2) / Math.max(1, maxZ - minZ));
      const toX = (x: number) => pad + (x - minX) * scale;
      const toY = (z: number) => pad + (z - minZ) * scale;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(11,14,18,0.72)";
      ctx.beginPath();
      const r = 12;
      ctx.moveTo(r, 0);
      ctx.lineTo(w - r, 0);
      ctx.quadraticCurveTo(w, 0, w, r);
      ctx.lineTo(w, h - r);
      ctx.quadraticCurveTo(w, h, w - r, h);
      ctx.lineTo(r, h);
      ctx.quadraticCurveTo(0, h, 0, h - r);
      ctx.lineTo(0, r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "#303844";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(toX(samples[0].x), toY(samples[0].z));
      for (let i = 1; i < samples.length; i++) ctx.lineTo(toX(samples[i].x), toY(samples[i].z));
      ctx.closePath();
      ctx.stroke();

      ctx.strokeStyle = "#f3ede4";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // AI
      for (let i = 1; i <= 5; i++) {
        const p = poses[i];
        if (!p.visible) continue;
        ctx.fillStyle = "#9a9186";
        ctx.beginPath();
        ctx.arc(toX(p.x), toY(p.z), 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Player
      const sim = runtime.sim;
      ctx.fillStyle = "#d4a45a";
      ctx.beginPath();
      ctx.arc(toX(sim.x), toY(sim.z), 4.5, 0, Math.PI * 2);
      ctx.fill();
      const fx = -Math.sin(sim.yaw);
      const fz = -Math.cos(sim.yaw);
      ctx.strokeStyle = "#d4a45a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(toX(sim.x), toY(sim.z));
      ctx.lineTo(toX(sim.x + fx * 8), toY(sim.z + fz * 8));
      ctx.stroke();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [trackId]);

  return <canvas ref={ref} width={160} height={160} className="h-28 w-28 rounded-xl border border-line/60 md:h-36 md:w-36" />;
}

function TouchControls() {
  const steerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = steerRef.current;
    if (!el) return;

    const setSteer = (clientX: number) => {
      const rect = el.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width;
      runtime.touch.steer = Math.max(-1, Math.min(1, (x - 0.5) * 2));
    };

    const onDown = (e: PointerEvent) => {
      setActive(true);
      el.setPointerCapture(e.pointerId);
      setSteer(e.clientX);
    };
    const onMove = (e: PointerEvent) => {
      if (!active && e.buttons === 0) return;
      setSteer(e.clientX);
    };
    const onUp = () => {
      setActive(false);
      runtime.touch.steer = 0;
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [active]);

  const press = (key: "throttle" | "brake" | "drift" | "boost" | "oil" | "missile" | "shield" | "emp", val: number | boolean) => {
    if (key === "drift" || key === "boost" || key === "oil" || key === "missile" || key === "shield" || key === "emp") runtime.touch[key] = Boolean(val);
    else runtime.touch[key] = Number(val);
  };

  return (
    <div className="pointer-events-auto absolute bottom-0 left-0 right-0 flex flex-col items-end gap-2 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden">
      <div className="flex gap-2">
        <button onPointerDown={() => press("oil", true)} onPointerUp={() => press("oil", false)} className="h-12 w-12 rounded-full border border-line bg-panel/80 text-[10px] uppercase text-mute">Oil</button>
        <button onPointerDown={() => press("missile", true)} onPointerUp={() => press("missile", false)} className="h-12 w-12 rounded-full border border-ember bg-ember/30 text-[10px] uppercase text-ember">Msl</button>
        <button onPointerDown={() => press("shield", true)} onPointerUp={() => press("shield", false)} className="h-12 w-12 rounded-full border border-gold bg-gold/20 text-[10px] uppercase text-gold">Shld</button>
        <button onPointerDown={() => press("emp", true)} onPointerUp={() => press("emp", false)} className="h-12 w-12 rounded-full border border-line bg-panel/80 text-[10px] uppercase text-mute">EMP</button>
      </div>
      <div className="flex items-end justify-between w-full">
      <div
        ref={steerRef}
        className="h-24 w-32 rounded-2xl border border-line bg-panel/60 backdrop-blur touch-none"
      >
        <div className="flex h-full items-center justify-center text-xs uppercase tracking-widest text-mute">
          Steer
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onPointerDown={() => press("brake", 1)}
          onPointerUp={() => press("brake", 0)}
          onPointerLeave={() => press("brake", 0)}
          className="h-14 w-14 rounded-full border border-line bg-panel/80 text-xs uppercase text-ivory active:bg-panel-2"
        >
          Brk
        </button>
        <button
          onPointerDown={() => press("drift", true)}
          onPointerUp={() => press("drift", false)}
          onPointerLeave={() => press("drift", false)}
          className="h-14 w-14 rounded-full border border-ember bg-ember/30 text-xs uppercase text-ember active:bg-ember/50"
        >
          Drift
        </button>
        <button
          onPointerDown={() => press("boost", true)}
          onPointerUp={() => press("boost", false)}
          onPointerLeave={() => press("boost", false)}
          className="h-14 w-14 rounded-full border border-gold bg-gold/40 text-xs uppercase text-ink active:bg-gold"
        >
          Nitro
        </button>
        <button
          onPointerDown={() => press("throttle", 1)}
          onPointerUp={() => press("throttle", 0)}
          onPointerLeave={() => press("throttle", 0)}
          className="h-14 w-14 rounded-full border border-gold bg-gold/30 text-xs uppercase text-gold active:bg-gold/50"
        >
          Acc
        </button>
      </div>
      </div>
    </div>
  );
}
