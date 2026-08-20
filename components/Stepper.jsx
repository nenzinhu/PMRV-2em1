'use client';

export default function Stepper({ currentStep, ehVitima }) {
  const stepsMap = ehVitima ? [1, 2, 3, 4, 5] : [1, 2, 3, 5];
  const activeIndex = stepsMap.indexOf(currentStep);
  const totalActive = stepsMap.length;
  const progressWidth = (activeIndex / (totalActive - 1)) * 100 + '%';

  const dots = [
    { n: 1, label: '1', show: true },
    { n: 2, label: '2', show: true },
    { n: 3, label: '3', show: true },
    { n: 4, label: '4', show: ehVitima },
    { n: 5, label: '✓', show: true },
  ];

  function dotClass(n) {
    if (n === currentStep) return 'bg-pmrv border-pmrv';
    if (stepsMap.indexOf(n) !== -1 && stepsMap.indexOf(n) < activeIndex)
      return 'bg-step-done border-charcoal';
    return 'bg-step-idle border-charcoal';
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-5">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 w-full h-0.5 bg-step-idle -translate-y-1/2 z-0" />
        <div
          id="stepper-progress"
          className="absolute left-0 top-1/2 h-0.5 bg-pmrv -translate-y-1/2 z-0 transition-all duration-300"
          style={{ width: progressWidth }}
        />
        {dots
          .filter((d) => d.show)
          .map((d) => (
            <div
              key={d.n}
              className={`step-dot z-10 w-9 h-9 ${dotClass(d.n)} flex items-center justify-center font-mono font-semibold text-sm`}
            >
              {d.label}
            </div>
          ))}
      </div>
    </div>
  );
}
