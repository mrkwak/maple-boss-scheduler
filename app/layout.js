export const metadata = {
  title: '보스 파티',
  description: '지인용 메이플 주간 보스 파티 구성',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: 16 }}>{children}</body>
    </html>
  );
}
