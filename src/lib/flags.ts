export const flags: Record<string, string> = {
  // Hosts + Nord America
  "USA": "🇺🇸", "Messico": "🇲🇽", "Canada": "🇨🇦",
  // Sud America
  "Brasile": "🇧🇷", "Argentina": "🇦🇷", "Colombia": "🇨🇴", "Uruguay": "🇺🇾",
  "Paraguay": "🇵🇾", "Ecuador": "🇪🇨", "Cile": "🇨🇱", "Perù": "🇵🇪",
  "Venezuela": "🇻🇪",
  // Europa
  "Italia": "🇮🇹", "Germania": "🇩🇪", "Francia": "🇫🇷", "Spagna": "🇪🇸",
  "Inghilterra": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Portogallo": "🇵🇹", "Olanda": "🇳🇱", "Belgio": "🇧🇪",
  "Croazia": "🇭🇷", "Danimarca": "🇩🇰", "Serbia": "🇷🇸", "Svizzera": "🇨🇭",
  "Polonia": "🇵🇱", "Norvegia": "🇳🇴", "Svezia": "🇸🇪", "Scozia": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "Galles": "🏴󠁧󠁢󠁷󠁬󠁳󠁿", "Austria": "🇦🇹", "Repubblica Ceca": "🇨🇿",
  "Bosnia-Erzegovina": "🇧🇦", "Turchia": "🇹🇷",
  // Asia
  "Giappone": "🇯🇵", "Corea del Sud": "🇰🇷", "Australia": "🇦🇺", "Iran": "🇮🇷",
  "Arabia Saudita": "🇸🇦", "Qatar": "🇶🇦", "Iraq": "🇮🇶", "Giordania": "🇯🇴",
  "Uzbekistan": "🇺🇿",
  // Africa
  "Marocco": "🇲🇦", "Senegal": "🇸🇳", "Egitto": "🇪🇬", "Tunisia": "🇹🇳",
  "Algeria": "🇩🇿", "Ghana": "🇬🇭", "Sudafrica": "🇿🇦", "Costa d'Avorio": "🇨🇮",
  "Capo Verde": "🇨🇻", "RD Congo": "🇨🇩", "Nigeria": "🇳🇬", "Camerun": "🇨🇲",
  // Oceania
  "Nuova Zelanda": "🇳🇿",
  // Centro America / Caraibi
  "Panama": "🇵🇦", "Haiti": "🇭🇹", "Curaçao": "🇨🇼", "Costa Rica": "🇨🇷",
  "Honduras": "🇭🇳", "Israele": "🇮🇱",
};

export function getFlag(team: string): string {
  return flags[team] ?? "🏳️";
}

/**
 * ISO 3166-1 alpha-2 country codes for flag images.
 * Uses `gb-eng`, `gb-sct`, `gb-wls` for British home nations (supported by flagcdn.com).
 */
export const flagCodes: Record<string, string> = {
  // Hosts + Nord America
  "USA": "us", "Messico": "mx", "Canada": "ca",
  // Sud America
  "Brasile": "br", "Argentina": "ar", "Colombia": "co", "Uruguay": "uy",
  "Paraguay": "py", "Ecuador": "ec", "Cile": "cl", "Perù": "pe",
  "Venezuela": "ve",
  // Europa
  "Italia": "it", "Germania": "de", "Francia": "fr", "Spagna": "es",
  "Inghilterra": "gb-eng", "Portogallo": "pt", "Olanda": "nl", "Belgio": "be",
  "Croazia": "hr", "Danimarca": "dk", "Serbia": "rs", "Svizzera": "ch",
  "Polonia": "pl", "Norvegia": "no", "Svezia": "se", "Scozia": "gb-sct",
  "Galles": "gb-wls", "Austria": "at", "Repubblica Ceca": "cz",
  "Bosnia-Erzegovina": "ba", "Turchia": "tr",
  // Asia
  "Giappone": "jp", "Corea del Sud": "kr", "Australia": "au", "Iran": "ir",
  "Arabia Saudita": "sa", "Qatar": "qa", "Iraq": "iq", "Giordania": "jo",
  "Uzbekistan": "uz",
  // Africa
  "Marocco": "ma", "Senegal": "sn", "Egitto": "eg", "Tunisia": "tn",
  "Algeria": "dz", "Ghana": "gh", "Sudafrica": "za", "Costa d'Avorio": "ci",
  "Capo Verde": "cv", "RD Congo": "cd", "Nigeria": "ng", "Camerun": "cm",
  // Oceania
  "Nuova Zelanda": "nz",
  // Centro America / Caraibi
  "Panama": "pa", "Haiti": "ht", "Curaçao": "cw", "Costa Rica": "cr",
  "Honduras": "hn", "Israele": "il",
};

export function getFlagCode(team: string): string | null {
  return flagCodes[team] ?? null;
}
