import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

function sx(str) {
  if (!str) return undefined
  const obj = {}
  for (const rule of str.split(';')) {
    const i = rule.indexOf(':')
    if (i === -1) continue
    const prop = rule.slice(0, i).trim()
    const val = rule.slice(i + 1).trim()
    if (!prop || !val) continue
    obj[prop.startsWith('--') ? prop : prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = val
  }
  return obj
}

// border split into longhand (width/style/color) instead of the `border` shorthand —
// GlassField's focused variant only overrides border-color, and mixing a shorthand
// base with a longhand override makes React warn when the value toggles back off.
const GLASS_INPUT = 'border-radius:16px;border-width:1px;border-style:solid;border-color:var(--color-divider);background:color-mix(in srgb, var(--color-surface) 70%, transparent);backdrop-filter:blur(6px);transition:border-color .15s,background .15s'

const STAGE_PREVIEW = [
  { stage: 'Qualified', company: 'Meridian Logistics', value: '$142k' },
  { stage: 'Proposal', company: 'Anargya Property', value: '$68k' },
  { stage: 'Won', company: 'Bluecrest Freight', value: '$210k' },
]

const COPY = {
  signin: { heading: 'Sign in to your sales desk.', submit: 'Sign in', submitLoading: 'Signing in…' },
  signup: { heading: 'Create an account to get started.', submit: 'Create account', submitLoading: 'Creating account…' },
  forgot: { heading: "Enter your email and we'll send a 6-digit code.", submit: 'Send code', submitLoading: 'Sending…' },
  otp: { heading: 'Enter the 6-digit code we emailed you.', submit: 'Verify code', submitLoading: 'Verifying…' },
  reset: { heading: 'Choose a new password.', submit: 'Reset password', submitLoading: 'Saving…' },
}

function GlassField({ children, focused }) {
  return <div style={sx(GLASS_INPUT + (focused ? `;border-color:var(--color-accent);background:var(--color-accent-100)` : ''))}>{children}</div>
}

function PasswordInput({ value, onChange, placeholder, focused, onFocus, onBlur, show, onToggleShow }) {
  return (
    <GlassField focused={focused}>
      <div style={sx('position:relative')}>
        <input
          className="input" type={show ? 'text' : 'password'} value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus} onBlur={onBlur}
          placeholder={placeholder} style={sx('background:transparent;border:none;width:100%;padding-right:40px')}
        />
        <button
          type="button" onClick={onToggleShow}
          aria-label={show ? 'Hide password' : 'Show password'}
          style={sx('position:absolute;right:8px;top:50%;transform:translateY(-50%);background:transparent;border:none;cursor:pointer;color:var(--color-neutral-600);display:flex;padding:4px')}
        >
          <i className={`ph-duotone ${show ? 'ph-eye-slash' : 'ph-eye'}`} style={sx('font-size:18px')}></i>
        </button>
      </div>
    </GlassField>
  )
}

