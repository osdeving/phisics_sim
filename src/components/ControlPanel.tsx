import { SliderControl } from '../physics/scenes/types';

interface ControlPanelProps {
  controls: SliderControl[];
  config: Record<string, number>;
  onChange: (key: string, value: number) => void;
  embedded?: boolean;
}

export function ControlPanel({ controls, config, onChange, embedded = false }: ControlPanelProps) {
  return (
    <div className={embedded ? 'stack-gap-sm inspector-panel' : 'card stack-gap-sm'}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Parâmetros físicos</p>
          <h2>Controles do experimento</h2>
        </div>
        <p className="panel-text">Ajuste massa, forças e constantes usando unidades reais.</p>
      </div>

      <div className="control-list">
        {controls.map((control) => {
          const value = config[control.key];
          return (
            <label key={control.key} className="control-item">
              <div className="control-item__header">
                <div>
                  <span className="control-item__label">{control.label}</span>
                  <span className="control-item__description">{control.description}</span>
                </div>
                <strong>
                  {value.toFixed(control.step < 0.1 ? 2 : 1)} {control.unit}
                </strong>
              </div>
              <input
                type="range"
                min={control.min}
                max={control.max}
                step={control.step}
                value={value}
                onChange={(event) => onChange(control.key, Number(event.target.value))}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}
