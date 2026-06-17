import { SCRIPT_GOALS, SCRIPT_QA, SCRIPT_STEPS } from '@/lib/talk-script';

// 架電中に参照する固定トークスクリプト（折りたたみカード）。
// 既定は閉じた状態（summary クリックで開く）。文言の編集は src/lib/talk-script.ts で行う。
export function TalkScript() {
  return (
    <details className="talk-script">
      <summary>📞 トークスクリプト / 想定Q&amp;A</summary>

      <ul className="talk-goals">
        {SCRIPT_GOALS.map((goal) => (
          <li key={goal}>{goal}</li>
        ))}
      </ul>

      <div className="talk-body">
        <div className="talk-flow">
          <h3>架電フロー</h3>
          {SCRIPT_STEPS.map((step) => (
            <div className="talk-step" key={step.label}>
              <p className="step-label">{step.label}</p>
              {step.lines.map((line, i) => (
                <p className="step-line" key={i}>
                  {line}
                </p>
              ))}
              {step.note && <p className="step-note">※ {step.note}</p>}
            </div>
          ))}
        </div>

        <div className="talk-qa-wrap">
          <h3>想定Q&amp;A・切り返し</h3>
          <dl className="talk-qa">
            {SCRIPT_QA.map((qa) => (
              <div className="qa-item" key={qa.q}>
                <dt>{qa.q}</dt>
                <dd>{qa.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </details>
  );
}
