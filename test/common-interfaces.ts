
export enum STATUS {
  one = "one",
  two = "two",
  three = "three",
  four = "four",
}

export interface Book {
  /**
   * this is id.
   */
  id: number;
  /**
   * @default sample title
   */
  title: string | null;
  /**
   * @format date
   */
  date?: Date | null;
  "meta-data": Record<string, string>;
  version: VersionTagString;
  statuses: STATUS[];
}

export type VersionTag = 'A' | 'B';
export type VersionTagString = `${VersionTag}_v${string}`;
