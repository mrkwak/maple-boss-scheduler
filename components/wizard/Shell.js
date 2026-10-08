// 신청 단계 공통 틀: 진행 표시 + 제목 + 본문 + 하단 고정 버튼
export const STEPS = ['캐릭터', '보스', '환산', '희망 시간', '매칭'];

export default function Shell({ step, title, hint, children, onBack, next, error }) {
  return (
    <section className="wiz">
      <ol className="wiz-progress" aria-label={`${step + 1}/${STEPS.length}단계`}>
        {STEPS.map((s, i) => (
          <li key={s} className={i < step ? 'done' : i === step ? 'now' : ''}>
            <span className="dot">{i < step ? '✓' : i + 1}</span>
            <span className="name">{s}</span>
          </li>
        ))}
      </ol>
      <h2 className="wiz-title">{title}</h2>
      {hint && <p className="wiz-hint">{hint}</p>}
      <div className="wiz-body">{children}</div>
      {error && <p className="error">{error}</p>}
      {(onBack || next) && (
        <div className="wiz-nav">
          {onBack ? (
            <button type="button" className="big ghost" onClick={onBack} disabled={next?.busy}>
              이전
            </button>
          ) : (
            <span />
          )}
          {next && (
            <button type="button" className="big primary" onClick={next.onClick} disabled={next.disabled || next.busy}>
              {next.busy ? '저장 중…' : next.label}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
