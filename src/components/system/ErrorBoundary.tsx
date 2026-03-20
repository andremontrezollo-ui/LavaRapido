import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global error boundary that catches unhandled React render errors.
 * Wrap the application root (or subtrees) with this component to
 * prevent a full blank screen on unexpected errors.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <h1 className="text-xl font-heading font-bold mb-2">
                Something went wrong
              </h1>
              <p className="text-sm text-muted-foreground">
                An unexpected error occurred. Please try again.
              </p>
              {this.state.error && (
                <code className="text-xs text-muted-foreground block mt-2 p-2 rounded bg-secondary break-all">
                  {this.state.error.message}
                </code>
              )}
            </div>
            <Button variant="outline" onClick={this.handleReset}>
              Try again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
