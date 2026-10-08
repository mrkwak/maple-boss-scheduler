import './globals.css';

export const metadata = {
  title: '보스 파티',
  description: '지인용 메이플 주간 보스 파티 구성',
  robots: { index: false, follow: false },
};

export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
