import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "../constants";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      let isFirestoreError = false;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.operationType) {
            errorMessage = `Database Error: ${parsed.error}`;
            isFirestoreError = true;
          }
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full glass-card p-8 text-center space-y-6">
            <div className="inline-flex p-4 bg-danger/10 rounded-full border border-danger/20">
              <AlertCircle className="w-12 h-12 text-danger" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-main">Something went wrong</h2>
              <p className="text-muted text-sm leading-relaxed">
                {errorMessage}
              </p>
              {isFirestoreError && (
                <p className="text-muted/60 text-xs italic mt-2">
                  This might be due to missing permissions or a configuration issue.
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                onClick={this.handleReset}
                className="btn-primary w-full sm:w-auto flex items-center justify-center space-x-2"
              >
                <RefreshCcw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
              <Link
                to={ROUTES.DASHBOARD}
                onClick={() => this.setState({ hasError: false, error: null })}
                className="btn-secondary w-full sm:w-auto flex items-center justify-center space-x-2"
              >
                <Home className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
