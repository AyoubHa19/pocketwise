import { fieldClass } from "@/components/formStyles";
import { currencyOptions } from "@/lib/money";

type Props = {
  /** A currency code like "MAD", or "" when nothing is chosen yet. */
  value: string;
  onChange: (code: string) => void;
};

// The list comes from the browser (see currencyOptions), so only render this
// once the page is running in the browser, e.g. after settings have loaded.
export function CurrencySelect({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={fieldClass}
    >
      <option value="" disabled>
        Choose a currency
      </option>
      {currencyOptions().map(({ code, name }) => (
        <option key={code} value={code}>
          {name} ({code})
        </option>
      ))}
    </select>
  );
}
