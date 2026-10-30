export function ToolStatus({
  working,
  progress,
  message,
  error,
}: {
  working: boolean;
  progress: number;
  message: string | null;
  error: string | null;
}) {
  return (
    <div className="mt-6">
      {working ? (
        <progress
          className="local-progress mb-3"
          max={100}
          value={Math.round(progress * 100)}
          aria-label="Progress"
        />
      ) : null}
      <p role="status" aria-live="polite" className="min-h-5 text-sm text-ink">
        {message}
      </p>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}
