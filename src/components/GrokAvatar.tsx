import React, { useState, useEffect } from 'react';
import { AgentStatus } from '../types.ts';

interface GrokAvatarProps {
  status?: AgentStatus;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  className?: string;
  name?: string;
}

export const GrokAvatar: React.FC<GrokAvatarProps> = ({
  status = 'Idle',
  size = 'md',
  color = '#4F46E5',
  className = '',
  name = '',
}) => {
  const [blink, setBlink] = useState(false);

  // Natural blinking effect for idle/working states
  useEffect(() => {
    if (status === 'Paused') return;
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 220);
    }, 4000 + Math.random() * 3000);

    return () => clearInterval(interval);
  }, [status]);

  const sizeClasses = {
    sm: 'w-7 h-7 rounded-lg text-[9px]',
    md: 'w-9 h-9 rounded-xl text-xs',
    lg: 'w-12 h-12 rounded-2xl text-sm',
    xl: 'w-16 h-16 rounded-3xl text-base',
  };

  const eyeSizes = {
    sm: { w: 'w-1', h: 'h-1.5', gap: 'gap-1' },
    md: { w: 'w-1.5', h: 'h-2', gap: 'gap-1.5' },
    lg: { w: 'w-2', h: 'h-3', gap: 'gap-2' },
    xl: { w: 'w-2.5', h: 'h-4', gap: 'gap-2.5' },
  };

  // Eyes rendering based on Grok Bot's expressive states
  const renderEyes = () => {
    const s = eyeSizes[size];

    if (status === 'Paused') {
      // Sleepy / closed eyes (- -)
      return (
        <div className={`flex items-center ${s.gap}`}>
          <div className="w-2 h-0.5 bg-slate-300 rounded-full" />
          <div className="w-2 h-0.5 bg-slate-300 rounded-full" />
        </div>
      );
    }

    if (status === 'Done') {
      // Happy curved eyes (^ ^)
      return (
        <div className={`flex items-center ${s.gap} text-white font-bold leading-none`}>
          <span>^</span>
          <span>^</span>
        </div>
      );
    }

    if (status === 'Blocked') {
      // Cross / troubled eyes (x x)
      return (
        <div className={`flex items-center ${s.gap} text-rose-300 font-bold leading-none`}>
          <span>×</span>
          <span>×</span>
        </div>
      );
    }

    if (blink) {
      // Blinking line
      return (
        <div className={`flex items-center ${s.gap}`}>
          <div className="w-2 h-0.5 bg-white/90 rounded-full" />
          <div className="w-2 h-0.5 bg-white/90 rounded-full" />
        </div>
      );
    }

    if (status === 'Working') {
      // Focused / scanning eyes
      return (
        <div className={`flex items-center ${s.gap}`}>
          <div className={`${s.w} ${s.h} bg-emerald-300 rounded-sm animate-pulse`} />
          <div className={`${s.w} ${s.h} bg-emerald-300 rounded-sm animate-pulse`} />
        </div>
      );
    }

    if (status === 'Waiting for you') {
      // Alert curious wide eyes
      return (
        <div className={`flex items-center ${s.gap}`}>
          <div className={`${s.w} ${s.h} bg-amber-300 rounded-full animate-ping opacity-80`} />
          <div className={`${s.w} ${s.h} bg-amber-300 rounded-full`} />
        </div>
      );
    }

    // Default Idle: calm white dot-eyes
    return (
      <div className={`flex items-center ${s.gap}`}>
        <div className={`${s.w} ${s.h} bg-white rounded-full transition-all`} />
        <div className={`${s.w} ${s.h} bg-white rounded-full transition-all`} />
      </div>
    );
  };

  return (
    <div
      className={`relative flex items-center justify-center select-none shadow-md transition-all duration-200 border border-white/10 ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: color || '#1e293b',
        boxShadow: `0 4px 14px -2px ${color}33`,
      }}
      title={name ? `${name} (${status})` : status}
    >
      {/* Expressive minimal face */}
      {renderEyes()}

      {/* State indicator glow dot */}
      {status === 'Working' && (
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-950 animate-pulse" />
      )}
      {status === 'Waiting for you' && (
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-slate-950 animate-bounce" />
      )}
      {status === 'Done' && (
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-blue-400 border-2 border-slate-950" />
      )}
    </div>
  );
};
