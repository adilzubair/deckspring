import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type StudioSelectOption = { value: string; label: string };
export type StudioSelectGroup = { label: string; options: readonly StudioSelectOption[] };

export function StudioSelect({
  label,
  value,
  onValueChange,
  options = [],
  groups = [],
  placeholder,
  disabled = false,
  compact = false,
  className = '',
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options?: readonly StudioSelectOption[];
  groups?: readonly StudioSelectGroup[];
  placeholder?: string;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const allOptions = [...options, ...groups.flatMap((group) => group.options)];
  const items = Object.fromEntries(allOptions.map((option) => [option.value, option.label]));

  return (
    <Select
      items={items}
      value={value || null}
      onValueChange={(next) => {
        if (typeof next === 'string') onValueChange(next);
      }}
    >
      <SelectTrigger
        aria-label={label}
        disabled={disabled}
        className={cn(
          'w-full min-w-0 border-input bg-card text-[14px]',
          compact ? 'data-[size=default]:h-8' : 'data-[size=default]:h-10',
          className,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        align="start"
        className="max-h-[min(24rem,var(--available-height))] min-w-[var(--anchor-width)] max-w-[min(25rem,var(--available-width))]"
      >
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
        {groups.map((group, index) => (
          <SelectGroup key={group.label}>
            {index > 0 || options.length > 0 ? <SelectSeparator /> : null}
            <SelectLabel>{group.label}</SelectLabel>
            {group.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
