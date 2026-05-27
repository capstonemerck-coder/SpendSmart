import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import merckLogo from '@/assets/Merck.png';
import { Button } from '@/components/shared';
import { useAuth } from '@/context/AuthContext';
import { LoginModal } from '@/components/shared/modals/LoginModal';

export default function Landing() {
  const { currentUser } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  const handleLogin = () => {
    setShowLogin(true);
  };

  if (currentUser) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-[48px] leading-[1.1] text-[var(--ink-900)] font-medium tracking-tight mb-4">
            Welcome back, {currentUser.fullName}
          </h1>
          <p className="text-[15px] text-[var(--ink-500)] mb-6">
            Use the navigation above to access your tools
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white flex flex-col font-sans overflow-hidden">
      {/* Top bar */}
      <header className="shrink-0 border-b border-[var(--border)]">
        <div className="max-w-[1440px] mx-auto px-8 h-16 flex items-center">
          <div className="flex items-center gap-2.5">
            <img src={merckLogo} alt="Merck" className="h-8 w-auto" />
            <div>
              <div className="font-display text-[16px] font-semibold leading-none text-[var(--ink-900)] tracking-tight">
                SpendSmart
              </div>
              <div className="text-[9px] tracking-[0.2em] uppercase text-[var(--ink-500)] mt-0.5">
                Marketing Mix Optimization
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero — fills remaining height exactly */}
      <section className="relative flex-1 overflow-hidden flex">
        {/* Teal right panel */}
        <div className="absolute top-0 right-0 bottom-0 w-[42%] bg-[var(--brand)] hidden lg:block" aria-hidden />
        {/* Radial highlight */}
        <div
          className="absolute top-0 right-0 bottom-0 w-[42%] hidden lg:block opacity-20"
          aria-hidden
          style={{ backgroundImage: 'radial-gradient(circle at 30% 80%, rgba(255,255,255,0.4), transparent 50%)' }}
        />

        <div className="relative w-full max-w-[1440px] mx-auto px-8 grid grid-cols-12 gap-10 items-center">
          {/* Left: copy */}
          <div className="col-span-12 lg:col-span-7">
            <div className="ui-eyebrow text-[var(--brand)] mb-5">
              · Plan · Compare · Optimize
            </div>
            <h1 className="font-display text-[52px] lg:text-[62px] leading-[1.02] text-[var(--ink-900)] font-medium tracking-tight">
              Make every<br />
              marketing dollar<br />
              <span className="text-[var(--brand)]">work harder.</span>
            </h1>
            <p className="text-[15px] text-[var(--ink-500)] leading-relaxed max-w-xl mt-6">
              Build, compare and stress-test marketing mix scenarios across channels, brands and
              cycles. Turn model output into decisions your team will actually use.
            </p>
          </div>

          {/* Right: sign-in panel */}
          <div className="col-span-12 lg:col-span-5 flex items-center justify-center">
            <div className="w-full max-w-[340px]">
              {/* Eyebrow */}
              <p className="text-[10px] tracking-[0.22em] uppercase text-white/60 mb-5 font-medium">
                Authorized users only
              </p>

              {/* Card */}
              <div className="bg-white rounded-2xl overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.22)]">
                <div className="h-1 w-full bg-[var(--brand-700)]" />

                <div className="p-7">
                  <h2 className="font-display text-[26px] font-semibold text-[var(--ink-900)] leading-tight mb-2">
                    Sign in to<br />SpendSmart
                  </h2>
                  <p className="text-[13px] text-[var(--ink-500)] leading-relaxed mb-7">
                    Access is restricted to authorized Merck employees. Use your organization credentials below.
                  </p>

                  <Button
                    onClick={handleLogin}
                    variant="primary"
                    size="lg"
                    rightIcon={<ArrowRight size={15} />}
                    className="w-full justify-center"
                  >
                    Sign in
                  </Button>
                </div>

                <div className="px-7 py-3.5 bg-[var(--surface-subtle)] border-t border-[var(--border)] flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                  <p className="text-[11px] text-[var(--ink-500)]">
                    Merck internal network — secure access
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-white/40 text-center mt-4">
                © 2026 Merck · SpendSmart v1.0
              </p>
            </div>
          </div>
        </div>
      </section>

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={() => setShowLogin(false)}
        />
      )}
    </div>
  );
}