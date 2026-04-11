import { useEffect, useRef, useState } from "react";
import { animate } from "motion";

interface Props {
  value: number;
  format: (n: number) => string;
  duration?: number;
}

export function AnimatedNumber({ value, format, duration = 1.2 }: Props) {
  const [display, setDisplay] = useState(format(0));
  const prevValue = useRef(0);

  useEffect(() => {
    const from = prevValue.current;
    const to = value;
    prevValue.current = to;

    const controls = animate(from, to, {
      duration,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
      onUpdate(latest) {
        setDisplay(format(latest));
      },
    });

    return () => controls.stop();
  }, [value, format, duration]);

  return <>{display}</>;
}
