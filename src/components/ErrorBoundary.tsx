import * as React from 'react';
import { ShieldAlert, RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('dnd_solo_campaigns_list_v2');
      localStorage.removeItem('dnd_solo_active_campaign_id_v2');
      localStorage.removeItem('dnd_solo_campaign_save_v2');
    } catch {
      // ignore
    }
    window.location.reload();
  };

  private handleReload = () => {
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-screen bg-[#fdfaf1] flex items-center justify-center p-4 text-[#2c1810] font-serif select-none">
          <div className="max-w-md w-full bg-white border-2 border-[#b8ae8f] rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 bg-red-100 border border-red-300 rounded-2xl mx-auto flex items-center justify-center text-red-700 shadow-xs">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-[#2c1810]">
                A Wild Arcane Disturbance Occurred
              </h2>
              <p className="text-xs text-[#8c7e6a] mt-1.5 font-sans leading-relaxed">
                The Dungeon Master encountered a temporary enchantment collision while loading your adventure state.
              </p>
            </div>

            <div className="bg-[#f5f0e3] p-3 rounded-xl border border-[#e2dcc5] text-left font-mono text-[11px] text-[#4a3227] overflow-x-auto max-h-24">
              {this.state.error?.message || 'Unknown Application Anomaly'}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={this.handleReload}
                className="flex-1 px-4 py-2.5 bg-[#2c1810] hover:bg-[#4a3227] text-[#fdfaf1] rounded-xl text-xs font-serif font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Adventure</span>
              </button>

              <button
                onClick={this.handleReset}
                className="px-4 py-2.5 bg-[#f5f0e3] hover:bg-[#e2dcc5] text-[#2c1810] border border-[#b8ae8f] rounded-xl text-xs font-serif font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#8c7e6a]" />
                <span>Reset Local Data</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
