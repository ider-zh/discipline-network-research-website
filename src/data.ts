const cache = new Map<string, Promise<unknown>>();

export function loadJson<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    cache.set(path, fetch(path).then((response) => {
      if (!response.ok) throw new Error(`数据加载失败（${response.status}）`);
      return response.json();
    }));
  }
  return cache.get(path) as Promise<T>;
}

export function subjectFileName(subject: string): string {
  return `${subject.toLowerCase().replaceAll(" ", "_")}.json`;
}

export function round(value: unknown, precision = 3): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(precision)) : null;
}
