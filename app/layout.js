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

export default function RootLayout({ children }) {
  return (
    <html lang="ko" className={jua.variable}>
      <body>{children}</body>
    </html>
  );
}
