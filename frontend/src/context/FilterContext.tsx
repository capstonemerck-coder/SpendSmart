/**
 * FilterContext.tsx
 *
 * Manages cascading filter state for the Data Input module.
 * Supports Market → Brand → Indication filtering with metadata ID resolution.
 * Fetches all MetaData rows on mount and derives cascading options.
 * Exports FilterProvider and useFilters hook for scoped usage.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { reportsService } from '@/services/reports.service';
import type { MetaData } from '@/utils/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Filters {
  market: string | null;
  brand: string | null;
  indication: string | null;
  metadataId: number | null;
}

export interface IndicationOption {
  indication: string;
  metadata_id: number;
}

interface Options {
  markets: string[];
  brands: string[];
  indications: IndicationOption[];
  marketsLoading: boolean;
  brandsLoading: boolean;
  indicationsLoading: boolean;
}

interface FilterContextValue {
  filters: Filters;
  options: Options;
  setMarket: (value: string | null) => void;
  setBrand: (value: string | null) => void;
  setIndication: (value: string | null, metadataId: number | null) => void;
}

const FilterContext = createContext<FilterContextValue | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────

/**
 * FilterProvider
 *
 * Fetches all metadata on mount and manages cascading Market → Brand → Indication
 * state. Each setter resets downstream selections. Must wrap any component
 * that calls useFilters().
 */
export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [metadata, setMetadata] = useState<MetaData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [market, setMarketState]         = useState<string | null>(null);
  const [brand, setBrandState]           = useState<string | null>(null);
  const [indication, setIndicationState] = useState<string | null>(null);
  const [metadataId, setMetadataId]      = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setMetadata(await reportsService.metadata());
      } catch {
        setMetadata([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // Derive cascading lists from flat metadata array
  const markets = Array.from(
    new Set(metadata.filter((m) => m.market).map((m) => m.market!)),
  ).sort();

  const brands = market
    ? Array.from(
        new Set(metadata.filter((m) => m.market === market && m.brand).map((m) => m.brand!)),
      ).sort()
    : [];

  const indications: IndicationOption[] = market && brand
    ? metadata
        .filter((m) => m.market === market && m.brand === brand && m.indication)
        .map((m) => ({ indication: m.indication!, metadata_id: m.metadata_id }))
        .filter((v, i, arr) => arr.findIndex((x) => x.indication === v.indication) === i)
        .sort((a, b) => a.indication.localeCompare(b.indication))
    : [];

  // Setters cascade: market reset clears brand + indication, brand reset clears indication

  const setMarket = (value: string | null) => {
    setMarketState(value);
    setBrandState(null);
    setIndicationState(null);
    setMetadataId(null);
  };

  const setBrand = (value: string | null) => {
    setBrandState(value);
    setIndicationState(null);
    setMetadataId(null);
  };

  const setIndication = (value: string | null, mid: number | null) => {
    setIndicationState(value);
    setMetadataId(mid);
  };

  const value: FilterContextValue = {
    filters: { market, brand, indication, metadataId },
    options: {
      markets,
      brands,
      indications,
      // Single metadata fetch means all three loading states share the same flag
      marketsLoading: isLoading,
      brandsLoading: isLoading,
      indicationsLoading: isLoading,
    },
    setMarket,
    setBrand,
    setIndication,
  };

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
};

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useFilters
 *
 * Returns the FilterContext value with cascading filter state, derived option
 * lists, and setter functions. Must be used within a FilterProvider.
 *
 * @returns {FilterContextValue} Filter state, dropdown options, and setters.
 * @throws Will throw if used outside FilterProvider.
 */
export const useFilters = (): FilterContextValue => {
  const context = useContext(FilterContext);
  if (!context) throw new Error('useFilters must be used within a FilterProvider');
  return context;
};
