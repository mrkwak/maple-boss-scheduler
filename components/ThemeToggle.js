'use client';

import { useEffect, useState } from 'react';

// 테마: 자동(기기 설정) → 라이트 → 다크. <html data-theme>에 적용하고 기기에 기억
const KEY = 'mbs_theme';
const NEXT = { auto: 'light', light: 'dark', dark: 'auto' };
const LABEL = { auto: '🌓 자동', light: '☀️ 라이트', dark: '🌙 다크' };

export function applyTheme(theme) {
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState('auto');

  useEffect(() => {
    try {
      setTheme(localStorage.getItem(KEY) || 'auto');
    } catch {
      // 저장소를 못 쓰면 자동
    }
  }, []);

  const change = () => {
    const next = NEXT[theme];
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // 이번 화면에서만 적용
    }
  };

  return (
    <button type="button" className="theme-btn" onClick={change} aria-label="화면 테마 바꾸기">
      {LABEL[theme]}
    </button>
  );
}
