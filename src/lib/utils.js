import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as SAR currency.
 * @param {number} amount
 * @returns {string}
 */
export function formatSAR(amount) {
  return `${amount?.toFixed(2)} ر.س`;
}

/**
 * Generate a 5-digit order number string.
 * @returns {string}
 */
export function generateOrderNumber() {
  const num = Math.floor(Math.random() * 100000);
  return num.toString().padStart(5, "0");
}

/**
 * Get time elapsed since a date, as a human-readable string.
 * @param {Date} date
 * @returns {string}
 */
export function timeElapsed(date) {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ${diffMins % 60}m ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

/**
 * Status color mapping for order badges.
 * @type {Record<string, string>}
 */
export const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  preparing: "bg-blue-100 text-blue-800 border-blue-300",
  onTheWay: "bg-orange-100 text-orange-800 border-orange-300",
  delivered: "bg-green-100 text-green-800 border-green-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
};
