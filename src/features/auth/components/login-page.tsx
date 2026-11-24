import Link from "next/link";

import { LoginForm } from "@/features/auth/components/login-form";
import styles from "@/features/auth/components/login-page.module.css";

export function LoginPage() {
  return (
    <main className={styles.page}>
      <section
        className={styles.shell}
        aria-label="Portfolio admin and editor sign in"
      >
        <aside className={styles.intro}>
          <Link className={styles.brand} href="/" aria-label="Portfolio home">
            <span className={styles.brandMark} aria-hidden="true">
              J
            </span>
            <span>Portfolio</span>
          </Link>

          <div className={styles.introCopy}>
            <p className={styles.eyebrow}>PRIVATE WORKSPACE</p>
            <h1>
              Good work
              <br />
              starts <span>here.</span>
            </h1>
            <p className={styles.introText}>
              Sign in to manage your portfolio, projects, and the details that
              bring them to life.
            </p>
          </div>

          <div className={styles.decor} aria-hidden="true">
            <span className={styles.decorCircle} />
            <span className={styles.decorLine} />
            <span className={styles.decorDot} />
            <span className={styles.decorLabel}>DESIGN · BUILD · REFINE</span>
          </div>

          <p className={styles.asideFooter}>A little space to make things better.</p>
        </aside>

        <div className={styles.formPanel}>
          <div className={styles.mobileBrand}>
            <span className={styles.mobileBrandMark} aria-hidden="true">
              J
            </span>
            <span>Portfolio</span>
          </div>
          <div className={styles.formContent}>
            <div className={styles.heading}>
              <p className={styles.formEyebrow}>ADMIN &amp; EDITOR ACCESS</p>
              <h2>Welcome back</h2>
              <p>Enter your account details to continue.</p>
            </div>
            <LoginForm />
            <p className={styles.helpText}>
              Need access? Contact the portfolio administrator.
            </p>
          </div>
          <footer className={styles.formFooter}>
            <Link href="/" className={styles.backLink}>
              <span aria-hidden="true">←</span> Back to portfolio
            </Link>
            <span className={styles.footerNote}>Private access only</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
