/**
 * Coarse regions (ISO 3166-2) for opt-in regional aggregation.
 *
 * Deliberately COARSE: states/regions only, never cities — location plus a
 * political profile is deanonymization material. Countries without a list
 * here simply publish no region. Labels are endonyms (proper names, no i18n).
 */

export type Region = { code: string; name: string };

export const REGIONS: Record<string, Region[]> = {
  DE: [
    { code: 'DE-BW', name: 'Baden-Württemberg' }, { code: 'DE-BY', name: 'Bayern' },
    { code: 'DE-BE', name: 'Berlin' }, { code: 'DE-BB', name: 'Brandenburg' },
    { code: 'DE-HB', name: 'Bremen' }, { code: 'DE-HH', name: 'Hamburg' },
    { code: 'DE-HE', name: 'Hessen' }, { code: 'DE-MV', name: 'Mecklenburg-Vorpommern' },
    { code: 'DE-NI', name: 'Niedersachsen' }, { code: 'DE-NW', name: 'Nordrhein-Westfalen' },
    { code: 'DE-RP', name: 'Rheinland-Pfalz' }, { code: 'DE-SL', name: 'Saarland' },
    { code: 'DE-SN', name: 'Sachsen' }, { code: 'DE-ST', name: 'Sachsen-Anhalt' },
    { code: 'DE-SH', name: 'Schleswig-Holstein' }, { code: 'DE-TH', name: 'Thüringen' },
  ],
  AT: [
    { code: 'AT-1', name: 'Burgenland' }, { code: 'AT-2', name: 'Kärnten' },
    { code: 'AT-3', name: 'Niederösterreich' }, { code: 'AT-4', name: 'Oberösterreich' },
    { code: 'AT-5', name: 'Salzburg' }, { code: 'AT-6', name: 'Steiermark' },
    { code: 'AT-7', name: 'Tirol' }, { code: 'AT-8', name: 'Vorarlberg' },
    { code: 'AT-9', name: 'Wien' },
  ],
  CH: [
    { code: 'CH-AG', name: 'Aargau' }, { code: 'CH-AR', name: 'Appenzell Ausserrhoden' },
    { code: 'CH-AI', name: 'Appenzell Innerrhoden' }, { code: 'CH-BL', name: 'Basel-Landschaft' },
    { code: 'CH-BS', name: 'Basel-Stadt' }, { code: 'CH-BE', name: 'Bern' },
    { code: 'CH-FR', name: 'Fribourg' }, { code: 'CH-GE', name: 'Genève' },
    { code: 'CH-GL', name: 'Glarus' }, { code: 'CH-GR', name: 'Graubünden' },
    { code: 'CH-JU', name: 'Jura' }, { code: 'CH-LU', name: 'Luzern' },
    { code: 'CH-NE', name: 'Neuchâtel' }, { code: 'CH-NW', name: 'Nidwalden' },
    { code: 'CH-OW', name: 'Obwalden' }, { code: 'CH-SH', name: 'Schaffhausen' },
    { code: 'CH-SZ', name: 'Schwyz' }, { code: 'CH-SO', name: 'Solothurn' },
    { code: 'CH-SG', name: 'St. Gallen' }, { code: 'CH-TG', name: 'Thurgau' },
    { code: 'CH-TI', name: 'Ticino' }, { code: 'CH-UR', name: 'Uri' },
    { code: 'CH-VS', name: 'Valais' }, { code: 'CH-VD', name: 'Vaud' },
    { code: 'CH-ZG', name: 'Zug' }, { code: 'CH-ZH', name: 'Zürich' },
  ],
  FR: [
    { code: 'FR-ARA', name: 'Auvergne-Rhône-Alpes' }, { code: 'FR-BFC', name: 'Bourgogne-Franche-Comté' },
    { code: 'FR-BRE', name: 'Bretagne' }, { code: 'FR-CVL', name: 'Centre-Val de Loire' },
    { code: 'FR-COR', name: 'Corse' }, { code: 'FR-GES', name: 'Grand Est' },
    { code: 'FR-HDF', name: 'Hauts-de-France' }, { code: 'FR-IDF', name: 'Île-de-France' },
    { code: 'FR-NOR', name: 'Normandie' }, { code: 'FR-NAQ', name: 'Nouvelle-Aquitaine' },
    { code: 'FR-OCC', name: 'Occitanie' }, { code: 'FR-PDL', name: 'Pays de la Loire' },
    { code: 'FR-PAC', name: 'Provence-Alpes-Côte d’Azur' },
  ],
  IT: [
    { code: 'IT-65', name: 'Abruzzo' }, { code: 'IT-77', name: 'Basilicata' },
    { code: 'IT-78', name: 'Calabria' }, { code: 'IT-72', name: 'Campania' },
    { code: 'IT-45', name: 'Emilia-Romagna' }, { code: 'IT-36', name: 'Friuli-Venezia Giulia' },
    { code: 'IT-62', name: 'Lazio' }, { code: 'IT-42', name: 'Liguria' },
    { code: 'IT-25', name: 'Lombardia' }, { code: 'IT-57', name: 'Marche' },
    { code: 'IT-67', name: 'Molise' }, { code: 'IT-21', name: 'Piemonte' },
    { code: 'IT-75', name: 'Puglia' }, { code: 'IT-88', name: 'Sardegna' },
    { code: 'IT-82', name: 'Sicilia' }, { code: 'IT-52', name: 'Toscana' },
    { code: 'IT-32', name: 'Trentino-Alto Adige' }, { code: 'IT-55', name: 'Umbria' },
    { code: 'IT-23', name: 'Valle d’Aosta' }, { code: 'IT-34', name: 'Veneto' },
  ],
  ES: [
    { code: 'ES-AN', name: 'Andalucía' }, { code: 'ES-AR', name: 'Aragón' },
    { code: 'ES-AS', name: 'Asturias' }, { code: 'ES-IB', name: 'Illes Balears' },
    { code: 'ES-CN', name: 'Canarias' }, { code: 'ES-CB', name: 'Cantabria' },
    { code: 'ES-CL', name: 'Castilla y León' }, { code: 'ES-CM', name: 'Castilla-La Mancha' },
    { code: 'ES-CT', name: 'Cataluña' }, { code: 'ES-EX', name: 'Extremadura' },
    { code: 'ES-GA', name: 'Galicia' }, { code: 'ES-RI', name: 'La Rioja' },
    { code: 'ES-MD', name: 'Madrid' }, { code: 'ES-MC', name: 'Murcia' },
    { code: 'ES-NC', name: 'Navarra' }, { code: 'ES-PV', name: 'País Vasco' },
    { code: 'ES-VC', name: 'Comunitat Valenciana' },
  ],
  NL: [
    { code: 'NL-DR', name: 'Drenthe' }, { code: 'NL-FL', name: 'Flevoland' },
    { code: 'NL-FR', name: 'Friesland' }, { code: 'NL-GE', name: 'Gelderland' },
    { code: 'NL-GR', name: 'Groningen' }, { code: 'NL-LI', name: 'Limburg' },
    { code: 'NL-NB', name: 'Noord-Brabant' }, { code: 'NL-NH', name: 'Noord-Holland' },
    { code: 'NL-OV', name: 'Overijssel' }, { code: 'NL-UT', name: 'Utrecht' },
    { code: 'NL-ZE', name: 'Zeeland' }, { code: 'NL-ZH', name: 'Zuid-Holland' },
  ],
  PL: [
    { code: 'PL-02', name: 'Dolnośląskie' }, { code: 'PL-04', name: 'Kujawsko-Pomorskie' },
    { code: 'PL-06', name: 'Lubelskie' }, { code: 'PL-08', name: 'Lubuskie' },
    { code: 'PL-10', name: 'Łódzkie' }, { code: 'PL-12', name: 'Małopolskie' },
    { code: 'PL-14', name: 'Mazowieckie' }, { code: 'PL-16', name: 'Opolskie' },
    { code: 'PL-18', name: 'Podkarpackie' }, { code: 'PL-20', name: 'Podlaskie' },
    { code: 'PL-22', name: 'Pomorskie' }, { code: 'PL-24', name: 'Śląskie' },
    { code: 'PL-26', name: 'Świętokrzyskie' }, { code: 'PL-28', name: 'Warmińsko-Mazurskie' },
    { code: 'PL-30', name: 'Wielkopolskie' }, { code: 'PL-32', name: 'Zachodniopomorskie' },
  ],
  GB: [
    { code: 'GB-ENG', name: 'England' }, { code: 'GB-NIR', name: 'Northern Ireland' },
    { code: 'GB-SCT', name: 'Scotland' }, { code: 'GB-WLS', name: 'Wales' },
  ],
  US: [
    { code: 'US-AL', name: 'Alabama' }, { code: 'US-AK', name: 'Alaska' },
    { code: 'US-AZ', name: 'Arizona' }, { code: 'US-AR', name: 'Arkansas' },
    { code: 'US-CA', name: 'California' }, { code: 'US-CO', name: 'Colorado' },
    { code: 'US-CT', name: 'Connecticut' }, { code: 'US-DE', name: 'Delaware' },
    { code: 'US-FL', name: 'Florida' }, { code: 'US-GA', name: 'Georgia' },
    { code: 'US-HI', name: 'Hawaii' }, { code: 'US-ID', name: 'Idaho' },
    { code: 'US-IL', name: 'Illinois' }, { code: 'US-IN', name: 'Indiana' },
    { code: 'US-IA', name: 'Iowa' }, { code: 'US-KS', name: 'Kansas' },
    { code: 'US-KY', name: 'Kentucky' }, { code: 'US-LA', name: 'Louisiana' },
    { code: 'US-ME', name: 'Maine' }, { code: 'US-MD', name: 'Maryland' },
    { code: 'US-MA', name: 'Massachusetts' }, { code: 'US-MI', name: 'Michigan' },
    { code: 'US-MN', name: 'Minnesota' }, { code: 'US-MS', name: 'Mississippi' },
    { code: 'US-MO', name: 'Missouri' }, { code: 'US-MT', name: 'Montana' },
    { code: 'US-NE', name: 'Nebraska' }, { code: 'US-NV', name: 'Nevada' },
    { code: 'US-NH', name: 'New Hampshire' }, { code: 'US-NJ', name: 'New Jersey' },
    { code: 'US-NM', name: 'New Mexico' }, { code: 'US-NY', name: 'New York' },
    { code: 'US-NC', name: 'North Carolina' }, { code: 'US-ND', name: 'North Dakota' },
    { code: 'US-OH', name: 'Ohio' }, { code: 'US-OK', name: 'Oklahoma' },
    { code: 'US-OR', name: 'Oregon' }, { code: 'US-PA', name: 'Pennsylvania' },
    { code: 'US-RI', name: 'Rhode Island' }, { code: 'US-SC', name: 'South Carolina' },
    { code: 'US-SD', name: 'South Dakota' }, { code: 'US-TN', name: 'Tennessee' },
    { code: 'US-TX', name: 'Texas' }, { code: 'US-UT', name: 'Utah' },
    { code: 'US-VT', name: 'Vermont' }, { code: 'US-VA', name: 'Virginia' },
    { code: 'US-WA', name: 'Washington' }, { code: 'US-WV', name: 'West Virginia' },
    { code: 'US-WI', name: 'Wisconsin' }, { code: 'US-WY', name: 'Wyoming' },
  ],
};

export function regionsForCountry(countryCode: string | null | undefined): Region[] {
  if (!countryCode) return [];
  return REGIONS[countryCode.toUpperCase()] ?? [];
}

export function regionName(code: string): string {
  const country = code.split('-')[0];
  return REGIONS[country]?.find((r) => r.code === code)?.name ?? code;
}

/** A region code is only accepted if it exists in our curated list. */
export function isValidRegion(code: string): boolean {
  const country = code.split('-')[0];
  return (REGIONS[country] ?? []).some((r) => r.code === code);
}
