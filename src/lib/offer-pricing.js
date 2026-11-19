// Offer pricing contract. Keep the three clients' offer-pricing.js copies in sync.
// tests/offer-pricing.test.ts checks the client copies against this implementation.

export function moneyMinor(value) {
  if (!Number.isFinite(value) || value < 0 || value > 100000) return NaN;
  return Math.round((value + Number.EPSILON) * 100);
}

function optionSnapshot(option, priceAdd) {
  return {
    ...(option.id && { id: option.id }),
    nameEn: option.nameEn || "",
    nameAr: option.nameAr || "",
    priceAdd,
  };
}

function sizeAddition(item, size) {
  const override = item.sizePriceAdd?.[size.id];
  return Number(override != null && override !== "" ? override : size.priceAdd ?? 0);
}

/** Resolve catalog prices and option snapshots from IDs, never client price additions. */
export function priceItem(item, selected, sizeOptions = [], extrasOptions = []) {
  if (!item || item.isActive === false) return null;
  const sizeId = selected.selectedSize?.id;
  const size = sizeOptions.find((entry) => entry.id === sizeId);
  if (item.availableSizes?.length ? (!size || !item.availableSizes.includes(sizeId)) : !!selected.selectedSize) return null;
  const sizeAdd = size ? sizeAddition(item, size) : 0;
  const cooking = item.cookingOptions?.find((entry) => entry.id === selected.selectedCookingOption?.id);
  if (item.cookingOptions?.length ? !cooking : !!selected.selectedCookingOption) return null;
  const extras = [];
  const seen = new Set();
  for (const selectedExtra of selected.selectedExtras || []) {
    const extra = extrasOptions.find((entry) => entry.id === selectedExtra.id);
    if (!extra || !item.availableExtras?.includes(extra.id) || seen.has(extra.id)) return null;
    seen.add(extra.id);
    extras.push(optionSnapshot(extra, extra.price));
  }
  const parts = [moneyMinor(item.price), moneyMinor(sizeAdd), moneyMinor(cooking?.priceAdd || 0), ...extras.map((extra) => moneyMinor(extra.priceAdd))];
  if (parts.some((part) => !Number.isFinite(part))) return null;
  return {
    price: parts.reduce((sum, part) => sum + part, 0) / 100,
    ...(size && { selectedSize: optionSnapshot(size, sizeAdd) }),
    ...(cooking && { selectedCookingOption: optionSnapshot(cooking, cooking.priceAdd || 0) }),
    ...(extras.length && { selectedExtras: extras }),
  };
}

/** Percentage offers use explicit customer choices; fixed bundles use the admin's sizes. */
export function offerDetails(offer, menuItems, sizeOptions = [], selectedSizes = {}) {
  const type = offer?.pricingType ?? "fixed";
  if (type !== "fixed" && type !== "percentage") return null;
  if (!Array.isArray(offer?.items) || !offer.items.length || offer.items.length > 50) return null;
  const lines = [];
  let originalMinor = 0;
  let units = 0;
  for (const [index, line] of offer.items.entries()) {
    const item = menuItems.find((entry) => entry.id === line.menuItemId);
    if (!item || item.isActive === false || !Number.isInteger(line.qty) || line.qty < 1 || line.qty > 999) return null;
    const sized = !!item.availableSizes?.length;
    const sizeId = type === "percentage" ? selectedSizes[index] : line.sizeId;
    const size = sizeOptions.find((entry) => entry.id === sizeId);
    if (sized ? (!size || !item.availableSizes.includes(sizeId)) : !!sizeId) return null;
    const sizeAdd = sized ? sizeAddition(item, size) : 0;
    const cooking = item.cookingOptions?.find((entry) => entry.isDefault) || item.cookingOptions?.[0];
    const parts = [moneyMinor(item.price), moneyMinor(sizeAdd), moneyMinor(cooking?.priceAdd || 0)];
    if (parts.some((part) => !Number.isFinite(part))) return null;
    const unitMinor = parts.reduce((sum, part) => sum + part, 0);
    originalMinor += unitMinor * line.qty;
    units += line.qty;
    if (units > 999) return null;
    lines.push({
      id: item.id,
      nameEn: item.nameEn || "",
      nameAr: item.nameAr || "",
      image: item.image || offer.image || "",
      offerLineIndex: index,
      baseQty: line.qty,
      unitMinor,
      ...(size && { selectedSize: optionSnapshot(size, sizeAdd) }),
      ...(cooking && { selectedCookingOption: optionSnapshot(cooking, cooking.priceAdd || 0) }),
    });
  }
  return { lines, originalMinor };
}

