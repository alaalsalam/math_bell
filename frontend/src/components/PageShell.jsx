function PageShell({ title, subtitle, children }) {
  return (
    <main className="page-shell">
      <section className="page-card">
        <h1>{title}</h1>
        {subtitle ? <p className="subtitle">{subtitle}</p> : null}
        <div className="content">{children}</div>
      </section>
    </main>
  );
}

export default PageShell;
