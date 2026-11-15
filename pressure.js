export const DEFAULT_SENSITIVITY=1.4;
export function pressureSensitivity(value){const n=Number(value);return value==null||!Number.isFinite(n)?DEFAULT_SENSITIVITY:Math.max(.5,Math.min(3,n));}
export function adjustedPressure(value,sensitivity=1){return Math.round(Math.max(0,Math.min(1,value*sensitivity))*1000)/1000;}
