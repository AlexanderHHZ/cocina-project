'use client';

import { useEffect, useState } from 'react';

export default function ScrollIndicator() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY < 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={`fixed right-6 md:right-8 bottom-10 z-40
                   transition-all duration-700 ease-out
                   ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'}`}
    >
      {/* Mouse outline */}
      <div className="w-6 h-10 rounded-full border-2 border-walnut/25 flex justify-center pt-2">
        {/* Dot that scrolls down */}
        <div
          className="w-1 h-2.5 rounded-full bg-paprika/50"
          style={{ animation: 'scrollDot 2s ease-in-out infinite' }}
        />
      </div>

      <style>{`
        @keyframes scrollDot {
          0% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(10px); opacity: 0.3; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
