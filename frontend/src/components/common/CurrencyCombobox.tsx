// ---------------------------------------------------------------------------
// CurrencyCombobox — combobox with common ISO currency codes + free-typing
// ---------------------------------------------------------------------------

import * as React from "react"

import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
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
  const [inputValue, setInputValue] = React.useState(value)

  // Sync inputValue when the parent updates value externally
  React.useEffect(() => {
    setInputValue(value)
  }, [value])

  return (
    <Combobox
      value={value}
      inputValue={inputValue}
      onValueChange={(selected) => {
        const next = selected as string ?? ""
        setInputValue(next)
        onChange?.(next)
      }}
      onInputValueChange={(next: string) => {
        setInputValue(next)
        onChange?.(next)
      }}
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
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}