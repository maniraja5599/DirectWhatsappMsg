import { COUNTRY_CODES } from '../lib/phone';

interface Props {
  value: string;
  onChange: (dial: string) => void;
  id?: string;
}

export default function CountryCodeSelector({ value, onChange, id = 'country-code' }: Props) {
  return (
    <select
      id={id}
      className="country-select"
      aria-label="Country code"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {COUNTRY_CODES.map((c) => (
        <option key={`${c.iso}-${c.dial}`} value={c.dial}>
          +{c.dial} {c.iso}
        </option>
      ))}
    </select>
  );
}
