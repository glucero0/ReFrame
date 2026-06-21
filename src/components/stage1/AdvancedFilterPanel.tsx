import type { FilterSettings } from '../../lib/regionTypes'

type SliderProps = {
  label: string
  value: number
  min: number
  max: number
  step?: number
  disabled?: boolean
  suffix?: string
  onChange: (value: number) => void
}

function FilterSlider({
  label,
  value,
  min,
  max,
  step = 1,
  disabled,
  suffix = '',
  onChange,
}: SliderProps) {
  return (
    <label className="block text-sm">
      <span className="text-gray-600">
        {label} ({value}
        {suffix})
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        onInput={(e) => onChange(Number(e.currentTarget.value))}
        className="w-full"
      />
    </label>
  )
}

type AdvancedFilterPanelProps = {
  filters: FilterSettings
  disabled?: boolean
  onChange: (partial: Partial<FilterSettings>) => void
}

export default function AdvancedFilterPanel({
  filters,
  disabled,
  onChange,
}: AdvancedFilterPanelProps) {
  return (
    <div className="space-y-3 rounded border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        Color & style
      </p>
      <FilterSlider
        label="Saturation"
        value={filters.saturation}
        min={0}
        max={200}
        suffix="%"
        disabled={disabled}
        onChange={(saturation) => onChange({ saturation })}
      />
      <FilterSlider
        label="Hue rotate"
        value={filters.hueRotate}
        min={0}
        max={360}
        suffix="°"
        disabled={disabled}
        onChange={(hueRotate) => onChange({ hueRotate })}
      />
      <FilterSlider
        label="Invert"
        value={filters.invert}
        min={0}
        max={100}
        suffix="%"
        disabled={disabled}
        onChange={(invert) => onChange({ invert })}
      />
      <FilterSlider
        label="Sepia"
        value={filters.sepia}
        min={0}
        max={100}
        suffix="%"
        disabled={disabled}
        onChange={(sepia) => onChange({ sepia })}
      />
      <FilterSlider
        label="Blur"
        value={filters.blur}
        min={0}
        max={10}
        step={0.5}
        suffix="px"
        disabled={disabled}
        onChange={(blur) => onChange({ blur })}
      />

      <p className="pt-1 text-xs font-medium uppercase tracking-wide text-gray-500">
        Tone & lighting
      </p>
      <FilterSlider
        label="Exposure"
        value={filters.exposure}
        min={-100}
        max={100}
        disabled={disabled}
        onChange={(exposure) => onChange({ exposure })}
      />
      <FilterSlider
        label="Gamma"
        value={filters.gamma}
        min={0.2}
        max={3}
        step={0.05}
        disabled={disabled}
        onChange={(gamma) => onChange({ gamma })}
      />
      <FilterSlider
        label="Vignette"
        value={filters.vignette}
        min={0}
        max={100}
        suffix="%"
        disabled={disabled}
        onChange={(vignette) => onChange({ vignette })}
      />

      <p className="pt-1 text-xs font-medium uppercase tracking-wide text-gray-500">
        Tint overlay
      </p>
      <FilterSlider
        label="Red tint"
        value={filters.tintRed}
        min={-100}
        max={100}
        disabled={disabled}
        onChange={(tintRed) => onChange({ tintRed })}
      />
      <FilterSlider
        label="Green tint"
        value={filters.tintGreen}
        min={-100}
        max={100}
        disabled={disabled}
        onChange={(tintGreen) => onChange({ tintGreen })}
      />
      <FilterSlider
        label="Blue tint"
        value={filters.tintBlue}
        min={-100}
        max={100}
        disabled={disabled}
        onChange={(tintBlue) => onChange({ tintBlue })}
      />
    </div>
  )
}
