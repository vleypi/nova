import { IMAGE_CACHE_DEFAULT_SIZE } from "@/features/board/constants/board.constant";

// Запись в кеше: сам HTMLImageElement, флаг неудачной загрузки и timestamp успеха.
interface ICacheEntry {
  img: HTMLImageElement;
  failed: boolean;
  loadedAt: number;
}

// LRU-кеш картинок. При новом url стартует загрузку, по завершении зовёт onLoaded.
// При превышении capacity вытесняет самые старые записи.
export class ImageCache {
  private map = new Map<string, ICacheEntry>();
  private capacity: number;
  private onLoaded: (url: string) => void;

  constructor(
    onLoaded: (url: string) => void,
    capacity: number = IMAGE_CACHE_DEFAULT_SIZE,
  ) {
    this.onLoaded = onLoaded;
    this.capacity = capacity;
  }

  // Возвращает картинку или null. При первом обращении стартует загрузку,
  // повторные обращения обновляют LRU-позицию.
  get(url: string): HTMLImageElement | null {
    const entry = this.map.get(url);
    if (!entry) {
      this.startLoad(url);
      return null;
    }
    this.touchEntry(url, entry);
    if (entry.failed) return null;
    if (entry.img.complete && entry.img.naturalWidth > 0) return entry.img;
    return null;
  }

  isFailed(url: string): boolean {
    const entry = this.map.get(url);
    return !!entry?.failed;
  }

  invalidate(url: string): void {
    this.map.delete(url);
  }

  // Map в JS гарантирует порядок вставки, поэтому delete + set перемещает запись в конец.
  private touchEntry(url: string, entry: ICacheEntry): void {
    this.map.delete(url);
    this.map.set(url, entry);
  }

  // Создаёт Image и стартует загрузку.
  private startLoad(url: string): void {
    const img = new Image();
    // Без crossOrigin канвас становится tainted и getImageData бросит SecurityError.
    img.crossOrigin = "anonymous";
    const entry: ICacheEntry = { img, failed: false, loadedAt: 0 };
    this.map.set(url, entry);
    this.evictIfNeeded();

    img.onload = () => {
      entry.loadedAt = performance.now();
      this.onLoaded(url);
    };
    img.onerror = () => {
      entry.failed = true;
      this.onLoaded(url);
    };
    img.src = url;
  }

  // Удаляет старейшие записи пока размер не уложится в capacity.
  private evictIfNeeded(): void {
    while (this.map.size > this.capacity) {
      const firstKey = this.map.keys().next().value as string | undefined;
      if (!firstKey) break;
      this.map.delete(firstKey);
    }
  }
}
