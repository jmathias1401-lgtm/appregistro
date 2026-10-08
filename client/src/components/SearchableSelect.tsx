import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';

export interface SelectOption {
  id: number | string;
  nombre: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(opt => String(opt.id) === String(value));

  const filteredOptions = options.filter(opt =>
    opt.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleSelect = (optionId: number | string) => {
    onChange(String(optionId));
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div
      ref={containerRef}
      className={`searchable-select-container ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
    >
      <div
        className="searchable-select-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={e => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          } else if (e.key === 'Escape') {
            setIsOpen(false);
          }
        }}
      >
        <span className={`selected-text ${!selectedOption ? 'placeholder' : ''}`}>
          {selectedOption ? selectedOption.nombre : placeholder}
        </span>
        <div className="trigger-actions">
          {selectedOption && !disabled && (
            <button
              type="button"
              className="clear-btn"
              onClick={handleClear}
              title="Limpiar selección"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown size={18} className={`chevron-icon ${isOpen ? 'up' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="searchable-select-dropdown">
          <div className="searchable-select-search">
            <Search size={16} className="search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onClick={e => e.stopPropagation()}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  setIsOpen(false);
                }
              }}
            />
            {searchTerm && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchTerm('')}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <ul className="searchable-select-options">
            <li
              className={`searchable-select-option ${!value ? 'selected' : ''}`}
              onClick={() => handleSelect('')}
            >
              <span>Seleccionar...</span>
              {!value && <Check size={16} />}
            </li>
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => {
                const isSelected = String(option.id) === String(value);
                return (
                  <li
                    key={option.id}
                    className={`searchable-select-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(option.id)}
                  >
                    <span>{option.nombre}</span>
                    {isSelected && <Check size={16} />}
                  </li>
                );
              })
            ) : (
              <li className="searchable-select-empty">
                No se encontraron resultados
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
