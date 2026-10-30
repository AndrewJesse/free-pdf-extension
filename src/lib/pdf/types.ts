export type ProgressUpdate = {
  /** 0 to 1 */
  progress: number;
  message: string;
};

export type ProgressHandler = (update: ProgressUpdate) => void;