/** Largest-remainder allocation per unit; split a row when cents do not divide evenly. */
export function priceOffer(offer, menuItems, sizeOptions = [], selectedSizes = {}) {
  const details = offerDetails(offer, menuItems, sizeOptions, selectedSizes);
  const percent = offer?.discountPercent;
  const basisPoints = Math.round(percent * 100);
  const percentage = offer?.pricingType === "percentage";
  if (percentage && (!Number.isFinite(percent) || percent <= 0 || percent >= 100 || Math.abs(percent * 100 - basisPoints) > 0.000001)) return null;
  const totalMinor = percentage && details
    ? Math.round(details.originalMinor * (10000 - basisPoints) / 10000)
    : moneyMinor(offer?.offerPrice);
  if (!details || !Number.isFinite(totalMinor) || totalMinor <= 0 || totalMinor >= details.originalMinor) return null;
  const units = [];
  for (const line of details.lines) {
    for (let i = 0; i < line.baseQty; i++) {
      const numerator = line.unitMinor * totalMinor;
      units.push({ line, minor: Math.floor(numerator / details.originalMinor), remainder: numerator % details.originalMinor });
    }
  }
  const remaining = totalMinor - units.reduce((sum, unit) => sum + unit.minor, 0);
  [...units].sort((a, b) => b.remainder - a.remainder).slice(0, remaining).forEach((unit) => unit.minor++);
  const lines = [];
  for (const unit of units) {
    const existing = lines.find((line) => line.offerLineIndex === unit.line.offerLineIndex && line.price === unit.minor / 100);
    if (existing) existing.baseQty++;
    else lines.push({ ...unit.line, baseQty: 1, price: unit.minor / 100 });
  }
  const savingsMinor = details.originalMinor - totalMinor;
  return {
    lines,
    totalMinor,
    originalPrice: details.originalMinor / 100,
    offerPrice: totalMinor / 100,
    savings: savingsMinor / 100,
    discount: `${percentage ? percent : Math.round(savingsMinor / details.originalMinor * 100)}%`,
  };
}

/** Starting price for listings only. These choices never select sizes in the customer form. */
export function offerPreview(offer, menuItems, sizeOptions = [], selectedSizes = {}) {
  if (!Array.isArray(offer?.items)) return null;
  const choices = {};
  if (offer?.pricingType === "percentage") {
    for (const [index, line] of (offer.items || []).entries()) {
      const item = menuItems.find((entry) => entry.id === line.menuItemId);
      const sizes = sizeOptions.filter((size) => item?.availableSizes?.includes(size.id));
      sizes.sort((a, b) => sizeAddition(item, a) - sizeAddition(item, b));
      if (sizes[0]) choices[index] = sizes[0].id;
    }
  }
  return priceOffer(offer, menuItems, sizeOptions, { ...choices, ...selectedSizes });
}

/** Recover one size per configured row, including rows split for halala allocation. */
export function offerSizeChoices(lines) {
  const choices = {};
  for (const line of lines) {
    const index = line.offerLineIndex;
    const sizeId = line.selectedSize?.id || null;
    if (!Number.isInteger(index) || index < 0 || index >= 50 ||
      (Object.prototype.hasOwnProperty.call(choices, index) && choices[index] !== sizeId)) return null;
    choices[index] = sizeId;
  }
  return choices;
}
