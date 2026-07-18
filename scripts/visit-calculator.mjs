export const FREQUENCIES = Object.freeze({
  daily: { label: "Daily", annualVisits: 365 },
  weekly: { label: "Weekly", annualVisits: 52 },
  monthly: { label: "Monthly", annualVisits: 12 },
  quarterly: { label: "Quarterly", annualVisits: 4 },
  fewTimesYear: { label: "A few times a year", annualVisits: 4 },
  twiceYear: { label: "Twice a year", annualVisits: 2 },
  onceYear: { label: "Once a year", annualVisits: 1 },
  rarely: { label: "Rarely", annualVisits: 0.5 },
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function interpolateAge(table, age) {
  if (!table || typeof table !== "object") return 0;

  const safeAge = clamp(Number(age), 0, 100);
  const integerAge = Math.floor(safeAge);
  const ageKey = String(integerAge);

  // Keep the Dart service's exact-match behavior for the integer ages in the
  // shipped table. Regional tables have five-year gaps after age five.
  if (Object.prototype.hasOwnProperty.call(table, ageKey)) {
    return Number(table[ageKey]);
  }

  const ages = Object.keys(table)
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  if (ages.length === 0) return 0;
  if (safeAge <= ages[0]) return Number(table[String(ages[0])]);
  if (safeAge >= ages[ages.length - 1]) return Number(table[String(ages[ages.length - 1])]);

  let lowerAge = ages[0];
  let upperAge = ages[ages.length - 1];
  ages.forEach((candidate) => {
    if (candidate <= safeAge) lowerAge = candidate;
    if (candidate >= safeAge && candidate < upperAge) upperAge = candidate;
  });

  if (lowerAge === upperAge) return Number(table[String(lowerAge)]);

  const lowerValue = Number(table[String(lowerAge)]);
  const upperValue = Number(table[String(upperAge)]);
  const fraction = (safeAge - lowerAge) / (upperAge - lowerAge);
  return lowerValue + (upperValue - lowerValue) * fraction;
}

export function getRemainingYears(data, age, region) {
  const selectedRegion = region && region !== "global" ? data?.regions?.[region] : null;
  const table = selectedRegion || data?.global;
  return interpolateAge(table, age);
}

export function ageAdjustedLifeExpectancy(data, age, region) {
  const currentAge = Number(age);
  const dataLifeExpectancy = currentAge + getRemainingYears(data, currentAge, region);

  if (currentAge >= 75) {
    return Math.max(dataLifeExpectancy, currentAge + 5, 80);
  }
  if (currentAge >= 60) {
    return clamp(dataLifeExpectancy, 0, 83);
  }
  return clamp(dataLifeExpectancy, 0, 85);
}

export function calculateEstimate({ data, age, region = "global", frequency = "weekly" }) {
  if (!data) throw new Error("Life expectancy data is unavailable.");

  const currentAge = Number(age);
  const frequencyData = FREQUENCIES[frequency];
  if (!Number.isFinite(currentAge) || currentAge < 18 || currentAge > 100 || !frequencyData) {
    throw new Error("Please enter an age from 18 to 100 and choose a visit frequency.");
  }

  const totalLifeExpectancy = ageAdjustedLifeExpectancy(data, currentAge, region);
  const remainingYears = Math.max(0, totalLifeExpectancy - currentAge);
  const remainingVisits = Math.max(0, Math.floor(remainingYears * frequencyData.annualVisits));
  const lifetimeVisits = Math.floor(totalLifeExpectancy * frequencyData.annualVisits);
  const estimatedPastVisits = Math.max(0, lifetimeVisits - remainingVisits);
  const consumedFraction = lifetimeVisits > 0
    ? clamp(1 - remainingVisits / lifetimeVisits, 0, 1)
    : 0;

  return {
    age: currentAge,
    region: region && data.regions?.[region] ? region : "global",
    frequency,
    remainingYears,
    remainingVisits,
    lifetimeVisits,
    estimatedPastVisits,
    consumedFraction,
    mode: "realistic",
  };
}

export function regionFromLocale(locale = "") {
  const match = String(locale).match(/[-_]([A-Za-z]{2})$/);
  return match ? match[1].toUpperCase() : "global";
}

function setError(element, message) {
  if (element) element.textContent = message;
}

function setResult(result, estimate, data) {
  const count = estimate.remainingVisits;
  document.querySelector("#result-count").textContent = count.toLocaleString("en-US");
  document.querySelector("#result-headline").textContent = `Based on averages, you may share roughly ${count.toLocaleString("en-US")} more visits.`;
  document.querySelector("#result-reassurance").textContent = count < 10
    ? "Every visit matters. We hope you have many more."
    : "We hope you have many more.";
  document.querySelector("#result-source").textContent = `Source: ${data.metadata?.source || "bundled population averages"}.`;
  window.CountedEclipse?.set(document.querySelector(".eclipse-result"), estimate.consumedFraction, true);
}

function resetCalculator(form, result, error) {
  form.reset();
  document.querySelector("#age").value = "60";
  document.querySelector("#frequency").value = "weekly";
  document.querySelector("#region").value = "global";
  result.hidden = true;
  setError(error, "");
  document.querySelector("#age-error").textContent = "";
}

function initCalculator() {
  const data = window.CountedLifeExpectancyData;
  const form = document.querySelector("#visit-calculator-form");
  if (!form) return;

  const result = document.querySelector("#calculator-result");
  const fallback = document.querySelector("#calculator-fallback");
  const error = document.querySelector("#calculator-error");
  const ageInput = document.querySelector("#age");
  const ageError = document.querySelector("#age-error");
  const retry = document.querySelector("#calculator-retry");

  if (!data) {
    form.hidden = true;
    fallback.hidden = false;
    retry?.addEventListener("click", () => window.location.reload());
    return;
  }

  const localeRegion = regionFromLocale(navigator.language);
  if ([...document.querySelector("#region").options].some((option) => option.value === localeRegion)) {
    document.querySelector("#region").value = localeRegion;
  }

  ageInput.addEventListener("input", () => {
    if (ageInput.validity.valid) setError(ageError, "");
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    setError(error, "");
    setError(ageError, "");

    const age = Number(ageInput.value);
    if (!Number.isInteger(age) || age < 18 || age > 100) {
      setError(ageError, "Enter a whole-number age from 18 to 100.");
      ageInput.focus();
      return;
    }

    try {
      const estimate = calculateEstimate({
        data,
        age,
        region: document.querySelector("#region").value,
        frequency: document.querySelector("#frequency").value,
      });
      setResult(result, estimate, data);
      result.hidden = false;
      result.focus({ preventScroll: true });
    } catch (calculationError) {
      setError(error, calculationError.message || "We couldn't make that estimate yet.");
    }
  });

  document.querySelector("#try-again")?.addEventListener("click", () => {
    resetCalculator(form, result, error);
    ageInput.focus();
  });
}

if (typeof document !== "undefined") initCalculator();
