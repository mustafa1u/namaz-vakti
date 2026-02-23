export type CountryId = "usa" | "turkiye";
export type StateProvinceId = "nj" | "dc" | "ny" | "il" | "tx" | "ca" | "pa" | "md" | "ankara" | "istanbul" | "aydin";
export type CityId = "paterson" | "washington" | "new-york-city" | "chicago" | "houston" | "dallas" | "fresno" | "harrisburg" | "irvine" | "ithaca" | "los-angeles" | "new-brunswick" | "newark" | "philadelphia" | "pittsburgh" | "rochester" | "san-antonio" | "san-francisco" | "syracuse" | "lanham" | "cankaya" | "kadikoy" | "aydin";

export type LocationSelection = {
  countryId: CountryId;
  stateId: StateProvinceId;
  cityId: CityId;
};

type LocationEntry = LocationSelection & {
  countryLabel: string;
  stateLabel: string;
  cityLabel: string;
  scheduleFolder: string;
};

type Option<T extends string> = {
  id: T;
  label: string;
};

const SCHEDULES_BASE_FOLDER = "assets/schedules/2026";

const LOCATION_ENTRIES: LocationEntry[] = [
  {
    countryId: "usa",
    countryLabel: "USA",
    stateId: "nj",
    stateLabel: "NJ",
    cityId: "paterson",
    cityLabel: "Paterson",
    scheduleFolder: "Paterson-NJ"
  },
  {
    countryId: "usa",
    countryLabel: "USA",
    stateId: "dc",
    stateLabel: "DC",
    cityId: "washington",
    cityLabel: "Washington",
    scheduleFolder: "Washington-DC"
  },
  {
    countryId: "usa",
    countryLabel: "USA",
    stateId: "ny",
    stateLabel: "NY",
    cityId: "new-york-city",
    cityLabel: "New York City",
    scheduleFolder: "New York City-NY"
  },
  {
    countryId: "usa",
    countryLabel: "USA",
    stateId: "il",
    stateLabel: "IL",
    cityId: "chicago",
    cityLabel: "Chicago",
    scheduleFolder: "Chicago-IL"
  },
  {
    countryId: "usa",
    countryLabel: "USA",
    stateId: "tx",
    stateLabel: "TX",
    cityId: "houston",
    cityLabel: "Houston",
    scheduleFolder: "Houston-TX"
  },
  {
    countryId: "usa",
    countryLabel: "USA",
    stateId: "tx",
    stateLabel: "TX",
    cityId: "dallas",
    cityLabel: "Dallas",
    scheduleFolder: "Dallas-TX"
  },
  {
    countryId: "usa",
    countryLabel: "USA",
    stateId: "ca",
    stateLabel: "CA",
    cityId: "fresno",
    cityLabel: "Fresno",
    scheduleFolder: "Fresno-CA"
  },
  {
    countryId: "usa",
    countryLabel: "USA",
    stateId: "pa",
    stateLabel: "PA",
    cityId: "harrisburg",
    cityLabel: "Harrisburg",
    scheduleFolder: "Harrisburg-PA"
  },
  {
    countryId: "usa",
    countryLabel: "USA",
    stateId: "ca",
    stateLabel: "CA",
    cityId: "irvine",
    cityLabel: "Irvine",
    scheduleFolder: "Irvine-CA"
  },
  {
    countryId: "usa",
    countryLabel: "USA",
    stateId: "ny",
    stateLabel: "NY",
    cityId: "ithaca",
    cityLabel: "Ithaca",
    scheduleFolder: "Ithaca-NY"
  },
  {
    countryId: "usa",
    countryLabel: "USA",
    stateId: "ca",
    stateLabel: "CA",
    cityId: "los-angeles",
    cityLabel: "Los Angeles",
    scheduleFolder: "Los Angeles-CA"
  },
  {
    countryId: "usa",
    countryLabel: "USA",
    stateId: "nj",
    stateLabel: "NJ",
    cityId: "new-brunswick",
    cityLabel: "New Brunswick",
    scheduleFolder: "New Brunswick-NJ"
  },
  {
    countryId: "usa",
    countryLabel: "USA",
    stateId: "nj",
    stateLabel: "NJ",
    cityId: "newark",
    cityLabel: "Newark",
    scheduleFolder: "Newark-NJ"
  },
  {
    countryId: "usa",
    countryLabel: "USA",
    stateId: "pa",
    stateLabel: "PA",
    cityId: "philadelphia",
    cityLabel: "Philadelphia",
    scheduleFolder: "Philadelphia-PA"
  },
  {
    countryId: "usa",
    countryLabel: "USA",
    stateId: "pa",
    stateLabel: "PA",
    cityId: "pittsburgh",
    cityLabel: "Pittsburgh",
    scheduleFolder: "Pittsburgh-PA"
  },
  {
    countryId: "usa",
    countryLabel: "USA",
    stateId: "ny",
    stateLabel: "NY",
    cityId: "rochester",
    cityLabel: "Rochester",
    scheduleFolder: "Rochester-NY"
  },
  {
    countryId: "usa",
    countryLabel: "USA",
    stateId: "tx",
    stateLabel: "TX",
    cityId: "san-antonio",
    cityLabel: "San Antonio",
    scheduleFolder: "San Antonio-TX"
  },
  {
    countryId: "usa",
    countryLabel: "USA",
    stateId: "ca",
    stateLabel: "CA",
    cityId: "san-francisco",
    cityLabel: "San Francisco",
    scheduleFolder: "San Francisco-CA"
  },
  {
    countryId: "usa",
    countryLabel: "USA",
    stateId: "ny",
    stateLabel: "NY",
    cityId: "syracuse",
    cityLabel: "Syracuse",
    scheduleFolder: "Syracuse-NY"
  },
  {
    countryId: "usa",
    countryLabel: "USA",
    stateId: "md",
    stateLabel: "MD",
    cityId: "lanham",
    cityLabel: "Lanham",
    scheduleFolder: "Lanham-MD"
  },
  {
    countryId: "turkiye",
    countryLabel: "Turkiye",
    stateId: "ankara",
    stateLabel: "Ankara",
    cityId: "cankaya",
    cityLabel: "\u00C7ankaya",
    scheduleFolder: "\u00C7ankaya-Ankara"
  },
  {
    countryId: "turkiye",
    countryLabel: "Turkiye",
    stateId: "istanbul",
    stateLabel: "\u0130stanbul",
    cityId: "kadikoy",
    cityLabel: "Kad\u0131koy",
    scheduleFolder: "Kad\u0131koy-\u0130stanbul"
  },
  {
    countryId: "turkiye",
    countryLabel: "Turkiye",
    stateId: "aydin",
    stateLabel: "Ayd\u0131n",
    cityId: "aydin",
    cityLabel: "Ayd\u0131n",
    scheduleFolder: "Ayd\u0131n-Ayd\u0131n"
  }
];