export default function SignInScreen({
  mode, name, email, password, otp, confirmPassword, error, loading,
  onName, onEmail, onPassword, onOtp, onConfirmPassword, onModeChange,
  onSubmit, onSignUp, onRequestOtp, onVerifyOtp, onResendOtp, onResetPassword, onBack,
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [focusField, setFocusField] = useState(null)
  const reduceMotion = useReducedMotion()
  const isSignup = mode === 'signup'
  const isAuthTab = mode === 'signin' || mode === 'signup'

  const fadeUp = { hidden: { opacity: 0, y: reduceMotion ? 0 : 14 }, show: { opacity: 1, y: 0 } }
  const stagger = { hidden: {}, show: { transition: { staggerChildren: reduceMotion ? 0 : 0.07, delayChildren: reduceMotion ? 0 : 0.05 } } }
  const reveal = { duration: reduceMotion ? 0.01 : 0.4, ease: [0.16, 1, 0.3, 1] }
  const fieldSwap = {
    initial: { opacity: 0, height: 0, marginBottom: 0 },
    animate: { opacity: 1, height: 'auto', marginBottom: 0 },
    exit: { opacity: 0, height: 0, marginBottom: 0 },
    transition: reveal,
  }

  const submitFor = { signin: onSubmit, signup: onSignUp, forgot: onRequestOtp, otp: onVerifyOtp, reset: onResetPassword }
  const handleSubmit = (e) => {
    e.preventDefault()
    submitFor[mode]?.()
  }

  return (
    <div style={sx('min-height:100vh;width:100%;display:flex;align-items:center;justify-content:center;background:var(--color-bg);color:var(--color-text);padding:var(--space-6);position:relative')}>
      {onBack && (
        <button className="btn btn-ghost" onClick={onBack} style={sx('position:absolute;top:var(--space-4);left:var(--space-4)')}>
          <i className="ph-duotone ph-arrow-left" style={sx('font-size:16px')}></i>Back
        </button>
      )}
      <motion.div
        initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }} animate={{ opacity: 1, y: 0 }} transition={reveal}
        className="auth-card card elev-lg"
        style={sx('flex-direction:row;gap:0;padding:0;overflow:hidden;border-radius:var(--radius-lg);max-width:960px;width:100%')}
      >
      {/* LEFT — form */}
      <div style={sx('flex:1;display:flex;flex-direction:column;justify-content:center;padding:var(--space-8);min-width:0')}>
        <motion.div key={mode} initial="hidden" animate="show" variants={stagger} style={sx('width:100%;max-width:360px;margin:0 auto')}>
          <motion.div variants={fadeUp} transition={reveal} style={sx('display:flex;align-items:baseline;gap:10px;margin-bottom:var(--space-1)')}>
            <span style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:32px;letter-spacing:-0.02em')}>Flowdesk</span>
          </motion.div>

          {isAuthTab ? (
            <motion.div variants={fadeUp} transition={reveal} className="seg" style={sx('margin:var(--space-3) 0')}>
              <label className="seg-opt">
                <input type="radio" name="authMode" checked={mode === 'signin'} onChange={() => onModeChange('signin')} />Sign in
              </label>
              <label className="seg-opt">
                <input type="radio" name="authMode" checked={mode === 'signup'} onChange={() => onModeChange('signup')} />Create account
              </label>
            </motion.div>
          ) : (
            <motion.button
              variants={fadeUp} transition={reveal} type="button" onClick={() => onModeChange('signin')}
              style={sx('display:flex;align-items:center;gap:6px;background:transparent;border:none;cursor:pointer;color:var(--color-accent);font-size:13px;padding:0;margin:var(--space-3) 0')}
            >
              <i className="ph-duotone ph-arrow-left" style={sx('font-size:14px')}></i>Back to sign in
            </motion.button>
          )}

          <motion.p variants={fadeUp} transition={reveal} className="text-muted" style={sx('margin-bottom:var(--space-4);font-size:15px')}>{COPY[mode].heading}</motion.p>

          <form onSubmit={handleSubmit} style={sx('display:flex;flex-direction:column;gap:var(--space-4)')}>
            <AnimatePresence initial={false}>
              {isSignup && (
                <motion.div key="name" {...fieldSwap} style={sx('overflow:hidden')}>
                  <label style={sx('font-size:12px;color:var(--color-neutral-700);display:block;margin-bottom:5px')}>Full name</label>
                  <GlassField focused={focusField === 'name'}>
                    <input
                      className="input" type="text" value={name} autoFocus={isSignup}
                      onChange={(e) => onName(e.target.value)}
                      onFocus={() => setFocusField('name')} onBlur={() => setFocusField(null)}
                      placeholder="Amara Wicaksono" style={sx('background:transparent;border:none;width:100%')}
                    />
                  </GlassField>
                </motion.div>
              )}
            </AnimatePresence>

            {(mode === 'signin' || mode === 'signup' || mode === 'forgot') && (
              <motion.div variants={fadeUp} transition={reveal}>
                <label style={sx('font-size:12px;color:var(--color-neutral-700);display:block;margin-bottom:5px')}>Email address</label>
                <GlassField focused={focusField === 'email'}>
                  <input
                    className="input" type="email" value={email} autoFocus={mode !== 'signup'}
                    onChange={(e) => onEmail(e.target.value)}
                    onFocus={() => setFocusField('email')} onBlur={() => setFocusField(null)}
                    placeholder="you@flowdesk.io" style={sx('background:transparent;border:none;width:100%')}
                  />
                </GlassField>
              </motion.div>
            )}

            {mode === 'otp' && (
              <motion.div variants={fadeUp} transition={reveal}>
                <label style={sx('font-size:12px;color:var(--color-neutral-700);display:block;margin-bottom:5px')}>6-digit code</label>
                <GlassField focused={focusField === 'otp'}>
                  <input
                    className="input" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={otp} autoFocus
                    onChange={(e) => onOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onFocus={() => setFocusField('otp')} onBlur={() => setFocusField(null)}
                    placeholder="000000" style={sx('background:transparent;border:none;width:100%;letter-spacing:0.4em;font-size:18px;text-align:center')}
                  />
                </GlassField>
                <button
                  type="button" onClick={() => onResendOtp()}
                  style={sx('background:transparent;border:none;cursor:pointer;color:var(--color-accent);font-size:13px;padding:0;margin-top:var(--space-2)')}
                >
                  Didn't get a code? Resend
                </button>
              </motion.div>
            )}

            {(mode === 'signin' || mode === 'signup') && (
              <motion.div variants={fadeUp} transition={reveal}>
                <label style={sx('font-size:12px;color:var(--color-neutral-700);display:block;margin-bottom:5px')}>Password</label>
                <PasswordInput
                  value={password} onChange={onPassword} show={showPassword} onToggleShow={() => setShowPassword((s) => !s)}
                  focused={focusField === 'password'} onFocus={() => setFocusField('password')} onBlur={() => setFocusField(null)}
                  placeholder={isSignup ? 'At least 8 characters' : '••••••••'}
                />
              </motion.div>
            )}

            {mode === 'reset' && (
              <>
                <motion.div variants={fadeUp} transition={reveal}>
                  <label style={sx('font-size:12px;color:var(--color-neutral-700);display:block;margin-bottom:5px')}>New password</label>
                  <PasswordInput
                    value={password} onChange={onPassword} show={showPassword} onToggleShow={() => setShowPassword((s) => !s)}
                    focused={focusField === 'password'} onFocus={() => setFocusField('password')} onBlur={() => setFocusField(null)}
                    placeholder="At least 8 characters"
                  />
                </motion.div>
                <motion.div variants={fadeUp} transition={reveal}>
                  <label style={sx('font-size:12px;color:var(--color-neutral-700);display:block;margin-bottom:5px')}>Confirm new password</label>
                  <PasswordInput
                    value={confirmPassword} onChange={onConfirmPassword} show={showConfirm} onToggleShow={() => setShowConfirm((s) => !s)}
                    focused={focusField === 'confirm'} onFocus={() => setFocusField('confirm')} onBlur={() => setFocusField(null)}
                    placeholder="Retype the password above"
                  />
                </motion.div>
              </>
            )}

            {error && <motion.div variants={fadeUp} transition={reveal} style={sx('font-size:13px;color:var(--color-accent-2)')}>{error}</motion.div>}

            {mode === 'signin' && (
              <motion.div variants={fadeUp} transition={reveal} style={sx('display:flex;justify-content:flex-end')}>
                <a href="#" onClick={(e) => { e.preventDefault(); onModeChange('forgot') }} style={sx('font-size:13px;color:var(--color-accent)')}>Forgot password?</a>
              </motion.div>
            )}

            <motion.button variants={fadeUp} transition={reveal} type="submit" className="btn btn-primary btn-block" disabled={loading} style={sx('margin-top:0;border-radius:16px;padding:12px')}>
              {loading ? COPY[mode].submitLoading : COPY[mode].submit}
            </motion.button>
          </form>
        </motion.div>
      </div>

      {/* RIGHT — brand panel, hidden below the auth-card breakpoint (card is narrower than a full page, so it needs its own) */}
      <div className="auth-hero-panel" style={sx('display:none;position:relative;background:var(--color-text);color:var(--color-bg);padding:var(--space-6);flex-direction:column;justify-content:space-between;overflow:hidden;flex:1')}>
        <motion.div
          initial={{ opacity: 0, x: reduceMotion ? 0 : 24 }} animate={{ opacity: 1, x: 0 }}
          transition={{ ...reveal, delay: reduceMotion ? 0 : 0.1 }}
        >
          <span style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:22px')}>Flowdesk</span>
          <p style={sx('max-width:30ch;font-size:19px;margin-top:var(--space-4);line-height:1.3')}>
            "One board for every deal — drag it, score it, close it."
          </p>
        </motion.div>

        <div style={sx('display:flex;flex-direction:column;gap:var(--space-2)')}>
          {STAGE_PREVIEW.map((d, i) => (
            <motion.div
              key={d.company}
              initial={{ opacity: 0, x: reduceMotion ? 0 : 24 }} animate={{ opacity: 1, x: 0 }}
              transition={{ ...reveal, delay: reduceMotion ? 0 : 0.25 + i * 0.08 }}
              style={sx('background:color-mix(in srgb, var(--color-bg) 12%, transparent);border-radius:14px;padding:var(--space-3);display:flex;justify-content:space-between;align-items:baseline')}
            >
              <div>
                <div style={sx('font-size:11px;opacity:0.65;text-transform:uppercase;letter-spacing:0.08em')}>{d.stage}</div>
                <div style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:14px')}>{d.company}</div>
              </div>
              <div style={sx('font-family:var(--font-heading);font-weight:var(--font-heading-weight);font-size:16px')}>{d.value}</div>
            </motion.div>
          ))}
        </div>
      </div>
      </motion.div>
      <style>{'@media (min-width: 760px) { .auth-hero-panel { display: flex !important; } .auth-card { min-height: 580px; } }'}</style>
    </div>
  )
}
