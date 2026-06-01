// Country list aligned with Airtable "Lead Country" single-select options.
// Add new entries to Airtable AND here together.
export interface Country {
  name: string; // Must match Airtable single-select option label exactly
  code: string; // ISO 3166-1 alpha-2
  dial: string; // E.164 dial code (no +)
}

export const COUNTRIES: Country[] = [
  { name: "Australia", code: "AU", dial: "61" },
  { name: "Austria", code: "AT", dial: "43" },
  { name: "Belgium", code: "BE", dial: "32" },
  { name: "Brazil", code: "BR", dial: "55" },
  { name: "Canada", code: "CA", dial: "1" },
  { name: "China", code: "CN", dial: "86" },
  { name: "Czech Republic", code: "CZ", dial: "420" },
  { name: "Denmark", code: "DK", dial: "45" },
  { name: "Finland", code: "FI", dial: "358" },
  { name: "France", code: "FR", dial: "33" },
  { name: "Germany", code: "DE", dial: "49" },
  { name: "Hong Kong", code: "HK", dial: "852" },
  { name: "India", code: "IN", dial: "91" },
  { name: "Indonesia", code: "ID", dial: "62" },
  { name: "Ireland", code: "IE", dial: "353" },
  { name: "Israel", code: "IL", dial: "972" },
  { name: "Italy", code: "IT", dial: "39" },
  { name: "Japan", code: "JP", dial: "81" },
  { name: "Malaysia", code: "MY", dial: "60" },
  { name: "Mexico", code: "MX", dial: "52" },
  { name: "Netherlands", code: "NL", dial: "31" },
  { name: "New Zealand", code: "NZ", dial: "64" },
  { name: "Norway", code: "NO", dial: "47" },
  { name: "Philippines", code: "PH", dial: "63" },
  { name: "Poland", code: "PL", dial: "48" },
  { name: "Portugal", code: "PT", dial: "351" },
  { name: "Singapore", code: "SG", dial: "65" },
  { name: "South Africa", code: "ZA", dial: "27" },
  { name: "South Korea", code: "KR", dial: "82" },
  { name: "Spain", code: "ES", dial: "34" },
  { name: "Sweden", code: "SE", dial: "46" },
  { name: "Switzerland", code: "CH", dial: "41" },
  { name: "Thailand", code: "TH", dial: "66" },
  { name: "United Arab Emirates", code: "AE", dial: "971" },
  { name: "United Kingdom", code: "GB", dial: "44" },
  { name: "United States", code: "US", dial: "1" },
  { name: "Vietnam", code: "VN", dial: "84" },
  { name: "Other", code: "XX", dial: "" },
];
