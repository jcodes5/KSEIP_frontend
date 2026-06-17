import { RefreshCw, TriangleAlert } from "lucide-react";
import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, resetKey: 0 };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[ui] error boundary caught:", error, info);
  }

  retry = () => {
    this.setState((state) => ({ error: null, resetKey: state.resetKey + 1 }));
  };

  render() {
    if (!this.state.error) {
      return React.cloneElement(this.props.children, { key: this.state.resetKey });
    }

    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-950 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <TriangleAlert className="mt-0.5 flex-shrink-0 text-red-700" size={20} />
            <div>
              <p className="text-sm font-black">{this.props.title || "Panel failed to render"}</p>
              <p className="mt-1 text-sm text-red-900">
                {this.state.error?.message || "An unexpected dashboard error occurred."}
              </p>
            </div>
          </div>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-red-700 px-4 text-sm font-black text-white hover:bg-red-800"
            onClick={this.retry}
            type="button"
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }
}
