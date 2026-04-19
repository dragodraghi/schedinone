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
