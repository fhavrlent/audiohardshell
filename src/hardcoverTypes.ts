export interface HardcoverAudiobook {
  edition_id: number;
  user_book_id: number;
  title: string;
  isbn_10: string | null;
  isbn_13: string | null;
  asin: string | null;
  book_id: number;
  audio_seconds: number;
  other_user_editions: number[];
}
