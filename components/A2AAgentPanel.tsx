/**
 * A2A Agent Panel Component
 * Displays A2A framework status, health, and agent information
 */

import React, { useState, useEffect } from 'react';
import { useA2AIntegration } from '../hooks/useA2AIntegration';
import { AgentName } from '../types';

interface A2AAgentPanelProps {
  className?: string;
}

interface ServiceHealth {
  status: 'healthy' | 'unhealthy' | 'unreachable' | 'error' | 'stopped' | 'external';
  lastCheck?: Date;
  error?: string;
  responseTime?: number;
  exitCode?: number;
}

export const A2AAgentPanel: React.FC<A2AAgentPanelProps> = ({ className = '' }) => {
  const [a2aState, a2aActions] = useA2AIntegration();
  const [stats, setStats] = useState<any>(null);
  const [expanded, setExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load stats on mount and when A2A becomes available
  useEffect(() => {
    if (a2aState.isA2AAvailable) {
      loadStats();
    }
  }, [a2aState.isA2AAvailable]);

  const loadStats = async () => {
    try {
      const statsData = await a2aActions.getA2AStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load A2A stats:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await a2aActions.checkA2AHealth();
      await loadStats();
    } catch (error) {
      console.error('Failed to refresh A2A data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleInitialize = async () => {
    try {
      await a2aActions.initializeA2A();
      await loadStats();
    } catch (error) {
      console.error('Failed to initialize A2A:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'unhealthy': return 'text-yellow-400';
      case 'unreachable': return 'text-red-400';
      case 'error': return 'text-red-400';
      case 'stopped': return 'text-gray-400';
      case 'external': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'unhealthy': return '⚠️';
      case 'unreachable': return '❌';
      case 'error': return '🔥';
      case 'stopped': return '⏹️';
      case 'external': return '🔗';
      default: return '❓';
    }
  };

  const formatResponseTime = (time?: number) => {
    if (!time) return 'N/A';
    return time < 1000 ? `${Math.round(time)}ms` : `${(time / 1000).toFixed(1)}s`;
  };

  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
          <h3 className="text-lg font-semibold text-white">A2A Agent Director</h3>
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            a2aState.isA2AAvailable ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
          }`}>
            {a2aState.isA2AAvailable ? 'Online' : 'Offline'}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            title="Refresh A2A Status"
          >
            <span className={`text-gray-400 ${refreshing ? 'animate-spin' : ''}`}>
              🔄
            </span>
          </button>
          
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            title="Toggle Details"
          >
            <span className={`text-gray-400 transform transition-transform ${expanded ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="space-y-3">
        {!a2aState.isA2AInitialized && (
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-yellow-400">⚠️</span>
                <span className="text-yellow-300">A2A Framework Not Initialized</span>
              </div>
              <button
                onClick={handleInitialize}
                className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm transition-colors"
              >
                Initialize
              </button>
            </div>
          </div>
        )}

        {a2aState.lastError && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <span className="text-red-400">🔥</span>
              <span className="text-red-300">Error: {a2aState.lastError}</span>
            </div>
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-sm text-gray-400">Services</div>
              <div className="text-2xl font-bold text-white">{stats.services}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-sm text-gray-400">Healthy</div>
              <div className="text-2xl font-bold text-green-400">{stats.healthyServices}</div>
            </div>
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Service Health */}
          {stats?.health && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Service Health</h4>
              <div className="space-y-2">
                {Object.entries(stats.health as Record<string, ServiceHealth>).map(([service, health]) => (
                  <div key={service} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span>{getStatusIcon(health.status)}</span>
                      <span className="text-sm text-gray-300">{service}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs ${getStatusColor(health.status)}`}>
                        {health.status}
                      </span>
                      {health.responseTime && (
                        <span className="text-xs text-gray-500">
                          {formatResponseTime(health.responseTime)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agent Capabilities */}
          {stats?.capabilities && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Agent Capabilities</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {Object.entries(stats.capabilities as Record<AgentName, string[]>).map(([agent, capabilities]) => (
                  <div key={agent} className="border-l-2 border-gray-700 pl-3">
                    <div className="text-sm font-medium text-gray-300">{agent}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {capabilities.map((capability) => (
                        <span
                          key={capability}
                          className="px-2 py-1 bg-gray-700 text-xs text-gray-300 rounded"
                        >
                          {capability}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Service Statistics */}
          {stats?.stats && Object.keys(stats.stats).length > 0 && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Service Statistics</h4>
              <div className="space-y-2">
                {Object.entries(stats.stats as Record<string, any>).map(([service, stat]) => (
                  <div key={service} className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">{service}</span>
                    <div className="flex items-center space-x-4">
                      <div className="text-xs text-gray-500">
                        Success: {stat.success || 0}
                      </div>
                      <div className="text-xs text-gray-500">
                        Failed: {stat.failure || 0}
                      </div>
                      <div className="text-xs text-gray-500">
                        Avg: {formatResponseTime(stat.avgResponseTime)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* A2A Actions */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-3">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => a2aActions.intelligentQuery('System status check')}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
              >
                Health Check
              </button>
              <button
                onClick={() => a2aActions.resetA2A()}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
              >
                Reset A2A
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default A2AAgentPanel;