const ONE_SECOND = 1_000; // ms

export const seconds = (s: number) => ONE_SECOND * s;
export const minutes = (m: number) => seconds(60) * m;

export const isTimeAgo = (timestamp: number, time: number) => {
  const now = Date.now();
  const diff = now - timestamp;
  return diff <= time;
};
