import { useEffect, useState } from 'react';
import { ScenePanelData, SliderControl } from '../physics/scenes/types';
import { ControlPanel } from './ControlPanel';
import { ExercisePanel } from './ExercisePanel';
import { OverviewPanel } from './OverviewPanel';
import { TutorialTabs } from './TutorialTabs';

type InspectorTabId = 'overview' | 'controls' | 'tutorial' | 'exercise';

interface InspectorDeckProps {
  sceneKey: string;
  panel: ScenePanelData;
  controls: SliderControl[];
  config: Record<string, number>;
  onChange: (key: string, value: number) => void;
}

const tabLabels: Record<InspectorTabId, string> = {
  overview: 'Painel',
  controls: 'Controles',
  tutorial: 'Tutorial',
  exercise: 'Exercícios',
};

export function InspectorDeck({ sceneKey, panel, controls, config, onChange }: InspectorDeckProps) {
  const [activeTab, setActiveTab] = useState<InspectorTabId>('overview');

  useEffect(() => {
    setActiveTab('overview');
  }, [sceneKey]);

  return (
    <section className="card inspector-deck">
      <div className="inspector-deck__header">
        <div>
          <p className="eyebrow">Laboratório didático</p>
          <h2>Dados, teoria e exercícios</h2>
        </div>

        <div className="tutorial-tabs__buttons">
          {(Object.keys(tabLabels) as InspectorTabId[]).map((tabId) => (
            <button
              key={tabId}
              type="button"
              className={`tutorial-tabs__button ${tabId === activeTab ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tabId)}
            >
              {tabLabels[tabId]}
            </button>
          ))}
        </div>
      </div>

      <div className="inspector-deck__body">
        {activeTab === 'overview' && <OverviewPanel panel={panel} />}
        {activeTab === 'controls' && (
          <ControlPanel controls={controls} config={config} onChange={onChange} embedded />
        )}
        {activeTab === 'tutorial' && <TutorialTabs sceneKey={sceneKey} panel={panel} embedded />}
        {activeTab === 'exercise' && <ExercisePanel panel={panel} />}
      </div>

      <div className="inspector-deck__about">
        <p className="eyebrow">Sobre</p>
        <p>
          Software de <strong>Willams Sousa</strong> para aprender Física de forma lúdica,
          visual e interativa.
        </p>
      </div>
    </section>
  );
}
