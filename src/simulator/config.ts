// Physical dimensions/speed are explicit provisional calibration, not library claims.
export const ROBOT = { wheelBaseCm: 12, radiusCm: 7, maxWheelCmS: 28,
  lineFrontCm: 6, lineSpreadCm: 2.8, sonarOffsetCm: 7, sonarMaxCm: 300,
  white: 28, black: 395, threshold: 200 } as const;
export const PHYSICS_STEP_MS = 10;
export const TELEMETRY_MS = 100;
