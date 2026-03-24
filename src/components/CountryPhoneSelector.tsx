import React, { useState } from 'react';
import { ChevronDown, Phone } from 'lucide-react';
import { COUNTRIES, Country } from '../lib/countries';

interface CountryPhoneSelectorProps {
  selectedCountry: Country | null;
  onCountrySelect: (country: Country) => void;
  phoneNumber: string;
  onPhoneChange: (phone: string) => void;
}

export default function CountryPhoneSelector({
  selectedCountry,
  onCountrySelect,
  phoneNumber,
  onPhoneChange,
}: CountryPhoneSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const sortedCountries = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
  const filteredCountries = searchQuery
    ? sortedCountries.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.phoneCode.includes(searchQuery)
      )
    : sortedCountries;

  return (
    <div>
      <label className="block text-sm font-semibold text-slate-200 mb-2">Phone Number</label>

      {/* Mobile Layout: 2 rows */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
        {/* Country Selector */}
        <div className="relative flex-1 sm:min-w-48">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full px-4 py-3 bg-slate-700/40 border border-slate-600/50 rounded-lg text-white font-semibold flex items-center justify-between hover:border-slate-500 transition-all gap-2"
          >
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400" />
              <span className="text-sm">Country Code</span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {isOpen && (
            <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-50 max-h-72 overflow-hidden flex flex-col min-w-72">
              <input
                type="text"
                placeholder="Search countries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-2 bg-slate-700/50 border-b border-slate-600 text-white placeholder-slate-400 text-sm focus:outline-none"
              />
              <div className="overflow-y-auto">
                {filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => {
                      onCountrySelect(country);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center gap-4 text-sm transition-colors ${
                      selectedCountry?.code === country.code
                        ? 'bg-rose-500/30 text-white'
                        : 'text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span className="w-16 text-left">{country.phoneCode}</span>
                    <span className="flex-1">{country.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Phone Code Display */}
        <div className="hidden sm:flex items-center px-4 py-3 bg-slate-700/40 border border-slate-600/50 rounded-lg text-white font-semibold text-sm sm:flex-shrink-0">
          {selectedCountry?.phoneCode || '+'}
        </div>

        {/* Phone Number Input */}
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => {
            onPhoneChange(e.target.value);
          }}
          placeholder="701234567"
          className="hidden sm:block flex-1 px-4 py-3 bg-slate-700/40 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-rose-400 focus:border-rose-400/50 transition-all"
        />
      </div>

      {/* Mobile Layout: Phone Code + Input Row (below country selector) */}
      <div className="w-full flex gap-2 sm:hidden mt-2 overflow-hidden">
        {/* Phone Code Display */}
        <div className="flex items-center px-3 py-3 bg-slate-700/40 border border-slate-600/50 rounded-lg text-white font-semibold text-sm flex-shrink-0">
          {selectedCountry?.phoneCode || '+'}
        </div>

        {/* Phone Number Input */}
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => {
            onPhoneChange(e.target.value);
          }}
          placeholder="701234567"
          className="min-w-0 flex-1 px-4 py-3 bg-slate-700/40 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-rose-400 focus:border-rose-400/50 transition-all"
        />
      </div>
    </div>
  );
}
