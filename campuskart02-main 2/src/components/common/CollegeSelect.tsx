import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../../config/firebase';
import { MapPin, School } from 'lucide-react';

export type CollegeSelectValue = {
  city: string;
  college: string;
};

type Props = {
  value: CollegeSelectValue;
  onChange: (val: CollegeSelectValue) => void;
  required?: boolean;
  labelCity?: string;
  labelCollege?: string;
  className?: string;
  showSearch?: boolean;
  // 'byCity' -> pick city then search college within, 'global' -> search across all cities
  searchMode?: 'byCity' | 'global';
  // If true, render a single-box combobox with suggestions (global search)
  comboMode?: boolean;
};

export const CollegeSelect: React.FC<Props> = ({
  value,
  onChange,
  required = false,
  labelCity = 'City',
  labelCollege = 'College',
  className,
  showSearch = true,
  searchMode = 'byCity',
  comboMode = false,
}) => {
  const [cities, setCities] = useState<string[]>([]);
  const [colleges, setColleges] = useState<string[]>([]);
  const [allColleges, setAllColleges] = useState<{ city: string; name: string }[]>([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Load cities list and aggregate all colleges
  useEffect(() => {
    const collegesRef = ref(database, 'colleges');
    const unsub = onValue(collegesRef, (snap) => {
      if (!snap.exists()) {
        setCities([]);
        setAllColleges([]);
        return;
      }
      const data = snap.val();
      const cityKeys = Object.keys(data);
      setCities(cityKeys);
      // flatten all colleges for global mode
      const agg: { city: string; name: string }[] = [];
      cityKeys.forEach((city) => {
        const cityObj = data[city] || {};
        Object.keys(cityObj).forEach((k) => {
          const name = cityObj[k]?.name || cityObj[k];
          if (name) agg.push({ city, name });
        });
      });
      setAllColleges(agg);
    });
    return () => unsub();
  }, []);

  // Load colleges when city changes
  useEffect(() => {
    if (!value.city) {
      setColleges([]);
      return;
    }
    const cityRef = ref(database, `colleges/${value.city}`);
    const unsub = onValue(cityRef, (snap) => {
      if (!snap.exists()) {
        setColleges([]);
        return;
      }
      const data = snap.val();
      const list = Object.keys(data).map((k) => data[k]?.name || data[k]);
      setColleges(list);
    });
    return () => unsub();
  }, [value.city]);

  const filteredGlobal = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allColleges;
    return allColleges.filter((c) => c.name.toLowerCase().startsWith(q));
  }, [allColleges, query]);

  const filteredByCity = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return colleges;
    return colleges.filter((c) => c.toLowerCase().startsWith(q));
  }, [colleges, query]);

  // Initialize query from value when it changes
  useEffect(() => {
    if (value.college) setQuery(value.college);
  }, [value.college]);

  // ComboBox: single input with dropdown suggestions
  if (comboMode) {
    return (
      <div className={className}>
        <label className="block text-sm font-medium text-gray-700 mb-1">{labelCollege}{required ? ' *' : ''}</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <School className="h-5 w-5 text-gray-400" />
          </div>
          <input
            ref={inputRef}
            type="text"
            required={required}
            placeholder="Search college..."
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setHighlight(0);
              // Clear selection if user edits
              if (value.college !== e.target.value) onChange({ city: '', college: '' });
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
                setOpen(true);
                return;
              }
              const max = Math.max(filteredGlobal.length - 1, 0);
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlight((h) => Math.min(h + 1, max));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlight((h) => Math.max(h - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                const picked = filteredGlobal[highlight];
                if (picked) {
                  onChange({ city: picked.city, college: picked.name });
                  setQuery(picked.name);
                  setOpen(false);
                }
              } else if (e.key === 'Escape') {
                setOpen(false);
              }
            }}
            aria-autocomplete="list"
            aria-expanded={open}
            role="combobox"
          />
          {open && filteredGlobal.length > 0 && (
            <ul
              role="listbox"
              className="absolute z-10 mt-1 w-full max-h-56 overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
            >
              {filteredGlobal.map((c, idx) => (
                <li
                  key={`${c.city}-${c.name}`}
                  role="option"
                  aria-selected={idx === highlight}
                  className={`${idx === highlight ? 'bg-blue-50' : ''} cursor-pointer select-none px-3 py-2 text-sm text-gray-700 flex justify-between`}
                  onMouseEnter={() => setHighlight(idx)}
                  onMouseDown={(e) => {
                    // prevent input blur before click handler
                    e.preventDefault();
                  }}
                  onClick={() => {
                    onChange({ city: c.city, college: c.name });
                    setQuery(c.name);
                    setOpen(false);
                    inputRef.current?.blur();
                  }}
                >
                  <span>{c.name}</span>
                  <span className="text-xs text-gray-400">{c.city}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  if (searchMode === 'global') {
    // Global search UI: search box + select of results labeled with city
    return (
      <div className={className}>
        <label className="block text-sm font-medium text-gray-700 mb-1">{labelCollege}{required ? ' *' : ''}</label>
        {showSearch && (
          <input
            type="text"
            placeholder="Search college..."
            className="mb-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <School className="h-5 w-5 text-gray-400" />
          </div>
          <select
            required={required}
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            value={value.college}
            onChange={(e) => {
              const picked = filteredGlobal.find((c) => c.name === e.target.value);
              if (picked) onChange({ city: picked.city, college: picked.name });
              else onChange({ city: '', college: '' });
            }}
          >
            <option value="">Select College</option>
            {filteredGlobal.map((c) => (
              <option key={`${c.city}-${c.name}`} value={c.name}>{c.name} — {c.city}</option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  // Default byCity UI
  return (
    <div className={className}>
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">{labelCity}{required ? ' *' : ''}</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MapPin className="h-5 w-5 text-gray-400" />
          </div>
          <select
            required={required}
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            value={value.city}
            onChange={(e) => onChange({ city: e.target.value, college: '' })}
          >
            <option value="">Select City</option>
            {cities.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>
      </div>

      {value.city && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{labelCollege}{required ? ' *' : ''}</label>
          {showSearch && (
            <input
              type="text"
              placeholder="Search college..."
              className="mb-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          )}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <School className="h-5 w-5 text-gray-400" />
            </div>
            <select
              required={required}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={value.college}
              onChange={(e) => onChange({ city: value.city, college: e.target.value })}
            >
              <option value="">Select College</option>
              {filteredByCity.map((col) => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollegeSelect;
