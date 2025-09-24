'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

/**
 * Error Boundary Component สำหรับจัดการ errors ใน React components
 * รองรับ custom fallback UI และ error reporting
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error} retry={this.handleRetry} />
      }

      // Default error UI
      return (
        <Card className="max-w-lg mx-auto mt-8">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">เกิดข้อผิดพลาด</CardTitle>
            </div>
            <CardDescription>
              เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm font-mono text-muted-foreground">
                  <strong>Error:</strong> {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="text-xs cursor-pointer">Component Stack</summary>
                    <pre className="text-xs mt-1 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}
            <Button 
              onClick={this.handleRetry}
              className="w-full"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              ลองใหม่
            </Button>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

/**
 * Episode Error Boundary - Specialized error boundary for episode operations
 */
interface EpisodeErrorBoundaryProps {
  children: React.ReactNode
  onError?: (error: Error) => void
}

export const EpisodeErrorBoundary: React.FC<EpisodeErrorBoundaryProps> = ({ 
  children, 
  onError 
}) => {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error('[Episode Error]:', error)
    if (onError) {
      onError(error)
    }
  }

  const EpisodeFallback = ({ error, retry }: { error: Error; retry: () => void }) => (
    <Card className="m-4">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <CardTitle className="text-destructive">Episode Error</CardTitle>
        </div>
        <CardDescription>
          เกิดข้อผิดพลาดในการจัดการตอน กรุณาลองใหม่อีกครั้ง
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-muted p-2 rounded text-xs">
              <strong>Error:</strong> {error.message}
            </div>
          )}
          <Button 
            onClick={retry}
            size="sm"
            variant="outline"
            className="w-full"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            ลองใหม่
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <ErrorBoundary 
      fallback={EpisodeFallback}
      onError={handleError}
    >
      {children}
    </ErrorBoundary>
  )
}

export default ErrorBoundary
