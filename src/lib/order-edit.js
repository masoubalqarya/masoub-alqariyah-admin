export const changeId = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
export function createdMillis(order) {
  return typeof order.createdAt === "number" ? order.createdAt : order.createdAt?.toMillis?.() || (order.createdAt?.seconds || 0) * 1000;
}
export function changeSeconds(order, now = Date.now()) {
  return order.status === "pending" && !order.preparationStartedAt ? Math.min(60, Math.max(0, Math.ceil((createdMillis(order) + 60000 - now) / 1000))) : 0;
}
export function editGroups(order) {
  const groups = [];
  order.items.forEach((item, index) => {
    const key = item.offerGroupId || `line-${index}`;
    let group = groups.find((entry) => entry.key === key);
    if (!group) { group = { key, nameAr: item.offerTitleAr || item.nameAr, nameEn: item.offerTitleEn || item.nameEn, quantity: item.offerGroupId ? item.offerQty || 1 : item.quantity, indices: [] }; groups.push(group); }
    group.indices.push(index);
  });
  return groups;
}
export function initialEdit(order) {
  return { notes: order.notes || "", plateNumber: order.plateNumber || "", carModel: order.carModel || "", carColor: order.carColor || "", itemNotes: order.items.map((item) => item.notes || ""), counts: Object.fromEntries(editGroups(order).map((group) => [group.key, String(group.quantity)])) };
}
export function editPatch(order, draft) {
  const quantities = order.items.map((item) => item.quantity);
  for (const group of editGroups(order)) {
    const text = draft.counts[group.key];
    if (!/^\d+$/.test(text) || Number(text) > 999) return null;
    group.indices.forEach((index) => { quantities[index] = order.items[index].quantity * Number(text) / group.quantity; });
  }
  if (!quantities.some((quantity) => quantity > 0) || quantities.some((quantity) => !Number.isInteger(quantity) || quantity > 999)) return null;
  return { notes: draft.notes, plateNumber: draft.plateNumber, carModel: draft.carModel, carColor: draft.carColor, itemNotes: draft.itemNotes, quantities };
}
