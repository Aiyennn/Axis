import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AxisLogo } from './AxisLogo';

/** Friendly waiting copy, rather than a trace of model reasoning or tool activity. */
export const AIWaiting = () => {
  const { user, tasks } = useApp();
  const [step, setStep] = useState(0);
  const [visibleCharacters, setVisibleCharacters] = useState(0);
  const messages = [
    user?.name ? `Give me a moment, ${user.name}. Let's look at your day…` : "Give me a moment. Let's look at your day…",
    ...(tasks.some(task => task.source === 'canvas') ? ["Let's take a look at your imported Canvas tasks…"] : []),
    ...(tasks.some(task => task.source === 'email') ? ["Those email tasks deserve a closer look, too…"] : []),
    "Let's see which deadlines need your attention…",
    "A busy day needs a little breathing room. Let's keep that in mind…",
    "Thanks for waiting. I'm still preparing your response…",
  ];

  const message = messages[Math.min(step, messages.length - 1)];

  useEffect(() => {
    setVisibleCharacters(0);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) setVisibleCharacters(message.length);
    let index = 0;
    const typing = reducedMotion ? undefined : window.setInterval(() => {
      index += 1;
      setVisibleCharacters(index);
      if (index >= message.length) window.clearInterval(typing);
    }, 28);
    const nextMessage = step < messages.length - 1 ? window.setTimeout(
      () => setStep(value => value + 1),
      (reducedMotion ? 0 : message.length * 28) + 2200,
    ) : undefined;
    return () => {
      window.clearInterval(typing);
      window.clearTimeout(nextMessage);
    };
  }, [message, step, messages.length]);

  return (
    <div role="status" className="flex items-center gap-4 py-2 text-zinc-400">
      <AxisLogo aria-hidden="true" className="w-9 h-9 shrink-0 animate-pulse motion-reduce:animate-none" />
      <span className="sr-only" aria-live="polite" aria-atomic="true">{message}</span>
      <span aria-hidden="true" className="text-sm leading-relaxed">
        {message.slice(0, visibleCharacters)}
        <span className="inline-block w-[2px] h-[1em] bg-zinc-400 align-middle ml-0.5 animate-blink-cursor motion-reduce:animate-none" />
      </span>
    </div>
  );
};
