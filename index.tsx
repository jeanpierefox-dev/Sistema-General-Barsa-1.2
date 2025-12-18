
import React, { ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AlertTriangle, Trash2, RefreshCw } from 'lucide-react';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root element not found");

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Critical System Error:", error, errorInfo);
  }

  handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isHookError = String(this.state.error).includes('useRef') || String(this.state.error).includes('Hooks');
      
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
          <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center border border-white/20">
            <div className="bg-red-50 p-5 rounded-3xl w-20 h-20 flex items-center justify-center mx-auto mb-8 shadow-inner">
                <AlertTriangle size={40} className="text-red-500"/>
            </div>
            
            <h1 className="text-2xl font-black text-slate-900 mb-3 uppercase tracking-tight">Error de Inicialización</h1>
            <p className="text-slate-500 mb-8 text-sm font-medium leading-relaxed">
              {isHookError 
                ? "Se ha detectado un conflicto de versiones en el navegador. Por favor, limpie el caché o restablezca el sistema."
                : "El sistema no pudo cargar correctamente debido a un error crítico."}
            </p>
            
            <div className="bg-slate-50 p-4 rounded-2xl text-left text-[10px] font-mono text-red-600 mb-8 overflow-auto max-h-32 border border-slate-100 break-words">
                {String(this.state.error)}
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <RefreshCw size={18}/> REINTENTAR CARGA
              </button>
              
              <button 
                onClick={this.handleReset}
                className="w-full text-slate-400 py-2 font-bold text-[10px] uppercase tracking-widest hover:text-red-500 transition-colors"
              >
                Limpiar datos locales y resetear
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
  </React.StrictMode>
);
