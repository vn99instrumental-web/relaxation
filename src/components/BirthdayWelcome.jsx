import { useCallback, useLayoutEffect, useRef, useState } from 'react'

const PETALS = Array.from({ length: 18 }, (_, index) => ({
  id: index,
  left: ((index * 37 + 9) % 96) + '%',
  delay: (-((index * 0.43) % 5.2)) + 's',
  duration: (5.8 + (index % 5) * 0.7) + 's',
  drift: ((index % 2 ? 1 : -1) * (24 + (index % 4) * 12)) + 'px',
}))
const NO_SPOTS = [
  { left: 63, top: 0 },
  { left: 82, top: 0 },
  { left: 63, top: 48 },
  { left: 82, top: 48 },
]


const COPY = {
  dialogLabel: 'L\u1eddi ch\u00fac sinh nh\u1eadt',
  date: '\u0110\u00e0 L\u1ea1t \u00b7 m\u00f9a hoa n\u1edf',
  sparkle: '\u2726',
  check: '\u2713',
  questionEyebrow: 'C\u00f3 m\u1ed9t \u0111i\u1ec1u nh\u1ecf mu\u1ed1n h\u1ecfi b\u1ea1n',
  questionTitle: 'B\u1ea1n c\u00f3 th\u00edch m\u00ecnh kh\u00f4ng?',
  questionCopy: 'Tr\u1ea3 l\u1eddi th\u1eadt l\u00f2ng nh\u00e9 \u2014 d\u01b0\u1edbi t\u00e1n th\u00f4ng h\u00f4m nay c\u00f3 m\u1ed9t b\u1ea5t ng\u1edd \u0111ang ch\u1edd.',
  answersLabel: 'Ch\u1ecdn c\u00e2u tr\u1ea3 l\u1eddi',
  yes: 'C\u00f3, m\u00ecnh th\u00edch',
  no: 'Kh\u00f4ng',
  noLabel: 'Kh\u00f4ng \u2014 nh\u01b0ng n\u00fat n\u00e0y r\u1ea5t hay ng\u1ea1i',
  hint: 'G\u1ee3i \u00fd: c\u00f3 m\u1ed9t chi\u1ebfc n\u00fat h\u01a1i nh\u00fat nh\u00e1t.',
  correct: 'B\u1ea1n tr\u1ea3 l\u1eddi \u0111\u00fang r\u1ed3i!',
  gift: 'M\u1ed9t m\u00f3n qu\u00e0 t\u1eeb \u0110\u00e0 L\u1ea1t',
  birthdayTitle: 'Ch\u00fac m\u1eebng sinh nh\u1eadt, ng\u01b0\u1eddi \u0111\u1eb7c bi\u1ec7t!',
  wishOne: 'Mong tu\u1ed5i m\u1edbi c\u1ee7a b\u1ea1n d\u1ecbu d\u00e0ng nh\u01b0 s\u01b0\u01a1ng s\u1edbm, r\u1ef1c r\u1ee1 nh\u01b0 hoa th\u1ee7y ti\u00ean v\u00e0 b\u00ecnh y\u00ean nh\u01b0 nh\u1eefng chi\u1ec1u \u0111i gi\u1eefa r\u1eebng th\u00f4ng.',
  wishTwo: 'Ch\u00fac b\u1ea1n lu\u00f4n \u0111\u01b0\u1ee3c y\u00eau th\u01b0\u01a1ng, g\u1eb7p th\u1eadt nhi\u1ec1u ni\u1ec1m vui v\u00e0 c\u00f3 \u0111\u1ee7 d\u0169ng kh\u00ed \u0111\u1ec3 b\u01b0\u1edbc \u0111\u1ebfn m\u1ecdi \u0111i\u1ec1u m\u00ecnh mong \u01b0\u1edbc.',
  signature: '\u2014 G\u1eedi b\u1ea1n, gi\u1eefa m\u1ed9t \u0110\u00e0 L\u1ea1t \u0111\u1ea7y hoa \u2726',
  continue: 'C\u00f9ng v\u00e0o nghe nh\u1ea1c nh\u00e9',
}