export const DEFAULT_LOCATION_SELECTION: LocationSelection = {
  countryId: "usa",
  stateId: "nj",
  cityId: "paterson"
};

export function getCountryOptions(): Option<CountryId>[] {
  const out: Option<CountryId>[] = [];
  const seen = new Set<CountryId>();

  for (const entry of LOCATION_ENTRIES) {
    if (seen.has(entry.countryId)) {
      continue;
    }
    seen.add(entry.countryId);
    out.push({ id: entry.countryId, label: entry.countryLabel });
  }

  return out;
}

export function getStateOptions(countryId: CountryId): Option<StateProvinceId>[] {
  const out: Option<StateProvinceId>[] = [];
  const seen = new Set<StateProvinceId>();

  for (const entry of LOCATION_ENTRIES) {
    if (entry.countryId !== countryId || seen.has(entry.stateId)) {
      continue;
    }
    seen.add(entry.stateId);
    out.push({ id: entry.stateId, label: entry.stateLabel });
  }

  return out;
}

export function getCityOptions(countryId: CountryId, stateId: StateProvinceId): Option<CityId>[] {
  return LOCATION_ENTRIES
    .filter((entry) => entry.countryId === countryId && entry.stateId === stateId)
    .map((entry) => ({ id: entry.cityId, label: entry.cityLabel }));
}

export function normalizeLocationSelection(
  input: Partial<LocationSelection> | null | undefined
): LocationSelection {
  const countryIds = getCountryOptions().map((item) => item.id);
  const countryId = countryIds.includes((input?.countryId ?? "") as CountryId)
    ? (input?.countryId as CountryId)
    : DEFAULT_LOCATION_SELECTION.countryId;

  const stateIds = getStateOptions(countryId).map((item) => item.id);
  const stateId = stateIds.includes((input?.stateId ?? "") as StateProvinceId)
    ? (input?.stateId as StateProvinceId)
    : (stateIds[0] ?? DEFAULT_LOCATION_SELECTION.stateId);

  const cityIds = getCityOptions(countryId, stateId).map((item) => item.id);
  const cityId = cityIds.includes((input?.cityId ?? "") as CityId)
    ? (input?.cityId as CityId)
    : (cityIds[0] ?? DEFAULT_LOCATION_SELECTION.cityId);

  const found = LOCATION_ENTRIES.find((entry) =>
    entry.countryId === countryId
    && entry.stateId === stateId
    && entry.cityId === cityId
  );

  if (!found) {
    return { ...DEFAULT_LOCATION_SELECTION };
  }

  return {
    countryId: found.countryId,
    stateId: found.stateId,
    cityId: found.cityId
  };
}

export function getLocationLabels(selection: LocationSelection): {
  country: string;
  state: string;
  city: string;
} {
  const found = findLocation(selection);
  return {
    country: found?.countryLabel ?? "",
    state: found?.stateLabel ?? "",
    city: found?.cityLabel ?? ""
  };
}

export function getScheduleFolderPath(selection: LocationSelection): string {
  const found = findLocation(selection);
  const folder = found?.scheduleFolder ?? findLocation(DEFAULT_LOCATION_SELECTION)?.scheduleFolder ?? "Paterson-NJ";
  return `${SCHEDULES_BASE_FOLDER}/${folder}`;
}

function findLocation(selection: LocationSelection): LocationEntry | undefined {
  return LOCATION_ENTRIES.find((entry) =>
    entry.countryId === selection.countryId
    && entry.stateId === selection.stateId
    && entry.cityId === selection.cityId
  );
}
