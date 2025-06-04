// src/components/ui/ErrorBoundary.tsx
// Error Boundary Component สำหรับจัดการ JavaScript Errors ในระดับ Component
// รองรับ Fallback UI ที่สวยงามและ Error Reporting
'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  Bug, 
  Mail,
  ArrowLeft,
  Shield,
  Zap
} from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showReportButton?: boolean;
  showReloadButton?: boolean;
  showHomeButton?: boolean;
  className?: string;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: this.generateErrorId()
    };
  }

  // สร้าง Error ID ที่ unique สำหรับการ tracking
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // อัปเดต state เมื่อเกิด error เพื่อแสดง fallback UI
    return {
      hasError: true,
      error: error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // บันทึกข้อมูล error สำหรับการ debug
    console.error('🚨 [ErrorBoundary] จับ Error ได้:', error);
    console.error('🚨 [ErrorBoundary] Error Info:', errorInfo);

    this.setState({
      error: error,
      errorInfo: errorInfo,
      errorId: this.generateErrorId()
    });

    // เรียก callback function ถ้ามี
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // ส่ง error report ไปยัง service external (เช่น Sentry, LogRocket)
    this.reportError(error, errorInfo);
  }

  // ฟังก์ชันสำหรับส่ง error report
  private reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      // ตัวอย่างการส่งข้อมูล error ไปยัง API endpoint
      const errorData = {
        errorId: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      // ส่งไปยัง error reporting service
      // await fetch('/api/error-report', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorData)
      // });

      console.log('📊 [ErrorBoundary] Error Report Data:', errorData);
    } catch (reportingError) {
      console.error('❌ [ErrorBoundary] ไม่สามารถส่ง Error Report ได้:', reportingError);
    }
  };

  // ฟังก์ชันสำหรับรีเซ็ต Error Boundary
  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: this.generateErrorId()
    });
  };

  // ฟังก์ชันสำหรับ reload หน้า
  private handleReload = () => {
    window.location.reload();
  };

  // ฟังก์ชันสำหรับไปหน้าแรก
  private handleGoHome = () => {
    window.location.href = '/';
  };

  // ฟังก์ชันสำหรับ copy error details
  private handleCopyError = async () => {
    const errorText = `
Error ID: ${this.state.errorId}
Message: ${this.state.error?.message}
Stack: ${this.state.error?.stack}
Component Stack: ${this.state.errorInfo?.componentStack}
Timestamp: ${new Date().toISOString()}
URL: ${window.location.href}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorText);
      alert('คัดลอกข้อมูล Error แล้ว');
    } catch (err) {
      console.error('ไม่สามารถคัดลอกได้:', err);
    }
  };

  render() {
    const { 
      children, 
      fallback, 
      showReportButton = true, 
      showReloadButton = true, 
      showHomeButton = true,
      className = ''
    } = this.props;

    if (this.state.hasError) {
      // ถ้ามี custom fallback ให้ใช้
      if (fallback) {
        return fallback;
      }

      // Fallback UI เริ่มต้น
      return (
        <div className={`min-h-screen bg-background text-foreground flex items-center justify-center p-4 ${className}`}>
          <motion.div
            className="max-w-2xl w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Error Card */}
            <motion.div
              className="bg-card border border-border rounded-2xl p-8 shadow-xl"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
            >
              {/* Error Icon & Header */}
              <motion.div
                className="flex items-center justify-center mb-6"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 400 }}
              >
                <div className="relative">
                  <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-10 h-10 text-red-500" />
                  </div>
                  <motion.div
                    className="absolute inset-0 border-2 border-red-200 dark:border-red-800 rounded-full"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
              </motion.div>

              {/* Error Title */}
              <motion.h1
                className="text-3xl font-bold text-card-foreground text-center mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                เกิดข้อผิดพลาดที่ไม่คาดคิด
              </motion.h1>

              {/* Error Description */}
              <motion.p
                className="text-muted-foreground text-center mb-6 leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                เราขออภัยสำหรับความไม่สะดวก ระบบพบข้อผิดพลาดขณะประมวลผลคำขอของคุณ 
                ทีมพัฒนาได้รับการแจ้งเตือนแล้วและกำลังดำเนินการแก้ไข
              </motion.p>

              {/* Error ID */}
              <motion.div
                className="bg-secondary/50 rounded-lg p-4 mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Bug className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-secondary-foreground">Error ID</span>
                </div>
                <code className="text-xs text-muted-foreground font-mono bg-background px-2 py-1 rounded">
                  {this.state.errorId}
                </code>
              </motion.div>

              {/* Error Details (Development Mode) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <motion.div
                  className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ delay: 0.7 }}
                >
                  <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Development Error Details
                  </h3>
                  <pre className="text-xs text-red-600 dark:text-red-300 overflow-x-auto whitespace-pre-wrap">
                    {this.state.error.message}
                  </pre>
                  <button
                    onClick={this.handleCopyError}
                    className="mt-2 text-xs text-red-500 hover:text-red-700 underline transition-colors"
                  >
                    คัดลอกข้อมูล Error ทั้งหมด
                  </button>
                </motion.div>
              )}

              {/* Action Buttons */}
              <motion.div
                className="flex flex-col sm:flex-row gap-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                {/* Retry Button */}
                <motion.button
                  onClick={this.handleRetry}
                  className="flex-1 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary-hover transition-colors flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <RefreshCw className="w-5 h-5" />
                  ลองใหม่อีกครั้ง
                </motion.button>

                {/* Reload Button */}
                {showReloadButton && (
                  <motion.button
                    onClick={this.handleReload}
                    className="flex-1 bg-secondary text-secondary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Zap className="w-5 h-5" />
                    รีโหลดหน้า
                  </motion.button>
                )}

                {/* Home Button */}
                {showHomeButton && (
                  <motion.button
                    onClick={this.handleGoHome}
                    className="flex-1 bg-secondary text-secondary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Home className="w-5 h-5" />
                    กลับหน้าแรก
                  </motion.button>
                )}
              </motion.div>

              {/* Report Bug Button */}
              {showReportButton && (
                <motion.div
                  className="mt-6 pt-6 border-t border-border"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  <p className="text-center text-sm text-muted-foreground mb-3">
                    หากปัญหายังคงเกิดขึ้น คุณสามารถแจ้งข้อผิดพลาดให้เราทราบได้
                  </p>
                  <motion.button
                    onClick={() => {
                      // เปิด modal หรือ redirect ไปหน้า report bug
                      window.open(`mailto:support@novelmaze.com?subject=Bug Report - ${this.state.errorId}&body=Error ID: ${this.state.errorId}%0D%0A%0D%0APlease describe what you were doing when this error occurred:`);
                    }}
                    className="w-full bg-accent/10 text-accent-foreground border border-accent/20 px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent/20 transition-colors flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Mail className="w-4 h-4" />
                    แจ้งปัญหาให้ทีมพัฒนา
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        </div>
      );
    }

    // ถ้าไม่มี error ให้แสดง children ตามปกติ
    return children;
  }
}

// Higher Order Component สำหรับ wrap component ด้วย ErrorBoundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Hook สำหรับจัดการ error ใน functional components
export function useErrorHandler() {
  const throwError = (error: Error) => {
    throw error;
  };

  const handleAsyncError = (promise: Promise<any>) => {
    promise.catch(throwError);
  };

  return { throwError, handleAsyncError };
}