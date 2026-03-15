import { useCallback, useEffect, useMemo, useState } from "react";
import { InspectorDeck } from "./components/InspectorDeck";
import { SceneTabs } from "./components/SceneTabs";
import { SimulationStage } from "./components/SimulationStage";
import { scenes } from "./data/scenes";
import { ScenePanelData } from "./physics/scenes/types";

function buildConfigMap() {
  return Object.fromEntries(
    scenes.map((scene) => [scene.id, { ...scene.defaults }]),
  );
}

function buildPanelMap() {
  return Object.fromEntries(
    scenes.map((scene) => {
      const state = scene.createState(scene.defaults);
      return [scene.id, scene.buildPanelData(state, scene.defaults)];
    }),
  ) as Record<string, ScenePanelData>;
}

export default function App() {
  const [activeSceneId, setActiveSceneId] = useState(scenes[0].id);
  const [configMap, setConfigMap] = useState<
    Record<string, Record<string, number>>
  >(() => buildConfigMap());
  const [panelMap, setPanelMap] = useState<Record<string, ScenePanelData>>(() =>
    buildPanelMap(),
  );

  const activeScene = useMemo(
    () => scenes.find((scene) => scene.id === activeSceneId) ?? scenes[0],
    [activeSceneId],
  );
  const activeConfig = configMap[activeScene.id];
  const activePanel = panelMap[activeScene.id];

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--scene-accent",
      activeScene.accent,
    );
  }, [activeScene.accent]);

  const handleConfigChange = useCallback(
    (key: string, value: number) => {
      setConfigMap((current) => ({
        ...current,
        [activeScene.id]: {
          ...current[activeScene.id],
          [key]: value,
        },
      }));
    },
    [activeScene.id],
  );

  const handleConfigPatch = useCallback(
    (patch: Partial<Record<string, number>>) => {
      const definedEntries = Object.entries(patch).filter(
        (entry): entry is [string, number] => entry[1] !== undefined,
      );
      const patchValues = Object.fromEntries(definedEntries);

      setConfigMap((current) => ({
        ...current,
        [activeScene.id]: {
          ...current[activeScene.id],
          ...patchValues,
        },
      }));
    },
    [activeScene.id],
  );

  const handleTelemetry = useCallback(
    (panel: ScenePanelData) => {
      setPanelMap((current) => ({
        ...current,
        [activeScene.id]: panel,
      }));
    },
    [activeScene.id],
  );

  return (
    <div className="app-shell app-shell--canvas">
      <main className="app-layout">
        <SceneTabs
          scenes={scenes}
          activeSceneId={activeScene.id}
          onChange={setActiveSceneId}
        />

        <div className="workspace-grid">
          <SimulationStage
            scene={activeScene}
            config={activeConfig}
            onTelemetry={handleTelemetry}
            onConfigPatch={handleConfigPatch}
          />

          <InspectorDeck
            sceneKey={activeScene.id}
            panel={activePanel}
            controls={activeScene.controls}
            config={activeConfig}
            onChange={handleConfigChange}
          />
        </div>
      </main>
    </div>
  );
}