export default function BirthdayWelcome() {
  const [step, setStep] = useState('question')
  const [open, setOpen] = useState(true)
  const [noPosition, setNoPosition] = useState({ left: 82, top: 8 })
  const welcomeRef = useRef(null)
  const yesButtonRef = useRef(null)
  const contentRef = useRef(null)
  const celebrateTitleRef = useRef(null)
  const noButtonRef = useRef(null)

  useLayoutEffect(() => {
    const focusTarget = step === 'question' ? yesButtonRef.current : celebrateTitleRef.current
    focusTarget?.focus({ preventScroll: true })
    if (welcomeRef.current) welcomeRef.current.scrollTop = 0
    if (contentRef.current) contentRef.current.scrollTop = 0
  }, [step])

  const keepNoAway = useCallback((event) => {
    if (event.pointerType === 'touch') event.preventDefault()
    const area = event.currentTarget.getBoundingClientRect()
    const button = noButtonRef.current?.getBoundingClientRect()
    if (!button) return

    const distanceToButton = Math.hypot(
      event.clientX - (button.left + button.width / 2),
      event.clientY - (button.top + button.height / 2),
    )
    const safeDistance = Math.min(84, Math.max(68, area.width * .21))
    if (distanceToButton >= safeDistance) return

    const pointerX = event.clientX - area.left
    const pointerY = event.clientY - area.top
    const next = NO_SPOTS.reduce((best, spot) => {
      const spotX = area.width * spot.left / 100
      const spotY = spot.top + button.height / 2
      const distance = Math.hypot(pointerX - spotX, pointerY - spotY)
      return distance > best.distance ? { spot, distance } : best
    }, { spot: NO_SPOTS[0], distance: -1 }).spot

    setNoPosition((current) => (
      current.left === next.left && current.top === next.top ? current : next
    ))
  }, [])

  if (!open) return null

  return (
    <section ref={welcomeRef} className={'birthday-welcome birthday-welcome--' + step} aria-label={COPY.dialogLabel}>
      <div className="birthday-welcome__backdrop" aria-hidden="true" />
      <div className="birthday-welcome__mist birthday-welcome__mist--one" aria-hidden="true" />
      <div className="birthday-welcome__mist birthday-welcome__mist--two" aria-hidden="true" />

      {step === 'celebrate' && (
        <div className="birthday-petals" aria-hidden="true">
          {PETALS.map((petal) => (
            <i
              key={petal.id}
              style={{
                '--petal-left': petal.left,
                '--petal-delay': petal.delay,
                '--petal-duration': petal.duration,
                '--petal-drift': petal.drift,
              }}
            />
          ))}
        </div>
      )}

      <div
        className={'birthday-card ' + (step === 'celebrate' ? 'is-celebrating' : '')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="birthday-title"
        aria-describedby="birthday-copy"
      >
        <div className="birthday-card__photo" aria-hidden="true">
          <span className="birthday-card__date">{COPY.date}</span>
          <span className="birthday-card__pine birthday-card__pine--left">{COPY.sparkle}</span>
          <span className="birthday-card__pine birthday-card__pine--right">{COPY.sparkle}</span>
        </div>

        <div ref={contentRef} className="birthday-card__content">
          <div className="birthday-card__flower" aria-hidden="true">
            <span /><span /><span /><span /><span /><b />
          </div>

          {step === 'question' ? (
            <>
              <p className="birthday-card__eyebrow">{COPY.questionEyebrow}</p>
              <h2 id="birthday-title">{COPY.questionTitle}</h2>
              <p id="birthday-copy" className="birthday-card__copy">{COPY.questionCopy}</p>

              <div className="birthday-card__answers" aria-label={COPY.answersLabel}
                onPointerEnter={keepNoAway} onPointerMove={keepNoAway} onPointerDown={keepNoAway}>
                <button ref={yesButtonRef} className="birthday-answer birthday-answer--yes" type="button"
                  onClick={() => setStep('celebrate')}>
                  {COPY.yes}
                </button>
                <span ref={noButtonRef} className="birthday-answer birthday-answer--no" role="button" aria-disabled="true"
                  style={{ left: noPosition.left + '%', top: noPosition.top + 'px' }}
                  aria-label={COPY.noLabel} draggable="false">
                  {COPY.no}
                </span>
              </div>
              <p className="birthday-card__hint">{COPY.hint}</p>
            </>
          ) : (
            <div className="birthday-card__wish">
              <p className="birthday-card__correct"><span>{COPY.check}</span> {COPY.correct}</p>
              <p className="birthday-card__eyebrow">{COPY.gift}</p>
              <h2 ref={celebrateTitleRef} id="birthday-title" tabIndex={-1}>{COPY.birthdayTitle}</h2>
              <div id="birthday-copy" className="birthday-card__copy birthday-card__copy--wish">
                <p>{COPY.wishOne}</p>
                <p>{COPY.wishTwo}</p>
              </div>
              <p className="birthday-card__signature">{COPY.signature}</p>
              <button className="birthday-card__continue" type="button"
                onClick={() => setOpen(false)}>
                {COPY.continue}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
