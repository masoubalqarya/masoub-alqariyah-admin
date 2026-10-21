const ALADHAN_BASE = "https://api.aladhan.com/v1";

function cleanTime(value) {
  const match = /^(\d{2}):(\d{2})/.exec(value || "");
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) {
    throw new Error("Invalid prayer time returned by provider");
  }
  return `${match[1]}:${match[2]}`;
}

export async function fetchPrayerMonth(year, month, settings) {
  const url = new URL(`${ALADHAN_BASE}/calendarByCity/${year}/${month}`);
  url.searchParams.set("city", settings.prayerLocation.city);
  url.searchParams.set("country", settings.prayerLocation.country);
  url.searchParams.set("method", String(settings.prayerCalculationMethod));
  url.searchParams.set("timezonestring", "Asia/Riyadh");

  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`Prayer provider returned ${response.status}`);
  const body = await response.json();
  if (body.code !== 200 || !Array.isArray(body.data)) {
    throw new Error("Prayer provider returned invalid calendar data");
  }

  return new Map(
    body.data.map((day) => {
      const [date, monthPart, yearPart] = day.date.gregorian.date.split("-");
      return [
        `${yearPart}-${monthPart}-${date}`,
        {
          fajr: cleanTime(day.timings.Fajr),
          maghrib: cleanTime(day.timings.Maghrib),
        },
      ];
    }),
  );
}
