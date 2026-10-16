// Global error boundary — bắt lỗi render bất kỳ component con nào
// để app không bị blank screen khi có lỗi.
import React, { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-orange-100 p-8 text-center space-y-4">
            <div className="text-5xl">⚠️</div>
            <h1 className="text-xl font-bold text-slate-800">
              Đã xảy ra lỗi không mong muốn
            </h1>
            <p className="text-sm text-slate-500">
              {this.state.error?.message || "Lỗi không xác định"}
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={this.handleReset} className="w-full bg-greenx-gradient text-white hover:opacity-90">
                Thử lại
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/")}
                className="w-full border-orange-200 text-orange-600 hover:bg-orange-50"
              >
                Về trang chủ
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
