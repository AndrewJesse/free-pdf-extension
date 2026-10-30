export {};

declare global {
  var chrome:
    | {
        runtime?: {
          id?: string;
          getURL?: (path: string) => string;
          onInstalled?: {
            addListener: (listener: () => void) => void;
          };
        };
      }
    | undefined;
}
