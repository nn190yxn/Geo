import type { AIPlatformFilterValue } from '../utils/displayLabels';
import { preferredAIPlatformOptions } from '../utils/displayLabels';

export type PlatformSwitchProps = {
  value: AIPlatformFilterValue;
  onChange: (value: AIPlatformFilterValue) => void;
  includeAll?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
};

export function PlatformSwitch({
  value,
  onChange,
  includeAll = true,
  disabled = false,
  ariaLabel = '选择 AI 平台'
}: PlatformSwitchProps) {
  const options = includeAll
    ? [{ value: 'all' as const, label: '全部平台', mark: '全' }, ...preferredAIPlatformOptions]
    : preferredAIPlatformOptions;

  return (
    <div className="platform-switch" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          aria-pressed={value === option.value}
          className={value === option.value ? 'platform-switch-item platform-switch-item-active' : 'platform-switch-item'}
          disabled={disabled}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          <span className="platform-switch-mark" aria-hidden="true">{option.mark}</span>
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}
