"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import {
  COOKIE_KEYS,
  COOKIE_MAX_AGE_YEAR_SECONDS,
} from "@/shared/config/cookies.constant";
import type {
  TFilter,
  TSortBy,
  TViewMode,
} from "../interfaces/filter.interface";

interface IFiltersContext {
  filter: TFilter;
  sortBy: TSortBy;
  viewMode: TViewMode;
  setFilter: (value: TFilter) => void;
  setSortBy: (value: TSortBy) => void;
  setViewMode: (value: TViewMode) => void;
}

interface IFiltersProviderProps {
  children: ReactNode;
  defaultFilter?: TFilter;
  defaultSortBy?: TSortBy;
  defaultViewMode?: TViewMode;
}

const FiltersContext = createContext<IFiltersContext | null>(null);

// Записать persistent cookie с year-сроком.
function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value};path=/;max-age=${COOKIE_MAX_AGE_YEAR_SECONDS}`;
}

// Провайдер фильтров досок с сохранением в cookies.
export function FiltersProvider({
  children,
  defaultFilter = "all",
  defaultSortBy = "last_created",
  defaultViewMode = "list",
}: IFiltersProviderProps) {
  const [filter, setFilterState] = useState<TFilter>(defaultFilter);
  const [sortBy, setSortByState] = useState<TSortBy>(defaultSortBy);
  const [viewMode, setViewModeState] = useState<TViewMode>(defaultViewMode);

  const setFilter = (value: TFilter) => {
    setFilterState(value);
    setCookie(COOKIE_KEYS.BOARD_FILTER, value);
  };

  const setSortBy = (value: TSortBy) => {
    setSortByState(value);
    setCookie(COOKIE_KEYS.BOARD_SORT, value);
  };

  const setViewMode = (value: TViewMode) => {
    setViewModeState(value);
    setCookie(COOKIE_KEYS.BOARD_VIEW_MODE, value);
  };

  return (
    <FiltersContext.Provider
      value={{ filter, sortBy, viewMode, setFilter, setSortBy, setViewMode }}
    >
      {children}
    </FiltersContext.Provider>
  );
}

// Хук-getter контекста фильтров. Бросает, если вне провайдера.
export function useFilters() {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error("useFilters must be used within FiltersProvider");
  return ctx;
}
