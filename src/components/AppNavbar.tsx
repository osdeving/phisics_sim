import { SceneDefinition } from "../physics/scenes/types";

interface AppNavbarProps {
  scenes: SceneDefinition[];
  activeScene: SceneDefinition;
  onChangeScene: (sceneId: string) => void;
}

export function AppNavbar({
  scenes,
  activeScene,
  onChangeScene,
}: AppNavbarProps) {
  const categoryMap = new Map<string, SceneDefinition[]>();

  scenes.forEach((scene) => {
    const bucket = categoryMap.get(scene.category);
    if (bucket) {
      bucket.push(scene);
      return;
    }

    categoryMap.set(scene.category, [scene]);
  });

  return (
    <header className="app-navbar card">
      <div className="app-navbar__brand">
        <p className="eyebrow">Workspace</p>
        <h1>Physics Sim</h1>
        <p className="app-navbar__copy">
          Cena, tutorial e exercicios ficam no mesmo container de abas.
        </p>
      </div>

      <nav className="app-navbar__categories" aria-label="Categorias de cenas">
        {Array.from(categoryMap.entries()).map(([category, categoryScenes]) => {
          const isActive = activeScene.category === category;
          return (
            <button
              key={category}
              type="button"
              className={`app-navbar__category ${isActive ? "is-active" : ""}`}
              onClick={() => onChangeScene(categoryScenes[0].id)}
            >
              <span>{category}</span>
              <small>{categoryScenes.length}</small>
            </button>
          );
        })}
      </nav>

      <div className="app-navbar__status">
        <span className="app-navbar__status-label">Cena ativa</span>
        <strong>{activeScene.title}</strong>
        <p>{activeScene.subtitle}</p>
      </div>
    </header>
  );
}
