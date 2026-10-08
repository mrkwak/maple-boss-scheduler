import { Jua } from 'next/font/google';
import './globals.css';

// 제목용 둥근 글꼴 (메이플 느낌)
const jua = Jua({ weight: '400', subsets: ['latin'], display: 'swap', variable: '--font-jua' });

export const metadata = {
  title: '보스 파티',
  description: '지인용 메이플 주간 보스 파티 구성',
  robots: { index: false, follow: false },
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#f08a24' };

// 첫 화면 깜빡임 없이 저장된 테마 적용 (components/ThemeToggle.js와 같은 키)
const themeScript = `try{var t=localStorage.getItem('mbs_theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="ko" className={jua.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
