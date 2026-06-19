// ---------------------------------------------------------------------------
// CurrencyCombobox — combobox with common ISO currency codes + free-typing
// ---------------------------------------------------------------------------

import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox"

const COMMON_CURRENCIES = [
  "EUR",
  "USD",
  "GBP",
  "CHF",
  "JPY",
  "CAD",
  "AUD",
  "BRL",
  "CNY",
  "INR",
  "MXN",
]

export interface CurrencyComboboxProps {
  value?: string
  onChange?: (value: string) => void
  disabled?: boolean
}

export function CurrencyCombobox({
  value = "",
  onChange,
  disabled = false,
}: CurrencyComboboxProps) {
  return (
    <Combobox
      value={value}
      onValueChange={(newValue) => onChange?.(newValue ?? "")}
    >
      <ComboboxInput
        disabled={disabled}
        placeholder="Select or type a currency…"
        aria-label="Currency"
        showTrigger
      />

      <ComboboxContent>
        <ComboboxList>
          {COMMON_CURRENCIES.map((code) => (
            <ComboboxItem key={code} value={code}>
              {code}
            </ComboboxItem>
          ))}
          <ComboboxEmpty>No currency found</ComboboxEmpty>
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}