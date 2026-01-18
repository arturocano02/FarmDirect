export const metadata = {
  title: "Farm Setup",
  description: "Set up your farm profile on Farmlink",
};

export default function FarmSetupPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="text-center">
        <h1 className="section-heading">Set Up Your Farm</h1>
        <p className="mt-2 text-muted-foreground">
          Complete these steps to start selling on Farmlink
        </p>
      </div>

      {/* Progress steps */}
      <div className="flex justify-center">
        <div className="flex items-center gap-4">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  step === 1
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step}
              </div>
              {step < 3 && <div className="h-px w-8 bg-muted" />}
            </div>
          ))}
        </div>
      </div>

      {/* Setup form placeholder */}
      <div className="rounded-xl border bg-card p-8">
        <h2 className="font-display text-lg font-semibold">
          Step 1: Basic Information
        </h2>
        <p className="mt-4 text-sm text-muted-foreground">
          Farm setup wizard will be implemented in Phase E
        </p>

        <div className="mt-8 space-y-4">
          <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
          <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
          <div className="h-24 w-full animate-pulse rounded-md bg-muted" />
        </div>

        <div className="mt-8 flex justify-end">
          <button
            disabled
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground opacity-50"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
