import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function capitalize(str: string) {
  if (typeof str !== 'string' || str.length === 0) {
    return ""; // Handle non-string or empty input
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}
