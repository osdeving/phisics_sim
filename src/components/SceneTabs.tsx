import { useEffect, useMemo, useState } from "react";
import { SceneDefinition } from "../physics/scenes/types";

interface SceneTabsProps {
  scenes: SceneDefinition[];
  activeSceneId: string;
  activeScene: SceneDefinition;
  onChange: (sceneId: string) => void;
}

function buildSceneGlyph(title: string) {
  const words = title
    .replace(/[^A-Za-zÀ-ÿ0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) {
    return "SC";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function SceneTabs({ scenes, activeSceneId, activeScene, onChange }: SceneTabsProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const groupedScenes = useMemo(() => {
    const groups: Array<{ category: string; scenes: SceneDefinition[] }> = [];
    const seen = new Map<string, { category: string; scenes: SceneDefinition[] }>();

    scenes.forEach((scene) => {
      const existing = seen.get(scene.category);
      if (existing) {
        existing.scenes.push(scene);
        return;
      }

      const group = {
        category: scene.category,
        scenes: [scene],
      };
      seen.set(scene.category, group);
      groups.push(group);
    });

    return groups;
  }, [scenes]);

  useEffect(() => {
    setMobileOpen(false);
  }, [activeSceneId]);

  return (
    <div className="scene-menu">
      <button
        type="button"
        className="scene-menu__mobile-trigger"
        onClick={() => setMobileOpen(true)}
      >
        cenas
      </button>

      {mobileOpen && (
        <button
          type="button"
          className="scene-menu__backdrop"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`scene-menu__panel ${collapsed ? "is-collapsed" : ""} ${mobileOpen ? "is-mobile-open" : ""}`}
      >
        <header className="scene-menu__header">
          {!collapsed && (
            <div>
              <p className="eyebrow">Navegação</p>
              <h2>Cenas</h2>
            </div>
          )}
          <div className="scene-menu__header-actions">
            <button
              type="button"
              className="scene-menu__icon-button"
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
              onClick={() => setCollapsed((value) => !value)}
            >
              {collapsed ? ">>" : "<<"}
            </button>
            <button
              type="button"
              className="scene-menu__icon-button scene-menu__close"
              aria-label="Fechar menu"
              onClick={() => setMobileOpen(false)}
            >
              x
            </button>
          </div>
        </header>

        <div className="scene-menu__list">
          {groupedScenes.map((group) => (
            <section key={group.category} className="scene-menu__group">
              {!collapsed && (
                <p className="scene-menu__group-title">{group.category}</p>
              )}

              <div className="scene-menu__group-list">
                {group.scenes.map((scene) => (
                  <button
                    key={scene.id}
                    type="button"
                    className={`scene-tab ${scene.id === activeSceneId ? "is-active" : ""}`}
                    onClick={() => onChange(scene.id)}
                    style={{ ["--scene-accent" as string]: scene.accent }}
                    title={scene.title}
                  >
                    <span className="scene-tab__icon">{buildSceneGlyph(scene.title)}</span>
                    {!collapsed && (
                      <span className="scene-tab__copy">
                        <span className="scene-tab__title">{scene.title}</span>
                        <span className="scene-tab__subtitle">{scene.subtitle}</span>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        {!collapsed && (
          <section className="scene-menu__details">
            <p className="eyebrow">Cena ativa</p>
            <h3>{activeScene.title}</h3>
            <p className="scene-menu__details-subtitle">{activeScene.subtitle}</p>
            <p className="scene-menu__details-summary">{activeScene.summary}</p>

            <div className="scene-menu__meta">
              <span className="scene-menu__meta-chip">{activeScene.category}</span>
              <span className="scene-menu__meta-chip">
                {activeScene.controls.length} controle{activeScene.controls.length === 1 ? "" : "s"}
              </span>
            </div>

            {!!activeScene.keyboardHints.length && (
              <ul className="scene-menu__details-list">
                {activeScene.keyboardHints.map((hint) => (
                  <li key={hint}>{hint}</li>
                ))}
              </ul>
            )}
          </section>
        )}
      </aside>
    </div>
  );
}
