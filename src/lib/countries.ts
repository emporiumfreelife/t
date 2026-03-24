export interface Country {
  name: string;
  code: string;
  flag: string;
  phoneCode: string;
  regions: string[];
}

export const COUNTRIES: Country[] = [
  {
    name: 'Uganda',
    code: 'UG',
    flag: '🇺🇬',
    phoneCode: '+256',
    regions: ['Kampala', 'Wakiso', 'Mukono', 'Jinja', 'Tororo', 'Gulu', 'Mbarara', 'Fort Portal', 'Masaka', 'Kabale'],
  },
  {
    name: 'Kenya',
    code: 'KE',
    flag: '🇰🇪',
    phoneCode: '+254',
    regions: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Kericho', 'Migori', 'Nyeri', 'Thika', 'Isiolo'],
  },
  {
    name: 'Tanzania',
    code: 'TZ',
    flag: '🇹🇿',
    phoneCode: '+255',
    regions: ['Dar es Salaam', 'Dodoma', 'Mwanza', 'Arusha', 'Mbeya', 'Morogoro', 'Zanzibar', 'Tanga', 'Iringa', 'Kigali'],
  },
  {
    name: 'Ghana',
    code: 'GH',
    flag: '🇬🇭',
    phoneCode: '+233',
    regions: ['Accra', 'Kumasi', 'Sekondi', 'Tamale', 'Cape Coast', 'Tema', 'Legon', 'Takoradi', 'Koforidua', 'Obuasi'],
  },
  {
    name: 'Nigeria',
    code: 'NG',
    flag: '🇳🇬',
    phoneCode: '+234',
    regions: ['Lagos', 'Ibadan', 'Kano', 'Abuja', 'Port Harcourt', 'Enugu', 'Kaduna', 'Aba', 'Benin City', 'Ilorin'],
  },
  {
    name: 'Rwanda',
    code: 'RW',
    flag: '🇷🇼',
    phoneCode: '+250',
    regions: ['Kigali', 'Butare', 'Gitarama', 'Ruhengeri', 'Cyangugu', 'Kibuye', 'Muhanga', 'Nyanza', 'Rusizi', 'Musanze'],
  },
  {
    name: 'Burundi',
    code: 'BI',
    flag: '🇧🇮',
    phoneCode: '+257',
    regions: ['Bujumbura', 'Gitega', 'Ngozi', 'Muyinga', 'Kirundo', 'Kayanza', 'Ruyigi', 'Makamba', 'Bubanza', 'Muramvya'],
  },
  {
    name: 'South Sudan',
    code: 'SS',
    flag: '🇸🇸',
    phoneCode: '+211',
    regions: ['Juba', 'Malakal', 'Wau', 'Bentiu', 'Kassala', 'Torit', 'Rumbek', 'Yei', 'Renk', 'Bor'],
  },
  {
    name: 'Sudan',
    code: 'SD',
    flag: '🇸🇩',
    phoneCode: '+249',
    regions: ['Khartoum', 'Omdurman', 'Port Sudan', 'Kassala', 'Gedaref', 'Nyala', 'El Fasher', 'Ed Daein', 'Renk', 'Singa'],
  },
  {
    name: 'Ethiopia',
    code: 'ET',
    flag: '🇪🇹',
    phoneCode: '+251',
    regions: ['Addis Ababa', 'Dire Dawa', 'Adama', 'Mekelle', 'Hawassa', 'Bahir Dar', 'Jimma', 'Arba Minch', 'Jijiga', 'Dese'],
  },
  {
    name: 'Democratic Republic of Congo',
    code: 'CD',
    flag: '🇨🇩',
    phoneCode: '+243',
    regions: ['Kinshasa', 'Lubumbashi', 'Mbuji-Mayi', 'Kananga', 'Tshikapa', 'Likasi', 'Kolwezi', 'Bukavu', 'Goma', 'Matadi'],
  },
  {
    name: 'South Africa',
    code: 'ZA',
    flag: '🇿🇦',
    phoneCode: '+27',
    regions: ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth', 'Bloemfontein', 'Nelspruit', 'East London', 'Kimberley', 'Polokwane'],
  },
  {
    name: 'United Kingdom',
    code: 'GB',
    flag: '🇬🇧',
    phoneCode: '+44',
    regions: ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Liverpool', 'Newcastle', 'Bristol', 'Coventry', 'Leicester'],
  },
  {
    name: 'United States',
    code: 'US',
    flag: '🇺🇸',
    phoneCode: '+1',
    regions: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'],
  },
  {
    name: 'Canada',
    code: 'CA',
    flag: '🇨🇦',
    phoneCode: '+1',
    regions: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg', 'Quebec City', 'Hamilton', 'Kitchener'],
  },
];

export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

export function getCountryByPhoneCode(phoneCode: string): Country | undefined {
  return COUNTRIES.find((c) => c.phoneCode === phoneCode);
}

export function sortCountriesByName(): Country[] {
  return [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
}
