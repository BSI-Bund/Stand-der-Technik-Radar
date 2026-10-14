import { Component, type ReactNode } from 'react';
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="shell">
          <div role="alert">
            <h1>Die Ansicht konnte nicht geladen werden</h1>
            <p>
              Bitte laden Sie die Seite erneut. Bei einem Update kann ein bereits geöffnetes
              Browserfenster noch ältere Dateien verwenden.
            </p>
            <a href={window.location.href}>Seite neu laden</a>
          </div>
        </main>
      );
    return this.props.children;
  }
}
