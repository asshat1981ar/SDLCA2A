/**
 * A2A Performance Monitor
 * Comprehensive performance monitoring and metrics collection for A2A framework
 */

import { A2AServiceOptimized, A2AMetrics } from './a2aServiceOptimized';

export interface PerformanceAlert {
  id: string;
  timestamp: number;
  type: 'memory' | 'response_time' | 'error_rate' | 'cache_hit_rate';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  suggestions: string[];
}

export interface PerformanceThresholds {
  memoryUsageMaxMB: number;
  responseTimeMaxMs: number;
  errorRateMaxPercent: number;
  cacheHitRateMinPercent: number;
}

export interface PerformanceReport {
  timestamp: number;
  metrics: A2AMetrics;
  alerts: PerformanceAlert[];
  recommendations: string[];
  overallHealth: 'excellent' | 'good' | 'warning' | 'critical';
}

export class A2APerformanceMonitor {
  private a2aService: A2AServiceOptimized;
  private alerts: PerformanceAlert[] = [];
  private thresholds: PerformanceThresholds;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  
  constructor(
    a2aService: A2AServiceOptimized,
    thresholds: Partial<PerformanceThresholds> = {}
  ) {
    this.a2aService = a2aService;
    this.thresholds = {
      memoryUsageMaxMB: 200,
      responseTimeMaxMs: 5000,
      errorRateMaxPercent: 5,
      cacheHitRateMinPercent: 60,
      ...thresholds
    };
  }

  /**
   * Start continuous performance monitoring
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) {
      console.log('Performance monitoring already active');
      return;
    }

    this.isMonitoring = true;
    console.log('🔍 Starting A2A performance monitoring...');

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkPerformance();
      } catch (error) {
        console.error('Error in performance monitoring:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.isMonitoring = false;
      console.log('⏹️  Performance monitoring stopped');
    }
  }

  /**
   * Check current performance metrics
   */
  async checkPerformance(): Promise<void> {
    try {
      const metrics = await this.a2aService.getMetrics();
      const newAlerts = this.analyzeMetrics(metrics);
      
      if (newAlerts.length > 0) {
        this.alerts.push(...newAlerts);
        
        // Keep only last 100 alerts
        if (this.alerts.length > 100) {
          this.alerts = this.alerts.slice(-100);
        }
        
        // Log critical alerts
        newAlerts.forEach(alert => {
          if (alert.severity === 'critical') {
            console.error(`🚨 CRITICAL ALERT: ${alert.message}`);
          } else if (alert.severity === 'high') {
            console.warn(`⚠️  HIGH ALERT: ${alert.message}`);
          }
        });
      }
      
    } catch (error) {
      console.error('Failed to check performance:', error);
    }
  }

