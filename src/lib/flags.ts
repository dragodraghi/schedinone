export const flags: Record<string, string> = {
  "USA": "🇺🇸", "Messico": "🇲🇽", "Canada": "🇨🇦", "Marocco": "🇲🇦",
  "Italia": "🇮🇹", "Brasile": "🇧🇷", "Argentina": "🇦🇷", "Germania": "🇩🇪",
  "Francia": "🇫🇷", "Spagna": "🇪🇸", "Inghilterra": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Portogallo": "🇵🇹",
  "Olanda": "🇳🇱", "Giappone": "🇯🇵", "Senegal": "🇸🇳", "Ecuador": "🇪🇨",
  "Belgio": "🇧🇪", "Colombia": "🇨🇴", "Uruguay": "🇺🇾", "Corea del Sud": "🇰🇷",
  "Croazia": "🇭🇷", "Danimarca": "🇩🇰", "Serbia": "🇷🇸", "Australia": "🇦🇺",
  "Svizzera": "🇨🇭", "Nigeria": "🇳🇬", "Camerun": "🇨🇲", "Costa Rica": "🇨🇷",
  "Polonia": "🇵🇱", "Egitto": "🇪🇬", "Tunisia": "🇹🇳", "Arabia Saudita": "🇸🇦",
  "Galles": "🏴󠁧󠁢󠁷󠁬󠁳󠁿", "Iran": "🇮🇷", "Ghana": "🇬🇭", "Panama": "🇵🇦",
  "Scozia": "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "Perù": "🇵🇪", "Algeria": "🇩🇿", "Honduras": "🇭🇳",
  "Norvegia": "🇳🇴", "Cile": "🇨🇱", "Paraguay": "🇵🇾", "Nuova Zelanda": "🇳🇿",
  "Svezia": "🇸🇪", "Turchia": "🇹🇷", "Venezuela": "🇻🇪", "Israele": "🇮🇱",
};

export function getFlag(team: string): string {
  return flags[team] ?? "🏳️";
}
