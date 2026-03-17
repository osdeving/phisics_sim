import { useCallback, useEffect, useMemo, useState } from "react";
import { AppNavbar } from "./components/AppNavbar";
import { SceneTabs } from "./components/SceneTabs";
import { SimulationStage } from "./components/SimulationStage";
import { WorkspaceTabs } from "./components/WorkspaceTabs";
import { scenes } from "./data/scenes";
import { SceneDefinition, ScenePanelData } from "./physics/scenes/types";

function normalizeSceneConfig(
  scene: SceneDefinition,
  currentConfig?: Record<string, number>,
) {
  const merged = {
    ...scene.defaults,
    ...(currentConfig ?? {}),
  };

  scene.controls.forEach((control) => {
    const value = merged[control.key];
    if (!Number.isFinite(value) || value < control.min || value > control.max) {
      merged[control.key] = scene.defaults[control.key];
    }
  });

  return merged;
}

function buildConfigMap() {
  return Object.fromEntries(
    scenes.map((scene) => [scene.id, normalizeSceneConfig(scene)]),
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
  const activeConfig = useMemo(
    () => normalizeSceneConfig(activeScene, configMap[activeScene.id]),
    [activeScene, configMap],
  );
  const activePanel = panelMap[activeScene.id];

  useEffect(() => {
    setConfigMap((current) => {
      const normalized = normalizeSceneConfig(activeScene, current[activeScene.id]);
      const currentSceneConfig = current[activeScene.id];
      if (JSON.stringify(currentSceneConfig) === JSON.stringify(normalized)) {
        return current;
      }

      return {
        ...current,
        [activeScene.id]: normalized,
      };
    });
  }, [activeScene]);

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
          ...normalizeSceneConfig(activeScene, current[activeScene.id]),
          [key]: value,
        },
      }));
    },
    [activeScene],
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
          ...normalizeSceneConfig(activeScene, current[activeScene.id]),
          ...patchValues,
        },
      }));
    },
    [activeScene],
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
      <AppNavbar
        scenes={scenes}
        activeScene={activeScene}
        onChangeScene={setActiveSceneId}
      />

      <main className="app-layout">
        <SceneTabs
          scenes={scenes}
          activeSceneId={activeScene.id}
          activeScene={activeScene}
          onChange={setActiveSceneId}
        />

        <WorkspaceTabs
          scene={activeScene}
          panel={activePanel}
          controls={activeScene.controls}
          config={activeConfig}
          onChange={handleConfigChange}
          sceneContent={
            <SimulationStage
              scene={activeScene}
              config={activeConfig}
              onTelemetry={handleTelemetry}
              onConfigPatch={handleConfigPatch}
            />
          }
        />
      </main>
    </div>
  );
}