  /**
   * Analyze metrics and generate alerts
   */
  private analyzeMetrics(metrics: A2AMetrics): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];
    const now = Date.now();

    // Memory usage alert
    if (metrics.memoryUsage && metrics.memoryUsage.heapUsedMB > this.thresholds.memoryUsageMaxMB) {
      alerts.push({
        id: `memory-${now}`,
        timestamp: now,
        type: 'memory',
        severity: this.getSeverity('memory', metrics.memoryUsage.heapUsedMB, this.thresholds.memoryUsageMaxMB),
        message: `High memory usage: ${metrics.memoryUsage.heapUsedMB}MB (threshold: ${this.thresholds.memoryUsageMaxMB}MB)`,
        value: metrics.memoryUsage.heapUsedMB,
        threshold: this.thresholds.memoryUsageMaxMB,
        suggestions: [
          'Consider implementing memory cleanup routines',
          'Check for memory leaks in bridge connections',
          'Optimize cache size settings'
        ]
      });
    }

    // Response time alert
    if (metrics.avgResponseTime > this.thresholds.responseTimeMaxMs) {
      alerts.push({
        id: `response-time-${now}`,
        timestamp: now,
        type: 'response_time',
        severity: this.getSeverity('response_time', metrics.avgResponseTime, this.thresholds.responseTimeMaxMs),
        message: `Slow response time: ${metrics.avgResponseTime}ms (threshold: ${this.thresholds.responseTimeMaxMs}ms)`,
        value: metrics.avgResponseTime,
        threshold: this.thresholds.responseTimeMaxMs,
        suggestions: [
          'Check external service health',
          'Optimize request routing algorithms',
          'Increase connection pool size'
        ]
      });
    }

    // Error rate alert
    if (metrics.errorRate > this.thresholds.errorRateMaxPercent) {
      alerts.push({
        id: `error-rate-${now}`,
        timestamp: now,
        type: 'error_rate',
        severity: this.getSeverity('error_rate', metrics.errorRate, this.thresholds.errorRateMaxPercent),
        message: `High error rate: ${metrics.errorRate}% (threshold: ${this.thresholds.errorRateMaxPercent}%)`,
        value: metrics.errorRate,
        threshold: this.thresholds.errorRateMaxPercent,
        suggestions: [
          'Check external service availability',
          'Review error handling logic',
          'Implement circuit breakers'
        ]
      });
    }

    // Cache hit rate alert
    if (metrics.cacheHitRate < this.thresholds.cacheHitRateMinPercent) {
      alerts.push({
        id: `cache-hit-rate-${now}`,
        timestamp: now,
        type: 'cache_hit_rate',
        severity: this.getSeverity('cache_hit_rate', metrics.cacheHitRate, this.thresholds.cacheHitRateMinPercent, true),
        message: `Low cache hit rate: ${metrics.cacheHitRate}% (threshold: ${this.thresholds.cacheHitRateMinPercent}%)`,
        value: metrics.cacheHitRate,
        threshold: this.thresholds.cacheHitRateMinPercent,
        suggestions: [
          'Review cache configuration',
          'Optimize cache key generation',
          'Increase cache TTL if appropriate'
        ]
      });
    }

    return alerts;
  }

  /**
   * Get severity level based on how far the value is from threshold
   */
  private getSeverity(
    type: string,
    value: number,
    threshold: number,
    isReverse: boolean = false
  ): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = isReverse ? threshold / value : value / threshold;
    
    if (ratio >= 2) return 'critical';
    if (ratio >= 1.5) return 'high';
    if (ratio >= 1.2) return 'medium';
    return 'low';
  }

  /**
   * Generate comprehensive performance report
   */
  async generateReport(): Promise<PerformanceReport> {
    const metrics = await this.a2aService.getMetrics();
    const recentAlerts = this.alerts.filter(alert => Date.now() - alert.timestamp < 3600000); // Last hour
    
    const recommendations = this.generateRecommendations(metrics, recentAlerts);
    const overallHealth = this.calculateOverallHealth(recentAlerts);
    
    return {
      timestamp: Date.now(),
      metrics,
      alerts: recentAlerts,
      recommendations,
      overallHealth
    };
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(metrics: A2AMetrics, alerts: PerformanceAlert[]): string[] {
    const recommendations: string[] = [];
    
    // General recommendations
    if (metrics.requestCount > 1000) {
      recommendations.push('Consider implementing request rate limiting');
    }
    
    if (metrics.errorRate > 1) {
      recommendations.push('Review error handling and implement retry mechanisms');
    }
    
    if (metrics.avgResponseTime > 1000) {
      recommendations.push('Optimize service routing and consider response caching');
    }
    
    // Alert-specific recommendations
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      recommendations.push('Address critical performance issues immediately');
    }
    
    const highAlerts = alerts.filter(a => a.severity === 'high');
    if (highAlerts.length > 2) {
      recommendations.push('Multiple high-severity issues detected - consider system review');
    }
    
    return recommendations;
  }

  /**
   * Calculate overall system health
   */
  private calculateOverallHealth(alerts: PerformanceAlert[]): 'excellent' | 'good' | 'warning' | 'critical' {
    const criticalCount = alerts.filter(a => a.severity === 'critical').length;
    const highCount = alerts.filter(a => a.severity === 'high').length;
    const mediumCount = alerts.filter(a => a.severity === 'medium').length;
    
    if (criticalCount > 0) return 'critical';
    if (highCount > 2) return 'critical';
    if (highCount > 0 || mediumCount > 5) return 'warning';
    if (mediumCount > 0) return 'good';
    
    return 'excellent';
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(hoursBack: number = 24): PerformanceAlert[] {
    const cutoffTime = Date.now() - (hoursBack * 3600000);
    return this.alerts.filter(alert => alert.timestamp >= cutoffTime);
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: 'low' | 'medium' | 'high' | 'critical'): PerformanceAlert[] {
    return this.alerts.filter(alert => alert.severity === severity);
  }

  /**
   * Clear old alerts
   */
  clearOldAlerts(hoursBack: number = 168): void { // Default 7 days
    const cutoffTime = Date.now() - (hoursBack * 3600000);
    this.alerts = this.alerts.filter(alert => alert.timestamp >= cutoffTime);
  }

  /**
   * Get monitoring status
   */
  getMonitoringStatus(): {
    isActive: boolean;
    alertCount: number;
    thresholds: PerformanceThresholds;
  } {
    return {
      isActive: this.isMonitoring,
      alertCount: this.alerts.length,
      thresholds: this.thresholds
    };
  }
}

export default A2APerformanceMonitor;